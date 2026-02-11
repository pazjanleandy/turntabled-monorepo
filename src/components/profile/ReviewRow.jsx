import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'

export default function ReviewRow({
  title,
  artist,
  year,
  rating,
  summary,
  timeAgo,
  cover,
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)] sm:flex-row sm:items-start">
      <CoverImage
        src={cover}
        alt={`${title} cover`}
        className="h-16 w-16 flex-shrink-0 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="mb-0 text-base text-text">{title}</h3>
            <p className="mb-0 text-xs text-muted">
              {artist} · {year}
            </p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {timeAgo}
          </span>
        </div>
        <p className="mb-0 mt-2 text-sm text-muted">{summary}</p>
        <StarRating
          value={rating}
          readOnly
          size={14}
          className="mt-2"
        />
      </div>
    </article>
  )
}
