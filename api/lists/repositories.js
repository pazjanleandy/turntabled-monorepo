import { InfrastructureError } from "../_lib/errors.js";

function handleDbError(error, context) {
  if (!error) return;
  if (error.code === "PGRST205") {
    throw new InfrastructureError(
      "Lists tables are not available to the API yet. Run the latest DB grants migration and reload schema.",
      {
        message: error.message,
        code: error.code,
        details: error.details,
      }
    );
  }
  throw new InfrastructureError(`Database error while ${context}.`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

function dedupeStringIds(values = []) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

export class CommunityListsRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async listPublishedLists() {
    const { data, error } = await this.supabase
      .from("community_lists")
      .select(
        "id,user_id,title,description,tags,is_published,published_at,created_at,updated_at,creator:user_id(id,username,avatar_url)"
      )
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false });

    handleDbError(error, "fetching published community lists");
    return data ?? [];
  }

  async findPublishedListById(listId) {
    const { data, error } = await this.supabase
      .from("community_lists")
      .select(
        "id,user_id,title,description,tags,is_published,published_at,created_at,updated_at,creator:user_id(id,username,avatar_url)"
      )
      .eq("id", listId)
      .eq("is_published", true)
      .maybeSingle();

    handleDbError(error, "fetching published list by id");
    return data;
  }

  async findListById(listId) {
    const { data, error } = await this.supabase
      .from("community_lists")
      .select(
        "id,user_id,title,description,tags,is_published,published_at,created_at,updated_at,creator:user_id(id,username,avatar_url)"
      )
      .eq("id", listId)
      .maybeSingle();

    handleDbError(error, "fetching list by id");
    return data;
  }

  async insertList({ userId, title, description, tags }) {
    const { data, error } = await this.supabase
      .from("community_lists")
      .insert({
        user_id: userId,
        title,
        description: description ?? null,
        tags,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select(
        "id,user_id,title,description,tags,is_published,published_at,created_at,updated_at,creator:user_id(id,username,avatar_url)"
      )
      .single();

    handleDbError(error, "creating community list");
    return data;
  }

  async updateListById(listId, patch = {}) {
    const payload = {
      ...(Object.prototype.hasOwnProperty.call(patch, "title")
        ? { title: patch.title }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "description")
        ? { description: patch.description }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "tags")
        ? { tags: patch.tags }
        : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("community_lists")
      .update(payload)
      .eq("id", listId)
      .select(
        "id,user_id,title,description,tags,is_published,published_at,created_at,updated_at,creator:user_id(id,username,avatar_url)"
      )
      .maybeSingle();

    handleDbError(error, "updating community list");
    return data;
  }

  async deleteListById(listId) {
    const { error } = await this.supabase
      .from("community_lists")
      .delete()
      .eq("id", listId);

    handleDbError(error, "deleting community list");
  }

  async insertListItems(listId, albumIds) {
    const normalizedAlbumIds = dedupeStringIds(albumIds);
    if (normalizedAlbumIds.length === 0) return [];

    const payload = normalizedAlbumIds.map((albumId, index) => ({
      list_id: listId,
      album_id: albumId,
      position: index + 1,
    }));

    const { data, error } = await this.supabase
      .from("community_list_items")
      .insert(payload)
      .select("id,list_id,album_id,position");

    handleDbError(error, "creating list items");
    return data ?? [];
  }

  async deleteListItemsByListId(listId) {
    const { error } = await this.supabase
      .from("community_list_items")
      .delete()
      .eq("list_id", listId);

    handleDbError(error, "deleting list items by list id");
  }

  async listItemsByListIds(listIds) {
    const normalizedIds = dedupeStringIds(listIds);
    if (normalizedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("community_list_items")
      .select(
        "id,list_id,album_id,position,album:album_id(id,title,cover_art_url,release_date,artist:artist_id(name))"
      )
      .in("list_id", normalizedIds)
      .order("position", { ascending: true });

    handleDbError(error, "fetching list items by list ids");
    return data ?? [];
  }

  async listItemsByListId(listId) {
    const { data, error } = await this.supabase
      .from("community_list_items")
      .select(
        "id,list_id,album_id,position,album:album_id(id,title,cover_art_url,release_date,artist:artist_id(name))"
      )
      .eq("list_id", listId)
      .order("position", { ascending: true });

    handleDbError(error, "fetching list items by list id");
    return data ?? [];
  }

  async listProfileMediaByUserIds(userIds) {
    const normalizedIds = dedupeStringIds(userIds);
    if (normalizedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id,avatar_path")
      .in("id", normalizedIds);

    handleDbError(error, "fetching profile media by user ids for lists");
    return data ?? [];
  }

  async listFavoritesByListIds(listIds) {
    const normalizedIds = dedupeStringIds(listIds);
    if (normalizedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("community_list_favorites")
      .select("id,list_id,user_id,created_at")
      .in("list_id", normalizedIds);

    handleDbError(error, "fetching list favorites by list ids");
    return data ?? [];
  }

  async listFavoritesByListId(listId) {
    const { data, error } = await this.supabase
      .from("community_list_favorites")
      .select("id,list_id,user_id,created_at")
      .eq("list_id", listId);

    handleDbError(error, "fetching list favorites by list id");
    return data ?? [];
  }

  async findFavorite(listId, userId) {
    const { data, error } = await this.supabase
      .from("community_list_favorites")
      .select("id,list_id,user_id")
      .eq("list_id", listId)
      .eq("user_id", userId)
      .maybeSingle();

    handleDbError(error, "fetching favorite");
    return data;
  }

  async insertFavorite(listId, userId) {
    const { data, error } = await this.supabase
      .from("community_list_favorites")
      .insert({ list_id: listId, user_id: userId })
      .select("id,list_id,user_id")
      .single();

    handleDbError(error, "creating favorite");
    return data;
  }

  async removeFavoriteById(favoriteId) {
    const { error } = await this.supabase
      .from("community_list_favorites")
      .delete()
      .eq("id", favoriteId);

    handleDbError(error, "removing favorite");
  }

  async listCommentSummariesByListIds(listIds) {
    const normalizedIds = dedupeStringIds(listIds);
    if (normalizedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("community_list_comments")
      .select("id,list_id,created_at")
      .in("list_id", normalizedIds);

    handleDbError(error, "fetching list comments by list ids");
    return data ?? [];
  }

  async listCommentsByListId(listId, limit = 50) {
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 200)
      : 50;
    const { data, error } = await this.supabase
      .from("community_list_comments")
      .select(
        "id,list_id,user_id,comment_text,created_at,updated_at,author:user_id(id,username,avatar_url)"
      )
      .eq("list_id", listId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    handleDbError(error, "fetching list comments by list id");
    return data ?? [];
  }

  async insertComment(listId, userId, commentText) {
    const { data, error } = await this.supabase
      .from("community_list_comments")
      .insert({
        list_id: listId,
        user_id: userId,
        comment_text: commentText,
      })
      .select(
        "id,list_id,user_id,comment_text,created_at,updated_at,author:user_id(id,username,avatar_url)"
      )
      .single();

    handleDbError(error, "creating list comment");
    return data;
  }

  async searchAlbums({ query = "", page = 1, limit = 24 }) {
    const safePage = Number.isInteger(page) ? Math.max(page, 1) : 1;
    const safeLimit = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 24;
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;
    const normalizedQuery = String(query ?? "").trim();
    const selectFields =
      "id,title,release_date,cover_art_url,last_synced_at,artist:artist_id(name)";

    if (!normalizedQuery) {
      const { data, error, count } = await this.supabase
        .from("album")
        .select(selectFields, { count: "exact" })
        .order("title", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      handleDbError(error, "searching albums for list creation");
      return { rows: data ?? [], total: count ?? 0 };
    }

    const [titleMatchResult, artistMatchResult] = await Promise.all([
      this.supabase
        .from("album")
        .select(selectFields)
        .ilike("title", `%${normalizedQuery}%`)
        .order("title", { ascending: true })
        .order("id", { ascending: true })
        .limit(600),
      this.supabase
        .from("artist")
        .select("id")
        .ilike("name", `%${normalizedQuery}%`)
        .order("name", { ascending: true })
        .limit(200),
    ]);

    handleDbError(titleMatchResult.error, "searching albums by title for list creation");
    handleDbError(artistMatchResult.error, "searching artists for list creation");

    const artistIds = dedupeStringIds((artistMatchResult.data ?? []).map((row) => row?.id));
    let artistAlbumRows = [];

    if (artistIds.length > 0) {
      const { data, error } = await this.supabase
        .from("album")
        .select(selectFields)
        .in("artist_id", artistIds)
        .order("title", { ascending: true })
        .order("id", { ascending: true })
        .limit(600);

      handleDbError(error, "searching albums by artist for list creation");
      artistAlbumRows = data ?? [];
    }

    const mergedById = new Map();
    for (const row of titleMatchResult.data ?? []) {
      if (!row?.id) continue;
      mergedById.set(row.id, row);
    }
    for (const row of artistAlbumRows) {
      if (!row?.id) continue;
      mergedById.set(row.id, row);
    }

    const mergedRows = Array.from(mergedById.values()).sort((a, b) => {
      const titleA = String(a?.title ?? "");
      const titleB = String(b?.title ?? "");
      const byTitle = titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
      if (byTitle !== 0) return byTitle;
      return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
    });

    return {
      rows: mergedRows.slice(from, to + 1),
      total: mergedRows.length,
    };
  }

  async findAlbumsByIds(albumIds) {
    const normalizedIds = dedupeStringIds(albumIds);
    if (normalizedIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("album")
      .select("id,title,release_date,cover_art_url,artist:artist_id(name)")
      .in("id", normalizedIds);

    handleDbError(error, "fetching albums by ids");
    return data ?? [];
  }
}
