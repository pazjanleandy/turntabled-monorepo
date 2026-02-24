import { UnauthorizedError } from "../_lib/errors.js";

export async function resolveAuthenticatedUserId(req, supabase) {
  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing Bearer token.");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new UnauthorizedError("Missing Bearer token.");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new UnauthorizedError("Invalid authentication token.");
  }

  return data.user.id;
}
