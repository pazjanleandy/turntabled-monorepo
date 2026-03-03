import { Link } from 'react-router-dom'
import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'

const actionButtonClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

export default function FavoritesSection({
  favorites,
  favoriteCovers,
  favoriteRatings,
  onFavoriteRatingChange,
  recentCarousel,
  recentRatings,
  onRecentRatingChange,
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
          <Link to="/favorites" className={actionButtonClass}>
            Manage
          </Link>
        </div>

        <div className="overflow-hidden">
          <div className="scrollbar-sleek grid auto-cols-[9.5rem] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[10.5rem]">
            {favorites.slice(0, 5).map((album) => {
              const key = `${album.artist} - ${album.title}`
              const albumLink = album.releaseId
                ? `/album/${album.releaseId}`
                : null

              return (
                <article key={key} className="snap-start">
                  {albumLink ? (
                    <Link
                      to={albumLink}
                      className="block rounded-xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                    >
                      <div className="aspect-square overflow-hidden rounded-xl border border-black/10 bg-black/5">
                        <CoverImage
                          src={favoriteCovers[key] ?? album.cover}
                          alt={`${album.title} cover`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </Link>
                  ) : (
                    <div className="aspect-square overflow-hidden rounded-xl border border-black/10 bg-black/5">
                      <CoverImage
                        src={favoriteCovers[key] ?? album.cover}
                        alt={`${album.title} cover`}
                        className="h-full w-full object-cover"
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
                    <StarRating
                      value={favoriteRatings[key] ?? 0}
                      onChange={(next) => onFavoriteRatingChange(key, next)}
                      step={0.5}
                      size={14}
                      className="mt-1"
                    />
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
            {recentCarousel.map((item) => (
              <article key={`${item.artist} - ${item.title}`} className="snap-start">
                <div className="aspect-square overflow-hidden rounded-xl border border-black/10 bg-black/5">
                  <CoverImage
                    src={item.cover}
                    alt={`${item.title} cover`}
                    className="h-full w-full object-cover"
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
                  <StarRating
                    value={recentRatings[`${item.artist} - ${item.title}`] ?? 0}
                    onChange={(next) =>
                      onRecentRatingChange(`${item.artist} - ${item.title}`, next)
                    }
                    step={0.5}
                    size={14}
                    className="mt-1"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
