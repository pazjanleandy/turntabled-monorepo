/* global process */

import { getProfileEnv } from "../../_lib/config/env.js";
import { NotFoundError, ValidationError, toErrorResponse } from "../../_lib/errors.js";
import { getRequestId, sendJson } from "../../_lib/http.js";
import { logError, logInfo, logWarn } from "../../_lib/logger.js";
import { getSupabaseAdminClient } from "../../_lib/supabase-admin.js";
import { resolveAuthenticatedUserId } from "../../profile/auth.js";
import { LastFmService } from "../lastfm.service.js";
import { RecentlyListenedRepository } from "../recently-listened.repository.js";

const RECENTLY_LISTENED_LIMIT = 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUsername(req) {
  const raw = req.query?.username;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError("Missing username in path.");
  }
  return raw.trim().replace(/^@/, "");
}

function isUuidLike(value = "") {
  return UUID_PATTERN.test(String(value).trim());
}

function mapBacklogRow(row) {
  return {
    source: "turntabled",
    track: null,
    artist: row?.album?.artist?.name ?? row?.artist_name_raw ?? null,
    album: row?.album?.title ?? row?.album_title_raw ?? null,
    played_at: null,
    logged_at: row?.updated_at ?? null,
    cover_art: row?.album?.cover_art_url ?? null,
  };
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const username = parseUsername(req);
    const env = getProfileEnv();
    const supabase = getSupabaseAdminClient(env);
    const repository = new RecentlyListenedRepository(supabase);
    const lastFmService = new LastFmService({
      apiKey: process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY || "",
    });

    const user =
      username.toLowerCase() === "me"
        ? await (async () => {
            const authenticatedUserId = await resolveAuthenticatedUserId(req, supabase);
            return repository.findUserById(authenticatedUserId);
          })()
        : isUuidLike(username)
          ? await repository.findUserById(username)
        : await repository.findUserByUsername(username);
    if (!user?.id) {
      throw new NotFoundError("User not found.");
    }

    const fallbackToTurntabled = async () => {
      const backlogRows = await repository.listRecentBacklogForUser(
        user.id,
        RECENTLY_LISTENED_LIMIT
      );
      return backlogRows.map((row) => mapBacklogRow(row));
    };

    const lastFmUsername =
      typeof user.lastfm_username === "string" ? user.lastfm_username.trim() : "";

    if (lastFmUsername) {
      const lastFmItems = await lastFmService.fetchRecentTracks(lastFmUsername, {
        limit: RECENTLY_LISTENED_LIMIT,
      });
      if (Array.isArray(lastFmItems)) {
        logInfo("Recently listened resolved from Last.fm.", {
          requestId,
          userId: user.id,
          username: user.username ?? username,
          lastfmUsername: lastFmUsername,
          lastfmTrackCount: lastFmItems.length,
          fallbackTriggered: false,
        });
        sendJson(res, 200, lastFmItems, requestId);
        return;
      }

      logWarn("Last.fm recently listened fallback to Turntabled backlog.", {
        requestId,
        userId: user.id,
        username: user.username ?? username,
        lastfmUsername: lastFmUsername,
        reason: "lastfm_unavailable_or_empty",
        fallbackTriggered: true,
      });
    }

    const fallbackItems = await fallbackToTurntabled();
    logInfo("Recently listened resolved from Turntabled fallback.", {
      requestId,
      userId: user.id,
      username: user.username ?? username,
      fallbackTriggered: true,
      fallbackCount: fallbackItems.length,
    });
    sendJson(res, 200, fallbackItems, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Recently listened endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
