import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { CalendarPlus, NotePencil, Star } from "phosphor-react";
import Navbar from "../components/Navbar.jsx";
import NavbarGuest from "../components/NavbarGuest.jsx";
import BackButton from "../components/BackButton.jsx";
import CoverImage from "../components/CoverImage.jsx";
import StarRating from "../components/StarRating.jsx";
import LogDatesModal from "../components/album/LogDatesModal.jsx";
import ReviewModal from "../components/album/ReviewModal.jsx";
import useAuthStatus from "../hooks/useAuthStatus.js";
import { albumCatalog } from "../data/albumData.js";

function LogCard({ onLogDates, onWriteReview }) {
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
            className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onWriteReview}
          >
            <NotePencil size={14} weight="bold" />
            Write a review
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onLogDates}
          >
            <CalendarPlus size={14} weight="bold" />
            Log your dates
          </button>
        </div>
      </div>

      <div className="mt-3">
        <StarRating value={0} readOnly={false} size={16} />
      </div>
    </div>
  );
}

export default function AlbumPage() {
  const { releaseId } = useParams();
  const { isSignedIn } = useAuthStatus();
  const album = albumCatalog[releaseId];
  const [isLogDatesOpen, setIsLogDatesOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  if (!album) {
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
              We could not find that album release. Try browsing the explore page.
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
      {/* Slightly narrower max width so the hero doesn't feel like a billboard */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}
        <BackButton className="self-start" />

        {/* HERO */}
        <section className="card vinyl-texture">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:gap-10">
            {/* Cover */}
            <div className="min-w-0">
              <CoverImage
                src={album.cover}
                alt={`${album.title} cover`}
                className="aspect-square w-full max-w-[220px] rounded-2xl object-cover shadow-[0_14px_28px_-22px_rgba(15,15,15,0.35)]"
              />

              {/* On small screens, show the log card under the cover */}
              <div className="mt-4 lg:hidden">
                <LogCard
                  onLogDates={() => setIsLogDatesOpen(true)}
                  onWriteReview={() => setIsReviewOpen(true)}
                />
              </div>
            </div>

            {/* Album info */}
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Album
              </p>

              <h1 className="mb-1 text-3xl text-text leading-tight">
                {album.title}
              </h1>
              <p className="mb-4 text-sm font-semibold text-text">{album.artist}</p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {album.type}
                </span>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {album.format}
                </span>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
                  {album.length}
                </span>
              </div>

              {/* Make metadata feel intentionally filled instead of sparse */}
              <div className="mt-5 grid grid-cols-1 gap-2 text-xs text-muted sm:grid-cols-2">
                <p className="mb-0">
                  <span className="font-semibold text-text">Release date:</span>{" "}
                  {album.releaseDate}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Label:</span>{" "}
                  {album.label}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Catalog:</span>{" "}
                  {album.catalogNumber}
                </p>
                <p className="mb-0">
                  <span className="font-semibold text-text">Genres:</span>{" "}
                  {album.genres.join(", ")}
                </p>
              </div>
            </div>

            {/* Right sidebar actions (desktop) */}
            <aside className="hidden min-w-0 lg:block">
              <LogCard
                onLogDates={() => setIsLogDatesOpen(true)}
                onWriteReview={() => setIsReviewOpen(true)}
              />
            </aside>
          </div>
        </section>

        {/* TRACKLIST */}
        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Tracklist
              </p>
              <h2 className="mb-0 text-xl text-text">All tracks</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              {album.tracks.length} tracks
            </span>
          </div>

          <ul className="mt-4 divide-y divide-black/5">
            {album.tracks.map((track) => (
              <li
                key={`${track.number}-${track.title}`}
                className="flex items-center gap-4 py-3"
              >
                <span className="w-6 text-xs font-semibold text-muted">
                  {String(track.number).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-0 truncate text-sm font-semibold text-text">
                    {track.title}
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted">
                  {track.length}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <LogDatesModal
        isOpen={isLogDatesOpen}
        onClose={() => setIsLogDatesOpen(false)}
        albumTitle={album?.title}
      />
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        albumTitle={album?.title}
      />
    </div>
  );
}
