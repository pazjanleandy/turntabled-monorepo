import { Link } from 'react-router-dom'
import { Users, Star, Disc, TrendUp, MagnifyingGlass } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'

function AlbumTile({ item }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? 'Unknown Album'
  const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? 'Unknown Artist'
  const coverArtUrl = item?.album?.coverArtUrl ?? '/album/am.jpg'
  const logCount = item?.popularity?.logCount ?? 0
  const ratingsCount = item?.popularity?.ratingsCount ?? 0
  const averageRating = item?.popularity?.averageRating
  const primaryType = item?.album?.primaryType

  return (
    <div className="group w-full snap-start space-y-3">
      <div className="overflow-hidden rounded-soft bg-white/85 shadow-subtle transition group-hover:-translate-y-1 group-hover:shadow-lg">
        <CoverImage
          src={coverArtUrl}
          alt={`${albumTitle} cover`}
          className="h-[160px] w-[160px] object-cover md:h-[176px] md:w-[176px]"
        />
      </div>
      <div className="space-y-1">
        <p className="mb-0 text-sm font-semibold text-text">{albumTitle}</p>
        <p className="mb-0 text-xs text-muted">{artistName}</p>
        <div className="flex items-center gap-3 text-[0.65rem] text-muted">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {logCount}
          </span>
          <span className="flex items-center gap-1">
            <Star size={12} />
            {averageRating == null ? 'N/A' : averageRating.toFixed(2)}
            <span className="text-[0.6rem]">({ratingsCount})</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[0.65rem] text-muted">
          {primaryType ? (
            <span className="flex items-center gap-1">
              <Disc size={12} />
              {primaryType}
            </span>
          ) : null}
        </div>
        {albumId ? (
          <Link
            to={`/album/${albumId}`}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent"
          >
            Open
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export default function PopularAlbumsSection({ albums, search, onSearchChange, isLoading, error }) {
  const visibleAlbums = albums.slice(0, 6)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendUp size={18} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-lg uppercase tracking-[0.2em] text-muted">Popular albums</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="hidden items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-subtle md:flex">
            <MagnifyingGlass size={12} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Artist or album"
              className="w-28 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
            />
          </div>
          <Link
            to="/explore?filter=popular-week"
            className="text-xs font-semibold uppercase tracking-[0.25em] text-text transition hover:text-accent"
          >
            More
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-muted shadow-subtle md:hidden">
        <MagnifyingGlass size={12} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Artist or album"
          className="w-full bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
          Loading popular albums...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : visibleAlbums.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
          No popular albums found.
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="scrollbar-sleek grid auto-cols-[160px] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 md:auto-cols-[176px]">
            {visibleAlbums.map((item) => (
              <AlbumTile key={`${item?.rank ?? 0}-${item?.album?.id ?? item?.album?.titleRaw ?? 'album'}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
