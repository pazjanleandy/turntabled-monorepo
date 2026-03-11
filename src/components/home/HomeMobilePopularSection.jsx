import { Link } from 'react-router-dom'
import { Star, TrendUp } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

function formatAverageRating(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return value.toFixed(2)
}

function PopularAlbumCard({ item }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? 'Unknown album'
  const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? 'Unknown artist'
  const coverArtUrl = item?.album?.coverArtUrl ?? '/album/am.jpg'
  const logCount = Number(item?.popularity?.logCount ?? 0)
  const averageRating = formatAverageRating(item?.popularity?.averageRating)
  const typeLabel = item?.album?.primaryType || ''
  const details = [logCount.toLocaleString() + ' logs']

  if (averageRating) {
    details.push(`${averageRating} avg`)
  }

  if (typeLabel) {
    details.push(typeLabel)
  }

  const cardContent = (
    <>
      <CoverImage
        src={coverArtUrl}
        alt={`${albumTitle} by ${artistName} cover`}
        className="w-full border border-black/10 shadow-subtle"
      />
      <div className="mt-2.5 space-y-1 px-0.5">
        <p className="mb-0 overflow-hidden text-[15px] font-semibold leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
          {albumTitle}
        </p>
        <p className="mb-0 truncate text-[12px] text-muted">{artistName}</p>
        <p className="mb-0 flex min-w-0 items-center gap-1 text-[11px] text-muted">
          {averageRating ? <Star size={11} weight="fill" className="text-accent" /> : null}
          <span className="truncate">{details.join(' - ')}</span>
        </p>
      </div>
    </>
  )

  if (!albumId) {
    return <article className="snap-start">{cardContent}</article>
  }

  return (
    <Link
      to={`/album/${albumId}`}
      className="group snap-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      {cardContent}
    </Link>
  )
}

export default function HomeMobilePopularSection({ albums = [], isLoading = false, error = '' }) {
  const visibleAlbums = Array.isArray(albums) ? albums.slice(0, 10) : []

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Spotlight
          </p>
          <h2 className="mb-0 mt-1 text-[1.55rem] leading-tight text-text">Popular albums</h2>
        </div>
        <Link
          to="/explore?filter=popular-week"
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-text transition hover:text-accent"
        >
          More
        </Link>
      </div>

      {isLoading ? (
        <div className="py-2 text-sm text-muted">Loading popular albums...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/85 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : visibleAlbums.length === 0 ? (
        <div className="py-2 text-sm text-muted">No popular albums found.</div>
      ) : (
        <div className="-mx-4 overflow-hidden sm:-mx-6">
          <div className="scrollbar-sleek grid auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto px-4 pb-1 pt-1 snap-x snap-mandatory scroll-px-4 sm:auto-cols-[48%] sm:px-6 sm:scroll-px-6">
            {visibleAlbums.map((item) => (
              <PopularAlbumCard
                key={`${item?.rank ?? 0}-${item?.album?.id ?? item?.album?.titleRaw ?? 'album'}`}
                item={item}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
