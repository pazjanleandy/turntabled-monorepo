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

  buildBacklogSelect() {
    return "id,user_id,album_id,artist_name_raw,album_title_raw,status,rating,is_favorite,review_text,reviewed_at,source,added_at,updated_at,album:album_id(id,title,release_date,primary_type,cover_art_url,artist:artist_id(name))";
  }

  async listByUser(userId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase
      .from("backlog")
      .select(this.buildBacklogSelect(), { count: "exact" })
      .eq("user_id", userId)
      .order("added_at", { ascending: false })
      .range(from, to);

    handleDbError(error, "fetching backlog");
    return { rows: data ?? [], total: count ?? 0 };
  }

  async getHomeSummaryByUser(userId) {
    const { data, error } = await this.supabase.rpc("get_user_backlog_home_summary", {
      p_user_id: userId,
    });

    if (!error) {
      if (Array.isArray(data)) {
        return data[0] ?? null;
      }
      return data ?? null;
    }

    if (!this.shouldFallbackHomeSummary(error)) {
      handleDbError(error, "fetching backlog home summary");
    }

    // Compatibility fallback when the SQL helper has not been migrated yet.
    return this.getHomeSummaryByUserLegacy(userId);
  }

  shouldFallbackHomeSummary(error) {
    const code = String(error?.code ?? "").trim();
    const message = String(error?.message ?? "").toLowerCase();
    return (
      code === "PGRST202" ||
      code === "42883" ||
      message.includes("get_user_backlog_home_summary")
    );
  }

  buildLegacyHomeSummary(rows = []) {
    const buckets = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const counts = new Map(buckets.map((bucket) => [bucket.toFixed(1), 0]));
    let listenedCount = 0;
    let backlogCount = 0;
    let logsCount = 0;
    let ratedCount = 0;

    for (const row of rows) {
      listenedCount += 1;
      const status = String(row?.status ?? "").trim().toLowerCase();
      if (status === "listened") logsCount += 1;
      if (status === "listening" || status === "unfinished" || status === "backloggd") {
        backlogCount += 1;
      }
      const rating = Number(row?.rating);
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        ratedCount += 1;
        const bucket = Math.min(5, Math.max(1, Math.round(rating * 2) / 2));
        const key = bucket.toFixed(1);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return {
      listened_count: listenedCount,
      backlog_count: backlogCount,
      logs_count: logsCount,
      rated_count: ratedCount,
      rating_distribution: buckets.map((bucket) => ({
        bucket: bucket.toFixed(1),
        count: counts.get(bucket.toFixed(1)) ?? 0,
      })),
    };
  }

  async getHomeSummaryByUserLegacy(userId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select("status,rating")
      .eq("user_id", userId);

    handleDbError(error, "fetching backlog home summary (legacy)");
    return this.buildLegacyHomeSummary(data ?? []);
  }

  async listRecentActivityByUser(userId, limit = 5) {
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 20) : 5;
    const { data, error } = await this.supabase
      .from("backlog")
      .select(
        "id,status,rating,added_at,updated_at,artist_name_raw,album_title_raw,album:album_id(title,cover_art_url,artist:artist_id(name))"
      )
      .eq("user_id", userId)
      .order("added_at", { ascending: false })
      .limit(safeLimit);

    handleDbError(error, "fetching recent backlog activity for home summary");
    return data ?? [];
  }

  async findById(id) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(this.buildBacklogSelect())
      .eq("id", id)
      .maybeSingle();

    handleDbError(error, "fetching backlog item by id");
    return data;
  }

  async findDuplicateByUser(userId, albumId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(this.buildBacklogSelect())
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .maybeSingle();

    handleDbError(error, "checking duplicate backlog item");
    return data;
  }

  async findByUserAndAlbum(userId, albumId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select(this.buildBacklogSelect())
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
      .select(this.buildBacklogSelect())
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
      .select(this.buildBacklogSelect())
      .single();

    handleDbError(error, "updating backlog item");
    return data;
  }

  async remove(id) {
    const { error } = await this.supabase.from("backlog").delete().eq("id", id);
    handleDbError(error, "deleting backlog item");
  }
}
