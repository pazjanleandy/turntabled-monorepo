import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "./auth.js";
import { buildProfileContainer } from "./container.js";

function parseQuery(req) {
  const raw = req.query?.q;
  if (typeof raw !== "string") {
    throw new ValidationError("Missing query param 'q'.");
  }
  return raw;
}

function parseLimit(req) {
  const raw = req.query?.limit;
  if (raw == null || raw === "") return 20;
  const value = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new ValidationError("Query param 'limit' must be an integer between 1 and 50.");
  }
  return value;
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const { supabase, profileService } = buildProfileContainer();
    const userId = await resolveAuthenticatedUserId(req, supabase);
    const q = parseQuery(req);
    const limit = parseLimit(req);

    const payload = await profileService.searchPublicUsersByUsername(userId, q, { limit });
    sendJson(res, 200, payload, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Profile search endpoint failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}
