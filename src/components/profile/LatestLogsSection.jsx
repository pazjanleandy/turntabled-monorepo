import { Link } from 'react-router-dom'
import AlbumRow from './AlbumRow.jsx'

const actionButtonCardClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

const actionButtonInlineClass =
  'rounded-lg border border-black/10 bg-white/65 px-2.5 py-1.5 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

export default function LatestLogsSection({ recent, asCard = true, compactMobile = false }) {
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : compactMobile
      ? 'space-y-3 md:space-y-4'
      : 'space-y-4'

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={compactMobile ? 'mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted md:text-[11px] md:tracking-[0.18em]' : 'mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'}>
            Recent activity
          </p>
          <h2 className={compactMobile ? 'mb-0 text-base text-text md:text-lg' : 'mb-0 text-lg text-text'}>
            Latest logs
          </h2>
        </div>
        <Link
          to="/activity?filter=added-latest"
          className={asCard ? actionButtonCardClass : compactMobile ? 'rounded-lg border border-black/10 bg-white/60 px-2 py-1.5 text-[11px] font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:border-[var(--border)] md:bg-[var(--surface-3)] md:px-2.5 md:text-xs md:hover:bg-[var(--surface-elevated)]' : actionButtonInlineClass}
        >
          View all
        </Link>
      </div>

      <div className={compactMobile ? 'mt-3 space-y-2 md:mt-4 md:space-y-3' : 'mt-4 space-y-3'}>
        {recent.map((entry, idx) => (
          <AlbumRow key={idx} {...entry} elevated={asCard} compactMobile={compactMobile} />
        ))}
      </div>
    </section>
  )
}
