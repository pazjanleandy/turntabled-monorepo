import { toErrorResponse } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildBacklogContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, reviewInteractionsService } = buildBacklogContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);

    if (req.method === "POST") {
      const payload = await reviewInteractionsService.addCommentToReview(userId, req.body ?? {});
      sendJson(res, 201, payload, requestId);
      return;
    }

    if (req.method === "PATCH") {
      const payload = await reviewInteractionsService.updateCommentForReview(userId, req.body ?? {});
      sendJson(res, 200, payload, requestId);
      return;
    }

    if (req.method === "DELETE") {
      const rawCommentId = req.query?.id ?? req.body?.commentId;
      const payload = await reviewInteractionsService.removeCommentFromReview(userId, {
        commentId: rawCommentId,
      });
      sendJson(res, 200, payload, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Review comments endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
