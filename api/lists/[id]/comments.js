import { toErrorResponse, ValidationError } from "../../_lib/errors.js";
import { getRequestId, sendJson } from "../../_lib/http.js";
import { logError } from "../../_lib/logger.js";
import { resolveAuthenticatedUserId } from "../auth.js";
import { buildListsContainer } from "../container.js";

function parseListId(req) {
  const raw = req.query?.id;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError("Missing list id in path.");
  }
  return raw.trim();
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, listsService } = buildListsContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);
    const listId = parseListId(req);

    if (req.method === "POST") {
      const payload = await listsService.addCommentForUser(
        userId,
        listId,
        req.body ?? {}
      );
      sendJson(res, 201, payload, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("List comments endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
