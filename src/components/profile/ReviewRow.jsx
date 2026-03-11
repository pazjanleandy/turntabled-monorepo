import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'
import { PencilSimple, Trash } from 'phosphor-react'

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
  compactMobile = false,
}) {
  const rowClass = elevated
    ? 'flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-start'
    : 'flex flex-col gap-3 rounded-xl border border-black/5 bg-white/35 p-4 sm:flex-row sm:items-start'

  if (compactMobile) {
    const mobileRowClass = elevated
      ? 'rounded-xl border border-black/8 bg-white/60 p-2.5 shadow-none'
      : 'rounded-xl border border-black/8 bg-white/28 p-2.5'

    const reviewClampClass =
      'mb-0 mt-1 overflow-hidden text-[13px] leading-snug text-slate-700 whitespace-pre-wrap [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]'

    return (
      <>
        <article className={`${mobileRowClass} md:hidden`}>
          <div className="flex items-start gap-2.5">
            <CoverImage
              src={cover}
              alt={`${title} by ${artist} cover`}
              className="h-12 w-12 shrink-0 rounded-md border border-black/10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <h3 className="mb-0 truncate text-[14px] leading-tight text-text">{title}</h3>
                  <p className="mb-0 mt-0.5 truncate text-[11px] leading-tight text-slate-600">{artist}</p>
                </div>
                <span className="shrink-0 rounded-full border border-black/8 bg-white/65 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {formatReviewDate(reviewedAt)}
                </span>
              </div>
              <p className={reviewClampClass}>{reviewText}</p>
              <StarRating value={rating ?? 0} readOnly size={12} className="mt-1" />
            </div>
          </div>
          {(typeof onEdit === 'function' || typeof onDelete === 'function') ? (
            <div className="mt-1.5 flex items-center justify-end gap-3 pt-1">
              {typeof onEdit === 'function' ? (
                <button
                  type="button"
                  className="!m-0 inline-flex h-5 w-5 items-center justify-center !rounded-none !border-0 !bg-transparent !p-0 !shadow-none text-slate-500 !transition-colors hover:text-text hover:!bg-transparent hover:!shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/45 disabled:opacity-60"
                  onClick={() => onEdit({ backlogId, title, reviewText })}
                  disabled={isBusy || !backlogId}
                  aria-label={`Edit review for ${title}`}
                  title="Edit review"
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
              ) : null}
              {typeof onDelete === 'function' ? (
                <button
                  type="button"
                  className="!m-0 inline-flex h-5 w-5 items-center justify-center !rounded-none !border-0 !bg-transparent !p-0 !shadow-none text-slate-500 !transition-colors hover:text-red-700 hover:!bg-transparent hover:!shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/45 disabled:opacity-60"
                  onClick={() => onDelete({ backlogId, title })}
                  disabled={isBusy || !backlogId}
                  aria-label={`Delete review for ${title}`}
                  title="Delete review"
                >
                  <Trash size={14} weight="bold" />
                </button>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className={`hidden md:flex ${rowClass}`}>
          <CoverImage
            src={cover}
            alt={`${title} by ${artist} cover`}
            className="h-16 w-16 flex-shrink-0 border border-black/10"
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
      </>
    )
  }

  return (
    <article className={rowClass}>
      <CoverImage
        src={cover}
        alt={`${title} by ${artist} cover`}
        className="h-16 w-16 flex-shrink-0 border border-black/10"
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
