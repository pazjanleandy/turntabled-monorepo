import { Link } from 'react-router-dom'
import AlbumRow from './AlbumRow.jsx'

export default function LatestLogsSection({ recent }) {
  return (
    <section className="card vinyl-texture">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Recent activity
          </p>
          <h2 className="mb-0 text-xl">Latest logs</h2>
        </div>
        <Link
          to="/activity?filter=added-latest"
          className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {recent.map((entry, idx) => (
          <AlbumRow key={idx} {...entry} />
        ))}
      </div>
    </section>
  )
}
