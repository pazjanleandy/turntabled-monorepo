import { Link } from 'react-router-dom'
import { Trophy } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'

function resolveArtistHref(artist) {
  const normalizedName = typeof artist?.normalizedName === 'string' ? artist.normalizedName.trim() : ''
  if (normalizedName) {
    return `/artist/${encodeURIComponent(normalizedName)}`
  }

  const artistName = typeof artist?.name === 'string' ? artist.name.trim() : ''
  if (artistName) {
    return `/artists?q=${encodeURIComponent(artistName)}`
  }

  return '/artists'
}

function WinnerCover({ item, className = '' }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? 'Unknown album'
  const artistName = item?.artist?.name ?? 'Unknown artist'
  const coverArtUrl = item?.album?.coverArtUrl ?? ''
  const image = (
    <CoverImage
      src={coverArtUrl}
      alt={`${albumTitle} by ${artistName} cover`}
      rounded="rounded-none"
      className={className}
    />
  )

  if (!albumId) return image
  return (
    <Link to={`/album/${albumId}`} className="relative z-[1] inline-flex">
      {image}
    </Link>
  )
}

function FeaturedWinner({ item, compact = false }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? 'Unknown album'
  const artistName = item?.artist?.name ?? 'Unknown artist'
  const category = item?.category ?? 'Album of the Year'
  const artistHref = resolveArtistHref(item?.artist)
  const isAlbumOfYear = String(category).trim().toLowerCase() === 'album of the year'
  const titleClass = compact
    ? 'mb-0 font-serif text-[1.34rem] leading-[1.02] grammy-feature-title transition hover:text-accent'
    : 'mb-0 font-serif text-[1.65rem] leading-[1.01] grammy-feature-title transition hover:text-accent xl:text-[1.78rem]'

  return (
    <article
      className={
        compact
          ? 'group relative grid grid-cols-[148px_minmax(0,1fr)] items-start gap-4 py-1.5'
          : 'group relative grid grid-cols-[188px_minmax(0,1fr)] items-start gap-5 py-2 xl:grid-cols-[202px_minmax(0,1fr)]'
      }
    >
      <WinnerCover
        item={item}
        className={
          compact
            ? 'grammy-cover-featured h-[148px] w-[148px]'
            : 'grammy-cover-featured h-[188px] w-[188px] xl:h-[202px] xl:w-[202px]'
        }
      />

      <div className="relative z-[1] min-w-0 space-y-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {isAlbumOfYear ? (
            <span className="grammy-centerpiece-badge inline-flex rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
              Centerpiece
            </span>
          ) : null}
          <p className="grammy-winner-category mb-0 text-[10.5px] font-semibold uppercase tracking-[0.2em]">
            {category}
          </p>
        </div>
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-block max-w-full">
            <h3 className={titleClass}>{albumTitle}</h3>
          </Link>
        ) : (
          <h3 className={titleClass}>
            {albumTitle}
          </h3>
        )}
        <p className="grammy-artist-meta mb-0 truncate text-[13.5px]">
          <Link to={artistHref} className="font-medium text-accent transition hover:text-accent-strong">
            {artistName}
          </Link>
        </p>
      </div>
    </article>
  )
}

function CompactWinner({ item }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? 'Unknown album'
  const artistName = item?.artist?.name ?? 'Unknown artist'
  const category = item?.category ?? 'Winner'
  const artistHref = resolveArtistHref(item?.artist)

  return (
    <article className="group grid grid-cols-[66px_minmax(0,1fr)] items-center gap-3 py-2.5 transition duration-200 hover:-translate-y-px">
      <WinnerCover item={item} className="grammy-cover-secondary h-[66px] w-[66px]" />

      <div className="min-w-0 space-y-1.5">
        <p className="grammy-secondary-kicker mb-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em]">
          {category}
        </p>
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-block min-w-0 max-w-full">
            <p className="grammy-secondary-title mb-0 overflow-hidden text-[14px] font-semibold leading-tight transition hover:text-accent [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
              {albumTitle}
            </p>
          </Link>
        ) : (
          <p className="grammy-secondary-title mb-0 overflow-hidden text-[14px] font-semibold leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
            {albumTitle}
          </p>
        )}
        <p className="grammy-artist-meta mb-0 truncate text-[11.5px]">
          <Link to={artistHref} className="font-medium text-accent transition hover:text-accent-strong">
            {artistName}
          </Link>
        </p>
      </div>
    </article>
  )
}

function MobileHeroWinner({ item }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? 'Unknown album'
  const artistName = item?.artist?.name ?? 'Unknown artist'
  const artistHref = resolveArtistHref(item?.artist)

  return (
    <article className="space-y-3.5">
      <p className="grammy-winner-category mb-0 text-[10px] font-semibold uppercase tracking-[0.18em]">
        Album of the year
      </p>

      <div className="max-w-[20rem]">
        <WinnerCover item={item} className="grammy-cover-featured w-full" />
      </div>

      <div className="space-y-1.5">
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-block max-w-full">
            <p className="grammy-feature-title mb-0 overflow-hidden font-serif text-[1.42rem] leading-[1.03] transition hover:text-accent [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
              {albumTitle}
            </p>
          </Link>
        ) : (
          <p className="grammy-feature-title mb-0 overflow-hidden font-serif text-[1.42rem] leading-[1.03] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
            {albumTitle}
          </p>
        )}
        <p className="grammy-artist-meta mb-0 truncate text-[13px]">
          <Link to={artistHref} className="font-medium text-accent transition hover:text-accent-strong">
            {artistName}
          </Link>
        </p>
      </div>
    </article>
  )
}

function MobileWinnerRow({ item }) {
  const albumId = item?.album?.id
  const albumTitle = item?.album?.title ?? 'Unknown album'
  const artistName = item?.artist?.name ?? 'Unknown artist'
  const category = item?.category ?? 'Winner'
  const artistHref = resolveArtistHref(item?.artist)

  return (
    <article className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-3 py-3">
      <WinnerCover item={item} className="grammy-cover-secondary h-[58px] w-[58px]" />

      <div className="min-w-0 space-y-1">
        <p className="grammy-secondary-kicker mb-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em]">
          {category}
        </p>
        {albumId ? (
          <Link to={`/album/${albumId}`} className="inline-block max-w-full">
            <p className="grammy-secondary-title mb-0 overflow-hidden text-[14px] font-semibold leading-tight transition hover:text-accent [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
              {albumTitle}
            </p>
          </Link>
        ) : (
          <p className="grammy-secondary-title mb-0 overflow-hidden text-[14px] font-semibold leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
            {albumTitle}
          </p>
        )}
        <p className="grammy-artist-meta mb-0 truncate text-[11.5px]">
          <Link to={artistHref} className="font-medium text-accent transition hover:text-accent-strong">
            {artistName}
          </Link>
        </p>
      </div>
    </article>
  )
}

export default function GrammyWinnersSection({ items = [], isLoading = false }) {
  const winners = Array.isArray(items) ? items.filter((item) => item?.album?.id) : []
  const featuredIndex = winners.findIndex(
    (item) => String(item?.category ?? '').trim().toLowerCase() === 'album of the year',
  )
  const featured = winners[featuredIndex >= 0 ? featuredIndex : 0] ?? null
  const supporting = winners.filter((_, index) => index !== (featuredIndex >= 0 ? featuredIndex : 0))

  if (!isLoading && winners.length === 0) return null

  return (
    <section className="relative">
      <div className="space-y-4 lg:space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="grammy-eyebrow mb-0 text-[10px] font-semibold uppercase tracking-[0.2em]">
              Awards spotlight
            </p>
            <h2 className="grammy-heading mb-0 flex items-center gap-2 text-[1.42rem] leading-tight sm:text-[1.82rem]">
              <Trophy size={18} weight="fill" className="text-accent" />
              The 2026 GRAMMY Awards
            </h2>
            <p className="grammy-subtitle mb-0 max-w-2xl text-[12.5px] leading-relaxed sm:text-[14px]">
              The records honored by the Recording Academy this year.
            </p>
          </div>
          <Link
            to="/explore?filter=a-z"
            className="grammy-link hidden shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition hover:text-accent md:inline-flex sm:text-[11px]"
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grammy-divider grammy-status border-y py-4 text-sm">
            Loading 2026 winners...
          </div>
        ) : (
          <>
            <div className="grammy-divider relative hidden border-y py-4 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start lg:gap-6 xl:gap-7">
              {featured ? <FeaturedWinner item={featured} /> : null}
              <div className={`${featured ? 'grammy-divider border-l pl-6' : ''}`}>
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="grammy-secondary-kicker mb-0 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    Category winners
                  </p>
                  <span className="grammy-status text-[10px] uppercase tracking-[0.14em]">
                    Supporting honors
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-x-3.5 gap-y-4 xl:grid-cols-2">
                  {(featured ? supporting : winners).map((item) => (
                    <CompactWinner
                      key={`${item?.album?.id ?? 'winner'}-${item?.category ?? 'category'}`}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grammy-divider hidden border-y py-3.5 md:block lg:hidden">
              <div className="grid grid-cols-2 gap-x-3.5 gap-y-4.5">
                {featured ? (
                  <div className="grammy-divider col-span-2 border-b pb-4">
                    <FeaturedWinner item={featured} compact />
                  </div>
                ) : null}
                {(featured ? supporting : winners).map((item) => (
                  <CompactWinner
                    key={`${item?.album?.id ?? 'winner'}-${item?.category ?? 'category'}`}
                    item={item}
                  />
                ))}
              </div>
            </div>

            <div className="grammy-divider border-y py-4 md:hidden">
              {featured ? <MobileHeroWinner item={featured} /> : null}

              {(featured ? supporting : winners).length > 0 ? (
                <div className="mt-6 space-y-2">
                  <p className="grammy-secondary-kicker mb-0 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    Category winners
                  </p>
                  <div className="grammy-divider divide-y divide-black/8 border-y">
                    {(featured ? supporting : winners).map((item) => (
                      <MobileWinnerRow
                        key={`${item?.album?.id ?? 'winner'}-${item?.category ?? 'category'}`}
                        item={item}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

            </div>
          </>
        )}
      </div>
    </section>
  )
}
