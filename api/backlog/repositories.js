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
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,added_at,updated_at,album:album_id(id,cover_art_url)",
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
      .select("id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,added_at,updated_at")
      .eq("id", id)
      .maybeSingle();

    handleDbError(error, "fetching backlog item by id");
    return data;
  }

  async findDuplicateByUser(userId, albumId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select("id")
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .maybeSingle();

    handleDbError(error, "checking duplicate backlog item");
    return data;
  }

  async create(item) {
    const payload = {
      user_id: item.userId,
      album_id: item.albumId,
      artist_name_raw: item.artistNameRaw,
      album_title_raw: item.albumTitleRaw,
      status: item.status ?? "pending",
      rating: item.rating,
      source: item.source ?? "explore",
      added_at: item.addedAt ?? undefined,
    };

    const { data, error } = await this.supabase
      .from("backlog")
      .insert(payload)
      .select("id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,added_at,updated_at")
      .single();

    handleDbError(error, "creating backlog item");
    return data;
  }

  async updateRating(id, rating) {
    const { data, error } = await this.supabase
      .from("backlog")
      .update({ rating, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,added_at,updated_at")
      .single();

    handleDbError(error, "updating backlog rating");
    return data;
  }

  async remove(id) {
    const { error } = await this.supabase.from("backlog").delete().eq("id", id);
    handleDbError(error, "deleting backlog item");
  }
}
