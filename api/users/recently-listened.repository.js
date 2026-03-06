import { InfrastructureError } from "../_lib/errors.js";

function handleDbError(error, context) {
  if (!error) return;
  throw new InfrastructureError(`Database error while ${context}.`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

export class RecentlyListenedRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async findUserById(userId) {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,username,lastfm_username")
      .eq("id", userId)
      .maybeSingle();

    handleDbError(error, "fetching user by id for recently listened");
    return data;
  }

  async findUserByUsername(username) {
    const { data, error } = await this.supabase
      .from("users")
      .select("id,username,lastfm_username")
      .eq("username", username)
      .maybeSingle();

    handleDbError(error, "fetching user by username for recently listened");
    return data;
  }

  async listRecentBacklogForUser(userId, limit = 10) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,status,updated_at,artist_name_raw,album_title_raw,album:album_id(title,cover_art_url,artist:artist_id(name))"
      )
      .eq("user_id", userId)
      .in("status", ["listened", "completed", "favorite"])
      .order("updated_at", { ascending: false })
      .limit(limit);

    handleDbError(error, "fetching fallback recently listened from backlog");
    return data ?? [];
  }
}
