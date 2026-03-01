import { InfrastructureError } from "../_lib/errors.js";
import { normalizeText } from "./normalize.js";

function handleDbError(error, context) {
  if (error) {
    throw new InfrastructureError(`Database error while ${context}.`, {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }
}

export class BacklogRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async findByUser(userId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase
      .from("backlog")
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,added_at,updated_at",
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("added_at", { ascending: false })
      .range(from, to);

    handleDbError(error, "fetching backlog");
    return { rows: data ?? [], total: count ?? 0 };
  }

  async findLatest(page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase
      .from("backlog")
      .select(
        "id,user_id,album_id,artist_name_raw,album_title_raw,status,added_at,updated_at",
        { count: "exact" }
      )
      .order("added_at", { ascending: false })
      .range(from, to);

    handleDbError(error, "fetching public backlog");
    return { rows: data ?? [], total: count ?? 0 };
  }

  async findById(backlogId) {
    const { data, error } = await this.supabase
      .from("backlog")
      .select("id,user_id,album_id,artist_name_raw,album_title_raw,status,added_at,updated_at")
      .eq("id", backlogId)
      .maybeSingle();

    handleDbError(error, "fetching backlog by id");
    return data;
  }

  async attachAlbum(backlogId, albumId) {
    const { error } = await this.supabase
      .from("backlog")
      .update({ album_id: albumId, updated_at: new Date().toISOString() })
      .eq("id", backlogId);

    handleDbError(error, "attaching backlog item to album");
  }
}

export class ArtistRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async upsertFromMusicBrainz(artist) {
    const payload = {
      mbid: artist.mbid ?? null,
      name: artist.name,
      normalized_name: normalizeText(artist.name),
      sort_name: artist.sortName ?? null,
      country: artist.country ?? null,
      disambiguation: artist.disambiguation ?? null,
      metadata_source: "musicbrainz",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("artist")
      .upsert(payload, { onConflict: "normalized_name" })
      .select("id,name,normalized_name")
      .single();

    handleDbError(error, "upserting artist");
    return data;
  }

  async findByNormalizedName(artistName) {
    const { data, error } = await this.supabase
      .from("artist")
      .select("id,name,normalized_name")
      .eq("normalized_name", normalizeText(artistName))
      .maybeSingle();

    handleDbError(error, "fetching artist by normalized name");
    return data;
  }
}

export class AlbumRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async findLatestForExplore(page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase
      .from("album")
      .select(
        "id,mbid,title,release_date,primary_type,cover_art_url,last_synced_at,artist:artist_id(id,name)",
        { count: "exact" }
      )
      .order("last_synced_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    handleDbError(error, "fetching latest albums for explore");
    return { rows: data ?? [], total: count ?? 0 };
  }

  async findById(id) {
    const { data, error } = await this.supabase
      .from("album")
      .select("id,mbid,title,normalized_title,cover_art_url,last_synced_at,artist:artist_id(id,name)")
      .eq("id", id)
      .maybeSingle();

    handleDbError(error, "fetching album by id");
    return data;
  }

  async findDetailedById(id) {
    const { data, error } = await this.supabase
      .from("album")
      .select(
        "id,mbid,title,normalized_title,release_date,primary_type,secondary_types,cover_art_url,last_synced_at,artist:artist_id(id,name)"
      )
      .eq("id", id)
      .maybeSingle();

    handleDbError(error, "fetching detailed album by id");
    return data;
  }

  async findByNormalized(artistId, albumTitle) {
    const normalizedTitle = normalizeText(albumTitle);

    const { data, error } = await this.supabase
      .from("album")
      .select("id,mbid,title,normalized_title,cover_art_url,last_synced_at,artist:artist_id(id,name)")
      .eq("normalized_title", normalizedTitle)
      .eq("artist_id", artistId)
      .maybeSingle();

    handleDbError(error, "fetching album by normalized keys");
    return data;
  }

  async upsertFromMusicBrainz(album, artistId) {
    const payload = {
      mbid: album.mbid ?? null,
      artist_id: artistId,
      title: album.title,
      normalized_title: normalizeText(album.title),
      release_date: album.releaseDate ?? null,
      primary_type: album.primaryType ?? null,
      secondary_types: album.secondaryTypes ?? [],
      cover_art_url: album.coverArtUrl ?? null,
      metadata_source: "musicbrainz",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("album")
      .upsert(payload, { onConflict: "artist_id,normalized_title" })
      .select("id,title,normalized_title,artist_id")
      .single();

    handleDbError(error, "upserting album");
    return data;
  }

  async findByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from("album")
      .select(
        "id,title,normalized_title,release_date,primary_type,cover_art_url,updated_at,artist:artist_id(id,name,normalized_name,updated_at)"
      )
      .in("id", ids);

    handleDbError(error, "fetching albums by ids");
    return data ?? [];
  }

  async findPopularFromBacklog(page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await this.supabase
      .from("backlog")
      .select("album_id,user_id,artist_name_raw,album_title_raw,rating,added_at,updated_at")
      .not("album_id", "is", null);

    handleDbError(error, "aggregating popular albums from backlog");

    const rows = Array.isArray(data) ? data : [];
    const groupedMap = new Map();

    for (const row of rows) {
      const albumId = row?.album_id;
      if (!albumId) continue;

      let entry = groupedMap.get(albumId);
      if (!entry) {
        entry = {
          album_id: albumId,
          album_title_raw: row?.album_title_raw ?? null,
          artist_name_raw: row?.artist_name_raw ?? null,
          ratings_count: 0,
          ratings_sum: 0,
          last_logged_at: row?.added_at ?? null,
          last_backlog_updated_at: row?.updated_at ?? null,
          unique_users: new Set(),
        };
        groupedMap.set(albumId, entry);
      }

      if (typeof row?.user_id === "string" && row.user_id.trim()) {
        entry.unique_users.add(row.user_id);
      }
      if (typeof row?.rating === "number") {
        entry.ratings_count += 1;
        entry.ratings_sum += row.rating;
      }
      if (!entry.album_title_raw && row?.album_title_raw) {
        entry.album_title_raw = row.album_title_raw;
      }
      if (!entry.artist_name_raw && row?.artist_name_raw) {
        entry.artist_name_raw = row.artist_name_raw;
      }

      const loggedAtCurrent = Date.parse(entry.last_logged_at ?? "") || 0;
      const loggedAtNext = Date.parse(row?.added_at ?? "") || 0;
      if (loggedAtNext > loggedAtCurrent) {
        entry.last_logged_at = row?.added_at ?? entry.last_logged_at;
      }

      const updatedAtCurrent = Date.parse(entry.last_backlog_updated_at ?? "") || 0;
      const updatedAtNext = Date.parse(row?.updated_at ?? "") || 0;
      if (updatedAtNext > updatedAtCurrent) {
        entry.last_backlog_updated_at = row?.updated_at ?? entry.last_backlog_updated_at;
      }
    }

    const grouped = Array.from(groupedMap.values()).map((entry) => {
      const logsCount = entry.unique_users.size;
      const averageRating =
        entry.ratings_count > 0 ? Number((entry.ratings_sum / entry.ratings_count).toFixed(4)) : null;
      return {
        album_id: entry.album_id,
        album_title_raw: entry.album_title_raw,
        artist_name_raw: entry.artist_name_raw,
        logs_count: logsCount,
        ratings_count: entry.ratings_count,
        average_rating: averageRating,
        last_logged_at: entry.last_logged_at,
        last_backlog_updated_at: entry.last_backlog_updated_at,
      };
    });

    grouped.sort((a, b) => {
      const logsA = Number(a?.logs_count ?? 0);
      const logsB = Number(b?.logs_count ?? 0);
      if (logsB !== logsA) return logsB - logsA;

      const avgA = a?.average_rating == null ? Number.NEGATIVE_INFINITY : Number(a.average_rating);
      const avgB = b?.average_rating == null ? Number.NEGATIVE_INFINITY : Number(b.average_rating);
      if (avgB !== avgA) return avgB - avgA;

      const updatedA = Date.parse(a?.last_backlog_updated_at ?? "") || 0;
      const updatedB = Date.parse(b?.last_backlog_updated_at ?? "") || 0;
      return updatedB - updatedA;
    });

    return grouped.slice(from, to + 1);
  }
}
