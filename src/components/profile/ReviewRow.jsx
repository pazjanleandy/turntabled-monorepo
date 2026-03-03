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
  elevated = true,
}) {
  const rowClass = elevated
    ? 'flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-start'
    : 'flex flex-col gap-3 rounded-xl border border-black/5 bg-white/35 p-4 sm:flex-row sm:items-start'

  return (
    <article className={rowClass}>
      <CoverImage
        src={cover}
        alt={`${title} cover`}
        className="h-16 w-16 flex-shrink-0 rounded-xl border border-black/10 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="mb-0 text-base text-text">{title}</h3>
            <p className="mb-0 text-xs text-slate-600">
              {artist} - {year}
            </p>
          </div>
          <span className="rounded-full border border-black/10 bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {timeAgo}
          </span>
        </div>
        <p className="mb-0 mt-2 text-sm text-slate-700">{summary}</p>
        <StarRating value={rating} readOnly size={14} className="mt-2" />
      </div>
    </article>
  )
}
