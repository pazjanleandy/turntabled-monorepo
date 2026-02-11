import { Link } from 'react-router-dom'

export default function ProfileCTA() {
  return (
    <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/55 p-4 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)] sm:flex-row sm:items-center">
      <p className="mb-0 text-sm text-muted">
        Want this to feel more "music"? Add a{' '}
        <span className="font-semibold text-text">Now Spinning</span> module + friends
        feed next.
      </p>
      <div className="flex gap-3">
        <Link
          to="/backlog"
          className="rounded-xl border border-black/5 bg-white/70 px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          Open backlog
        </Link>
        <Link to="/home" className="btn-primary px-4 py-2 text-sm">
          Log an album
        </Link>
      </div>
    </section>
  )
}
