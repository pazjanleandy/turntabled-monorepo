import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { measureRequest } from "../_lib/perf.js";
import { setPrivateCacheHeaders } from "../_lib/cache-control.js";
import { getOrSetMemoryCache } from "../_lib/memory-cache.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildBacklogContainer } from "./container.js";

function parseActivityLimit(value) {
  if (value == null || value === "") return 5;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new ValidationError("Query param 'activityLimit' must be an integer between 1 and 20.");
  }
  return parsed;
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const { supabase, backlogService } = buildBacklogContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);
    const activityLimit = parseActivityLimit(req.query?.activityLimit);
    const cacheKey = `backlog:summary:v1:u:${userId}:a:${activityLimit}`;

    const payload = await getOrSetMemoryCache(
      cacheKey,
      15_000,
      () =>
        measureRequest(
          "backlog.summary",
          requestId,
          () => backlogService.listHomeSummaryForUser(userId, { activityLimit }),
          { warnMs: 500 }
        )
    );

    setPrivateCacheHeaders(res, {
      maxAgeSeconds: 20,
      staleWhileRevalidateSeconds: 40,
    });
    sendJson(res, 200, payload, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Backlog summary endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
