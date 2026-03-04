import ReviewRow from './ReviewRow.jsx'

export default function ReviewsSection({
  reviews = [],
  onEditReview = null,
  onDeleteReview = null,
  isReviewActionBusy = false,
  asCard = true,
}) {
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : 'space-y-4'

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Reviews
          </p>
          <h2 className="mb-0 text-lg text-text">Your write-ups</h2>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reviews.length ? (
          reviews.map((review) => (
            <ReviewRow
              key={review.backlogId || `${review.title}-${review.artist}`}
              {...review}
              onEdit={onEditReview}
              onDelete={onDeleteReview}
              isBusy={isReviewActionBusy}
              elevated={asCard}
            />
          ))
        ) : (
          <p className="mb-0 text-sm text-slate-600">
            No reviews to show yet. Start writing to build your collection.
          </p>
        )}
      </div>
    </section>
  )
}
