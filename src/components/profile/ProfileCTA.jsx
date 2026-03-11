import { Link } from 'react-router-dom'

export default function ProfileCTA({ asCard = true, compactMobile = false }) {
  const sectionClass = asCard
    ? 'flex flex-col items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/75 p-4 shadow-sm sm:flex-row sm:items-center'
    : compactMobile
      ? 'flex flex-col items-start justify-between gap-2.5 rounded-xl border border-black/8 bg-white/28 p-3 sm:flex-row sm:items-center lg:gap-3 lg:rounded-2xl lg:border-[var(--border)] lg:bg-[var(--surface-1)] lg:p-4'
      : 'flex flex-col items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/35 p-4 sm:flex-row sm:items-center'

  const copyClass = compactMobile ? 'mb-0 text-[12px] text-slate-600 lg:text-sm' : 'mb-0 text-sm text-slate-600'
  const actionsClass = compactMobile ? 'flex w-full gap-2 sm:w-auto sm:gap-3' : 'flex gap-3'
  const backlogButtonClass = compactMobile
    ? 'inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-black/10 bg-white/75 px-3 text-xs font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:h-auto sm:flex-none sm:px-4 sm:py-2 sm:text-sm'
    : 'rounded-xl border border-black/10 bg-white/85 px-4 py-2 text-sm font-semibold text-text shadow-none transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
  const logButtonClass = compactMobile
    ? 'btn-primary inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-orange-500/30 px-3 text-xs shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:h-auto sm:flex-none sm:px-4 sm:py-2 sm:text-sm'
    : 'btn-primary rounded-xl border border-orange-500/30 px-4 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'

  return (
    <section className={sectionClass}>
      <p className={copyClass}>
        Want this to feel more "music"? Add a{' '}
        <span className="font-semibold text-text">Now Spinning</span> module + friends
        feed next.
      </p>
      <div className={actionsClass}>
        <Link
          to="/backlog"
          className={backlogButtonClass}
        >
          Open backlog
        </Link>
        <Link
          to="/home"
          className={logButtonClass}
        >
          Log an album
        </Link>
      </div>
    </section>
  )
}
