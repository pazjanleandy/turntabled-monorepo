function clampSeconds(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function setPublicCacheHeaders(
  res,
  { sMaxAgeSeconds = 60, staleWhileRevalidateSeconds = 120, maxAgeSeconds = 0 } = {}
) {
  const safeSMaxAge = clampSeconds(sMaxAgeSeconds, 60);
  const safeSWR = clampSeconds(staleWhileRevalidateSeconds, 120);
  const safeMaxAge = clampSeconds(maxAgeSeconds, 0);
  res.setHeader(
    "Cache-Control",
    `public, max-age=${safeMaxAge}, s-maxage=${safeSMaxAge}, stale-while-revalidate=${safeSWR}`
  );
}

export function setPrivateCacheHeaders(
  res,
  { maxAgeSeconds = 30, staleWhileRevalidateSeconds = 30 } = {}
) {
  const safeMaxAge = clampSeconds(maxAgeSeconds, 30);
  const safeSWR = clampSeconds(staleWhileRevalidateSeconds, 30);
  res.setHeader(
    "Cache-Control",
    `private, max-age=${safeMaxAge}, stale-while-revalidate=${safeSWR}`
  );
}
