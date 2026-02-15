import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, parsePagination, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveOptionalUserId } from "./auth.js";
import { buildExploreContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  try {
    const { supabase, exploreService } = buildExploreContainer();
    const userId = await resolveOptionalUserId(req, supabase);
    const { page, limit } = parsePagination(req.query);
    const data = await exploreService.getExplorePage(userId, page, limit);

    sendJson(res, 200, data, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Explore endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error instanceof ValidationError ? "VALIDATION_ERROR" : "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
