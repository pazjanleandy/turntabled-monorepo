import { UnauthorizedError, ValidationError } from "../_lib/errors.js";

const ALLOWED_STATUSES = ["listened", "listening", "unfinished", "backloggd"];
const LEGACY_STATUS_MAP = {
  completed: "listened",
  pending: "backloggd",
  favorite: "listened",
};

function normalizeStatusForRead(value) {
  if (typeof value !== "string" || !value.trim()) return "backloggd";
  const normalized = value.trim().toLowerCase();
  if (ALLOWED_STATUSES.includes(normalized)) return normalized;
  if (Object.prototype.hasOwnProperty.call(LEGACY_STATUS_MAP, normalized)) {
    return LEGACY_STATUS_MAP[normalized];
  }
  return "backloggd";
}

function assertString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`Field '${fieldName}' is required and must be a non-empty string.`);
  }
  return value.trim();
}

function assertUuidLike(value, fieldName) {
  const normalized = assertString(value, fieldName);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(normalized)) {
    throw new ValidationError(`Field '${fieldName}' must be a valid UUID.`);
  }
  return normalized;
}

function assertRating(value, fieldName = "rating") {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new ValidationError(`Field '${fieldName}' must be an integer between 1 and 5.`);
  }
  return value;
}

function assertStatus(value) {
  if (typeof value !== "string" || !ALLOWED_STATUSES.includes(value)) {
    throw new ValidationError("Field 'status' must be one of: listened, listening, unfinished, backloggd.");
  }
  return value;
}

function parseListenedOnDate(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new ValidationError("Field 'listenedOn' must be in YYYY-MM-DD format.");
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new ValidationError("Field 'listenedOn' must be in YYYY-MM-DD format.");
  }
  const iso = `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Field 'listenedOn' must be a valid date.");
  }
  return iso;
}

function assertOptionalReviewText(value, fieldName = "reviewText") {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new ValidationError(`Field '${fieldName}' must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`Field '${fieldName}' cannot be empty or whitespace only.`);
  }

  return trimmed;
}

function assertOptionalBoolean(value, fieldName) {
  if (value == null) return null;
  if (typeof value !== "boolean") {
    throw new ValidationError(`Field '${fieldName}' must be a boolean.`);
  }
  return value;
}

function mapItem(row) {
  return {
    id: row.id,
    albumId: row.album_id,
    artistNameRaw: row.artist_name_raw,
    albumTitleRaw: row.album_title_raw,
    status: normalizeStatusForRead(row.status),
    rating: row.rating,
    isFavorite: Boolean(row.is_favorite),
    reviewText: row.review_text ?? null,
    reviewedAt: row.reviewed_at ?? null,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    coverArtUrl: row?.album?.cover_art_url ?? null,
  };
}

export class BacklogService {
  constructor({ backlogRepository }) {
    this.backlogRepository = backlogRepository;
  }

  async listForUser(userId, page, limit) {
    const { rows, total } = await this.backlogRepository.listByUser(userId, page, limit);
    return {
      page,
      limit,
      total,
      items: rows.map((row) => mapItem(row)),
    };
  }

  async findForUserByAlbumId(userId, albumId) {
    const normalizedAlbumId = assertUuidLike(albumId, "albumId");
    const item = await this.backlogRepository.findByUserAndAlbum(userId, normalizedAlbumId);
    return item ? mapItem(item) : null;
  }

  async addForUser(userId, input) {
    const albumId = assertUuidLike(input?.albumId, "albumId");
    const artistNameRaw = assertString(input?.artistNameRaw, "artistNameRaw");
    const albumTitleRaw = assertString(input?.albumTitleRaw, "albumTitleRaw");
    const status = assertStatus(input?.status ?? "backloggd");
    const rating = assertRating(input?.rating, "rating");
    const requestedIsFavorite = assertOptionalBoolean(input?.isFavorite, "isFavorite");
    const isFavorite = requestedIsFavorite === true;
    const normalizedStatus = status;
    const addedAt = parseListenedOnDate(input?.listenedOn);
    const reviewText = assertOptionalReviewText(input?.reviewText, "reviewText");

    const duplicate = await this.backlogRepository.findDuplicateByUser(userId, albumId);
    if (duplicate?.id) {
      if (!reviewText && !isFavorite) {
        throw new ValidationError("This album is already in your backlog.");
      }

      const patch = {};

      if (reviewText) {
        patch.review_text = reviewText;
        patch.reviewed_at = new Date().toISOString();
      }

      if (isFavorite) {
        patch.is_favorite = true;
        patch.status = "listened";
      }

      const updated = await this.backlogRepository.updateById(duplicate.id, patch);
      return mapItem(updated);
    }

    const created = await this.backlogRepository.create({
      userId,
      albumId,
      artistNameRaw,
      albumTitleRaw,
      status: normalizedStatus,
      rating,
      isFavorite,
      reviewText,
      reviewedAt: reviewText ? new Date().toISOString() : null,
      addedAt,
      source: "explore",
    });
    return mapItem(created);
  }

  async updateForUser(userId, backlogId, input) {
    const patch = {};
    const hasReviewText = Object.prototype.hasOwnProperty.call(input ?? {}, "reviewText");
    const hasClearReview = Object.prototype.hasOwnProperty.call(input ?? {}, "clearReview");

    if (Object.prototype.hasOwnProperty.call(input ?? {}, "rating")) {
      patch.rating = assertRating(input?.rating, "rating");
    }
    if (hasReviewText && hasClearReview) {
      throw new ValidationError("Provide only one of: reviewText, clearReview.");
    }
    if (hasReviewText) {
      const reviewText = assertOptionalReviewText(input?.reviewText, "reviewText");
      if (!reviewText) {
        throw new ValidationError("Field 'reviewText' cannot be null when provided.");
      }
      patch.review_text = reviewText;
      patch.reviewed_at = new Date().toISOString();
    }
    if (hasClearReview) {
      if (input?.clearReview !== true) {
        throw new ValidationError("Field 'clearReview' must be true when provided.");
      }
      patch.review_text = null;
      patch.reviewed_at = null;
    }

    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide at least one editable field: rating, reviewText, clearReview.");
    }

    const current = await this.backlogRepository.findById(backlogId);
    if (!current) {
      throw new ValidationError("Backlog item not found.");
    }
    if (current.user_id !== userId) {
      throw new UnauthorizedError("You cannot modify another user's backlog item.");
    }

    const updated = await this.backlogRepository.updateById(backlogId, patch);
    return mapItem(updated);
  }

  async removeForUser(userId, backlogId) {
    const current = await this.backlogRepository.findById(backlogId);
    if (!current) {
      throw new ValidationError("Backlog item not found.");
    }
    if (current.user_id !== userId) {
      throw new UnauthorizedError("You cannot delete another user's backlog item.");
    }
    await this.backlogRepository.remove(backlogId);
  }
}
