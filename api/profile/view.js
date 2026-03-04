import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildProfileContainer } from "./container.js";

function parseTarget(req) {
  const userId = typeof req.query?.userId === "string" ? req.query.userId.trim() : "";
  const username = typeof req.query?.username === "string" ? req.query.username.trim() : "";

  if (!userId && !username) {
    throw new ValidationError("Provide query param 'userId' or 'username'.");
  }
  if (userId && username) {
    throw new ValidationError("Provide only one query param: 'userId' or 'username'.");
  }

  return { userId, username };
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const { supabase, profileService } = buildProfileContainer();
    const authenticatedUserId = await resolveAuthenticatedUserId(req, supabase);
    const target = parseTarget(req);

    const payload = await profileService.getPublicProfileForTarget(authenticatedUserId, target);
    sendJson(res, 200, payload, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Profile view endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
