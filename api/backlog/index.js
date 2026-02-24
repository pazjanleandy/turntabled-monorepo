import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, parsePagination, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildBacklogContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, backlogService } = buildBacklogContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);

    if (req.method === "GET") {
      const { page, limit } = parsePagination(req.query);
      const payload = await backlogService.listForUser(userId, page, limit);
      sendJson(res, 200, payload, requestId);
      return;
    }

    if (req.method === "POST") {
      const created = await backlogService.addForUser(userId, req.body ?? {});
      sendJson(res, 201, { item: created }, requestId);
      return;
    }

    if (req.method === "DELETE") {
      const backlogId = req.query?.id;
      if (typeof backlogId !== "string" || !backlogId.trim()) {
        throw new ValidationError("Missing backlog id in query param 'id'.");
      }
      await backlogService.removeForUser(userId, backlogId.trim());
      sendJson(res, 200, { ok: true }, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Backlog endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
