import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'

function RecentReviewCard({ title, artist, year, rating, timeAgo, cover }) {
  return (
    <article className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-[0_14px_28px_-22px_rgba(15,15,15,0.35)]">
      <div className="flex items-center gap-3">
        <CoverImage
          src={cover}
          alt={`${title} cover`}
          className="h-12 w-12 flex-shrink-0 object-cover"
        />
        <div className="min-w-0">
          <p className="mb-1 truncate text-sm font-semibold text-text">
            {title}
          </p>
          <p className="mb-0 text-xs text-muted">
            {artist} · {year}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <StarRating value={rating} readOnly size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          {timeAgo}
        </span>
      </div>
    </article>
  )
}

export default function RecentReviewsSection({ reviews = [] }) {
  return (
    <section className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Reviews
          </p>
          <h2 className="mb-0 text-xl text-text">Recent reviews</h2>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
          Latest 3
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {reviews.map((review) => (
          <RecentReviewCard
            key={`${review.title}-${review.artist}`}
            {...review}
          />
        ))}
      </div>
    </section>
  )
}
