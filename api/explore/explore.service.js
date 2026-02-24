import { makeResourceKey } from "./normalize.js";

function mapExploreAlbumItem(album) {
  const coverArtUrl = album?.cover_art_url ?? (album?.mbid ? `https://coverartarchive.org/release/${album.mbid}/front-500` : null);
  return {
    backlogId: null,
    status: null,
    addedAt: null,
    artistName: album?.artist?.name ?? "Unknown Artist",
    albumTitle: album?.title ?? "Unknown Album",
    coverArtUrl,
    hydrated: true,
    albumId: album?.id ?? null,
    lastSyncedAt: album?.last_synced_at ?? null,
  };
}

export class ExploreService {
  constructor({ backlogRepository, albumRepository, artistRepository, queueService, musicBrainzClient }) {
    this.backlogRepository = backlogRepository;
    this.albumRepository = albumRepository;
    this.artistRepository = artistRepository;
    this.queueService = queueService;
    this.musicBrainzClient = musicBrainzClient;
  }

  async getExplorePage(userId, page, limit) {
    const { rows, total } = await this.albumRepository.findLatestForExplore(page, limit);
    const resultItems = rows.map((row) => mapExploreAlbumItem(row));

    return {
      page,
      limit,
      scope: "catalog",
      total,
      hydrationPendingCount: 0,
      items: resultItems,
    };
  }

  async getAlbumDetails(id) {
    const fromAlbum = await this.albumRepository.findDetailedById(id);
    if (fromAlbum) {
      const tracks = await this.getTracklistForAlbumSafe(fromAlbum);
      return this.mapAlbumDetails(fromAlbum, null, tracks);
    }

    const backlogItem = await this.backlogRepository.findById(id);
    if (!backlogItem) return null;

    let album = null;
    if (backlogItem.album_id) {
      album = await this.albumRepository.findDetailedById(backlogItem.album_id);
    }
    if (!album) {
      const artist = await this.artistRepository.findByNormalizedName(backlogItem.artist_name_raw);
      if (artist?.id) {
        album = await this.albumRepository.findByNormalized(artist.id, backlogItem.album_title_raw);
        if (album?.id) {
          album = await this.albumRepository.findDetailedById(album.id);
        }
      }
    }

    if (!album) {
      const job = {
        resourceKey: makeResourceKey(backlogItem.artist_name_raw, backlogItem.album_title_raw),
        artistName: backlogItem.artist_name_raw,
        albumTitle: backlogItem.album_title_raw,
        backlogId: backlogItem.id,
        userId: backlogItem.user_id ?? null,
        attempt: 0,
        createdAt: new Date().toISOString(),
      };
      await this.queueService.enqueueIfMissing(job);
      return this.mapAlbumDetails(null, backlogItem, []);
    }

    if (backlogItem.album_id !== album.id) {
      await this.backlogRepository.attachAlbum(backlogItem.id, album.id);
    }

    const tracks = await this.getTracklistForAlbumSafe(album);
    return this.mapAlbumDetails(album, backlogItem, tracks);
  }

  async getTracklistForAlbumSafe(album) {
    try {
      return await this.getTracklistForAlbum(album);
    } catch {
      return [];
    }
  }

  async getTracklistForAlbum(album) {
    const releaseMbid = album?.mbid;
    if (!releaseMbid) return [];

    const cachedTracks = await this.queueService.getTracklistCache(releaseMbid);
    if (cachedTracks) return cachedTracks;

    const gateAcquired = await this.queueService.acquireRateGate();
    if (!gateAcquired) return [];

    const tracks = await this.musicBrainzClient.fetchTracklist(releaseMbid);
    if (Array.isArray(tracks) && tracks.length > 0) {
      await this.queueService.setTracklistCache(releaseMbid, tracks);
    }
    return Array.isArray(tracks) ? tracks : [];
  }

  mapAlbumDetails(album, backlogItem, tracks = []) {
    const title = album?.title ?? backlogItem?.album_title_raw ?? "Unknown Album";
    const artistName = album?.artist?.name ?? backlogItem?.artist_name_raw ?? "Unknown Artist";
    const releaseDate = album?.release_date ?? null;
    const secondaryTypes = Array.isArray(album?.secondary_types) ? album.secondary_types : [];
    const cover =
      album?.cover_art_url ??
      (album?.mbid ? `https://coverartarchive.org/release/${album.mbid}/front-500` : null);

    return {
      id: album?.id ?? backlogItem?.id ?? null,
      title,
      artist: artistName,
      cover,
      releaseDate,
      year: releaseDate ? new Date(releaseDate).getFullYear().toString() : "Unknown",
      label: "Unknown",
      catalogNumber: "Unknown",
      format: "Digital",
      length: "Unknown",
      type: album?.primary_type ?? "Album",
      genres: secondaryTypes.length > 0 ? secondaryTypes : ["Unknown"],
      tracks: Array.isArray(tracks) ? tracks : [],
      hydrated: Boolean(album),
    };
  }
}
