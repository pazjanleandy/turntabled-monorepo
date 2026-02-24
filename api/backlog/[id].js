import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildBacklogContainer } from "./container.js";

function parseBacklogId(req) {
  const raw = req.query?.id;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError("Missing backlog id in path.");
  }
  return raw.trim();
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, backlogService } = buildBacklogContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);
    const backlogId = parseBacklogId(req);

    if (req.method === "PATCH") {
      const updated = await backlogService.updateRatingForUser(userId, backlogId, req.body ?? {});
      sendJson(res, 200, { item: updated }, requestId);
      return;
    }

    if (req.method === "DELETE") {
      await backlogService.removeForUser(userId, backlogId);
      sendJson(res, 200, { ok: true }, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Backlog item endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
