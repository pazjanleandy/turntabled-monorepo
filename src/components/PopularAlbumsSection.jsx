import useHorizontalRail from '../hooks/useHorizontalRail.js'
import { Link } from 'react-router-dom'
import { Users, Star, TrendUp, MagnifyingGlass } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'

function AlbumTile({ item }) {
  const albumId = item?.album?.id
  const rank = item?.rank ?? null
  const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? 'Unknown Album'
  const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? 'Unknown Artist'
  const coverArtUrl = item?.album?.coverArtUrl ?? '/album/am.jpg'
  const logCount = item?.popularity?.logCount ?? 0
  const ratingsCount = item?.popularity?.ratingsCount ?? 0
  const averageRating = item?.popularity?.averageRating
  const primaryType = item?.album?.primaryType

  return (
    <div className="group min-w-0 snap-start space-y-2.5">
      <div className="relative overflow-hidden bg-white/88 shadow-[0_20px_36px_-32px_rgba(15,23,42,0.72)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_26px_40px_-30px_rgba(15,23,42,0.72)]">
        <CoverImage
          src={coverArtUrl}
          alt={`${albumTitle} by ${artistName} cover`}
          rounded="rounded-none"
          className="h-[min(70vw,240px)] w-full sm:h-[172px] md:h-[176px] lg:h-[184px]"
        />
      </div>
      <div className="space-y-1.5 px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="mb-0 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted">
            {rank ? `#${rank}` : 'Trending'}
          </p>
          {primaryType ? (
            <p className="mb-0 text-[0.64rem] uppercase tracking-[0.12em] text-muted">{primaryType}</p>
          ) : null}
        </div>
        <p className="mb-0 truncate text-sm font-semibold text-text">{albumTitle}</p>
        <p className="mb-0 truncate text-xs text-muted">{artistName}</p>
        <div className="flex items-center gap-2 text-[0.66rem] text-muted">
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {logCount}
          </span>
          <span className="h-1 w-1 rounded-full bg-black/15" />
          <span className="inline-flex items-center gap-1">
            <Star size={12} />
            {averageRating == null ? 'N/A' : averageRating.toFixed(2)}
          </span>
          <span className="text-[0.62rem]">({ratingsCount})</span>
        </div>
        {albumId ? (
          <Link to={`/album/${albumId}`} className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent">
            Open
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function formatRank(rank) {
  const numeric = Number(rank)
  if (!Number.isFinite(numeric) || numeric <= 0) return '--'
  return String(Math.floor(numeric)).padStart(2, '0')
}

function getRankAccent(rank) {
  if (rank === 1) {
    return {
      text: 'text-[var(--rank-gold-text)]',
      label: 'Gold pick',
      rule: 'bg-[var(--rank-gold-rule)]',
      badge: 'border-[var(--rank-gold-border)] bg-[var(--rank-gold-badge-bg)] text-[var(--rank-gold-text)]',
    }
  }
  if (rank === 2) {
    return {
      text: 'text-[var(--rank-silver-text)]',
      label: 'Silver pick',
      rule: 'bg-[var(--rank-silver-rule)]',
      badge: 'border-[var(--rank-silver-border)] bg-[var(--rank-silver-badge-bg)] text-[var(--rank-silver-text)]',
    }
  }
  return {
    text: 'text-text/75',
    label: 'Ranked',
    rule: 'bg-black/20',
    badge: 'border-black/20 bg-white/75 text-text/75',
  }
}

function resolveArtistHref(item) {
  const normalizedName = item?.artist?.normalizedName ?? item?.artist?.normalized_name
  if (typeof normalizedName === 'string' && normalizedName.trim()) {
    return `/artist/${encodeURIComponent(normalizedName.trim())}`
  }

  const artistName = item?.artist?.name ?? item?.artist?.nameRaw
  if (typeof artistName === 'string' && artistName.trim()) {
    return `/artists?q=${encodeURIComponent(artistName.trim())}`
  }

  return '/artists'
}

function PopularFeaturedCard({ item }) {
  if (!item) return null

  const rank = Number(item?.rank ?? 1)
  const accent = getRankAccent(rank)
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? 'Unknown Album'
  const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? 'Unknown Artist'
  const artistHref = resolveArtistHref(item)
  const coverArtUrl = item?.album?.coverArtUrl ?? '/album/am.jpg'
  const primaryType = item?.album?.primaryType ?? 'Album'
  const releaseDate = item?.album?.releaseDate
  const logCount = item?.popularity?.logCount ?? 0
  const ratingsCount = item?.popularity?.ratingsCount ?? 0
  const averageRating = item?.popularity?.averageRating

  return (
    <article className="grid grid-cols-[232px_minmax(0,1fr)] gap-5 pr-5">
      <div className="relative">
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-flex">
            <CoverImage
              src={coverArtUrl}
              alt={`${albumTitle} by ${artistName} cover`}
              rounded="rounded-none"
              className="h-[232px] w-[232px] border border-black/12"
            />
          </Link>
        ) : (
          <CoverImage
            src={coverArtUrl}
            alt={`${albumTitle} by ${artistName} cover`}
            rounded="rounded-none"
            className="h-[232px] w-[232px] border border-black/12"
          />
        )}
      </div>
      <div className="min-w-0 space-y-3">
        <p className={`mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] ${accent.text}`}>
          {accent.label}
        </p>
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-block">
            <h3 className={`mb-0 text-[2rem] leading-[1.01] ${accent.text} transition hover:opacity-90`}>
              #{formatRank(item?.rank)}. {albumTitle}
            </h3>
          </Link>
        ) : (
          <h3 className={`mb-0 text-[2rem] leading-[1.01] ${accent.text}`}>
            #{formatRank(item?.rank)}. {albumTitle}
          </h3>
        )}
        <p className="mb-0 text-base text-muted">
          <Link to={artistHref} className="transition hover:text-text">
            {artistName}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          <span>{primaryType}</span>
          {releaseDate ? (
            <>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{releaseDate}</span>
            </>
          ) : null}
        </div>
        <div className={`h-px w-16 ${accent.rule}`} />
        <div className="grid gap-2 pt-1 text-[12px] text-muted">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} />
              {logCount} logs
            </span>
            <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
            <span>{ratingsCount} ratings</span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Star size={13} />
            Community avg {averageRating == null ? 'N/A' : averageRating.toFixed(2)}
          </span>
        </div>
      </div>
    </article>
  )
}

function PopularSecondCard({ item }) {
  if (!item) return null

  const rank = Number(item?.rank ?? 2)
  const accent = getRankAccent(rank)
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? 'Unknown Album'
  const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? 'Unknown Artist'
  const artistHref = resolveArtistHref(item)
  const coverArtUrl = item?.album?.coverArtUrl ?? '/album/am.jpg'
  const primaryType = item?.album?.primaryType ?? 'Album'
  const releaseDate = item?.album?.releaseDate
  const logCount = item?.popularity?.logCount ?? 0
  const ratingsCount = item?.popularity?.ratingsCount ?? 0
  const averageRating = item?.popularity?.averageRating

  return (
    <article className="grid grid-cols-[168px_minmax(0,1fr)] items-center gap-3.5 pr-5">
      <div className="relative">
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-flex">
            <CoverImage
              src={coverArtUrl}
              alt={`${albumTitle} by ${artistName} cover`}
              rounded="rounded-none"
              className="h-[168px] w-[168px] border border-black/12"
            />
          </Link>
        ) : (
          <CoverImage
            src={coverArtUrl}
            alt={`${albumTitle} by ${artistName} cover`}
            rounded="rounded-none"
            className="h-[168px] w-[168px] border border-black/12"
          />
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <p className={`mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.text}`}>
          {accent.label}
        </p>
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-block max-w-full">
            <h4 className={`mb-0 truncate text-[1.5rem] leading-[1.02] ${accent.text} transition hover:opacity-90`}>
              #{formatRank(item?.rank)}. {albumTitle}
            </h4>
          </Link>
        ) : (
          <h4 className={`mb-0 truncate text-[1.5rem] leading-[1.02] ${accent.text}`}>
            #{formatRank(item?.rank)}. {albumTitle}
          </h4>
        )}
        <p className="mb-0 truncate text-[14px] text-muted">
          <Link to={artistHref} className="transition hover:text-text">
            {artistName}
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          <span>{primaryType}</span>
          {releaseDate ? (
            <>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{releaseDate}</span>
            </>
          ) : null}
        </div>
        <div className={`h-px w-14 ${accent.rule}`} />
        <div className="grid gap-1.5 pt-0.5 text-[12px] text-muted">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} />
              {logCount} logs
            </span>
            <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
            <span>{ratingsCount} ratings</span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Star size={12} />
            Community avg {averageRating == null ? 'N/A' : averageRating.toFixed(2)}
          </span>
        </div>
      </div>
    </article>
  )
}

function PopularRankRow({ item }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? 'Unknown Album'
  const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? 'Unknown Artist'
  const artistHref = resolveArtistHref(item)
  const coverArtUrl = item?.album?.coverArtUrl ?? '/album/am.jpg'
  const logCount = item?.popularity?.logCount ?? 0
  const ratingsCount = item?.popularity?.ratingsCount ?? 0
  const averageRating = item?.popularity?.averageRating

  return (
    <article className="grid grid-cols-[28px_50px_minmax(0,1fr)] items-center gap-3 py-2.5">
      <p className="mb-0 text-center font-serif text-[1.05rem] leading-none text-text/78">#{formatRank(item?.rank)}</p>
      {albumId ? (
        <Link to={`/album/${albumId}`} className="inline-flex">
          <CoverImage
            src={coverArtUrl}
            alt={`${albumTitle} by ${artistName} cover`}
            rounded="rounded-none"
            className="h-[50px] w-[50px] border border-black/10"
          />
        </Link>
      ) : (
        <CoverImage
          src={coverArtUrl}
          alt={`${albumTitle} by ${artistName} cover`}
          rounded="rounded-none"
          className="h-[50px] w-[50px] border border-black/10"
        />
      )}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          {albumId ? (
            <Link to={`/album/${albumId}`} className="inline-block min-w-0 max-w-full">
              <p className="mb-0 truncate text-[14px] font-semibold text-text transition hover:text-accent">
                {albumTitle}
              </p>
            </Link>
          ) : (
            <p className="mb-0 truncate text-[14px] font-semibold text-text">{albumTitle}</p>
          )}
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted">
            <Star size={11} />
            {averageRating == null ? 'N/A' : averageRating.toFixed(1)}
          </span>
        </div>
        <p className="mb-0 truncate text-[12px] text-muted">
          <Link to={artistHref} className="transition hover:text-text">
            {artistName}
          </Link>
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{logCount} logs</span>
          <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
          <span>{ratingsCount} ratings</span>
        </div>
      </div>
    </article>
  )
}

export default function PopularAlbumsSection({ albums, search, onSearchChange, isLoading, error }) {
  const mobileAlbums = albums.slice(0, 6)
  const desktopAlbums = albums.slice(0, 7)
  const featuredAlbum = desktopAlbums[0] ?? null
  const secondAlbum = desktopAlbums[1] ?? null
  const rankedAlbums = desktopAlbums.slice(2)
  const { railRef } = useHorizontalRail(mobileAlbums.length)

  return (
    <section className="space-y-3 sm:space-y-4 lg:border-t lg:border-black/10 lg:pt-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <TrendUp size={18} weight="bold" className="text-accent" />
            <h2 className="mb-0 text-base uppercase tracking-[0.2em] text-muted sm:text-lg">
              Popular albums
            </h2>
          </div>
          <p className="mb-0 hidden text-sm text-muted/90 lg:block">
            Community momentum this week, ranked by logs and listener response.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted lg:hidden">
          <div className="hidden items-center gap-2 border-b border-black/10 px-0.5 py-1 md:flex">
            <MagnifyingGlass size={12} className="text-muted" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Artist or album"
              className="w-28 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {mobileAlbums.length} picks
          </span>
          <Link
            to="/explore?filter=popular-week"
            className="text-xs font-semibold uppercase tracking-[0.25em] text-text transition hover:text-accent"
          >
            More
          </Link>
        </div>
      </div>

      <div className="hidden items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs text-muted lg:flex">
        <label className="inline-flex min-w-[240px] items-center gap-2">
          <MagnifyingGlass size={13} className="text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter by artist or album"
            className="w-full bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
          />
        </label>
        <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {desktopAlbums.length} ranked
        </span>
        <Link
          to="/explore?filter=popular-week"
          className="ml-auto text-[11px] font-semibold uppercase tracking-[0.18em] text-text transition hover:text-accent"
        >
          Full chart
        </Link>
      </div>

      <div className="flex items-center gap-2 border-b border-black/10 px-0.5 py-1.5 text-xs text-muted md:hidden">
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
      ) : desktopAlbums.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
          No popular albums found.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.88fr)] lg:gap-0">
            <div className="border-y border-black/10 py-3">
              <PopularFeaturedCard item={featuredAlbum} />
              {secondAlbum ? (
                <div className="mt-3 border-t border-black/10 pt-3">
                  <PopularSecondCard item={secondAlbum} />
                </div>
              ) : null}
            </div>
            <div className="border-y border-l border-black/10 py-2 pl-4 pr-0">
              <p className="mb-0 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Climbing now
              </p>
              <div className="divide-y divide-black/8">
                {rankedAlbums.map((item) => (
                  <PopularRankRow
                    key={`${item?.rank ?? 0}-${item?.album?.id ?? item?.album?.titleRaw ?? 'album'}`}
                    item={item}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden lg:hidden">
            <div
              ref={railRef}
              className="scrollbar-sleek grid auto-cols-[72vw] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 sm:auto-cols-[172px] md:auto-cols-[176px]"
            >
              {mobileAlbums.map((item) => (
                <AlbumTile
                  key={`${item?.rank ?? 0}-${item?.album?.id ?? item?.album?.titleRaw ?? 'album'}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
