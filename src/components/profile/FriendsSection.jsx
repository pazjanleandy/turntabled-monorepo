import { Link } from 'react-router-dom'

const actionButtonCardClass =
  'rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

const actionButtonInlineClass =
  'rounded-lg border border-black/10 bg-white/65 px-2.5 py-1.5 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

export default function FriendsSection({ friends, asCard = true, compactMobile = false }) {
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : compactMobile
      ? 'space-y-3 md:space-y-4'
      : 'space-y-4'

  const rowClass = asCard
    ? 'flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/75 px-3 py-2.5 shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
    : compactMobile
      ? 'flex items-center justify-between gap-2.5 rounded-lg border border-black/8 bg-white/28 px-2.5 py-2 transition hover:bg-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:gap-3 md:rounded-xl md:border-[var(--border)] md:bg-[var(--surface-2)] md:px-3 md:py-2.5 md:hover:bg-[var(--surface-3)]'
      : 'flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/35 px-3 py-2.5 transition hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={compactMobile ? 'mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted md:text-[11px] md:tracking-[0.18em]' : 'mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'}>
            Connections
          </p>
          <h2 className={compactMobile ? 'mb-0 text-base text-text md:text-lg' : 'mb-0 text-lg text-text'}>
            Friends
          </h2>
        </div>
        <Link
          to="/friends"
          className={asCard ? actionButtonCardClass : compactMobile ? 'rounded-lg border border-black/10 bg-white/60 px-2 py-1.5 text-[11px] font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:border-[var(--border)] md:bg-[var(--surface-3)] md:px-2.5 md:text-xs md:hover:bg-[var(--surface-elevated)]' : actionButtonInlineClass}
        >
          View all
        </Link>
      </div>

      <div className={compactMobile ? 'mt-3 space-y-2 md:mt-4 md:space-y-2.5' : 'mt-4 space-y-2.5'}>
        {friends.map((friend) => (
          <Link
            key={friend.handle}
            to={`/friends/${friend.slug}`}
            className={rowClass}
          >
            <div className="flex min-w-0 items-center gap-3">
              {friend.avatarUrl ? (
                <img
                  src={friend.avatarUrl}
                  alt={`${friend.name} avatar`}
                  className={compactMobile ? 'h-8 w-8 shrink-0 rounded-full border border-orange-500/20 object-cover md:h-9 md:w-9' : 'h-9 w-9 shrink-0 rounded-full border border-orange-500/20 object-cover'}
                />
              ) : (
                <div className={compactMobile ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-accent/15 text-[10px] font-semibold text-accent md:h-9 md:w-9 md:text-xs' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-accent/15 text-xs font-semibold text-accent'}>
                  {friend.initials}
                </div>
              )}
              <div className="min-w-0">
                <p className={compactMobile ? 'mb-0 truncate text-[13px] font-semibold text-text md:text-sm' : 'mb-0 truncate text-sm font-semibold text-text'}>
                  {friend.name}
                </p>
                <p className={compactMobile ? 'mb-0 truncate text-[10px] text-slate-600 md:text-[11px]' : 'mb-0 truncate text-[11px] text-slate-600'}>
                  {friend.handle} - {friend.note}
                </p>
              </div>
            </div>
            <span className={compactMobile ? 'shrink-0 rounded-full border border-black/10 bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600 md:border-[var(--border)] md:bg-[var(--surface-3)] md:px-2 md:py-1 md:text-[10px] md:tracking-[0.12em]' : 'shrink-0 rounded-full border border-black/10 bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600'}>
              {friend.activity}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
