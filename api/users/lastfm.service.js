const CACHE_TTL_MS = 60 * 1000;
const recentTracksCache = new Map();

function parseUnixTimestampToIso(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const unixSeconds = Number.parseInt(value, 10);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function buildCacheKey(username) {
  return `lastfm_recent_${username}`;
}

function getCachedRecentTracks(cacheKey) {
  const cached = recentTracksCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    recentTracksCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function setCachedRecentTracks(cacheKey, data) {
  recentTracksCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function pickCoverArt(images) {
  if (!Array.isArray(images)) return null;

  const orderedSizes = ["mega", "extralarge", "large", "medium", "small"];
  for (const size of orderedSizes) {
    const match = images.find((item) => item?.size === size && typeof item?.["#text"] === "string");
    if (match?.["#text"]?.trim()) {
      return match["#text"].trim();
    }
  }

  const fallback = images.find((item) => typeof item?.["#text"] === "string" && item["#text"].trim());
  return fallback?.["#text"]?.trim() ?? null;
}

function normalizeRecentTrack(track) {
  return {
    source: "lastfm",
    track: track?.name ?? null,
    artist: track?.artist?.["#text"] ?? null,
    album: track?.album?.["#text"] ?? null,
    played_at: parseUnixTimestampToIso(track?.date?.uts),
    logged_at: null,
    cover_art: pickCoverArt(track?.image),
  };
}

export class LastFmService {
  constructor({ apiKey, fetchImpl = fetch }) {
    this.apiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    this.fetchImpl = fetchImpl;
  }

  async fetchRecentTracks(username, { limit = 10 } = {}) {
    if (!this.apiKey) return null;
    if (typeof username !== "string" || !username.trim()) return null;

    const normalizedUsername = username.trim();
    const cacheKey = buildCacheKey(normalizedUsername);
    const cached = getCachedRecentTracks(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      method: "user.getrecenttracks",
      user: normalizedUsername,
      api_key: this.apiKey,
      format: "json",
      limit: String(limit),
    });

    try {
      const response = await this.fetchImpl(`https://ws.audioscrobbler.com/2.0/?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.error) {
        return null;
      }

      const rawTracks = payload?.recenttracks?.track;
      const tracks = Array.isArray(rawTracks)
        ? rawTracks
        : rawTracks && typeof rawTracks === "object"
          ? [rawTracks]
          : [];

      const normalized = tracks
        .map((item) => normalizeRecentTrack(item))
        .filter((item) => item.track || item.album || item.artist);
      setCachedRecentTracks(cacheKey, normalized);
      return normalized;
    } catch {
      return null;
    }
  }
}
