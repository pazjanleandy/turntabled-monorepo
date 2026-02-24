import { UnauthorizedError, ValidationError } from "../_lib/errors.js";

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
  const allowed = ["completed", "listening", "unfinished", "pending", "favorite"];
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationError("Field 'status' must be one of: completed, listening, unfinished, pending, favorite.");
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

function mapItem(row) {
  return {
    id: row.id,
    albumId: row.album_id,
    artistNameRaw: row.artist_name_raw,
    albumTitleRaw: row.album_title_raw,
    status: row.status ?? "pending",
    rating: row.rating,
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

  async addForUser(userId, input) {
    const albumId = assertUuidLike(input?.albumId, "albumId");
    const artistNameRaw = assertString(input?.artistNameRaw, "artistNameRaw");
    const albumTitleRaw = assertString(input?.albumTitleRaw, "albumTitleRaw");
    const status = assertStatus(input?.status ?? "pending");
    const rating = assertRating(input?.rating, "rating");
    const addedAt = parseListenedOnDate(input?.listenedOn);

    const duplicate = await this.backlogRepository.findDuplicateByUser(userId, albumId);
    if (duplicate?.id) {
      throw new ValidationError("This album is already in your backlog.");
    }

    const created = await this.backlogRepository.create({
      userId,
      albumId,
      artistNameRaw,
      albumTitleRaw,
      status,
      rating,
      addedAt,
      source: "explore",
    });
    return mapItem(created);
  }

  async updateRatingForUser(userId, backlogId, input) {
    const rating = assertRating(input?.rating, "rating");
    const current = await this.backlogRepository.findById(backlogId);
    if (!current) {
      throw new ValidationError("Backlog item not found.");
    }
    if (current.user_id !== userId) {
      throw new UnauthorizedError("You cannot modify another user's backlog item.");
    }

    const updated = await this.backlogRepository.updateRating(backlogId, rating);
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
