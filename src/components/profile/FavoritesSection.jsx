import { Link } from 'react-router-dom'
import CoverImage from '../CoverImage.jsx'

const actionButtonClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

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
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Favorites
            </p>
            <h2 className="mb-0 text-lg text-text">Top albums</h2>
          </div>
          {showManage ? (
            <button
              type="button"
              className={actionButtonClass}
              onClick={onManageFavorites}
              disabled={manageDisabled}
            >
              {manageLabel}
            </button>
          ) : null}
        </div>

        <div className="overflow-hidden">
          <div className="scrollbar-sleek grid auto-cols-[9.5rem] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[10.5rem]">
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
                : favorites.slice(0, 5).map((album) => {
                    const key = `${album.artist} - ${album.title}`
                    const albumLink = album.releaseId
                      ? `/album/${album.releaseId}`
                      : null

                    return (
                      <article key={key} className="snap-start">
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
                              className="mb-0 block truncate text-xs font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                            >
                              {album.title}
                            </Link>
                          ) : (
                            <p className="mb-0 truncate text-xs font-semibold text-text">
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

        <div className="flex items-start justify-between gap-4 pt-1">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Recent activity
            </p>
            <h2 className="mb-0 text-lg text-text">Recently listened</h2>
          </div>
          <span className="rounded-full border border-black/10 bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Today
          </span>
        </div>

        <div className="overflow-hidden">
          <div className="scrollbar-sleek grid auto-cols-[8.75rem] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[9.75rem]">
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
                : recentCarousel.map((item) => (
                    <article key={`${item.artist} - ${item.title}`} className="snap-start">
                      <div className="aspect-square overflow-hidden border border-black/10 bg-black/5">
                        <CoverImage
                          src={item.cover}
                          alt={`${item.title} by ${item.artist} cover`}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="mt-2">
                        <p className="mb-0 truncate text-xs font-semibold text-text">
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
