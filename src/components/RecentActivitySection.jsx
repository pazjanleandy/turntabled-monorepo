import { Heart } from 'phosphor-react'
import ActivityRow from './ActivityRow.jsx'

export default function RecentActivitySection({
  activity = [],
  isLoading = false,
  error = '',
  emptyMessage = 'No friend activity yet.',
  compactMobile = false,
}) {
  const hasItems = Array.isArray(activity) && activity.length > 0
  const desktopPanelClasses =
    'overflow-hidden rounded-[22px] border border-black/8 bg-white/60 backdrop-blur-sm shadow-[0_18px_36px_-30px_rgba(15,23,42,0.42)]'
  const desktopMessageClasses = `${desktopPanelClasses} px-4 py-4 text-sm`

  return (
    <section className={compactMobile ? 'space-y-3 md:space-y-4' : 'space-y-4'}>
      <div className="flex items-center gap-2">
        <Heart size={compactMobile ? 16 : 18} weight="bold" className="text-accent" />
        <h2 className={compactMobile ? 'mb-0 text-base uppercase tracking-[0.16em] text-muted md:text-lg md:tracking-[0.2em]' : 'mb-0 text-lg uppercase tracking-[0.2em] text-muted'}>
          Friend activity
        </h2>
      </div>
      {isLoading ? (
        <div
          className={
            compactMobile
              ? 'rounded-lg border border-black/8 bg-white/70 px-3 py-3 text-[13px] text-muted shadow-none md:rounded-soft md:border md:border-[var(--border)] md:bg-[var(--surface-2)] md:px-4 md:py-5 md:text-sm md:shadow-subtle'
              : `${desktopMessageClasses} text-muted`
          }
        >
          Loading friend activity...
        </div>
      ) : error ? (
        <div
          className={
            compactMobile
              ? 'rounded-lg border border-black/8 bg-white/70 px-3 py-3 text-[13px] text-red-700 shadow-none md:rounded-soft md:border md:border-[var(--border)] md:bg-[var(--surface-2)] md:px-4 md:py-5 md:text-sm md:shadow-subtle'
              : `${desktopMessageClasses} text-red-700`
          }
        >
          {error}
        </div>
      ) : hasItems ? (
        compactMobile ? (
          <div className="grid gap-2 md:gap-3">
            {activity.slice(0, 8).map((item) => (
              <ActivityRow key={item.id} {...item} compactMobile />
            ))}
          </div>
        ) : (
          <div className={desktopPanelClasses}>
            {activity.slice(0, 8).map((item, index) => (
              <div key={item.id} className={index > 0 ? 'border-t border-black/7' : ''}>
                <ActivityRow {...item} desktopFeed />
              </div>
            ))}
          </div>
        )
      ) : (
        <div
          className={
            compactMobile
              ? 'rounded-lg border border-black/8 bg-white/70 px-3 py-3 text-[13px] text-muted shadow-none md:rounded-soft md:border md:border-[var(--border)] md:bg-[var(--surface-2)] md:px-4 md:py-5 md:text-sm md:shadow-subtle'
              : `${desktopMessageClasses} text-muted`
          }
        >
          {emptyMessage}
        </div>
      )}
    </section>
  )
}
