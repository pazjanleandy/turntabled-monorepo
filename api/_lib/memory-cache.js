const valueCache = new Map();
const inFlightCache = new Map();

function nowMs() {
  return Date.now();
}

function getFreshEntry(key) {
  const entry = valueCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    valueCache.delete(key);
    return null;
  }
  return entry.value;
}

export function clearMemoryCache() {
  valueCache.clear();
  inFlightCache.clear();
}

export async function getOrSetMemoryCache(key, ttlMs, loader) {
  if (typeof key !== "string" || !key.trim()) {
    return loader();
  }
  const normalizedKey = key.trim();
  const safeTtlMs = Number.isFinite(Number(ttlMs)) ? Math.max(0, Number(ttlMs)) : 0;

  const cachedValue = getFreshEntry(normalizedKey);
  if (cachedValue !== null && cachedValue !== undefined) {
    return cachedValue;
  }

  const existingPromise = inFlightCache.get(normalizedKey);
  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = (async () => {
    try {
      const value = await loader();
      if (safeTtlMs > 0) {
        valueCache.set(normalizedKey, {
          value,
          expiresAt: nowMs() + safeTtlMs,
        });
      }
      return value;
    } finally {
      inFlightCache.delete(normalizedKey);
    }
  })();

  inFlightCache.set(normalizedKey, nextPromise);
  return nextPromise;
}
