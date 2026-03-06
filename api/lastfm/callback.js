/* global Buffer */

import { getLastFmEnv } from "../_lib/config/env.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError, logInfo, logWarn } from "../_lib/logger.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";
import { resolveAuthenticatedUserId } from "../profile/auth.js";
import { LastFmService } from "./lastfm.service.js";

const CONNECTED_REDIRECT_PATH = "/profile?lastfm=connected";
const ERROR_REDIRECT_PATH = "/profile?lastfm=error";

function redirect(res, path) {
  res.setHeader("Location", path);
  res.status(302).end();
}

function parseToken(req) {
  const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
  if (!token) return "";
  if (token.length > 512) return "";
  return token;
}

function parseState(req) {
  return typeof req.query?.state === "string" ? req.query.state.trim() : "";
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function connectLastFmForUser({ supabase, lastFmService, userId, token, requestId }) {
  const session = await lastFmService.exchangeTokenForSession(token);
  if (!session?.username) {
    logWarn("Last.fm callback failed to exchange token for session.", {
      requestId,
      userId,
    });
    return false;
  }

  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({
      lastfm_username: session.username,
      lastfm_connected_at: timestamp,
      updated_at: timestamp,
    })
    .eq("id", userId);

  if (error) {
    logError("Last.fm callback failed while updating user connection.", {
      requestId,
      userId,
      code: error?.code ?? null,
    });
    return false;
  }

  logInfo("Last.fm account connected.", { requestId, userId });
  return true;
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const env = getLastFmEnv();
    const supabase = getSupabaseAdminClient(env);
    const lastFmService = new LastFmService({
      apiKey: env.LASTFM_API_KEY,
      apiSecret: env.LASTFM_API_SECRET,
    });

    if (req.method === "POST") {
      const userId = await resolveAuthenticatedUserId(req, supabase);
      const body = await parseBody(req);
      const rawToken = typeof body?.token === "string" ? body.token.trim() : "";
      const token = rawToken && rawToken.length <= 512 ? rawToken : "";

      if (!token) {
        sendJson(res, 400, { error: "Invalid callback token." }, requestId);
        return;
      }

      const connected = await connectLastFmForUser({
        supabase,
        lastFmService,
        userId,
        token,
        requestId,
      });
      if (!connected) {
        sendJson(res, 400, { error: "Unable to connect Last.fm account." }, requestId);
        return;
      }

      sendJson(res, 200, { ok: true }, requestId);
      return;
    }

    if (req.method === "GET") {
      const token = parseToken(req);
      const state = parseState(req);
      if (!token) {
        logWarn("Last.fm callback rejected due to missing/invalid token.", { requestId });
        redirect(res, ERROR_REDIRECT_PATH);
        return;
      }

      const userId = lastFmService.verifyConnectionState(state);
      if (!userId) {
        logWarn("Last.fm callback rejected due to invalid connection state.", {
          requestId,
        });
        redirect(res, ERROR_REDIRECT_PATH);
        return;
      }

      const connected = await connectLastFmForUser({
        supabase,
        lastFmService,
        userId,
        token,
        requestId,
      });
      redirect(res, connected ? CONNECTED_REDIRECT_PATH : ERROR_REDIRECT_PATH);
      return;
    }

    res.setHeader("x-request-id", requestId);
    res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    logError("Last.fm callback endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    redirect(res, ERROR_REDIRECT_PATH);
  }
}
