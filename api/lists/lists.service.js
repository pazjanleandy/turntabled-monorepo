import { ForbiddenError, NotFoundError, ValidationError } from "../_lib/errors.js";

const LIST_SORT_KEYS = new Set([
  "trending",
  "recent",
  "most-favorited",
  "most-reviewed",
]);

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

function assertTitle(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Field 'title' is required.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 120) {
    throw new ValidationError("Field 'title' must be at most 120 characters.");
  }
  return trimmed;
}

function assertDescription(value) {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new ValidationError("Field 'description' must be a string.");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1600) {
    throw new ValidationError("Field 'description' must be at most 1600 characters.");
  }
  return trimmed;
}

function normalizeTags(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new ValidationError("Field 'tags' must be an array of strings.");
  }

  const seen = new Set();
  const tags = [];
  for (const rawTag of value) {
    if (typeof rawTag !== "string") continue;
    const trimmed = rawTag.trim();
    if (!trimmed) continue;
    if (trimmed.length > 32) {
      throw new ValidationError("Each tag must be at most 32 characters.");
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(trimmed);
    if (tags.length >= 8) break;
  }
  return tags;
}

function normalizeAlbumIds(value) {
  if (!Array.isArray(value)) {
    throw new ValidationError("Field 'albumIds' must be an array of album IDs.");
  }

  const seen = new Set();
  const ids = [];
  for (const rawId of value) {
    const id = assertUuidLike(rawId, "albumIds[]");
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  if (ids.length < 2) {
    throw new ValidationError("Add at least two albums to publish a list.");
  }
  if (ids.length > 60) {
    throw new ValidationError("A list can include at most 60 albums.");
  }

  return ids;
}

function normalizeSort(value) {
  if (typeof value !== "string" || !value.trim()) return "trending";
  const normalized = value.trim().toLowerCase();
  if (!LIST_SORT_KEYS.has(normalized)) return "trending";
  return normalized;
}

function normalizeTagFilter(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return "";
  return trimmed;
}

function normalizeSearchQuery(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 120);
}

function normalizeComment(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Field 'comment' is required.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 1200) {
    throw new ValidationError("Field 'comment' must be at most 1200 characters.");
  }
  return trimmed;
}

function toTimestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function computeTrendingScore(row, nowMs = Date.now()) {
  const favorites = Number(row?.favoriteCount ?? 0);
  const comments = Number(row?.commentCount ?? 0);
  const ageDays = Math.max(0, Math.floor((nowMs - toTimestamp(row?.publishedAt)) / 86400000));
  const freshnessBoost = Math.max(0, 14 - ageDays);
  return favorites * 1.6 + comments * 2.4 + freshnessBoost;
}

function sortLists(rows = [], mode = "trending") {
  const items = Array.isArray(rows) ? [...rows] : [];

  if (mode === "recent") {
    return items.sort((a, b) => toTimestamp(b?.publishedAt) - toTimestamp(a?.publishedAt));
  }
  if (mode === "most-favorited") {
    return items.sort(
      (a, b) => Number(b?.favoriteCount ?? 0) - Number(a?.favoriteCount ?? 0)
    );
  }
  if (mode === "most-reviewed") {
    return items.sort(
      (a, b) => Number(b?.commentCount ?? 0) - Number(a?.commentCount ?? 0)
    );
  }
  return items.sort((a, b) => computeTrendingScore(b) - computeTrendingScore(a));
}

function buildAvatarUrl(avatarPath, supabaseUrl) {
  if (typeof avatarPath !== "string" || !avatarPath.trim()) return null;
  const normalized = avatarPath.trim();
  const base = typeof supabaseUrl === "string" ? supabaseUrl.trim().replace(/\/+$/, "") : "";
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

function mapCreator(row, avatarPathByUserId = new Map(), supabaseUrl = "") {
  const creatorValue = row?.creator;
  const creator = Array.isArray(creatorValue) ? creatorValue[0] ?? {} : creatorValue ?? {};
  const creatorId = creator?.id ?? row?.user_id ?? null;
  const profileAvatarPath =
    creatorId && avatarPathByUserId instanceof Map
      ? avatarPathByUserId.get(String(creatorId)) ?? null
      : null;

  return {
    id: creatorId,
    username: creator?.username ?? "unknown",
    avatarUrl: resolvePublicAvatarUrl(creator?.avatar_url, profileAvatarPath, supabaseUrl),
  };
}

function mapAlbum(row) {
  const albumValue = row?.album;
  const album = Array.isArray(albumValue) ? albumValue[0] ?? {} : albumValue ?? {};
  const artistValue = album?.artist;
  const artist = Array.isArray(artistValue) ? artistValue[0] ?? {} : artistValue ?? {};
  return {
    id: album?.id ?? row?.album_id ?? null,
    title: album?.title ?? "Unknown Album",
    artist: artist?.name ?? "Unknown Artist",
    cover: album?.cover_art_url ?? null,
    releaseDate: album?.release_date ?? null,
  };
}

function mapComment(row, avatarPathByUserId = new Map(), supabaseUrl = "") {
  const authorValue = row?.author;
  const author = Array.isArray(authorValue) ? authorValue[0] ?? {} : authorValue ?? {};
  const authorId = author?.id ?? row?.user_id ?? null;
  const profileAvatarPath =
    authorId && avatarPathByUserId instanceof Map
      ? avatarPathByUserId.get(String(authorId)) ?? null
      : null;

  return {
    id: row?.id ?? null,
    comment: row?.comment_text ?? "",
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
    author: {
      id: authorId,
      username: author?.username ?? "unknown",
      avatarUrl: resolvePublicAvatarUrl(author?.avatar_url, profileAvatarPath, supabaseUrl),
    },
  };
}

function mapAlbumPickerRow(row) {
  const artistValue = row?.artist;
  const artist = Array.isArray(artistValue) ? artistValue[0] ?? {} : artistValue ?? {};
  return {
    id: row?.id ?? null,
    title: row?.title ?? "Unknown Album",
    artist: artist?.name ?? "Unknown Artist",
    cover: row?.cover_art_url ?? null,
    releaseDate: row?.release_date ?? null,
  };
}

function buildListMaps(
  listRows,
  itemRows,
  favoriteRows,
  commentRows,
  viewerUserId,
  avatarPathByUserId = new Map(),
  supabaseUrl = ""
) {
  const listIds = listRows.map((row) => row.id);
  const itemsByList = new Map(listIds.map((id) => [id, []]));
  const favoritesByList = new Map(listIds.map((id) => [id, []]));
  const commentsByList = new Map(listIds.map((id) => [id, []]));

  for (const row of itemRows) {
    const bucket = itemsByList.get(row?.list_id);
    if (!bucket) continue;
    bucket.push(row);
  }
  for (const row of favoriteRows) {
    const bucket = favoritesByList.get(row?.list_id);
    if (!bucket) continue;
    bucket.push(row);
  }
  for (const row of commentRows) {
    const bucket = commentsByList.get(row?.list_id);
    if (!bucket) continue;
    bucket.push(row);
  }

  return listRows.map((row) => {
    const listId = row.id;
    const favorites = favoritesByList.get(listId) ?? [];
    const comments = commentsByList.get(listId) ?? [];
    const albums = (itemsByList.get(listId) ?? []).map((item) => mapAlbum(item));
    const favoritedByViewer = Boolean(
      viewerUserId &&
        favorites.some((favorite) => String(favorite?.user_id) === String(viewerUserId))
    );
    const ownedByViewer = Boolean(
      viewerUserId && String(row?.user_id ?? "") === String(viewerUserId)
    );

    return {
      id: listId,
      title: row?.title ?? "",
      description: row?.description ?? "",
      tags: Array.isArray(row?.tags) ? row.tags.filter(Boolean) : [],
      publishedAt: row?.published_at ?? row?.created_at ?? null,
      createdAt: row?.created_at ?? null,
      creator: mapCreator(row, avatarPathByUserId, supabaseUrl),
      albums,
      albumCount: albums.length,
      favoriteCount: favorites.length,
      commentCount: comments.length,
      isFavoritedByViewer: favoritedByViewer,
      isOwnedByViewer: ownedByViewer,
    };
  });
}

export class ListsService {
  constructor({ listsRepository, supabaseUrl = "" }) {
    this.listsRepository = listsRepository;
    this.supabaseUrl = typeof supabaseUrl === "string" ? supabaseUrl : "";
  }

  async listPublished({ sort, tag, query, page, limit, viewerUserId }) {
    const normalizedSort = normalizeSort(sort);
    const normalizedTag = normalizeTagFilter(tag);
    const normalizedQuery = normalizeSearchQuery(query).toLowerCase();
    const safePage = Number.isInteger(page) ? Math.max(page, 1) : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 24;

    const baseRows = await this.listsRepository.listPublishedLists();
    const listIds = baseRows.map((row) => row.id);
    const creatorUserIds = baseRows.map((row) => row?.user_id).filter(Boolean);
    const [itemRows, favoriteRows, commentRows, profileMediaRows] = await Promise.all([
      this.listsRepository.listItemsByListIds(listIds),
      this.listsRepository.listFavoritesByListIds(listIds),
      this.listsRepository.listCommentSummariesByListIds(listIds),
      this.listsRepository.listProfileMediaByUserIds(creatorUserIds),
    ]);

    const avatarPathByUserId = new Map(
      (profileMediaRows ?? []).map((row) => [String(row?.id ?? ""), row?.avatar_path ?? null])
    );

    const hydrated = buildListMaps(
      baseRows,
      itemRows,
      favoriteRows,
      commentRows,
      viewerUserId,
      avatarPathByUserId,
      this.supabaseUrl
    );
    const availableTags = Array.from(
      new Set(
        hydrated.flatMap((row) =>
          Array.isArray(row?.tags) ? row.tags.map((tag) => String(tag).trim()) : []
        )
      )
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const filtered = hydrated.filter((row) => {
      if (
        normalizedTag &&
        !row.tags.some(
          (itemTag) => itemTag.toLowerCase() === normalizedTag.toLowerCase()
        )
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        row.title,
        row.description,
        row.creator?.username,
        ...row.tags,
        ...row.albums.map((album) => `${album.title} ${album.artist}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const sorted = sortLists(filtered, normalizedSort);
    const total = sorted.length;
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit;

    return {
      page: safePage,
      limit: safeLimit,
      total,
      sort: normalizedSort,
      tags: availableTags,
      featured: sortLists(hydrated, "trending").slice(0, 3),
      items: sorted.slice(from, to),
    };
  }

  async getPublishedById(listId, viewerUserId = null) {
    const normalizedListId = assertUuidLike(listId, "listId");
    const baseRow = await this.listsRepository.findPublishedListById(normalizedListId);
    if (!baseRow?.id) {
      throw new NotFoundError("List not found.");
    }

    const [itemRows, favoriteRows, commentRows] = await Promise.all([
      this.listsRepository.listItemsByListId(normalizedListId),
      this.listsRepository.listFavoritesByListId(normalizedListId),
      this.listsRepository.listCommentsByListId(normalizedListId, 100),
    ]);
    const profileUserIds = [
      baseRow?.user_id,
      ...commentRows.map((row) => row?.user_id),
    ].filter(Boolean);
    const profileMediaRows = await this.listsRepository.listProfileMediaByUserIds(profileUserIds);
    const avatarPathByUserId = new Map(
      (profileMediaRows || []).map((row) => [String(row?.id ?? ""), row?.avatar_path ?? null])
    );

    const mapped = buildListMaps(
      [baseRow],
      itemRows,
      favoriteRows,
      commentRows,
      viewerUserId,
      avatarPathByUserId,
      this.supabaseUrl
    )[0];

    return {
      ...mapped,
      comments: commentRows.map((row) =>
        mapComment(row, avatarPathByUserId, this.supabaseUrl)
      ),
    };
  }

  async createListForUser(userId, input) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const title = assertTitle(input?.title);
    const description = assertDescription(input?.description);
    const tags = normalizeTags(input?.tags);
    const albumIds = normalizeAlbumIds(input?.albumIds);

    const albums = await this.listsRepository.findAlbumsByIds(albumIds);
    const foundIds = new Set((albums ?? []).map((album) => album?.id));
    const missingAlbum = albumIds.find((id) => !foundIds.has(id));
    if (missingAlbum) {
      throw new ValidationError("One or more selected albums do not exist.");
    }

    const created = await this.listsRepository.insertList({
      userId: normalizedUserId,
      title,
      description,
      tags,
    });
    await this.listsRepository.insertListItems(created.id, albumIds);
    return this.getPublishedById(created.id, normalizedUserId);
  }

  async updateListForUser(userId, listId, input = {}) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const normalizedListId = assertUuidLike(listId, "listId");

    const existingList = await this.listsRepository.findListById(normalizedListId);
    if (!existingList?.id) {
      throw new NotFoundError("List not found.");
    }
    if (String(existingList?.user_id ?? "") !== String(normalizedUserId)) {
      throw new ForbiddenError("You can only edit your own lists.");
    }

    const patch = {};
    if (Object.prototype.hasOwnProperty.call(input, "title")) {
      patch.title = assertTitle(input?.title);
    }
    if (Object.prototype.hasOwnProperty.call(input, "description")) {
      patch.description = assertDescription(input?.description);
    }
    if (Object.prototype.hasOwnProperty.call(input, "tags")) {
      patch.tags = normalizeTags(input?.tags);
    }
    const hasAlbumIds = Object.prototype.hasOwnProperty.call(input, "albumIds");
    const albumIds = hasAlbumIds ? normalizeAlbumIds(input?.albumIds) : null;

    if (Object.keys(patch).length === 0 && !hasAlbumIds) {
      throw new ValidationError(
        "Provide at least one of: title, description, tags, or albumIds."
      );
    }

    if (hasAlbumIds) {
      const albums = await this.listsRepository.findAlbumsByIds(albumIds);
      const foundIds = new Set((albums ?? []).map((album) => album?.id));
      const missingAlbum = albumIds.find((id) => !foundIds.has(id));
      if (missingAlbum) {
        throw new ValidationError("One or more selected albums do not exist.");
      }
    }

    if (Object.keys(patch).length > 0) {
      const updated = await this.listsRepository.updateListById(normalizedListId, patch);
      if (!updated?.id) {
        throw new NotFoundError("List not found.");
      }
    }

    if (hasAlbumIds) {
      await this.listsRepository.deleteListItemsByListId(normalizedListId);
      await this.listsRepository.insertListItems(normalizedListId, albumIds);
    }

    return this.getPublishedById(normalizedListId, normalizedUserId);
  }

  async deleteListForUser(userId, listId) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const normalizedListId = assertUuidLike(listId, "listId");

    const existingList = await this.listsRepository.findListById(normalizedListId);
    if (!existingList?.id) {
      throw new NotFoundError("List not found.");
    }
    if (String(existingList?.user_id ?? "") !== String(normalizedUserId)) {
      throw new ForbiddenError("You can only delete your own lists.");
    }

    await this.listsRepository.deleteListById(normalizedListId);
    return { listId: normalizedListId, deleted: true };
  }

  async setFavoriteStateForUser(userId, listId, input = {}) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const normalizedListId = assertUuidLike(listId, "listId");
    const existingList = await this.listsRepository.findPublishedListById(normalizedListId);
    if (!existingList?.id) {
      throw new NotFoundError("List not found.");
    }

    const existingFavorite = await this.listsRepository.findFavorite(
      normalizedListId,
      normalizedUserId
    );

    let targetFavorited = !existingFavorite;
    if (Object.prototype.hasOwnProperty.call(input, "favorited")) {
      if (typeof input.favorited !== "boolean") {
        throw new ValidationError("Field 'favorited' must be a boolean.");
      }
      targetFavorited = input.favorited;
    }

    if (targetFavorited && !existingFavorite) {
      await this.listsRepository.insertFavorite(normalizedListId, normalizedUserId);
    }
    if (!targetFavorited && existingFavorite?.id) {
      await this.listsRepository.removeFavoriteById(existingFavorite.id);
    }

    const favorites = await this.listsRepository.listFavoritesByListId(normalizedListId);
    return {
      listId: normalizedListId,
      favorited: targetFavorited,
      favoriteCount: favorites.length,
    };
  }

  async addCommentForUser(userId, listId, input = {}) {
    const normalizedUserId = assertUuidLike(userId, "userId");
    const normalizedListId = assertUuidLike(listId, "listId");
    const existingList = await this.listsRepository.findPublishedListById(normalizedListId);
    if (!existingList?.id) {
      throw new NotFoundError("List not found.");
    }

    const commentText = normalizeComment(input?.comment);
    const created = await this.listsRepository.insertComment(
      normalizedListId,
      normalizedUserId,
      commentText
    );
    const commentRows = await this.listsRepository.listCommentsByListId(normalizedListId, 100);
    const profileMediaRows = await this.listsRepository.listProfileMediaByUserIds([
      normalizedUserId,
    ]);
    const avatarPathByUserId = new Map(
      (profileMediaRows || []).map((row) => [String(row?.id ?? ""), row?.avatar_path ?? null])
    );

    return {
      listId: normalizedListId,
      commentCount: commentRows.length,
      comment: mapComment(created, avatarPathByUserId, this.supabaseUrl),
    };
  }

  async searchAlbumsForPicker({ query, page, limit }) {
    const safePage = Number.isInteger(page) ? Math.max(page, 1) : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 24;
    const normalizedQuery = normalizeSearchQuery(query);
    const { rows, total } = await this.listsRepository.searchAlbums({
      query: normalizedQuery,
      page: safePage,
      limit: safeLimit,
    });

    return {
      page: safePage,
      limit: safeLimit,
      total,
      items: rows.map((row) => mapAlbumPickerRow(row)),
    };
  }
}
