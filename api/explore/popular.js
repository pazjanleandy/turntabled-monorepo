import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, parsePagination, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { getOrSetMemoryCache } from "../_lib/memory-cache.js";
import { setPublicCacheHeaders } from "../_lib/cache-control.js";
import { measureRequest } from "../_lib/perf.js";
import { buildExploreContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  try {
    const { page, limit } = parsePagination(req.query);
    const { exploreService } = buildExploreContainer();
    const cacheKey = `explore:popular:v1:p${page}:l${limit}`;
    const data = await getOrSetMemoryCache(cacheKey, 60_000, () =>
      measureRequest(
        "explore.popular",
        requestId,
        () => exploreService.getPopularAlbums(page, limit),
        { warnMs: 350 }
      )
    );
    setPublicCacheHeaders(res, {
      sMaxAgeSeconds: 60,
      staleWhileRevalidateSeconds: 180,
      maxAgeSeconds: 0,
    });
    sendJson(res, 200, data, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Explore popular endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error instanceof ValidationError ? "VALIDATION_ERROR" : "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}

