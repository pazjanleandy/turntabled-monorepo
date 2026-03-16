import { supabase } from "../supabase.js";

const SESSION_CACHE_TTL_MS = 15 * 1000;
let cachedAuth = {
  token: "",
  expiresAt: 0,
};

function shouldUseCachedToken() {
  return Boolean(cachedAuth.token) && cachedAuth.expiresAt > Date.now();
}

export async function buildApiAuthHeaders({ forceRefresh = false } = {}) {
  if (!forceRefresh && shouldUseCachedToken()) {
    return {
      Authorization: `Bearer ${cachedAuth.token}`,
    };
  }

  const headers = {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const sessionExpiresAt = Number(data?.session?.expires_at ?? 0) * 1000;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    const safeExpiryMs = Number.isFinite(sessionExpiresAt) && sessionExpiresAt > Date.now()
      ? Math.max(0, sessionExpiresAt - Date.now() - 5_000)
      : SESSION_CACHE_TTL_MS;
    cachedAuth = {
      token,
      expiresAt: Date.now() + Math.min(SESSION_CACHE_TTL_MS, safeExpiryMs || SESSION_CACHE_TTL_MS),
    };
  } else {
    cachedAuth = { token: "", expiresAt: 0 };
  }

  return headers;
}
