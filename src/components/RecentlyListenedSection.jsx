import { useMemo } from 'react'
import { Headphones } from 'phosphor-react'
import StarRating from './StarRating.jsx'
import CoverImage from './CoverImage.jsx'

function AlbumTile({ album, artist, cover, ratingValue }) {
  return (
    <div className="group w-full snap-start space-y-3">
      <div className="overflow-hidden bg-white/85 shadow-subtle transition group-hover:-translate-y-1 group-hover:shadow-lg">
        <CoverImage
          src={cover}
          alt={`${album} by ${artist} cover`}
          className="h-[160px] w-[160px] md:h-[176px] md:w-[176px]"
        />
      </div>
      <div className="space-y-1">
        <p className="mb-0 text-sm font-semibold text-text">{album}</p>
        <p className="mb-0 text-xs text-muted">{artist}</p>
        <StarRating
          value={ratingValue ?? 0}
          readOnly
          step={0.5}
          size={16}
          className="pt-1"
        />
      </div>
    </div>
  )
}

export default function RecentlyListenedSection({ albums, isLoading, error, isSignedIn }) {
  const visibleAlbums = useMemo(() => albums.slice(0, 6), [albums])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Headphones size={18} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-lg uppercase tracking-[0.2em] text-muted">
            Recently listened
          </h2>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-text">
          Newest first
        </span>
      </div>

      <div className="overflow-hidden">
        {isLoading ? (
          <p className="mb-0 text-sm text-muted">Loading recently listened...</p>
        ) : error ? (
          <p className="mb-0 text-sm text-muted">{error}</p>
        ) : !isSignedIn ? (
          <p className="mb-0 text-sm text-muted">Sign in to see your recently listened backlog logs.</p>
        ) : visibleAlbums.length === 0 ? (
          <p className="mb-0 text-sm text-muted">No recently listened logs yet.</p>
        ) : (
          <div className="scrollbar-sleek grid auto-cols-[160px] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 md:auto-cols-[176px]">
            {visibleAlbums.map((album) => {
              const key = album.id ?? `${album.artist} - ${album.album}`
              return <AlbumTile key={key} {...album} ratingValue={album.rating} />
            })}
          </div>
        )}
      </div>
    </section>
  )
}
