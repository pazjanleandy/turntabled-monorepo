import { toErrorResponse } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildBacklogContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    if (req.method !== "PATCH") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const { supabase, reviewInteractionsService } = buildBacklogContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);
    const payload = await reviewInteractionsService.setLikeForReview(userId, req.body ?? {});
    sendJson(res, 200, payload, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Review likes endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
