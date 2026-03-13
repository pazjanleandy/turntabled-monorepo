import { InfrastructureError } from "../_lib/errors.js";

function handleDbError(error, context) {
  if (!error) return;
  throw new InfrastructureError(`Database error while ${context}.`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

function dedupeStringIds(values = []) {
  const ids = Array.isArray(values) ? values : [];
  const seen = new Set();
  const output = [];

  for (const value of ids) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

export class NotificationsRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  buildNotificationSelect() {
    return "id,user_id,actor_id,type,entity_type,entity_id,comment_id,is_read,actor_username,actor_avatar_url,entity_title,metadata,created_at,updated_at,actor:actor_id(id,username,avatar_url)";
  }

  async listByUser(userId, limit = 40) {
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 40;

    const { data, error } = await this.supabase
      .from("notifications")
      .select(this.buildNotificationSelect())
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    handleDbError(error, "listing notifications");
    return data ?? [];
  }

  async countUnreadByUser(userId) {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    handleDbError(error, "counting unread notifications");
    return Number.isFinite(Number(count)) ? Number(count) : 0;
  }

  async findByIdForUser(userId, notificationId) {
    const { data, error } = await this.supabase
      .from("notifications")
      .select(this.buildNotificationSelect())
      .eq("user_id", userId)
      .eq("id", notificationId)
      .maybeSingle();

    handleDbError(error, "fetching notification by id");
    return data ?? null;
  }

  async markReadByIdForUser(userId, notificationId) {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", notificationId)
      .select(this.buildNotificationSelect())
      .maybeSingle();

    handleDbError(error, "marking notification as read");
    return data ?? null;
  }

  async markAllReadForUser(userId) {
    const { data, error } = await this.supabase
      .from("notifications")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("id");

    handleDbError(error, "marking all notifications as read");
    return data ?? [];
  }

  async listProfileMediaByUserIds(userIds) {
    const normalizedIds = dedupeStringIds(userIds);
    if (normalizedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id,avatar_path")
      .in("id", normalizedIds);

    handleDbError(error, "fetching actor profile media by user ids");
    return data ?? [];
  }
}
