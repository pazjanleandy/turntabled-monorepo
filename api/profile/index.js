import { toErrorResponse } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildProfileContainer } from "./container.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    const { supabase, profileService } = buildProfileContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);

    if (req.method === "GET") {
      const payload = await profileService.getProfileForUser(userId);
      sendJson(res, 200, payload, requestId);
      return;
    }

    if (req.method === "PATCH") {
      const payload = await profileService.updateProfileForUser(userId, req.body ?? {});
      sendJson(res, 200, payload, requestId);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Profile endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
