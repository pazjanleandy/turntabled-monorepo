import { Link } from 'react-router-dom'

export default function FriendsSection({ friends }) {
  return (
    <section className="card vinyl-texture">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Connections
          </p>
          <h2 className="mb-0 text-xl">Friends</h2>
        </div>
        <Link
          to="/friends"
          className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
        >
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {friends.map((friend) => (
          <div
            key={friend.handle}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/60 px-3 py-2 shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {friend.initials}
              </div>
              <div className="min-w-0">
                <p className="mb-0 truncate text-sm font-semibold text-text">
                  {friend.name}
                </p>
                <p className="mb-0 truncate text-[11px] text-muted">
                  {friend.handle} - {friend.note}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-muted">
              {friend.activity}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
