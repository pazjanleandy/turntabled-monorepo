import { Link } from 'react-router-dom'

const actionButtonCardClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

const actionButtonInlineClass =
  'rounded-lg border border-black/10 bg-white/65 px-2.5 py-1.5 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

export default function FriendsSection({ friends, asCard = true }) {
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : 'space-y-4'

  const rowClass = asCard
    ? 'flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/75 px-3 py-2.5 shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
    : 'flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/35 px-3 py-2.5 transition hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Connections
          </p>
          <h2 className="mb-0 text-lg text-text">Friends</h2>
        </div>
        <Link
          to="/friends"
          className={asCard ? actionButtonCardClass : actionButtonInlineClass}
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-2.5">
        {friends.map((friend) => (
          <Link
            key={friend.handle}
            to={`/friends/${friend.slug}`}
            className={rowClass}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-accent/15 text-xs font-semibold text-accent">
                {friend.initials}
              </div>
              <div className="min-w-0">
                <p className="mb-0 truncate text-sm font-semibold text-text">
                  {friend.name}
                </p>
                <p className="mb-0 truncate text-[11px] text-slate-600">
                  {friend.handle} - {friend.note}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-black/10 bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {friend.activity}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
