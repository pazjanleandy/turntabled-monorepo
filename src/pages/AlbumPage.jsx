import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CalendarPlus, NotePencil, Star } from "phosphor-react";
import Navbar from "../components/Navbar.jsx";
import NavbarGuest from "../components/NavbarGuest.jsx";
import BackButton from "../components/BackButton.jsx";
import CoverImage from "../components/CoverImage.jsx";
import StarRating from "../components/StarRating.jsx";
import LogDatesModal from "../components/album/LogDatesModal.jsx";
import ReviewModal from "../components/album/ReviewModal.jsx";
import useAuthStatus from "../hooks/useAuthStatus.js";
import { supabase } from "../supabase.js";

function LogCard({ onLogDates, onWriteReview, disabled }) {
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
            title={disabled ? "Login required" : "Log your dates"}
          >
            <CalendarPlus size={14} weight="bold" />
            Log your dates
          </button>
        </div>
      </div>

      <div className="mt-3">
        <StarRating value={0} readOnly={disabled} size={16} />
      </div>
    </div>
  );
}

export default function AlbumPage() {
  const { releaseId } = useParams();
  const { isSignedIn } = useAuthStatus();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isLogDatesOpen, setIsLogDatesOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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
  }, [releaseId]);

  const safeAlbum = useMemo(() => {
    if (!album) return null;
    return {
      ...album,
      tracks: Array.isArray(album.tracks) ? album.tracks : [],
      genres: Array.isArray(album.genres) ? album.genres : ["Unknown"],
    };
  }, [album]);

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
                alt={`${safeAlbum.title} cover`}
                className="aspect-square w-full max-w-[220px] rounded-2xl object-cover shadow-[0_14px_28px_-22px_rgba(15,15,15,0.35)]"
              />

              <div className="mt-4 lg:hidden">
                <LogCard
                  onLogDates={() => setIsLogDatesOpen(true)}
                  onWriteReview={() => setIsReviewOpen(true)}
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
      </div>

      <LogDatesModal
        isOpen={isLogDatesOpen}
        onClose={() => setIsLogDatesOpen(false)}
        albumTitle={safeAlbum?.title}
      />
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        albumTitle={safeAlbum?.title}
      />
    </div>
  );
}
