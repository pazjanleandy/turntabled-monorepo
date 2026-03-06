/* global Buffer */

import { createHash, createHmac, timingSafeEqual } from "crypto";

const LASTFM_API_BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const REQUEST_TIMEOUT_MS = 4000;
const CONNECTION_STATE_TTL_MS = 10 * 60 * 1000;

function md5(input) {
  return createHash("md5").update(input).digest("hex");
}

function buildApiSig(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const base = sortedKeys.map((key) => `${key}${params[key]}`).join("") + apiSecret;
  return md5(base);
}

function withTimeoutSignal() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { controller, timeout };
}

function isValidTokenFormat(token) {
  return typeof token === "string" && /^[a-z0-9]+$/i.test(token.trim());
}

function signStatePayload(payload, apiSecret) {
  return createHmac("sha256", apiSecret).update(payload).digest("hex");
}

function safeCompareStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export class LastFmService {
  constructor({ apiKey, apiSecret, fetchImpl = fetch }) {
    this.apiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    this.apiSecret = typeof apiSecret === "string" ? apiSecret.trim() : "";
    this.fetchImpl = fetchImpl;
  }

  async requestAuthToken() {
    if (!this.apiKey) return null;

    const params = new URLSearchParams({
      method: "auth.getToken",
      api_key: this.apiKey,
      format: "json",
    });
    const { controller, timeout } = withTimeoutSignal();

    try {
      const response = await this.fetchImpl(`${LASTFM_API_BASE_URL}?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      const token = typeof payload?.token === "string" ? payload.token.trim() : "";
      if (!response.ok || payload?.error || !isValidTokenFormat(token)) {
        return null;
      }
      return token;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  buildAuthorizationUrl({ callbackUrl = "", token = "" } = {}) {
    if (!this.apiKey) return null;
    const paramsObject = {
      api_key: this.apiKey,
    };
    if (typeof token === "string" && token.trim()) {
      if (!isValidTokenFormat(token)) return null;
      paramsObject.token = token.trim();
    }
    if (typeof callbackUrl === "string" && callbackUrl.trim()) {
      paramsObject.cb = callbackUrl.trim();
    }
    const params = new URLSearchParams(paramsObject);
    return `https://www.last.fm/api/auth/?${params.toString()}`;
  }

  createConnectionState(userId) {
    if (typeof userId !== "string" || !userId.trim()) return "";
    if (!this.apiSecret) return "";
    const normalizedUserId = userId.trim();
    const expiresAt = Date.now() + CONNECTION_STATE_TTL_MS;
    const payload = `${normalizedUserId}.${expiresAt}`;
    const signature = signStatePayload(payload, this.apiSecret);
    return `${payload}.${signature}`;
  }

  verifyConnectionState(rawState) {
    if (typeof rawState !== "string" || !rawState.trim()) return null;
    if (!this.apiSecret) return null;

    const state = rawState.trim();
    const parts = state.split(".");
    if (parts.length !== 3) return null;

    const [userId, expiresAtRaw, signature] = parts;
    if (!userId || !expiresAtRaw || !signature) return null;

    const expiresAt = Number.parseInt(expiresAtRaw, 10);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    const payload = `${userId}.${expiresAtRaw}`;
    const expectedSignature = signStatePayload(payload, this.apiSecret);
    if (!safeCompareStrings(signature, expectedSignature)) return null;

    return userId;
  }

  async exchangeTokenForSession(token) {
    if (!this.apiKey || !this.apiSecret) return null;
    if (!isValidTokenFormat(token)) return null;

    const trimmedToken = token.trim();
    const signatureParams = {
      api_key: this.apiKey,
      method: "auth.getSession",
      token: trimmedToken,
    };
    const apiSig = buildApiSig(signatureParams, this.apiSecret);

    const query = new URLSearchParams({
      ...signatureParams,
      api_sig: apiSig,
      format: "json",
    });
    const { controller, timeout } = withTimeoutSignal();

    try {
      const response = await this.fetchImpl(`${LASTFM_API_BASE_URL}?${query.toString()}`, {
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      const username =
        typeof payload?.session?.name === "string" ? payload.session.name.trim() : "";
      if (!response.ok || payload?.error || !username) {
        return null;
      }

      return {
        username,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
