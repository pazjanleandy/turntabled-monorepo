import { makeResourceKey } from "./normalize.js";

function mapExploreAlbumItem(album) {
  const coverArtUrl = album?.cover_art_url ?? (album?.mbid ? `https://coverartarchive.org/release/${album.mbid}/front-500` : null);
  const secondaryTypes = Array.isArray(album?.secondary_types) ? album.secondary_types : [];
  const genres = secondaryTypes.filter((value) => typeof value === "string" && value.trim());
  return {
    backlogId: null,
    status: null,
    addedAt: null,
    artistName: album?.artist?.name ?? "Unknown Artist",
    albumTitle: album?.title ?? "Unknown Album",
    coverArtUrl,
    releaseDate: album?.release_date ?? null,
    genres: genres.length > 0 ? genres : [],
    primaryType: typeof album?.primary_type === "string" ? album.primary_type : null,
    hydrated: true,
    albumId: album?.id ?? null,
    lastSyncedAt: album?.last_synced_at ?? null,
  };
}

function parseNumber(value) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildAvatarUrl(avatarPath, supabaseUrl) {
  if (typeof avatarPath !== "string" || !avatarPath.trim()) return null;
  const normalized = avatarPath.trim();

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const base = typeof supabaseUrl === "string" ? supabaseUrl.replace(/\/+$/, "") : "";
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

export class ExploreService {
  constructor({
    backlogRepository,
    albumRepository,
    artistRepository,
    userRepository,
    profileMediaRepository,
    queueService,
    musicBrainzClient,
    supabaseUrl = "",
  }) {
    this.backlogRepository = backlogRepository;
    this.albumRepository = albumRepository;
    this.artistRepository = artistRepository;
    this.userRepository = userRepository ?? { findPublicByIds: async () => [] };
    this.profileMediaRepository = profileMediaRepository ?? { listByUserIds: async () => [] };
    this.queueService = queueService;
    this.musicBrainzClient = musicBrainzClient;
    this.supabaseUrl = supabaseUrl;
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

  async getPopularAlbums(page, limit) {
    const rows = await this.albumRepository.findPopularFromBacklog(page, limit);
    const albumIds = rows
      .map((row) => row?.album_id)
      .filter((value) => typeof value === "string" && value.trim());

    const uniqueAlbumIds = [...new Set(albumIds)];
    const albums = await this.albumRepository.findByIds(uniqueAlbumIds);
    const albumsById = new Map(albums.map((album) => [album.id, album]));

    const items = rows.map((row, index) => {
      const album = row?.album_id ? albumsById.get(row.album_id) : null;
      const artist = album?.artist ?? null;
      const logsCount = parseNumber(row?.logs_count) ?? 0;
      const ratingsCount = parseNumber(row?.ratings_count) ?? 0;
      const averageRating = parseNumber(row?.average_rating);

      return {
        rank: (page - 1) * limit + index + 1,
        popularity: {
          logCount: logsCount,
          ratingsCount,
          averageRating: ratingsCount > 0 ? averageRating : null,
        },
        album: {
          id: album?.id ?? row?.album_id ?? null,
          title: album?.title ?? row?.album_title_raw ?? null,
          titleRaw: row?.album_title_raw ?? album?.title ?? null,
          normalizedTitle: album?.normalized_title ?? null,
          releaseDate: album?.release_date ?? null,
          primaryType: album?.primary_type ?? null,
          coverArtUrl: album?.cover_art_url ?? null,
          updatedAt: album?.updated_at ?? null,
        },
        artist: {
          id: artist?.id ?? null,
          name: artist?.name ?? row?.artist_name_raw ?? null,
          nameRaw: row?.artist_name_raw ?? artist?.name ?? null,
          normalizedName: artist?.normalized_name ?? null,
          updatedAt: artist?.updated_at ?? null,
        },
        timestamps: {
          lastLoggedAt: row?.last_logged_at ?? null,
          lastBacklogUpdatedAt: row?.last_backlog_updated_at ?? null,
        },
      };
    });

    return {
      page,
      limit,
      scope: "popular-albums",
      rankedBy: ["logCount:desc", "averageRating:desc"],
      items,
    };
  }

  async getAlbumDetails(id) {
    const fromAlbum = await this.albumRepository.findDetailedById(id);
    if (fromAlbum) {
      const [tracks, reviews] = await Promise.all([
        this.getTracklistForAlbumSafe(fromAlbum),
        this.getAlbumReviews({ album: fromAlbum }),
      ]);
      return this.mapAlbumDetails(fromAlbum, null, tracks, reviews);
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
      const reviews = await this.getAlbumReviews({ backlogItem });
      return this.mapAlbumDetails(null, backlogItem, [], reviews);
    }

    if (backlogItem.album_id !== album.id) {
      await this.backlogRepository.attachAlbum(backlogItem.id, album.id);
    }

    const [tracks, reviews] = await Promise.all([
      this.getTracklistForAlbumSafe(album),
      this.getAlbumReviews({ album, backlogItem }),
    ]);
    return this.mapAlbumDetails(album, backlogItem, tracks, reviews);
  }

  async getAlbumReviews({ album = null, backlogItem = null, limit = 25 } = {}) {
    const rows = await this.backlogRepository.listReviewsForAlbum({
      albumId: album?.id ?? null,
      artistNameRaw: backlogItem?.artist_name_raw ?? album?.artist?.name ?? null,
      albumTitleRaw: backlogItem?.album_title_raw ?? album?.title ?? null,
      limit,
    });

    const reviews = (Array.isArray(rows) ? rows : []).filter((row) => {
      return typeof row?.review_text === "string" && row.review_text.trim();
    });

    if (reviews.length === 0) return [];

    const userIds = [...new Set(reviews.map((row) => row?.user_id).filter((value) => typeof value === "string" && value.trim()))];
    const [users, profileMediaRows] = await Promise.all([
      this.userRepository.findPublicByIds(userIds),
      this.profileMediaRepository.listByUserIds(userIds),
    ]);
    const usersById = new Map((users ?? []).map((user) => [user.id, user]));
    const profileMediaById = new Map((profileMediaRows ?? []).map((item) => [item.id, item]));

    return reviews.map((row) => {
      const user = usersById.get(row.user_id);
      const media = profileMediaById.get(row.user_id);
      const username =
        typeof user?.username === "string" && user.username.trim() ? user.username.trim() : "unknown-user";

      return {
        backlogId: row.id,
        albumId: row.album_id,
        rating: row.rating ?? null,
        reviewText: row.review_text ?? null,
        reviewedAt: row.reviewed_at ?? null,
        addedAt: row.added_at ?? null,
        updatedAt: row.updated_at ?? null,
        user: {
          id: row.user_id ?? null,
          username,
          avatarUrl: resolvePublicAvatarUrl(user?.avatar_url, media?.avatar_path, this.supabaseUrl),
        },
      };
    });
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

  mapAlbumDetails(album, backlogItem, tracks = [], reviews = []) {
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
      reviews: Array.isArray(reviews) ? reviews : [],
      hydrated: Boolean(album),
    };
  }
}
