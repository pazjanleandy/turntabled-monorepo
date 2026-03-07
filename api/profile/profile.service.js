import { NotFoundError, ValidationError } from "../_lib/errors.js";

function assertOptionalString(value, fieldName, { maxLength = 5000 } = {}) {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new ValidationError(`Field '${fieldName}' must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`Field '${fieldName}' must be at most ${maxLength} characters.`);
  }
  return trimmed;
}

function assertOptionalAvatarUrl(value) {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new ValidationError("Field 'avatarUrl' must be a string URL.");
  }

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new ValidationError("Field 'avatarUrl' must use http or https.");
    }
    return trimmed;
  } catch {
    throw new ValidationError("Field 'avatarUrl' must be a valid URL.");
  }
}

function assertUuidLike(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`Field '${fieldName}' is required and must be a UUID.`);
  }

  const normalized = value.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(normalized)) {
    throw new ValidationError(`Field '${fieldName}' must be a valid UUID.`);
  }
  return normalized;
}

function parseFavoriteBacklogIds(value) {
  if (!Array.isArray(value)) {
    throw new ValidationError("Field 'favoriteBacklogIds' must be an array of UUIDs.");
  }

  const deduped = [];
  const seen = new Set();
  for (const raw of value) {
    const id = assertUuidLike(raw, "favoriteBacklogIds[]");
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
  }
  return deduped;
}

function assertSearchQuery(value) {
  if (typeof value !== "string") {
    throw new ValidationError("Query param 'q' must be a string.");
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError("Query param 'q' cannot be empty.");
  }
  if (normalized.length > 64) {
    throw new ValidationError("Query param 'q' must be at most 64 characters.");
  }
  return normalized;
}

function normalizeUsername(username) {
  if (typeof username !== "string") return "";
  return username.trim().replace(/^@/, "");
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

function resolvePublicAvatarUrl(userAvatarUrl, profileAvatarPath, supabaseUrl) {
  const fromProfilePath = buildAvatarUrl(profileAvatarPath, supabaseUrl);
  if (fromProfilePath) return fromProfilePath;

  if (typeof userAvatarUrl === "string" && userAvatarUrl.trim()) {
    return userAvatarUrl.trim();
  }

  return null;
}

function mapFavorite(row) {
  return {
    backlogId: row.id,
    albumId: row.album_id,
    rating: row.rating ?? null,
    status: row.status ?? null,
    isFavorite: Boolean(row.is_favorite),
    addedAt: row.added_at ?? null,
    updatedAt: row.updated_at ?? null,
    album: {
      id: row?.album?.id ?? row.album_id,
      title: row?.album?.title ?? row.album_title_raw ?? null,
      artistName: row?.album?.artist?.name ?? row.artist_name_raw ?? null,
      coverArtUrl: row?.album?.cover_art_url ?? null,
      releaseId: row?.album?.mbid ?? null,
    },
  };
}

function mapReview(row) {
  return {
    backlogId: row.id,
    albumId: row.album_id,
    rating: row.rating ?? null,
    reviewText: row.review_text ?? null,
    reviewedAt: row.reviewed_at ?? null,
    addedAt: row.added_at ?? null,
    updatedAt: row.updated_at ?? null,
    album: {
      id: row?.album?.id ?? row.album_id,
      title: row?.album?.title ?? row.album_title_raw ?? null,
      artistName: row?.album?.artist?.name ?? row.artist_name_raw ?? null,
      coverArtUrl: row?.album?.cover_art_url ?? null,
      releaseId: row?.album?.mbid ?? null,
    },
  };
}

function mapCompleted(row) {
  return {
    backlogId: row.id,
    albumId: row.album_id,
    status: row.status ?? null,
    rating: row.rating ?? null,
    isFavorite: Boolean(row.is_favorite),
    reviewText: row.review_text ?? null,
    reviewedAt: row.reviewed_at ?? null,
    addedAt: row.added_at ?? null,
    updatedAt: row.updated_at ?? null,
    album: {
      id: row?.album?.id ?? row.album_id,
      title: row?.album?.title ?? row.album_title_raw ?? null,
      artistName: row?.album?.artist?.name ?? row.artist_name_raw ?? null,
      coverArtUrl: row?.album?.cover_art_url ?? null,
      releaseId: row?.album?.mbid ?? null,
    },
  };
}

const PUBLIC_BACKLOG_STATUSES = new Set(["backloggd", "pending", "listening", "unfinished"]);

function toTimestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildListeningStats(rows = []) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const previousYear = currentYear - 1;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  let totalLogs = 0;
  let logsLast30Days = 0;
  let totalRating = 0;
  let ratedCount = 0;
  let thisYearCount = 0;
  let lastYearCount = 0;
  let backlogCount = 0;
  const ratingFrequency = new Map();

  for (const row of rows) {
    totalLogs += 1;
    const addedTime = toTimestamp(row?.added_at ?? row?.updated_at ?? "");
    if (addedTime > 0) {
      if (addedTime >= thirtyDaysAgo) logsLast30Days += 1;
      const year = new Date(addedTime).getUTCFullYear();
      if (year === currentYear) thisYearCount += 1;
      if (year === previousYear) lastYearCount += 1;
    }

    const rating = Number(row?.rating);
    if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
      ratedCount += 1;
      totalRating += rating;
      const key = rating.toFixed(1);
      ratingFrequency.set(key, (ratingFrequency.get(key) ?? 0) + 1);
    }

    const normalizedStatus = String(row?.status ?? "").trim().toLowerCase();
    if (PUBLIC_BACKLOG_STATUSES.has(normalizedStatus)) {
      backlogCount += 1;
    }
  }

  let mostCommonRating = null;
  let mostCommonCount = 0;
  for (const [ratingValue, count] of ratingFrequency.entries()) {
    const currentBest = mostCommonRating == null ? -Infinity : Number(mostCommonRating);
    const candidate = Number(ratingValue);
    if (count > mostCommonCount || (count === mostCommonCount && candidate > currentBest)) {
      mostCommonCount = count;
      mostCommonRating = ratingValue;
    }
  }

  return {
    totalLogs,
    logsLast30Days,
    avgRating: ratedCount > 0 ? Number((totalRating / ratedCount).toFixed(1)) : 0,
    mostCommonRating,
    thisYearCount,
    lastYearCount,
    backlogCount,
    ratedCount,
  };
}

function mapProfile(user, favorites, reviews) {
  return {
    user: {
      id: user.id,
      username: user.username ?? null,
      email: user.email ?? null,
      fullName: user.full_name ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatar_url ?? null,
      lastfmUsername: user.lastfm_username ?? null,
      lastfmConnectedAt: user.lastfm_connected_at ?? null,
    },
    favorites: favorites.map((item) => mapFavorite(item)),
    reviews: reviews.map((item) => mapReview(item)),
  };
}

function mapPublicProfile(user, profileMedia, favorites, completed, reviews, stats, supabaseUrl) {
  return {
    user: {
      id: user.id,
      username: user.username ?? null,
      bio: user.bio ?? null,
      lastfmUsername: user.lastfm_username ?? null,
      avatarUrl: resolvePublicAvatarUrl(user.avatar_url, profileMedia?.avatar_path, supabaseUrl),
      coverUrl: profileMedia?.cover_url ?? null,
    },
    favorites: favorites.map((item) => mapFavorite(item)),
    completed: completed.map((item) => mapCompleted(item)),
    reviews: reviews.map((item) => mapReview(item)),
    stats,
  };
}

export class ProfileService {
  constructor({ profileRepository, supabaseUrl = "" }) {
    this.profileRepository = profileRepository;
    this.supabaseUrl = supabaseUrl;
  }

  async getProfileForUser(userId) {
    const user = await this.profileRepository.findUserById(userId);
    if (!user) {
      throw new ValidationError("Profile not found.");
    }

    const [favorites, reviews] = await Promise.all([
      this.profileRepository.listFavoritesByUser(userId),
      this.profileRepository.listReviewsByUser(userId),
    ]);
    return mapProfile(user, favorites, reviews);
  }

  async getPublicProfileForTarget(authenticatedUserId, target) {
    const rawTargetUserId = typeof target?.userId === "string" ? target.userId.trim() : "";
    const rawTargetUsername = normalizeUsername(target?.username);

    if (!rawTargetUserId && !rawTargetUsername) {
      throw new ValidationError("Provide one target identifier: userId or username.");
    }
    const normalizedTargetUserId = rawTargetUserId
      ? assertUuidLike(rawTargetUserId, "userId")
      : "";

    let user = null;
    if (normalizedTargetUserId) {
      user = await this.profileRepository.findPublicUserById(normalizedTargetUserId);
    } else {
      user = await this.profileRepository.findPublicUserByUsername(rawTargetUsername);
    }

    if (!user?.id) {
      throw new NotFoundError("User profile not found.");
    }

    if (user.id === authenticatedUserId) {
      throw new ValidationError("Use /api/profile to fetch the authenticated user's profile.");
    }

    const [profileMedia, favorites, completed, reviews, statRows] = await Promise.all([
      this.profileRepository.findProfileMediaByUserId(user.id),
      this.profileRepository.listFavoritesByUser(user.id),
      this.profileRepository.listCompletedByUser(user.id),
      this.profileRepository.listReviewsByUser(user.id),
      this.profileRepository.listBacklogRowsForStats(user.id),
    ]);

    const stats = buildListeningStats(statRows);
    return mapPublicProfile(
      user,
      profileMedia,
      favorites,
      completed,
      reviews,
      stats,
      this.supabaseUrl
    );
  }

  async searchPublicUsersByUsername(authenticatedUserId, query, { limit = 20 } = {}) {
    const normalizedQuery = assertSearchQuery(query);
    const normalizedLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

    const rows = await this.profileRepository.searchUsersByUsername(normalizedQuery, {
      excludeUserId: authenticatedUserId,
      limit: normalizedLimit,
    });
    const profileMediaRows = await this.profileRepository.listProfileMediaByUserIds(
      rows.map((row) => row.id).filter(Boolean)
    );
    const mediaByUserId = new Map(profileMediaRows.map((row) => [row.id, row]));

    return {
      query: normalizedQuery,
      results: rows.map((row) => ({
        id: row.id,
        username: row.username ?? null,
        avatarUrl: resolvePublicAvatarUrl(
          row.avatar_url,
          mediaByUserId.get(row.id)?.avatar_path ?? null,
          this.supabaseUrl
        ),
      })),
    };
  }

  async updateProfileForUser(userId, input) {
    const patch = {};
    let touched = false;

    if (Object.prototype.hasOwnProperty.call(input ?? {}, "fullName")) {
      patch.full_name = assertOptionalString(input.fullName, "fullName", { maxLength: 120 });
      touched = true;
    }
    if (Object.prototype.hasOwnProperty.call(input ?? {}, "bio")) {
      patch.bio = assertOptionalString(input.bio, "bio", { maxLength: 500 });
      touched = true;
    }
    if (Object.prototype.hasOwnProperty.call(input ?? {}, "avatarUrl")) {
      patch.avatar_url = assertOptionalAvatarUrl(input.avatarUrl);
      touched = true;
    }

    if (!touched) {
      throw new ValidationError("Provide at least one editable field: fullName, bio, avatarUrl.");
    }

    const updated = await this.profileRepository.updateUserById(userId, patch);
    if (!updated?.id) {
      throw new ValidationError("Profile not found.");
    }

    return this.getProfileForUser(userId);
  }

  async setFavoriteForBacklogItem(userId, backlogId, input) {
    if (typeof input?.isFavorite !== "boolean") {
      throw new ValidationError("Field 'isFavorite' must be a boolean.");
    }

    const normalizedBacklogId = assertUuidLike(backlogId, "backlogId");
    const updated = await this.profileRepository.updateFavoriteByBacklogId(
      userId,
      normalizedBacklogId,
      input.isFavorite
    );

    if (!updated?.id) {
      throw new ValidationError("Backlog item not found for this user.");
    }

    return this.getProfileForUser(userId);
  }

  async replaceFavoritesForUser(userId, input) {
    const favoriteBacklogIds = parseFavoriteBacklogIds(input?.favoriteBacklogIds);
    const ownedIds = await this.profileRepository.listOwnedBacklogIds(userId, favoriteBacklogIds);

    if (ownedIds.length !== favoriteBacklogIds.length) {
      throw new ValidationError("Some favoriteBacklogIds do not belong to the authenticated user.");
    }

    await this.profileRepository.clearFavoritesForUser(userId);
    await this.profileRepository.setFavoritesForUser(userId, favoriteBacklogIds);
    return this.getProfileForUser(userId);
  }
}
