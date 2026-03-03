import { ValidationError } from "../_lib/errors.js";

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

function mapProfile(user, favorites) {
  return {
    user: {
      id: user.id,
      username: user.username ?? null,
      email: user.email ?? null,
      fullName: user.full_name ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatar_url ?? null,
    },
    favorites: favorites.map((item) => mapFavorite(item)),
  };
}

export class ProfileService {
  constructor({ profileRepository }) {
    this.profileRepository = profileRepository;
  }

  async getProfileForUser(userId) {
    const user = await this.profileRepository.findUserById(userId);
    if (!user) {
      throw new ValidationError("Profile not found.");
    }

    const favorites = await this.profileRepository.listFavoritesByUser(userId);
    return mapProfile(user, favorites);
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
