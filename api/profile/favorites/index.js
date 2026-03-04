import { toErrorResponse, ValidationError } from "../../_lib/errors.js";
import { getRequestId, sendJson } from "../../_lib/http.js";
import { logError } from "../../_lib/logger.js";
import { resolveAuthenticatedUserId } from "../auth.js";
import { buildProfileContainer } from "../container.js";

function parseBacklogIdFromQuery(req) {
  const raw = req.query?.id;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ValidationError("Missing backlog id in query param 'id'.");
  }
  return raw.trim();
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, profileService } = buildProfileContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);

    if (req.method === "PUT") {
      const payload = await profileService.replaceFavoritesForUser(userId, req.body ?? {});
      sendJson(res, 200, payload, requestId);
      return;
    }

    if (req.method === "PATCH") {
      const backlogId = parseBacklogIdFromQuery(req);
      const payload = await profileService.setFavoriteForBacklogItem(userId, backlogId, req.body ?? {});
      sendJson(res, 200, payload, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Profile favorites endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
