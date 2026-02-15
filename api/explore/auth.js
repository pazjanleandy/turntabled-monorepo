import { UnauthorizedError } from "../_lib/errors.js";

async function findUserIdByIdentity(supabase, identity) {
  if (!identity) return null;

  const normalized = identity.trim().toLowerCase();
  if (!normalized) return null;

  const tableCandidates = ["user", "users"];
  for (const tableName of tableCandidates) {
    const { data, error } = await supabase
      .from(tableName)
      .select("id")
      .or(`username.eq.${normalized},email.eq.${normalized}`)
      .maybeSingle();

    if (!error && data?.id) {
      return data.id;
    }
  }

  return null;
}

export async function resolveOptionalUserId(req, supabase) {
  const explicitUserId = req.headers["x-user-id"] ?? req.query?.userId;
  if (typeof explicitUserId === "string" && explicitUserId.trim()) {
    return explicitUserId.trim();
  }

  const usernameHeader = req.headers["x-username"] ?? req.query?.username;
  const emailHeader = req.headers["x-email"] ?? req.query?.email;
  const userIdFromIdentity = await findUserIdByIdentity(
    supabase,
    typeof usernameHeader === "string" ? usernameHeader : emailHeader
  );
  if (userIdFromIdentity) {
    return userIdFromIdentity;
  }

  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) {
    throw new UnauthorizedError("Invalid authentication token.");
  }

  return data.user.id;
}

export async function resolveUserId(req, supabase) {
  const userId = await resolveOptionalUserId(req, supabase);
  if (!userId) {
    throw new UnauthorizedError(
      "Missing user identity. Provide Bearer token, x-user-id, x-username, or x-email."
    );
  }
  return userId;
}
