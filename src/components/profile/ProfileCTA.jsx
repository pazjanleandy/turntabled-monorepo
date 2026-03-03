import { Link } from 'react-router-dom'

export default function ProfileCTA({ asCard = true }) {
  const sectionClass = asCard
    ? 'flex flex-col items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/75 p-4 shadow-sm sm:flex-row sm:items-center'
    : 'flex flex-col items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/35 p-4 sm:flex-row sm:items-center'

  return (
    <section className={sectionClass}>
      <p className="mb-0 text-sm text-slate-600">
        Want this to feel more "music"? Add a{' '}
        <span className="font-semibold text-text">Now Spinning</span> module + friends
        feed next.
      </p>
      <div className="flex gap-3">
        <Link
          to="/backlog"
          className="rounded-xl border border-black/10 bg-white/85 px-4 py-2 text-sm font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          Open backlog
        </Link>
        <Link
          to="/home"
          className="btn-primary rounded-xl border border-orange-500/30 px-4 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          Log an album
        </Link>
      </div>
    </section>
  )
}
