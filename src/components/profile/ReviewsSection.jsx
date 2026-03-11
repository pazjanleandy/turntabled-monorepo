import ReviewRow from './ReviewRow.jsx'

export default function ReviewsSection({
  reviews = [],
  onEditReview = null,
  onDeleteReview = null,
  isReviewActionBusy = false,
  asCard = true,
  compactMobile = false,
}) {
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : compactMobile
      ? 'space-y-3 md:space-y-4'
      : 'space-y-4'

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={compactMobile ? 'mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted md:text-[11px] md:tracking-[0.18em]' : 'mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'}>
            Reviews
          </p>
          <h2 className={compactMobile ? 'mb-0 text-base text-text md:text-lg' : 'mb-0 text-lg text-text'}>
            Your write-ups
          </h2>
        </div>
      </div>

      <div className={compactMobile ? 'mt-2.5 space-y-2 md:mt-4 md:space-y-3' : 'mt-4 space-y-3'}>
        {reviews.length ? (
          reviews.map((review) => (
            <ReviewRow
              key={review.backlogId || `${review.title}-${review.artist}`}
              {...review}
              onEdit={onEditReview}
              onDelete={onDeleteReview}
              isBusy={isReviewActionBusy}
              elevated={asCard}
              compactMobile={compactMobile}
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
