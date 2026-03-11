import { toErrorResponse } from "../_lib/errors.js";
import { getRequestId, parsePagination, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId, resolveOptionalUserId } from "./auth.js";
import { buildListsContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, listsService } = buildListsContainer();

    if (req.method === "GET") {
      const viewerUserId = await resolveOptionalUserId(req, supabase);
      const { page, limit } = parsePagination(req.query);
      const payload = await listsService.listPublished({
        sort: req.query?.sort,
        tag: req.query?.tag,
        query: req.query?.q,
        page,
        limit,
        viewerUserId,
      });
      sendJson(res, 200, payload, requestId);
      return;
    }

    if (req.method === "POST") {
      const userId = await resolveAuthenticatedUserId(req, supabase);
      const created = await listsService.createListForUser(userId, req.body ?? {});
      sendJson(res, 201, { item: created }, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Lists endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
