import { toErrorResponse, ValidationError } from "../_lib/errors.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { logError } from "../_lib/logger.js";
import { resolveAuthenticatedUserId } from "../profile/auth.js";
import { getProfileEnv } from "../_lib/config/env.js";
import { getSupabaseAdminClient } from "../_lib/supabase-admin.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed." }, requestId);
      return;
    }

    const env = getProfileEnv();
    const supabase = getSupabaseAdminClient(env);
    const userId = await resolveAuthenticatedUserId(req, supabase);

    if (req.body?.confirmation !== "Confirm") {
      throw new ValidationError("Type Confirm exactly to delete your account.");
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(error.message);
    }

    const { error: profileDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    if (profileDeleteError) {
      throw new Error(profileDeleteError.message);
    }

    sendJson(res, 200, { ok: true }, requestId);
  } catch (error) {
    const mapped = toErrorResponse(error, requestId);
    logError("Account deletion failed.", {
      requestId,
      error: error?.message,
      stack: error?.stack,
      code: error?.code ?? "UNHANDLED",
    });
    sendJson(res, mapped.statusCode, mapped.payload, requestId);
  }
}