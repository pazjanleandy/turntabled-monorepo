import { createClient } from "@supabase/supabase-js";
import { toErrorResponse, UnauthorizedError, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new ValidationError(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function validateWorkerAuthorization(req, expectedSecret) {
  const customHeader = req.headers["x-worker-secret"];
  const authorization = req.headers.authorization ?? req.headers.Authorization;
  const bearerToken =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;

  if (customHeader !== expectedSecret && bearerToken !== expectedSecret) {
    throw new UnauthorizedError("Invalid worker secret.");
  }
}

function safeTrim(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number.parseInt(rawValue ?? String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getFanartImageUrl(payload) {
  const artistThumb = Array.isArray(payload?.artistthumb) ? payload.artistthumb : [];
  const firstThumb = artistThumb[0];
  return safeTrim(firstThumb?.url);
}

function getLastFmImageUrl(payload) {
  const images = Array.isArray(payload?.artist?.image) ? payload.artist.image : [];
  const preferredSizes = ["mega", "extralarge", "large", "medium", "small"];
  const placeholderToken = "2a96cbd8b46e442fc41c2b86b821562f";

  const isUsableLastFmUrl = (url) => {
    const normalized = safeTrim(url);
    if (!normalized) return false;
    return !normalized.includes(placeholderToken);
  };

  for (const size of preferredSizes) {
    const match = images.find((entry) => safeTrim(entry?.size).toLowerCase() === size);
    const url = safeTrim(match?.["#text"]);
    if (isUsableLastFmUrl(url)) return url;
  }

  for (const entry of images) {
    const url = safeTrim(entry?.["#text"]);
    if (isUsableLastFmUrl(url)) return url;
  }

  return "";
}

async function resolveFanartImageUrl(artistMbid, fanartApiKey) {
  if (!artistMbid || !fanartApiKey) return "";
  const fanartUrl = `http://webservice.fanart.tv/v3/music/${encodeURIComponent(
    artistMbid
  )}?api_key=${encodeURIComponent(fanartApiKey)}`;
  const response = await fetch(fanartUrl);
  if (!response.ok) return "";
  const payload = await response.json().catch(() => ({}));
  return getFanartImageUrl(payload);
}

async function resolveLastFmImageUrl({ artistMbid, artistName, lastFmApiKey }) {
  if (!lastFmApiKey) return "";

  const baseUrl = "https://ws.audioscrobbler.com/2.0/";
  const tryParams = [];

  if (artistMbid) {
    tryParams.push({
      method: "artist.getinfo",
      mbid: artistMbid,
      api_key: lastFmApiKey,
      format: "json",
      autocorrect: "1",
    });
  }

  if (artistName) {
    tryParams.push({
      method: "artist.getinfo",
      artist: artistName,
      api_key: lastFmApiKey,
      format: "json",
      autocorrect: "1",
    });
  }

  for (const paramsObject of tryParams) {
    const params = new URLSearchParams(paramsObject);
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (!response.ok) continue;
    const payload = await response.json().catch(() => ({}));
    if (payload?.error) continue;
    const imageUrl = getLastFmImageUrl(payload);
    if (imageUrl) return imageUrl;
  }

  return "";
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);
  if (req.method !== "POST" && req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  try {
    const workerSecret = getRequiredEnv("EXPLORE_WORKER_SECRET");
    validateWorkerAuthorization(req, workerSecret);

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const fanartApiKey = getRequiredEnv("FANART_API_KEY");
    const lastFmApiKey = getRequiredEnv("LASTFM_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const maxJobs = parsePositiveInt(req.query?.maxJobs, 100);
    const maxRuntimeMs = parsePositiveInt(req.query?.maxRuntimeMs, 60000);
    const startedAt = Date.now();

    const { data: artists, error: artistsError } = await supabase
      .from("artist")
      .select("id,mbid,name,image_url")
      .is("image_url", null)
      .order("updated_at", { ascending: true })
      .limit(maxJobs);

    if (artistsError) {
      throw new Error(artistsError.message || "Failed to load artists for backfill.");
    }

    let processed = 0;
    let updated = 0;
    let missing = 0;
    let failed = 0;
    let timedOut = false;

    for (const artist of artists ?? []) {
      if (Date.now() - startedAt >= maxRuntimeMs) {
        timedOut = true;
        break;
      }

      const artistId = safeTrim(artist?.id);
      const artistMbid = safeTrim(artist?.mbid);
      const artistName = safeTrim(artist?.name);
      if (!artistId) continue;

      processed += 1;

      try {
        let imageUrl = await resolveFanartImageUrl(artistMbid, fanartApiKey);
        if (!imageUrl) {
          imageUrl = await resolveLastFmImageUrl({
            artistMbid,
            artistName,
            lastFmApiKey,
          });
        }

        if (!imageUrl) {
          missing += 1;
          continue;
        }

        const { error: updateError } = await supabase
          .from("artist")
          .update({ image_url: imageUrl })
          .eq("id", artistId);

        if (updateError) {
          failed += 1;
          continue;
        }

        updated += 1;
      } catch {
        failed += 1;
      }
    }

    sendJson(
      res,
      200,
      {
        ok: true,
        processed,
        updated,
        missing,
        failed,
        maxJobs,
        maxRuntimeMs,
        elapsedMs: Date.now() - startedAt,
        timedOut,
      },
      requestId
    );
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Fanart worker failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
