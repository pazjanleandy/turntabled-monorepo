import { createClient } from "@supabase/supabase-js";
import { getMissingPasswordRequirements } from "../../shared/password-policy.js";
import { getRequestId, sendJson } from "../_lib/http.js";
import { getAuthEnv } from "../_lib/config/env.js";

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." }, requestId);
    return;
  }

  const { email, password, username, emailRedirectTo } = req.body ?? {};
  const missingRequirements = getMissingPasswordRequirements(password);

  if (missingRequirements.length > 0) {
    sendJson(
      res,
      400,
      {
        error: "Password does not meet the required security rules.",
        missingRequirements: missingRequirements.map(({ key, label }) => ({ key, label })),
      },
      requestId,
    );
    return;
  }

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedUsername = typeof username === "string" ? username.trim() : "";
  if (!normalizedEmail || !normalizedUsername) {
    sendJson(res, 400, { error: "Email and username are required." }, requestId);
    return;
  }

  const env = getAuthEnv();
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { username: normalizedUsername },
      ...(typeof emailRedirectTo === "string" && emailRedirectTo.trim()
        ? { emailRedirectTo: emailRedirectTo.trim() }
        : {}),
    },
  });

  if (error) {
    sendJson(res, 400, { error: error.message }, requestId);
    return;
  }

  sendJson(res, 200, { data }, requestId);
}