import { UnauthorizedError } from "../_lib/errors.js";

function readBearerToken(req) {
  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") return "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

export async function resolveAuthenticatedUserId(req, supabase) {
  const token = readBearerToken(req);
  if (!token) {
    throw new UnauthorizedError("Missing Bearer token.");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new UnauthorizedError("Invalid authentication token.");
  }

  return data.user.id;
}

export async function resolveOptionalUserId(req, supabase) {
  const token = readBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new UnauthorizedError("Invalid authentication token.");
  }

  return data.user.id;
}
