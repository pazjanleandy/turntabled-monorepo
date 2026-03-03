import { Link } from 'react-router-dom'
import AlbumRow from './AlbumRow.jsx'

const actionButtonCardClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

const actionButtonInlineClass =
  'rounded-lg border border-black/10 bg-white/65 px-2.5 py-1.5 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

export default function LatestLogsSection({ recent, asCard = true }) {
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : 'space-y-4'

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Recent activity
          </p>
          <h2 className="mb-0 text-lg text-text">Latest logs</h2>
        </div>
        <Link
          to="/activity?filter=added-latest"
          className={asCard ? actionButtonCardClass : actionButtonInlineClass}
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {recent.map((entry, idx) => (
          <AlbumRow key={idx} {...entry} elevated={asCard} />
        ))}
      </div>
    </section>
  )
}
