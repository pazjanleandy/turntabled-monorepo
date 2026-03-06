import { InfrastructureError } from "../_lib/errors.js";

function handleDbError(error, context) {
  if (!error) return;
  throw new InfrastructureError(`Database error while ${context}.`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

export class BacklogRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async listByUser(userId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase
      .from("backlog")
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,cover_art_url)",
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("added_at", { ascending: false })
      .range(from, to);

    handleDbError(error, "fetching backlog");
    return { rows: data ?? [], total: count ?? 0 };
  }

  async findById(id) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,cover_art_url)"
      )
      .eq("id", id)
      .maybeSingle();

    handleDbError(error, "fetching backlog item by id");
    return data;
  }

  async findDuplicateByUser(userId, albumId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,cover_art_url)"
      )
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .maybeSingle();

    handleDbError(error, "checking duplicate backlog item");
    return data;
  }

  async findByUserAndAlbum(userId, albumId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,cover_art_url)"
      )
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .maybeSingle();

    handleDbError(error, "fetching backlog item by user and album");
    return data;
  }

  async create(item) {
    const payload = {
      user_id: item.userId,
      album_id: item.albumId,
      artist_name_raw: item.artistNameRaw,
      album_title_raw: item.albumTitleRaw,
      status: item.status ?? "backloggd",
      rating: item.rating,
      is_favorite: Boolean(item.isFavorite),
      review_text: item.reviewText ?? null,
      reviewed_at: item.reviewedAt ?? null,
      source: item.source ?? "explore",
      added_at: item.addedAt ?? undefined,
    };

    const { data, error } = await this.supabase
      .from("backlog")
      .insert(payload)
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,cover_art_url)"
      )
      .single();

    handleDbError(error, "creating backlog item");
    return data;
  }

  async updateById(id, patch) {
    const payload = {
      ...(Object.prototype.hasOwnProperty.call(patch, "status") ? { status: patch.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "rating") ? { rating: patch.rating } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "is_favorite")
        ? { is_favorite: patch.is_favorite }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "review_text")
        ? { review_text: patch.review_text }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "reviewed_at")
        ? { reviewed_at: patch.reviewed_at }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "added_at") ? { added_at: patch.added_at } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("backlog")
      .update(payload)
      .eq("id", id)
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,cover_art_url)"
      )
      .single();

    handleDbError(error, "updating backlog item");
    return data;
  }

  async remove(id) {
    const { error } = await this.supabase.from("backlog").delete().eq("id", id);
    handleDbError(error, "deleting backlog item");
  }
}
