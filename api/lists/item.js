import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId, resolveOptionalUserId } from "./auth.js";
import { buildListsContainer } from "./container.js";

function parseBody(req) {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body;
  }

  if (typeof body === "string" && body.trim()) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function parseListId(req, payload = {}) {
  const queryId = req.query?.id;
  if (typeof queryId === "string" && queryId.trim()) {
    return queryId.trim();
  }
  if (Array.isArray(queryId) && typeof queryId[0] === "string" && queryId[0].trim()) {
    return queryId[0].trim();
  }

  const bodyId = payload?.listId;
  if (typeof bodyId === "string" && bodyId.trim()) {
    return bodyId.trim();
  }

  throw new ValidationError("Missing list id.");
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, listsService } = buildListsContainer();
    const payload = parseBody(req);
    const listId = parseListId(req, payload);

    if (req.method === "GET") {
      const viewerUserId = await resolveOptionalUserId(req, supabase);
      const item = await listsService.getPublishedById(listId, viewerUserId);
      sendJson(res, 200, { item }, requestId);
      return;
    }

    if (req.method === "POST") {
      const userId = await resolveAuthenticatedUserId(req, supabase);
      const action =
        typeof payload?.action === "string" ? payload.action.trim().toLowerCase() : "";

      const hasFavoriteIntent =
        action === "favorite" ||
        (!action && Object.prototype.hasOwnProperty.call(payload, "favorited"));
      if (hasFavoriteIntent) {
        const favoritePayload = await listsService.setFavoriteStateForUser(userId, listId, payload);
        sendJson(res, 200, favoritePayload, requestId);
        return;
      }

      const hasCommentIntent =
        action === "comment" ||
        (!action && Object.prototype.hasOwnProperty.call(payload, "comment"));
      if (hasCommentIntent) {
        const commentPayload = await listsService.addCommentForUser(userId, listId, payload);
        sendJson(res, 201, commentPayload, requestId);
        return;
      }

      throw new ValidationError("Field 'action' must be either 'favorite' or 'comment'.");
    }

    if (req.method === "PATCH") {
      const userId = await resolveAuthenticatedUserId(req, supabase);
      const item = await listsService.updateListForUser(userId, listId, payload);
      sendJson(res, 200, { item }, requestId);
      return;
    }

    if (req.method === "DELETE") {
      const userId = await resolveAuthenticatedUserId(req, supabase);
      const result = await listsService.deleteListForUser(userId, listId);
      sendJson(res, 200, result, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("List item endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
