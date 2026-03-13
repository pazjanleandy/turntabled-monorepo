import { NotFoundError, ValidationError } from "../_lib/errors.js";

const MAX_LIMIT = 100;

function assertUuidLike(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`Field '${fieldName}' is required and must be a UUID.`);
  }

  const normalized = value.trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(normalized)) {
    throw new ValidationError(`Field '${fieldName}' must be a valid UUID.`);
  }
  return normalized;
}

function normalizeLimit(value) {
  if (value == null || value === "") return 40;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new ValidationError(`Field 'limit' must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  return parsed;
}

function buildAvatarUrl(avatarPath, supabaseUrl) {
  if (typeof avatarPath !== "string" || !avatarPath.trim()) return null;
  const normalized = avatarPath.trim();

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const base = typeof supabaseUrl === "string" ? supabaseUrl.replace(/\/+$/, "") : "";
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${normalized}`;
}

function resolvePublicAvatarUrl(
  actorAvatarUrl,
  actorProfileAvatarPath,
  fallbackActorAvatarUrl,
  supabaseUrl
) {
  const fromProfilePath = buildAvatarUrl(actorProfileAvatarPath, supabaseUrl);
  if (fromProfilePath) return fromProfilePath;

  if (typeof actorAvatarUrl === "string" && actorAvatarUrl.trim()) {
    return actorAvatarUrl.trim();
  }

  if (typeof fallbackActorAvatarUrl === "string" && fallbackActorAvatarUrl.trim()) {
    return fallbackActorAvatarUrl.trim();
  }

  return null;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function extractRelation(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value;
  return null;
}

function normalizeUsername(username, fallback = "unknown-user") {
  if (typeof username !== "string") return fallback;
  const trimmed = username.trim().replace(/^@/, "");
  return trimmed || fallback;
}

function getEntityTitle(row, metadata) {
  if (typeof row?.entity_title === "string" && row.entity_title.trim()) {
    return row.entity_title.trim();
  }

  if (typeof metadata?.albumTitle === "string" && metadata.albumTitle.trim()) {
    return metadata.albumTitle.trim();
  }

  if (typeof metadata?.listTitle === "string" && metadata.listTitle.trim()) {
    return metadata.listTitle.trim();
  }

  return null;
}

function buildActionText(type, entityTitle = null) {
  if (type === "review_liked") {
    return entityTitle ? `liked your review of ${entityTitle}` : "liked your review";
  }

  if (type === "review_commented") {
    return entityTitle
      ? `commented on your review of ${entityTitle}`
      : "commented on your review";
  }

  if (type === "list_liked") {
    return entityTitle ? `liked your list '${entityTitle}'` : "liked your list";
  }

  if (type === "list_commented") {
    return entityTitle
      ? `commented on your list '${entityTitle}'`
      : "commented on your list";
  }

  if (type === "user_followed") {
    return "followed you";
  }

  return "interacted with your activity";
}

function isUuidLike(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function buildDestination(type, row, metadata = {}, actorUsername = "", actorId = "") {
  if (type === "review_liked" || type === "review_commented") {
    const backlogId = isUuidLike(row?.entity_id)
      ? row.entity_id
      : isUuidLike(metadata?.backlogId)
        ? metadata.backlogId
        : "";

    const routeId = isUuidLike(metadata?.albumId)
      ? metadata.albumId
      : backlogId;

    if (!routeId) {
      return "/activity";
    }

    const params = new URLSearchParams();
    if (backlogId) {
      params.set("review", backlogId);
    }
    if (type === "review_commented" && isUuidLike(row?.comment_id)) {
      params.set("comment", row.comment_id);
    }

    const query = params.toString();
    const querySuffix = query ? `?${query}` : "";
    return `/album/${encodeURIComponent(routeId)}${querySuffix}#album-community-reviews`;
  }

  if (type === "list_liked" || type === "list_commented") {
    const listId = isUuidLike(row?.entity_id)
      ? row.entity_id
      : isUuidLike(metadata?.listId)
        ? metadata.listId
        : "";

    if (!listId) {
      return "/lists";
    }

    const params = new URLSearchParams();
    params.set("listId", listId);
    if (type === "list_commented") {
      params.set("focus", "comments");
    }

    return `/lists?${params.toString()}`;
  }

  if (type === "user_followed") {
    const normalizedUsername = normalizeUsername(actorUsername, "");
    const followerId = isUuidLike(actorId)
      ? actorId
      : isUuidLike(metadata?.followerId)
        ? metadata.followerId
        : "";

    if (normalizedUsername && normalizedUsername !== "deleted-user") {
      return `/friends/${encodeURIComponent(actorUsername)}`;
    }
    if (followerId) {
      return `/friends/${encodeURIComponent(followerId)}`;
    }
    return "/friends";
  }

  return "/activity";
}

function mapNotification(row, avatarPathByUserId = new Map(), supabaseUrl = "") {
  const actorRelation = extractRelation(row?.actor);
  const metadata = asObject(row?.metadata);
  const actorId = isUuidLike(row?.actor_id)
    ? row.actor_id.trim()
    : isUuidLike(actorRelation?.id)
      ? actorRelation.id.trim()
      : isUuidLike(metadata?.followerId)
        ? metadata.followerId.trim()
        : null;
  const actorUsername = normalizeUsername(
    actorRelation?.username ?? row?.actor_username,
    "deleted-user"
  );
  const actorProfileAvatarPath =
    actorId && avatarPathByUserId instanceof Map
      ? avatarPathByUserId.get(actorId) ?? null
      : null;
  const actorAvatarUrl = resolvePublicAvatarUrl(
    actorRelation?.avatar_url,
    actorProfileAvatarPath,
    row?.actor_avatar_url,
    supabaseUrl
  );

  const entityTitle = getEntityTitle(row, metadata);
  const actionText = buildActionText(row?.type, entityTitle);

  return {
    id: row?.id ?? null,
    userId: row?.user_id ?? null,
    actorId,
    type: row?.type ?? null,
    entityType: row?.entity_type ?? null,
    entityId: row?.entity_id ?? null,
    commentId: row?.comment_id ?? null,
    isRead: Boolean(row?.is_read),
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
    actor: {
      id: actorId,
      username: actorUsername,
      avatarUrl: actorAvatarUrl,
    },
    actionText,
    message: `${actorUsername} ${actionText}`,
    targetTitle: entityTitle,
    destination: buildDestination(row?.type, row, metadata, actorUsername, actorId),
    metadata,
  };
}

export class NotificationsService {
  constructor({ notificationsRepository, supabaseUrl = "" }) {
    this.notificationsRepository = notificationsRepository;
    this.supabaseUrl = supabaseUrl;
  }

  async listForUser(userId, input = {}) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const limit = normalizeLimit(input?.limit);

    const rows = await this.notificationsRepository.listByUser(normalizedUserId, limit);
    const actorIds = Array.from(
      new Set(
        rows
          .map((row) => {
            const actorValue = extractRelation(row?.actor);
            return row?.actor_id ?? actorValue?.id ?? null;
          })
          .filter((value) => typeof value === "string" && value.trim())
      )
    );
    const profileMediaRows = await this.notificationsRepository.listProfileMediaByUserIds(actorIds);
    const avatarPathByUserId = new Map(
      (profileMediaRows ?? []).map((row) => [String(row?.id ?? ""), row?.avatar_path ?? null])
    );

    return {
      limit,
      items: rows.map((row) => mapNotification(row, avatarPathByUserId, this.supabaseUrl)),
    };
  }

  async getUnreadCountForUser(userId) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const unreadCount = await this.notificationsRepository.countUnreadByUser(normalizedUserId);
    return { unreadCount };
  }

  async markAsReadForUser(userId, notificationId) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const normalizedNotificationId = assertUuidLike(notificationId, "notificationId");

    const existing = await this.notificationsRepository.findByIdForUser(
      normalizedUserId,
      normalizedNotificationId
    );
    if (!existing?.id) {
      throw new NotFoundError("Notification not found.");
    }

    const updated = await this.notificationsRepository.markReadByIdForUser(
      normalizedUserId,
      normalizedNotificationId
    );

    const targetRow = updated ?? existing;
    const actorRelation = extractRelation(targetRow?.actor);
    const actorIds = [targetRow?.actor_id, actorRelation?.id].filter(
      (value) => typeof value === "string" && value.trim()
    );
    const profileMediaRows = await this.notificationsRepository.listProfileMediaByUserIds(actorIds);
    const avatarPathByUserId = new Map(
      (profileMediaRows ?? []).map((row) => [String(row?.id ?? ""), row?.avatar_path ?? null])
    );

    const unreadCount = await this.notificationsRepository.countUnreadByUser(normalizedUserId);

    return {
      unreadCount,
      notification: mapNotification(targetRow, avatarPathByUserId, this.supabaseUrl),
    };
  }

  async markAllAsReadForUser(userId) {
    const normalizedUserId = assertUuidLike(userId, "userId");

    const updatedRows = await this.notificationsRepository.markAllReadForUser(normalizedUserId);
    const unreadCount = await this.notificationsRepository.countUnreadByUser(normalizedUserId);

    return {
      updatedCount: Array.isArray(updatedRows) ? updatedRows.length : 0,
      unreadCount,
    };
  }
}
