import { Link } from 'react-router-dom'
import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'

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
    <section className="card vinyl-texture">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Favorites
          </p>
          <h2 className="mb-0 text-xl">Top albums</h2>
        </div>
        <Link
          to="/favorites"
          className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          Manage
        </Link>
      </div>

      <div className="mt-5 overflow-hidden">
        <div className="scrollbar-sleek grid auto-cols-[160px] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
          {favorites.slice(0, 5).map((album) => {
            const key = `${album.artist} - ${album.title}`
            return (
              <div key={album.title} className="snap-start space-y-2">
                <CoverImage
                  src={favoriteCovers[key] ?? album.cover}
                  alt={`${album.title} cover`}
                  className="h-40 w-40 object-cover"
                />
                <div>
                  <p className="mb-0 text-xs font-semibold text-text">{album.title}</p>
                  {album.artistId ? (
                    <Link
                      to={`/artist/${album.artistId}`}
                      className="mb-0 block text-[11px] text-muted transition hover:text-accent"
                    >
                      {album.artist}
                    </Link>
                  ) : (
                    <p className="mb-0 text-[11px] text-muted">{album.artist}</p>
                  )}
                  <StarRating
                    value={favoriteRatings[key] ?? 0}
                    onChange={(next) => onFavoriteRatingChange(key, next)}
                    step={0.5}
                    size={14}
                    className="mt-1"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Recent activity
          </p>
          <h2 className="mb-0 text-xl">Recently listened</h2>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-text">
          Today
        </span>
      </div>

      <div className="mt-4 overflow-hidden">
        <div className="scrollbar-sleek grid auto-cols-[150px] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
          {recentCarousel.map((item) => (
            <div key={item.title} className="snap-start space-y-2">
              <CoverImage
                src={item.cover}
                alt={`${item.title} cover`}
                className="h-37.5 w-37.5 object-cover"
              />
              <div>
                <p className="mb-0 text-xs font-semibold text-text">{item.title}</p>
                {item.artistId ? (
                  <Link
                    to={`/artist/${item.artistId}`}
                    className="mb-0 block text-[11px] text-muted transition hover:text-accent"
                  >
                    {item.artist}
                  </Link>
                ) : (
                  <p className="mb-0 text-[11px] text-muted">{item.artist}</p>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
