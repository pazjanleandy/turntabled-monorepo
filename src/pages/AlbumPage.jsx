import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalendarPlus, Heart, NotePencil, Star } from "phosphor-react";
import Navbar from "../components/Navbar.jsx";
import NavbarGuest from "../components/NavbarGuest.jsx";
import BackButton from "../components/BackButton.jsx";
import CoverImage from "../components/CoverImage.jsx";
import StarRating from "../components/StarRating.jsx";
import LogDatesModal from "../components/album/LogDatesModal.jsx";
import ReviewModal from "../components/album/ReviewModal.jsx";
import useAuthStatus from "../hooks/useAuthStatus.js";
import { buildApiAuthHeaders } from "../lib/apiAuth.js";
import { supabase } from "../supabase.js";

const BACKLOG_UPDATED_EVENT_NAME = "turntabled:backlog-updated";

function LogCard({
  onLogDates,
  onWriteReview,
  onFavorite,
  isFavorited = false,
  favoriteBusy = false,
  disabled,
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-[0_18px_36px_-26px_rgba(15,15,15,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Log this album
          </p>
          <div className="flex items-center gap-2">
            <Star size={14} weight="fill" className="text-accent" />
            <p className="mb-0 text-sm font-semibold text-text">Rate it</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${
              isFavorited
                ? "border-orange-500/35 bg-accent/15 text-accent hover:bg-accent/20 disabled:opacity-100"
                : "border-black/5 bg-white/90 text-text hover:bg-white disabled:opacity-50"
            }`}
            onClick={onFavorite}
            disabled={disabled || favoriteBusy}
            title={
              disabled
                ? "Login required"
                : isFavorited
                  ? "Remove from favorites"
                  : "Add to favorites"
            }
          >
            <Heart size={14} weight={isFavorited ? "fill" : "bold"} />
            {favoriteBusy ? "Saving..." : isFavorited ? "Favorited" : "Favorite"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onWriteReview}
            disabled={disabled}
            title={disabled ? "Login required" : "Write a review"}
          >
            <NotePencil size={14} weight="bold" />
            Write a review
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onLogDates}
            disabled={disabled}
            title={disabled ? "Login required" : "Log album"}
          >
            <CalendarPlus size={14} weight="bold" />
            Log album
          </button>
        </div>
      </div>

      <div className="mt-3">
        <StarRating value={0} readOnly={disabled} size={16} />
      </div>
    </div>
  );
}

function formatReviewDate(value) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReviewerInitials(username = "") {
  const normalized = String(username).trim().replace(/^@/, "");
  if (!normalized) return "U";
  return normalized.slice(0, 2).toUpperCase();
}

function AlbumReviewCard({ review }) {
  const username =
    typeof review?.user?.username === "string" && review.user.username.trim()
      ? review.user.username.trim()
      : "unknown-user";
  const profilePath =
    username && username !== "unknown-user" ? `/friends/${encodeURIComponent(username)}` : null;
  const ratingValue = typeof review?.rating === "number" ? review.rating : 0;

  return (
    <article className="flex items-start gap-3 py-4">
      <div className="mt-0.5">
        {review?.user?.avatarUrl ? (
          <img
            src={review.user.avatarUrl}
            alt={`${username} avatar`}
            className="h-10 w-10 rounded-full border border-black/10 object-cover"
          />
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-xs font-semibold uppercase text-accent">
            {getReviewerInitials(username)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="mb-0 text-sm text-muted">Review by</p>
          {profilePath ? (
            <Link
              to={profilePath}
              className="text-sm font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              @{username.replace(/^@/, "")}
            </Link>
          ) : (
            <p className="mb-0 text-sm font-semibold text-text">@{username.replace(/^@/, "")}</p>
          )}
          <StarRating value={ratingValue} readOnly size={13} />
          <span className="text-xs font-semibold text-muted">{ratingValue}/5</span>
          <span className="text-xs text-muted">{formatReviewDate(review?.reviewedAt ?? review?.addedAt)}</span>
        </div>
        <p className="mb-0 mt-2 whitespace-pre-wrap text-sm text-slate-700">{review?.reviewText}</p>
      </div>
    </article>
  );
}

export default function AlbumPage() {
  const { releaseId } = useParams();
  const { isSignedIn } = useAuthStatus();
  const [album, setAlbum] = useState(null);
  const [albumRefreshKey, setAlbumRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isLogDatesOpen, setIsLogDatesOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [logNotice, setLogNotice] = useState("");
  const [backlogItem, setBacklogItem] = useState(null);
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadAlbum() {
      setIsLoading(true);
      setLoadError("");

      try {
        const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
        const username = window.localStorage.getItem("lastfmUsername");
        const headers = {};

        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (userId) headers["x-user-id"] = userId;
        if (username) headers["x-username"] = username;

        const params = new URLSearchParams({ id: releaseId ?? "" });
        const response = await fetch(`${apiBase}/api/explore/album?${params.toString()}`, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load album details.");
        }

        const payload = await response.json();
        if (!cancelled) {
          setAlbum(payload?.item ?? null);
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        if (!cancelled) {
          setLoadError(error?.message ?? "Unable to load album details.");
          setAlbum(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAlbum();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [releaseId, albumRefreshKey]);

  const safeAlbum = useMemo(() => {
    if (!album) return null;
    return {
      ...album,
      tracks: Array.isArray(album.tracks) ? album.tracks : [],
      reviews: Array.isArray(album.reviews) ? album.reviews : [],
      genres: Array.isArray(album.genres) ? album.genres : ["Unknown"],
    };
  }, [album]);

  useEffect(() => {
    if (!isSignedIn || !safeAlbum?.id) {
      setBacklogItem(null);
      return;
    }

    let cancelled = false;

    async function loadBacklogItem() {
      try {
        const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
        const authHeaders = await buildApiAuthHeaders();
        const params = new URLSearchParams({ albumId: safeAlbum.id });
        const response = await fetch(`${apiBase}/api/backlog?${params.toString()}`, {
          headers: authHeaders,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load existing review.");
        }

        if (!cancelled) {
          setBacklogItem(payload?.item ?? null);
        }
      } catch {
        if (!cancelled) {
          setBacklogItem(null);
        }
      }
    }

    loadBacklogItem();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, safeAlbum?.id]);

  const emitBacklogUpdated = () => {
    window.dispatchEvent(new CustomEvent(BACKLOG_UPDATED_EVENT_NAME));
  };

  const handleBacklogSaved = (item, notice, { refreshAlbum = false } = {}) => {
    setBacklogItem(item ?? null);
    if (notice) {
      setLogNotice(notice);
      window.setTimeout(() => setLogNotice(""), 2200);
    }
    if (refreshAlbum) {
      setAlbumRefreshKey((current) => current + 1);
    }
    emitBacklogUpdated();
  };

  const handleFavoriteClick = async () => {
    if (!isSignedIn || !safeAlbum?.id || isFavoriteSaving) return;

    setIsFavoriteSaving(true);
    try {
      const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL ?? "";
      const authHeaders = await buildApiAuthHeaders();
      const nextIsFavorite = !backlogItem?.isFavorite;
      let item = backlogItem;

      if (!item?.id && nextIsFavorite) {
        const createResponse = await fetch(`${apiBase}/api/backlog`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            albumId: safeAlbum.id,
            artistNameRaw: safeAlbum.artist,
            albumTitleRaw: safeAlbum.title,
            status: "listened",
            rating: 5,
            isFavorite: true,
          }),
        });
        const createPayload = await createResponse.json().catch(() => null);
        if (!createResponse.ok) {
          throw new Error(createPayload?.error?.message ?? "Failed to add album to favorites.");
        }
        item = createPayload?.item ?? null;
      }

      if (item?.id && item?.isFavorite !== nextIsFavorite) {
        const favoriteResponse = await fetch(
          `${apiBase}/api/profile/favorites?id=${encodeURIComponent(item.id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify({ isFavorite: nextIsFavorite }),
          },
        );
        const favoritePayload = await favoriteResponse.json().catch(() => null);
        if (!favoriteResponse.ok) {
          throw new Error(
            favoritePayload?.error?.message ??
              (nextIsFavorite
                ? "Failed to add album to favorites."
                : "Failed to remove album from favorites."),
          );
        }
      }

      handleBacklogSaved(
        item
          ? {
              ...item,
              isFavorite: nextIsFavorite,
              status: item.status || "listened",
            }
          : null,
        nextIsFavorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch (error) {
      setLogNotice(
        error?.message ??
          (backlogItem?.isFavorite
            ? "Unable to remove album from favorites."
            : "Unable to add album to favorites."),
      );
      window.setTimeout(() => setLogNotice(""), 2400);
    } finally {
      setIsFavoriteSaving(false);
    }
  };

  const isAlbumFavorited = Boolean(backlogItem?.isFavorite);

  if (isLoading) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          {isSignedIn ? (
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          ) : (
            <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          )}
          <BackButton className="self-start" />
          <section className="card vinyl-texture">
            <p className="mb-0 text-sm text-muted">Loading album details...</p>
          </section>
        </div>
      </div>
    );
  }

  if (!safeAlbum) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          {isSignedIn ? (
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          ) : (
            <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          )}
          <BackButton className="self-start" />

          <section className="card vinyl-texture">
            <h1 className="mb-2 text-2xl">Album not found</h1>
            <p className="mb-4 text-sm text-muted">
              {loadError || "We could not find that album release. Try browsing the explore page."}
            </p>
            <Link className="btn-primary inline-flex px-4 py-2 text-sm" to="/explore">
              Back to explore
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-10">
            <div className="min-w-0">
              <CoverImage
                src={safeAlbum.cover || "/album/am.jpg"}
                alt={`${safeAlbum.title} by ${safeAlbum.artist} cover`}
                className="w-full max-w-[220px] shadow-[0_14px_28px_-22px_rgba(15,15,15,0.35)]"
              />

              <div className="mt-4 lg:hidden">
                <LogCard
                  onLogDates={() => setIsLogDatesOpen(true)}
                  onWriteReview={() => setIsReviewOpen(true)}
                  onFavorite={handleFavoriteClick}
                  isFavorited={isAlbumFavorited}
                  favoriteBusy={isFavoriteSaving}
                  disabled={!isSignedIn}
                />
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Album
              </p>

              <h1 className="mb-1 text-3xl text-text leading-tight">{safeAlbum.title}</h1>
              <p className="mb-4 text-sm font-semibold text-text">{safeAlbum.artist}</p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {safeAlbum.type}
                </span>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {safeAlbum.format}
                </span>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {safeAlbum.length}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-muted sm:grid-cols-2">
                <p className="mb-0">
                  <span className="font-semibold text-text">Release date:</span>{" "}
                  {safeAlbum.releaseDate || "Unknown"}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Label:</span> {safeAlbum.label}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Catalog:</span>{" "}
                  {safeAlbum.catalogNumber}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Genres:</span>{" "}
                  {safeAlbum.genres.join(", ")}
                </p>
              </div>
            </div>

            <aside className="hidden min-w-0 lg:block">
              <LogCard
                onLogDates={() => setIsLogDatesOpen(true)}
                onWriteReview={() => setIsReviewOpen(true)}
                onFavorite={handleFavoriteClick}
                isFavorited={isAlbumFavorited}
                favoriteBusy={isFavoriteSaving}
                disabled={!isSignedIn}
              />
            </aside>
          </div>
        </section>

        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Tracklist
              </p>
              <h2 className="mb-0 text-xl text-text">All tracks</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              {safeAlbum.tracks.length} tracks
            </span>
          </div>

          {safeAlbum.tracks.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted">
              Track details are still syncing.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-black/5">
              {safeAlbum.tracks.map((track) => (
                <li
                  key={`${track.number}-${track.title}`}
                  className="flex items-center gap-4 py-3"
                >
                  <span className="w-6 text-xs font-semibold text-muted">
                    {String(track.number).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0 truncate text-sm font-semibold text-text">{track.title}</p>
                  </div>
                  <span className="text-xs font-semibold text-muted">{track.length}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Reviews
              </p>
              <h2 className="mb-0 text-xl text-text">Community reviews</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              {safeAlbum.reviews.length} review{safeAlbum.reviews.length === 1 ? "" : "s"}
            </span>
          </div>

          {safeAlbum.reviews.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted">
              No reviews yet. Be the first to review this album.
            </div>
          ) : (
            <div className="mt-2 divide-y divide-black/5">
              {safeAlbum.reviews.map((review) => (
                <AlbumReviewCard
                  key={review?.backlogId ?? `${review?.user?.id ?? "user"}-${review?.reviewedAt ?? ""}`}
                  review={review}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {logNotice ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800 shadow-[0_14px_30px_-20px_rgba(15,15,15,0.45)]">
          {logNotice}
        </div>
      ) : null}

      <LogDatesModal
        isOpen={isLogDatesOpen}
        onClose={() => setIsLogDatesOpen(false)}
        albumId={safeAlbum?.id}
        backlogId={backlogItem?.id ?? ""}
        albumTitle={safeAlbum?.title}
        albumArtist={safeAlbum?.artist}
        albumArt={safeAlbum?.cover}
        initialStatus={backlogItem?.status ?? "backloggd"}
        initialRating={backlogItem?.rating ?? 0}
        initialReviewText={backlogItem?.reviewText ?? ""}
        initialListenedOn={backlogItem?.addedAt ?? ""}
        onSaved={(item) => {
          handleBacklogSaved(item, "Log saved", { refreshAlbum: true })
        }}
      />
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        backlogId={backlogItem?.id ?? ''}
        albumTitle={safeAlbum?.title}
        initialReviewText={backlogItem?.reviewText ?? ''}
        onSaved={(item) => {
          handleBacklogSaved(item, "Review updated", { refreshAlbum: true })
        }}
      />
    </div>
  );
}
