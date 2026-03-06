import { getLastFmEnv } from "../_lib/config/env.js";
import { toErrorResponse } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { resolveAuthenticatedUserId } from "../profile/auth.js";
import { LastFmService } from "./lastfm.service.js";

function buildCallbackUrl(baseCallbackUrl, state = "") {
  if (typeof baseCallbackUrl !== "string" || !baseCallbackUrl.trim()) return "";
  const url = new URL(baseCallbackUrl.trim());
  if (typeof state === "string" && state.trim()) {
    url.searchParams.set("state", state.trim());
  }
  return url.toString();
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const env = getLastFmEnv();
    const supabase = getSupabaseAdminClient(env);
    const userId = await resolveAuthenticatedUserId(req, supabase);

    const lastFmService = new LastFmService({
      apiKey: env.LASTFM_API_KEY,
      apiSecret: env.LASTFM_API_SECRET,
    });

    const token = await lastFmService.requestAuthToken();
    if (!token) {
      sendJson(res, 502, { error: "Unable to start Last.fm connection." }, requestId);
      return;
    }

    const state = lastFmService.createConnectionState(userId);
    if (!state) {
      sendJson(res, 500, { error: "Unable to start Last.fm connection." }, requestId);
      return;
    }

    const callbackUrl = buildCallbackUrl(env.LASTFM_CALLBACK_URL, state);
    const authorizationUrl = lastFmService.buildAuthorizationUrl({ callbackUrl, token });
    if (!authorizationUrl) {
      sendJson(res, 500, { error: "Unable to start Last.fm connection." }, requestId);
      return;
    }

    sendJson(res, 200, { authorizationUrl }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Last.fm connect endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
