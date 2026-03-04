import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'

function formatReviewDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ReviewRow({
  backlogId,
  title,
  artist,
  rating,
  reviewText,
  reviewedAt,
  cover,
  onEdit = null,
  onDelete = null,
  isBusy = false,
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
            <p className="mb-0 text-xs text-slate-600">{artist}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-black/10 bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {formatReviewDate(reviewedAt)}
            </span>
            {typeof onEdit === 'function' ? (
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:text-text disabled:opacity-60"
                onClick={() => onEdit({ backlogId, title, reviewText })}
                disabled={isBusy || !backlogId}
              >
                Edit
              </button>
            ) : null}
            {typeof onDelete === 'function' ? (
              <button
                type="button"
                className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                onClick={() => onDelete({ backlogId, title })}
                disabled={isBusy || !backlogId}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
        <p className="mb-0 mt-2 text-sm text-slate-700 whitespace-pre-wrap">{reviewText}</p>
        <StarRating value={rating ?? 0} readOnly size={14} className="mt-2" />
      </div>
    </article>
  )
}
