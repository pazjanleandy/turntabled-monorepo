import { Heart } from 'phosphor-react'
import ActivityRow from './ActivityRow.jsx'

export default function RecentActivitySection({
  activity = [],
  isLoading = false,
  error = '',
  emptyMessage = 'No friend activity yet.',
}) {
  const hasItems = Array.isArray(activity) && activity.length > 0

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart size={18} weight="bold" className="text-accent" />
        <h2 className="mb-0 text-lg uppercase tracking-[0.2em] text-muted">
          Friend activity
        </h2>
      </div>
      {isLoading ? (
        <div className="rounded-soft bg-white/85 px-4 py-5 text-sm text-muted shadow-subtle">
          Loading friend activity...
        </div>
      ) : error ? (
        <div className="rounded-soft bg-white/85 px-4 py-5 text-sm text-red-700 shadow-subtle">
          {error}
        </div>
      ) : hasItems ? (
        <div className="grid gap-3">
          {activity.slice(0, 8).map((item) => (
            <ActivityRow key={item.id} {...item} />
          ))}
        </div>
      ) : (
        <div className="rounded-soft bg-white/85 px-4 py-5 text-sm text-muted shadow-subtle">
          {emptyMessage}
        </div>
      )}
    </section>
  )
}
