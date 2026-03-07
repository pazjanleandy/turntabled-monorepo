import { InfrastructureError } from "../_lib/errors.js";

function handleDbError(error, context) {
  if (!error) return;
  throw new InfrastructureError(`Database error while ${context}.`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

export class ProfileRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async findPublicUserById(userId) {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,username,bio,avatar_url,lastfm_username")
      .eq("id", userId)
      .maybeSingle();

    handleDbError(error, "fetching public user profile by id");
    return data;
  }

  async findPublicUserByUsername(username) {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,username,bio,avatar_url,lastfm_username")
      .eq("username", username)
      .maybeSingle();

    handleDbError(error, "fetching public user profile by username");
    return data;
  }

  async findProfileMediaByUserId(userId) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("avatar_path,cover_url")
      .eq("id", userId)
      .maybeSingle();

    handleDbError(error, "fetching profile media");
    return data;
  }

  async listProfileMediaByUserIds(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id,avatar_path,cover_url")
      .in("id", userIds);

    handleDbError(error, "fetching profile media by user ids");
    return data ?? [];
  }

  async searchUsersByUsername(query, { excludeUserId, limit = 20 } = {}) {
    let builder = this.supabase
      .from("users")
      .select("id,username,avatar_url")
      .ilike("username", `%${query}%`)
      .order("username", { ascending: true })
      .limit(limit);

    if (excludeUserId) {
      builder = builder.neq("id", excludeUserId);
    }

    const { data, error } = await builder;
    handleDbError(error, "searching users by username");
    return data ?? [];
  }

  async findUserById(userId) {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,username,email,full_name,bio,avatar_url,lastfm_username,lastfm_connected_at")
      .eq("id", userId)
      .maybeSingle();

    handleDbError(error, "fetching user profile");
    return data;
  }

  async updateUserById(userId, patch) {
    const payload = {
      ...(Object.prototype.hasOwnProperty.call(patch, "full_name")
        ? { full_name: patch.full_name }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "bio") ? { bio: patch.bio } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "avatar_url")
        ? { avatar_url: patch.avatar_url }
        : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("users")
      .update(payload)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    handleDbError(error, "updating user profile");
    return data;
  }

  async listFavoritesByUser(userId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,added_at,updated_at,album:album_id(id,title,cover_art_url,mbid,artist:artist_id(id,name))"
      )
      .eq("user_id", userId)
      .eq("is_favorite", true)
      .order("updated_at", { ascending: false });

    handleDbError(error, "fetching favorite albums");
    return data ?? [];
  }

  async listReviewsByUser(userId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,album_id,artist_name_raw,album_title_raw,rating,review_text,reviewed_at,added_at,updated_at,album:album_id(id,title,cover_art_url,mbid,artist:artist_id(id,name))"
      )
      .eq("user_id", userId)
      .not("review_text", "is", null)
      .order("reviewed_at", { ascending: false, nullsFirst: false });

    handleDbError(error, "fetching reviews");
    return data ?? [];
  }

  async listCompletedByUser(userId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,album:album_id(id,title,cover_art_url,mbid,artist:artist_id(id,name))"
      )
      .eq("user_id", userId)
      .in("status", ["listened", "completed", "favorite"])
      .order("updated_at", { ascending: false });

    handleDbError(error, "fetching listened/favorite backlog entries");
    return data ?? [];
  }

  async listBacklogRowsForStats(userId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select("status,rating,added_at,updated_at")
      .eq("user_id", userId);

    handleDbError(error, "fetching backlog rows for stats");
    return data ?? [];
  }

  async updateFavoriteByBacklogId(userId, backlogId, isFavorite) {
    const { data, error } = await this.supabase
      .from("backlog")
      .update({
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      })
      .eq("id", backlogId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    handleDbError(error, "updating favorite flag");
    return data;
  }

  async listOwnedBacklogIds(userId, backlogIds) {
    if (!Array.isArray(backlogIds) || backlogIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("backlog")
      .select("id")
      .eq("user_id", userId)
      .in("id", backlogIds);

    handleDbError(error, "verifying backlog ownership");
    return (data ?? []).map((item) => item.id);
  }

  async clearFavoritesForUser(userId) {
    const { error } = await this.supabase
      .from("backlog")
      .update({
        is_favorite: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_favorite", true);

    handleDbError(error, "clearing favorites");
  }

  async setFavoritesForUser(userId, backlogIds) {
    if (!Array.isArray(backlogIds) || backlogIds.length === 0) return;

    const baseTime = Date.now();
    const total = backlogIds.length;

    for (let index = 0; index < total; index += 1) {
      const backlogId = backlogIds[index];
      const orderOffset = total - index;
      const updatedAt = new Date(baseTime + orderOffset).toISOString();

      const { error } = await this.supabase
        .from("backlog")
        .update({
          is_favorite: true,
          updated_at: updatedAt,
        })
        .eq("user_id", userId)
        .eq("id", backlogId);

      handleDbError(error, "setting favorites");
    }
  }
}
