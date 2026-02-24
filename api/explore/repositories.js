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
}
