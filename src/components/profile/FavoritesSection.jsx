import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CoverImage from '../CoverImage.jsx'

const actionButtonClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

function MediaTile({ item }) {
  const art = (
    <div className="aspect-square overflow-hidden rounded-md border border-black/10 bg-black/5">
      <CoverImage
        src={item.cover}
        alt={`${item.title} by ${item.artist} cover`}
        className="h-full w-full"
      />
    </div>
  )

  return (
    <article className="snap-start">
      {item.albumLink ? (
        <Link
          to={item.albumLink}
          className="block transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          {art}
        </Link>
      ) : (
        art
      )}
      <div className="mt-1.5">
        {item.albumLink ? (
          <Link
            to={item.albumLink}
            className="mb-0 block overflow-hidden text-[12px] font-semibold leading-tight text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]"
          >
            {item.title}
          </Link>
        ) : (
          <p className="mb-0 overflow-hidden text-[12px] font-semibold leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
            {item.title}
          </p>
        )}
        {item.artistLink ? (
          <Link
            to={item.artistLink}
            className="mb-0 block truncate text-[10px] text-slate-600 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            {item.artist}
          </Link>
        ) : (
          <p className="mb-0 truncate text-[10px] text-slate-600">{item.artist}</p>
        )}
      </div>
    </article>
  )
}

export default function FavoritesSection({
  favorites,
  isLoadingFavorites = false,
  favoriteCovers,
  recentCarousel,
  isLoadingRecent = false,
  onManageFavorites = null,
  manageLabel = 'Manage',
  manageDisabled = false,
  showManage = Boolean(onManageFavorites),
  compactMobile = false,
}) {
  const [activeMobileView, setActiveMobileView] = useState('top')

  const topShowcaseItems = useMemo(
    () =>
      (Array.isArray(favorites) ? favorites : []).slice(0, 8).map((album, index) => {
        const key = `${album.artist} - ${album.title}-${index}`
        return {
          id: key,
          title: album.title,
          artist: album.artist,
          cover: favoriteCovers?.[`${album.artist} - ${album.title}`] ?? album.cover,
          albumLink: album.releaseId ? `/album/${album.releaseId}` : null,
          artistLink: album.artistId ? `/artist/${album.artistId}` : null,
        }
      }),
    [favorites, favoriteCovers],
  )

  const recentShowcaseItems = useMemo(
    () =>
      (Array.isArray(recentCarousel) ? recentCarousel : []).slice(0, 8).map((item, index) => ({
        id: item?.id ?? `${item.artist} - ${item.title}-${index}`,
        title: item?.title ?? 'Unknown album',
        artist: item?.artist ?? 'Unknown artist',
        cover: item?.cover,
        albumLink: item?.releaseId ? `/album/${item.releaseId}` : null,
        artistLink: item?.artistId ? `/artist/${item.artistId}` : null,
      })),
    [recentCarousel],
  )

  const renderStackedSection = (isCompactVariant) => {
    const sectionClass = isCompactVariant
      ? 'space-y-4 md:rounded-2xl md:border md:border-[var(--border)] md:bg-[var(--surface-2)] md:p-5 md:shadow-md'
      : 'rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md'

    const headingClass = isCompactVariant
      ? 'mb-0 text-base text-text md:text-lg'
      : 'mb-0 text-lg text-text'

    const labelClass = isCompactVariant
      ? 'mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted md:text-[11px] md:tracking-[0.18em]'
      : 'mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'

    const manageClass = isCompactVariant
      ? `${actionButtonClass} px-2.5 py-1.5 text-[11px] md:px-3 md:py-2 md:text-xs`
      : actionButtonClass

    const favoritesRailClass = isCompactVariant
      ? 'scrollbar-sleek grid auto-cols-[44vw] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 md:auto-cols-[10.5rem]'
      : 'scrollbar-sleek grid auto-cols-[9.5rem] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[10.5rem]'

    const recentRailClass = isCompactVariant
      ? 'scrollbar-sleek grid auto-cols-[42vw] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 md:auto-cols-[9.75rem]'
      : 'scrollbar-sleek grid auto-cols-[8.75rem] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[9.75rem]'

    return (
      <section className={sectionClass}>
        <div className={isCompactVariant ? 'space-y-4 md:space-y-6' : 'space-y-6'}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={labelClass}>
                Favorites
              </p>
              <h2 className={headingClass}>Top albums</h2>
            </div>
            {showManage ? (
              <button
                type="button"
                className={manageClass}
                onClick={onManageFavorites}
                disabled={manageDisabled}
              >
                {manageLabel}
              </button>
            ) : null}
          </div>

          <div className="overflow-hidden">
            <div className={favoritesRailClass}>
              {isLoadingFavorites
                ? Array.from({ length: 5 }).map((_, index) => (
                  <article key={`favorite-skeleton-${index}`} className="snap-start">
                    <div className="aspect-square animate-pulse border border-black/10 bg-black/10" />
                    <div className="mt-2 space-y-1.5">
                      <div className="h-3 w-4/5 animate-pulse rounded bg-black/10" />
                      <div className="h-3 w-3/5 animate-pulse rounded bg-black/10" />
                    </div>
                  </article>
                ))
                : favorites.length === 0
                  ? (
                    <p className="mb-0 text-sm text-slate-600">
                      No favorite albums yet. Add favorites from an album page.
                    </p>
                  )
                  : favorites.slice(0, 5).map((album, index) => {
                      const key = `${album.artist} - ${album.title}`
                      const albumLink = album.releaseId
                        ? `/album/${album.releaseId}`
                        : null

                      return (
                        <article key={`${key}-${index}`} className="snap-start">
                          {albumLink ? (
                            <Link
                              to={albumLink}
                              className="block transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                            >
                              <div className="aspect-square overflow-hidden border border-black/10 bg-black/5">
                                <CoverImage
                                  src={favoriteCovers[key] ?? album.cover}
                                  alt={`${album.title} by ${album.artist} cover`}
                                  className="h-full w-full"
                                />
                              </div>
                            </Link>
                          ) : (
                            <div className="aspect-square overflow-hidden border border-black/10 bg-black/5">
                              <CoverImage
                                src={favoriteCovers[key] ?? album.cover}
                                alt={`${album.title} by ${album.artist} cover`}
                                className="h-full w-full"
                              />
                            </div>
                          )}
                          <div className="mt-2">
                            {albumLink ? (
                              <Link
                                to={albumLink}
                                className="mb-0 block overflow-hidden text-xs font-semibold leading-tight text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]"
                              >
                                {album.title}
                              </Link>
                            ) : (
                              <p className="mb-0 overflow-hidden text-xs font-semibold leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                                {album.title}
                              </p>
                            )}
                            {album.artistId ? (
                              <Link
                                to={`/artist/${album.artistId}`}
                                className="mb-0 block truncate text-[11px] text-slate-600 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                              >
                                {album.artist}
                              </Link>
                            ) : (
                              <p className="mb-0 truncate text-[11px] text-slate-600">
                                {album.artist}
                              </p>
                            )}
                          </div>
                        </article>
                      )
                    })}
            </div>
          </div>

          <div className={isCompactVariant ? 'flex items-start justify-between gap-3 border-t border-black/8 pt-3 md:gap-4 md:border-[var(--border)] md:pt-4' : 'flex items-start justify-between gap-4 pt-1'}>
            <div>
              <p className={labelClass}>
                Recent activity
              </p>
              <h2 className={headingClass}>Recently listened</h2>
            </div>
            <span className={isCompactVariant ? 'rounded-full border border-black/10 bg-white/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 md:border-[var(--border)] md:bg-[var(--surface-3)] md:px-2.5 md:text-[11px] md:tracking-[0.14em]' : 'rounded-full border border-black/10 bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600'}>
              Today
            </span>
          </div>

          <div className="overflow-hidden">
            <div className={recentRailClass}>
              {isLoadingRecent
                ? Array.from({ length: 5 }).map((_, index) => (
                  <article key={`recent-skeleton-${index}`} className="snap-start">
                    <div className="aspect-square animate-pulse border border-black/10 bg-black/10" />
                    <div className="mt-2 space-y-1.5">
                      <div className="h-3 w-4/5 animate-pulse rounded bg-black/10" />
                      <div className="h-3 w-3/5 animate-pulse rounded bg-black/10" />
                    </div>
                  </article>
                ))
                : recentCarousel.length === 0
                  ? (
                    <p className="mb-0 text-sm text-slate-600">
                      No recently listened albums yet.
                    </p>
                  )
                  : recentCarousel.map((item, index) => (
                    <article key={item?.id ?? `${item.artist} - ${item.title}-${index}`} className="snap-start">
                      <div className="aspect-square overflow-hidden border border-black/10 bg-black/5">
                        <CoverImage
                          src={item.cover}
                          alt={`${item.title} by ${item.artist} cover`}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="mt-2">
                        <p className="mb-0 overflow-hidden text-xs font-semibold leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                          {item.title}
                        </p>
                        {item.artistId ? (
                          <Link
                            to={`/artist/${item.artistId}`}
                            className="mb-0 block truncate text-[11px] text-slate-600 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                          >
                            {item.artist}
                          </Link>
                        ) : (
                          <p className="mb-0 truncate text-[11px] text-slate-600">
                            {item.artist}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (compactMobile) {
    const isTopView = activeMobileView === 'top'
    const activeItems = isTopView ? topShowcaseItems : recentShowcaseItems
    const isLoadingActive = isTopView ? isLoadingFavorites : isLoadingRecent
    const activeTitle = isTopView ? 'Top albums' : 'Recently listened'
    const activeEyebrow = isTopView ? 'Showcase' : 'Recent activity'
    const emptyMessage = isTopView
      ? 'No favorite albums yet. Add favorites from an album page.'
      : 'No recently listened albums yet.'

    return (
      <>
        <section className="space-y-3 md:hidden">
          <div className="rounded-xl border border-black/8 bg-white/18 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                  Media
                </p>
                <h2 className="mb-0 text-base text-text">{activeTitle}</h2>
              </div>
              <div className="inline-flex items-center rounded-lg border border-black/10 bg-white/55 p-0.5">
                <button
                  type="button"
                  className={`!m-0 rounded-md !border-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] !shadow-none transition ${
                    isTopView
                      ? 'bg-accent text-[#1f130c]'
                      : '!bg-transparent text-slate-600'
                  }`}
                  onClick={() => setActiveMobileView('top')}
                  aria-label="Show top albums"
                  aria-pressed={isTopView}
                >
                  Top
                </button>
                <button
                  type="button"
                  className={`!m-0 rounded-md !border-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] !shadow-none transition ${
                    !isTopView
                      ? 'bg-accent text-[#1f130c]'
                      : '!bg-transparent text-slate-600'
                  }`}
                  onClick={() => setActiveMobileView('recent')}
                  aria-label="Show recently listened"
                  aria-pressed={!isTopView}
                >
                  Recent
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {activeEyebrow}
              </p>
              {isTopView ? (
                showManage ? (
                  <button
                    type="button"
                    className="!m-0 rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-[10px] font-semibold text-text shadow-none transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                    onClick={onManageFavorites}
                    disabled={manageDisabled}
                  >
                    {manageLabel}
                  </button>
                ) : null
              ) : (
                <span className="rounded-full border border-black/10 bg-white/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  Today
                </span>
              )}
            </div>

            <div className="mt-2 overflow-hidden">
              <div className="scrollbar-sleek grid auto-cols-[calc(50%-0.375rem)] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1">
                {isLoadingActive
                  ? Array.from({ length: 4 }).map((_, index) => (
                    <article key={`mobile-showcase-skeleton-${index}`} className="snap-start">
                      <div className="aspect-square animate-pulse rounded-md border border-black/10 bg-black/10" />
                      <div className="mt-1.5 space-y-1">
                        <div className="h-3 w-4/5 animate-pulse rounded bg-black/10" />
                        <div className="h-2.5 w-3/5 animate-pulse rounded bg-black/10" />
                      </div>
                    </article>
                  ))
                  : activeItems.length === 0
                    ? (
                      <p className="mb-0 text-sm text-slate-600">{emptyMessage}</p>
                    )
                    : activeItems.map((item) => (
                      <MediaTile key={item.id} item={item} />
                    ))}
              </div>
            </div>
          </div>
        </section>

        <div className="hidden md:block">
          {renderStackedSection(true)}
        </div>
      </>
    )
  }

  return renderStackedSection(false)
}
