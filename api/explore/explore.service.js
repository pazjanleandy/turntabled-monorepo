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

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TRENDING_DEFAULT_LIMIT = 4;
const TRENDING_MAX_LIMIT = 12;
const TRENDING_INTERACTION_WINDOW_DAYS = 7;
const TRENDING_REVIEW_WINDOW_DAYS = 30;
const GRAMMY_WINNER_YEAR = 2026;
const GRAMMY_WINNERS_2026 = [
  {
    albumTitle: "DeB\u00CD TiRAR M\u00E1S FOToS",
    artistName: "Bad Bunny",
    category: "Album of the Year",
    titleAliases: ["Debi Tirar Mas Fotos"],
  },
  {
    albumTitle: "MAYHEM",
    artistName: "Lady Gaga",
    category: "Best Pop Vocal Album",
  },
  {
    albumTitle: "GNX",
    artistName: "Kendrick Lamar",
    category: "Best Rap Album",
  },
  {
    albumTitle: "NEVER ENOUGH",
    artistName: "Turnstile",
    category: "Best Rock Album",
  },
  {
    albumTitle: "Songs Of A Lost World",
    artistName: "The Cure",
    category: "Best Alternative Music Album",
  },
  {
    albumTitle: "EUSEXUA",
    artistName: "FKA twigs",
    category: "Best Dance/Electronic Album",
  },
  {
    albumTitle: "Beautifully Broken",
    artistName: "Jelly Roll",
    category: "Best Contemporary Country Album",
  },
];

function getTimestampMs(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getIsoDaysAgo(days) {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(0, Number(days)) : 0;
  return new Date(Date.now() - safeDays * DAY_IN_MS).toISOString();
}

function getLatestTimestampValue(...values) {
  let bestValue = null;
  let bestMs = 0;

  for (const value of values) {
    const ms = getTimestampMs(value);
    if (ms > bestMs) {
      bestMs = ms;
      bestValue = value;
    }
  }

  return bestValue;
}

function clampPositiveInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function buildReviewPreview(reviewText, maxLength = 220) {
  const normalized =
    typeof reviewText === "string" ? reviewText.replace(/\s+/g, " ").trim() : "";
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function calculateTrendingReviewScore({
  likeCount = 0,
  commentCount = 0,
  recentLikeCount = 0,
  recentCommentCount = 0,
  interactionCount = 0,
  latestActivityAt = null,
}) {
  const latestActivityMs = getTimestampMs(latestActivityAt);
  const ageDays =
    latestActivityMs > 0 ? Math.max(0, (Date.now() - latestActivityMs) / DAY_IN_MS) : 30;

  let freshnessBonus = 0;
  if (ageDays <= 1) freshnessBonus = 5;
  else if (ageDays <= 3) freshnessBonus = 3.5;
  else if (ageDays <= 7) freshnessBonus = 2;
  else if (ageDays <= 14) freshnessBonus = 0.75;

  const score =
    recentLikeCount * 4 +
    recentCommentCount * 6 +
    likeCount * 1.5 +
    commentCount * 2.5 +
    interactionCount * 0.75 +
    freshnessBonus;

  return Number(score.toFixed(3));
}

function resolveExploreCatalogSort(filter = "") {
  if (filter === "a-z") return "title-asc";
  if (filter === "z-a") return "title-desc";
  return "latest-desc";
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

  async getExplorePage(userId, page, limit, options = {}) {
    const sort = resolveExploreCatalogSort(options?.filter);
    const { rows, total } = await this.albumRepository.findLatestForExplore(page, limit, { sort });
    const resultItems = rows.map((row) => mapExploreAlbumItem(row));

    return {
      page,
      limit,
      scope: "catalog",
      sort,
      total,
      hydrationPendingCount: 0,
      items: resultItems,
    };
  }

  async getGrammyWinners2026() {
    const winners = await Promise.all(
      GRAMMY_WINNERS_2026.map(async (entry) => {
        const artist = await this.artistRepository.findByNormalizedName(entry.artistName);
        if (!artist?.id) return null;

        let album = null;
        const candidateTitles = [entry.albumTitle].concat(
          Array.isArray(entry.titleAliases) ? entry.titleAliases : []
        );
        for (const candidateTitle of candidateTitles) {
          album = await this.albumRepository.findByNormalized(artist.id, candidateTitle);
          if (album?.id) break;
        }
        if (!album?.id) return null;

        const coverArtUrl =
          album?.cover_art_url ??
          (album?.mbid ? `https://coverartarchive.org/release/${album.mbid}/front-500` : null);

        return {
          awardYear: GRAMMY_WINNER_YEAR,
          category: entry.category,
          album: {
            id: album.id,
            title: album?.title ?? entry.albumTitle,
            coverArtUrl,
            releaseDate: album?.release_date ?? null,
            primaryType: album?.primary_type ?? null,
          },
          artist: {
            id: artist.id,
            name: album?.artist?.name ?? artist?.name ?? entry.artistName,
            normalizedName: album?.artist?.normalized_name ?? artist?.normalized_name ?? null,
          },
        };
      })
    );

    const items = winners.filter(Boolean);
    return {
      scope: "grammy-winners-2026",
      awardYear: GRAMMY_WINNER_YEAR,
      total: items.length,
      items,
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
          coverArtUrl: album?.cover_art_url ?? (album?.mbid ? `https://coverartarchive.org/release/${album.mbid}/front-500` : null),
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

  async getTrendingReviews(limit = TRENDING_DEFAULT_LIMIT, options = {}) {
    const safeLimit = clampPositiveInt(limit, TRENDING_DEFAULT_LIMIT, 1, TRENDING_MAX_LIMIT);
    const interactionWindowDays = clampPositiveInt(
      options?.interactionWindowDays,
      TRENDING_INTERACTION_WINDOW_DAYS,
      1,
      30
    );
    const reviewWindowDays = clampPositiveInt(
      options?.reviewWindowDays,
      TRENDING_REVIEW_WINDOW_DAYS,
      interactionWindowDays,
      120
    );
    const recentSinceIso = getIsoDaysAgo(interactionWindowDays);
    const recentReviewSinceIso = getIsoDaysAgo(reviewWindowDays);
    const recentSinceMs = getTimestampMs(recentSinceIso);
    const candidatePoolLimit = Math.max(safeLimit * 12, 36);
    const supplementalReviewLimit = Math.max(safeLimit * 8, 24);

    const [recentReviews, recentLikeRows, recentCommentRows] = await Promise.all([
      this.backlogRepository.listRecentReviews({
        since: recentReviewSinceIso,
        limit: Math.max(candidatePoolLimit, supplementalReviewLimit),
      }),
      this.backlogRepository.listRecentReviewLikes({
        since: recentSinceIso,
        limit: Math.max(candidatePoolLimit * 8, 240),
      }),
      this.backlogRepository.listRecentReviewComments({
        since: recentSinceIso,
        limit: Math.max(candidatePoolLimit * 8, 240),
      }),
    ]);

    const recentReviewRows = Array.isArray(recentReviews)
      ? recentReviews.filter((row) => typeof row?.review_text === "string" && row.review_text.trim())
      : [];
    const recentLikeEntries = Array.isArray(recentLikeRows) ? recentLikeRows : [];
    const recentCommentEntries = Array.isArray(recentCommentRows) ? recentCommentRows : [];

    const seededReviewsById = new Map();
    const candidateMetaById = new Map();

    const getCandidateMeta = (backlogId) => {
      if (typeof backlogId !== "string" || !backlogId.trim()) return null;
      let entry = candidateMetaById.get(backlogId);
      if (!entry) {
        entry = {
          recentLikeUserIds: new Set(),
          recentCommentCount: 0,
          recentReviewAtMs: 0,
          latestActivityMs: 0,
        };
        candidateMetaById.set(backlogId, entry);
      }
      return entry;
    };

    for (const row of recentReviewRows) {
      const backlogId = row?.id;
      const entry = getCandidateMeta(backlogId);
      if (!entry) continue;

      const reviewActivityMs = Math.max(
        getTimestampMs(row?.reviewed_at),
        getTimestampMs(row?.updated_at),
        getTimestampMs(row?.added_at)
      );
      entry.recentReviewAtMs = Math.max(entry.recentReviewAtMs, reviewActivityMs);
      entry.latestActivityMs = Math.max(entry.latestActivityMs, reviewActivityMs);
      seededReviewsById.set(backlogId, row);
    }

    for (const row of recentLikeEntries) {
      const backlogId = row?.backlog_id;
      const entry = getCandidateMeta(backlogId);
      const userId = row?.user_id;
      if (!entry || typeof userId !== "string" || !userId.trim()) continue;

      entry.recentLikeUserIds.add(userId);
      entry.latestActivityMs = Math.max(entry.latestActivityMs, getTimestampMs(row?.created_at));
    }

    for (const row of recentCommentEntries) {
      const backlogId = row?.backlog_id;
      const entry = getCandidateMeta(backlogId);
      if (!entry) continue;

      entry.recentCommentCount += 1;
      entry.latestActivityMs = Math.max(
        entry.latestActivityMs,
        getTimestampMs(row?.updated_at),
        getTimestampMs(row?.created_at)
      );
    }

    let rankedCandidateIds = Array.from(candidateMetaById.entries())
      .map(([backlogId, meta]) => {
        const recentLikeCount = meta.recentLikeUserIds.size;
        const recentCommentCount = meta.recentCommentCount;
        const recentInteractionCount = recentLikeCount + recentCommentCount;
        const preliminaryScore =
          recentLikeCount * 4 +
          recentCommentCount * 6 +
          recentInteractionCount * 0.75 +
          (meta.recentReviewAtMs > 0 ? 2 : 0);

        return {
          backlogId,
          preliminaryScore,
          latestActivityMs: meta.latestActivityMs,
        };
      })
      .sort((a, b) => {
        if (b.preliminaryScore !== a.preliminaryScore) {
          return b.preliminaryScore - a.preliminaryScore;
        }
        return b.latestActivityMs - a.latestActivityMs;
      })
      .slice(0, candidatePoolLimit)
      .map((item) => item.backlogId);

    if (rankedCandidateIds.length < candidatePoolLimit) {
      const supplementalReviews = await this.backlogRepository.listRecentReviews({
        limit: supplementalReviewLimit,
      });

      for (const row of Array.isArray(supplementalReviews) ? supplementalReviews : []) {
        if (typeof row?.review_text !== "string" || !row.review_text.trim()) continue;
        if (typeof row?.id !== "string" || !row.id.trim()) continue;
        if (seededReviewsById.has(row.id)) continue;

        seededReviewsById.set(row.id, row);
        rankedCandidateIds.push(row.id);
        if (rankedCandidateIds.length >= candidatePoolLimit) break;
      }
    }

    rankedCandidateIds = [...new Set(rankedCandidateIds)].slice(0, candidatePoolLimit);
    if (rankedCandidateIds.length === 0) {
      return {
        scope: "trending-reviews",
        limit: safeLimit,
        windowDays: interactionWindowDays,
        reviewWindowDays,
        rankedBy: [
          "recentCommentCount:desc",
          "recentLikeCount:desc",
          "interactionCount:desc",
          "latestActivityAt:desc",
        ],
        items: [],
      };
    }

    const missingReviewIds = rankedCandidateIds.filter((backlogId) => !seededReviewsById.has(backlogId));
    if (missingReviewIds.length > 0) {
      const missingReviewRows = await this.backlogRepository.listReviewsByIds(missingReviewIds);
      for (const row of Array.isArray(missingReviewRows) ? missingReviewRows : []) {
        if (typeof row?.review_text !== "string" || !row.review_text.trim()) continue;
        if (typeof row?.id !== "string" || !row.id.trim()) continue;
        seededReviewsById.set(row.id, row);
      }
    }

    const reviewRows = rankedCandidateIds
      .map((backlogId) => seededReviewsById.get(backlogId))
      .filter((row) => typeof row?.id === "string" && row.id.trim());

    const reviewIds = reviewRows.map((row) => row.id);
    if (reviewIds.length === 0) {
      return {
        scope: "trending-reviews",
        limit: safeLimit,
        windowDays: interactionWindowDays,
        reviewWindowDays,
        rankedBy: [
          "recentCommentCount:desc",
          "recentLikeCount:desc",
          "interactionCount:desc",
          "latestActivityAt:desc",
        ],
        items: [],
      };
    }

    const [likeRows, commentRows] = await Promise.all([
      this.backlogRepository.listReviewLikesForBacklogIds(reviewIds),
      this.backlogRepository.listReviewCommentsForBacklogIds(reviewIds, candidatePoolLimit * 50),
    ]);

    const likesByBacklogId = new Map();
    for (const row of Array.isArray(likeRows) ? likeRows : []) {
      const backlogId = row?.backlog_id;
      const userId = row?.user_id;
      if (typeof backlogId !== "string" || !backlogId.trim()) continue;
      if (typeof userId !== "string" || !userId.trim()) continue;

      let entry = likesByBacklogId.get(backlogId);
      if (!entry) {
        entry = {
          userIds: new Set(),
          recentUserIds: new Set(),
          latestActivityAt: null,
        };
        likesByBacklogId.set(backlogId, entry);
      }

      entry.userIds.add(userId);
      const createdAt = row?.created_at ?? null;
      if (getTimestampMs(createdAt) >= recentSinceMs) {
        entry.recentUserIds.add(userId);
      }
      entry.latestActivityAt = getLatestTimestampValue(entry.latestActivityAt, createdAt);
    }

    const commentsByBacklogId = new Map();
    for (const row of Array.isArray(commentRows) ? commentRows : []) {
      const backlogId = row?.backlog_id;
      if (typeof backlogId !== "string" || !backlogId.trim()) continue;

      let entry = commentsByBacklogId.get(backlogId);
      if (!entry) {
        entry = {
          count: 0,
          recentCount: 0,
          latestActivityAt: null,
          topComments: [],
        };
        commentsByBacklogId.set(backlogId, entry);
      }

      entry.count += 1;
      const activityAt = getLatestTimestampValue(row?.updated_at ?? null, row?.created_at ?? null);
      const activityAtMs = getTimestampMs(activityAt);
      if (getTimestampMs(activityAt) >= recentSinceMs) {
        entry.recentCount += 1;
      }
      entry.latestActivityAt = getLatestTimestampValue(entry.latestActivityAt, activityAt);

      const commentText =
        typeof row?.comment_text === "string" ? row.comment_text.trim() : "";
      const commentUserId =
        typeof row?.user_id === "string" && row.user_id.trim() ? row.user_id.trim() : null;

      if (commentText && commentUserId) {
        entry.topComments.push({
          id: row?.id ?? null,
          userId: commentUserId,
          commentText,
          createdAt: row?.created_at ?? null,
          updatedAt: row?.updated_at ?? null,
          activityAtMs,
        });
        entry.topComments.sort((a, b) => b.activityAtMs - a.activityAtMs);
        if (entry.topComments.length > 2) {
          entry.topComments.length = 2;
        }
      }
    }

    const trendingCommentUserIds = Array.from(commentsByBacklogId.values()).flatMap((entry) =>
      Array.isArray(entry?.topComments) ? entry.topComments.map((comment) => comment?.userId) : []
    );
    const userIds = [
      ...new Set(
        reviewRows
          .map((row) => row?.user_id)
          .filter((value) => typeof value === "string" && value.trim())
          .concat(
            trendingCommentUserIds.filter((value) => typeof value === "string" && value.trim())
          )
      ),
    ];
    const albumIds = [
      ...new Set(
        reviewRows
          .map((row) => row?.album_id)
          .filter((value) => typeof value === "string" && value.trim())
      ),
    ];

    const [users, profileMediaRows, albums] = await Promise.all([
      this.userRepository.findPublicByIds(userIds),
      this.profileMediaRepository.listByUserIds(userIds),
      this.albumRepository.findByIds(albumIds),
    ]);

    const usersById = new Map((users ?? []).map((user) => [user.id, user]));
    const profileMediaById = new Map((profileMediaRows ?? []).map((item) => [item.id, item]));
    const albumsById = new Map((albums ?? []).map((album) => [album.id, album]));

    const items = reviewRows
      .map((row) => {
        const likeMeta = likesByBacklogId.get(row.id);
        const commentMeta = commentsByBacklogId.get(row.id);
        const likeCount = likeMeta?.userIds?.size ?? 0;
        const commentCount = commentMeta?.count ?? 0;
        const recentLikeCount = likeMeta?.recentUserIds?.size ?? 0;
        const recentCommentCount = commentMeta?.recentCount ?? 0;
        const interactionCount = likeCount + commentCount;
        const recentInteractionCount = recentLikeCount + recentCommentCount;
        const latestActivityAt = getLatestTimestampValue(
          row?.reviewed_at ?? null,
          row?.updated_at ?? null,
          row?.added_at ?? null,
          likeMeta?.latestActivityAt ?? null,
          commentMeta?.latestActivityAt ?? null
        );
        const reviewScore = calculateTrendingReviewScore({
          likeCount,
          commentCount,
          recentLikeCount,
          recentCommentCount,
          interactionCount,
          latestActivityAt,
        });
        const album = row?.album_id ? albumsById.get(row.album_id) : null;
        const user = usersById.get(row.user_id);
        const profileMedia = profileMediaById.get(row.user_id);
        const username =
          typeof user?.username === "string" && user.username.trim() ? user.username.trim() : "unknown-user";
        const coverArtUrl =
          album?.cover_art_url ??
          (album?.mbid ? `https://coverartarchive.org/release/${album.mbid}/front-500` : null);
        const topComments = Array.isArray(commentMeta?.topComments)
          ? commentMeta.topComments
              .slice(0, 2)
              .map((comment) => {
                const commentUser = usersById.get(comment?.userId);
                const commentProfileMedia = profileMediaById.get(comment?.userId);
                const commentUsername =
                  typeof commentUser?.username === "string" && commentUser.username.trim()
                    ? commentUser.username.trim()
                    : "unknown-user";

                return {
                  id: comment?.id ?? null,
                  commentText: buildReviewPreview(comment?.commentText ?? "", 150),
                  createdAt: comment?.createdAt ?? null,
                  updatedAt: comment?.updatedAt ?? null,
                  user: {
                    id: comment?.userId ?? null,
                    username: commentUsername,
                    avatarUrl: resolvePublicAvatarUrl(
                      commentUser?.avatar_url,
                      commentProfileMedia?.avatar_path,
                      this.supabaseUrl
                    ),
                  },
                };
              })
          : [];

        return {
          backlogId: row.id,
          rating: typeof row?.rating === "number" ? row.rating : null,
          reviewText: row.review_text ?? "",
          previewText: buildReviewPreview(row.review_text),
          reviewedAt: row.reviewed_at ?? null,
          addedAt: row.added_at ?? null,
          updatedAt: row.updated_at ?? null,
          latestActivityAt,
          score: reviewScore,
          engagement: {
            likeCount,
            commentCount,
            interactionCount,
            recentLikeCount,
            recentCommentCount,
            recentInteractionCount,
          },
          topComments,
          album: {
            id: album?.id ?? row?.album_id ?? null,
            routeId: album?.id ?? row?.id ?? null,
            title: album?.title ?? row?.album_title_raw ?? "Unknown Album",
            artistName: album?.artist?.name ?? row?.artist_name_raw ?? "Unknown Artist",
            coverArtUrl,
            releaseDate: album?.release_date ?? null,
            primaryType: album?.primary_type ?? null,
          },
          reviewer: {
            id: row?.user_id ?? null,
            username,
            avatarUrl: resolvePublicAvatarUrl(
              user?.avatar_url,
              profileMedia?.avatar_path,
              this.supabaseUrl
            ),
          },
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return getTimestampMs(b.latestActivityAt) - getTimestampMs(a.latestActivityAt);
      })
      .slice(0, safeLimit);

    return {
      scope: "trending-reviews",
      limit: safeLimit,
      windowDays: interactionWindowDays,
      reviewWindowDays,
      rankedBy: [
        "recentCommentCount:desc",
        "recentLikeCount:desc",
        "interactionCount:desc",
        "latestActivityAt:desc",
      ],
      items,
    };
  }

  async getAlbumDetails(id, viewerUserId = null) {
    const fromAlbum = await this.albumRepository.findDetailedById(id);
    if (fromAlbum) {
      const [tracks, reviews] = await Promise.all([
        this.getTracklistForAlbumSafe(fromAlbum),
        this.getAlbumReviews({ album: fromAlbum, viewerUserId }),
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
      const reviews = await this.getAlbumReviews({ backlogItem, viewerUserId });
      return this.mapAlbumDetails(null, backlogItem, [], reviews);
    }

    if (backlogItem.album_id !== album.id) {
      await this.backlogRepository.attachAlbum(backlogItem.id, album.id);
    }

    const [tracks, reviews] = await Promise.all([
      this.getTracklistForAlbumSafe(album),
      this.getAlbumReviews({ album, backlogItem, viewerUserId }),
    ]);
    return this.mapAlbumDetails(album, backlogItem, tracks, reviews);
  }

  async getAlbumReviews({ album = null, backlogItem = null, viewerUserId = null, limit = 25 } = {}) {
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

    const reviewBacklogIds = [
      ...new Set(
        reviews.map((row) => row?.id).filter((value) => typeof value === "string" && value.trim())
      ),
    ];
    const [likeRows, commentRows] = await Promise.all([
      this.backlogRepository.listReviewLikesForBacklogIds(reviewBacklogIds),
      this.backlogRepository.listReviewCommentsForBacklogIds(reviewBacklogIds),
    ]);

    const likesByBacklogId = new Map();
    for (const row of Array.isArray(likeRows) ? likeRows : []) {
      const backlogId = row?.backlog_id;
      const userId = row?.user_id;
      if (typeof backlogId !== "string" || !backlogId.trim()) continue;
      if (typeof userId !== "string" || !userId.trim()) continue;

      let entry = likesByBacklogId.get(backlogId);
      if (!entry) {
        entry = { count: 0, userIds: new Set() };
        likesByBacklogId.set(backlogId, entry);
      }
      if (!entry.userIds.has(userId)) {
        entry.userIds.add(userId);
        entry.count += 1;
      }
    }

    const commentsByBacklogId = new Map();
    for (const row of Array.isArray(commentRows) ? commentRows : []) {
      const backlogId = row?.backlog_id;
      if (typeof backlogId !== "string" || !backlogId.trim()) continue;
      const current = commentsByBacklogId.get(backlogId) ?? [];
      current.push(row);
      commentsByBacklogId.set(backlogId, current);
    }

    const userIds = [
      ...new Set(
        [
          ...reviews.map((row) => row?.user_id),
          ...(Array.isArray(commentRows) ? commentRows.map((row) => row?.user_id) : []),
        ].filter((value) => typeof value === "string" && value.trim())
      ),
    ];
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
      const likeMeta = likesByBacklogId.get(row.id) ?? { count: 0, userIds: new Set() };
      const reviewComments = commentsByBacklogId.get(row.id) ?? [];

      return {
        backlogId: row.id,
        albumId: row.album_id,
        rating: row.rating ?? null,
        reviewText: row.review_text ?? null,
        reviewedAt: row.reviewed_at ?? null,
        addedAt: row.added_at ?? null,
        updatedAt: row.updated_at ?? null,
        likeCount: likeMeta.count,
        viewerHasLiked:
          typeof viewerUserId === "string" && viewerUserId.trim()
            ? likeMeta.userIds.has(viewerUserId)
            : false,
        commentCount: reviewComments.length,
        comments: reviewComments.map((commentRow) => {
          const commentUser = usersById.get(commentRow.user_id);
          const commentMedia = profileMediaById.get(commentRow.user_id);
          const commentUsername =
            typeof commentUser?.username === "string" && commentUser.username.trim()
              ? commentUser.username.trim()
              : "unknown-user";

          return {
            id: commentRow.id,
            backlogId: commentRow.backlog_id,
            commentText: commentRow.comment_text ?? "",
            createdAt: commentRow.created_at ?? null,
            updatedAt: commentRow.updated_at ?? null,
            user: {
              id: commentRow.user_id ?? null,
              username: commentUsername,
              avatarUrl: resolvePublicAvatarUrl(
                commentUser?.avatar_url,
                commentMedia?.avatar_path,
                this.supabaseUrl
              ),
            },
          };
        }),
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
