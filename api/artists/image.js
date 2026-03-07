import { toErrorResponse, ValidationError, NotFoundError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new ValidationError(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function safeTrim(value) {
  if (typeof value !== "string") return "";
  return value.trim();
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
  const fanartResponse = await fetch(fanartUrl);
  if (!fanartResponse.ok) return "";
  const fanartPayload = await fanartResponse.json().catch(() => ({}));
  return getFanartImageUrl(fanartPayload);
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

  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const artistId = safeTrim(req.query?.artistId);
    if (!artistId) {
      throw new ValidationError("Query param 'artistId' is required.");
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const fanartApiKey = getRequiredEnv("FANART_API_KEY");
    const lastFmApiKey = getRequiredEnv("LASTFM_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: artist, error: artistError } = await supabase
      .from("artist")
      .select("id,mbid,name,image_url")
      .eq("id", artistId)
      .maybeSingle();

    if (artistError) {
      throw new Error(artistError.message || "Failed to load artist.");
    }
    if (!artist) {
      throw new NotFoundError("Artist not found.");
    }

    const cachedImageUrl = safeTrim(artist.image_url);
    if (cachedImageUrl) {
      sendJson(res, 200, { imageUrl: cachedImageUrl, cached: true }, requestId);
      return;
    }

    const artistMbid = safeTrim(artist.mbid);
    const artistName = safeTrim(artist.name);

    let resolvedImageUrl = await resolveFanartImageUrl(artistMbid, fanartApiKey);
    if (!resolvedImageUrl) {
      resolvedImageUrl = await resolveLastFmImageUrl({
        artistMbid,
        artistName,
        lastFmApiKey,
      });
    }

    if (!resolvedImageUrl) {
      sendJson(res, 200, { imageUrl: null, cached: false }, requestId);
      return;
    }

    const { error: updateError } = await supabase
      .from("artist")
      .update({ image_url: resolvedImageUrl })
      .eq("id", artist.id);

    if (updateError) {
      throw new Error(updateError.message || "Failed to cache artist image.");
    }

    sendJson(res, 200, { imageUrl: resolvedImageUrl, cached: false }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Artist image endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
