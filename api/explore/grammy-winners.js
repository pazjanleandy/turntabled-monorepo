import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
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
    const { exploreService } = buildExploreContainer();
    const data = await getOrSetMemoryCache("explore:grammy:winners-2026:v1", 6 * 60 * 60 * 1000, () =>
      measureRequest(
        "explore.grammy-winners",
        requestId,
        () => exploreService.getGrammyWinners2026(),
        { warnMs: 300 }
      )
    );
    setPublicCacheHeaders(res, {
      sMaxAgeSeconds: 900,
      staleWhileRevalidateSeconds: 86400,
      maxAgeSeconds: 60,
    });
    sendJson(res, 200, data, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Explore grammy winners endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error instanceof ValidationError ? "VALIDATION_ERROR" : "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
