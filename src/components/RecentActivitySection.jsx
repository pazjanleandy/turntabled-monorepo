import { Heart } from 'phosphor-react'
import ActivityRow from './ActivityRow.jsx'

export default function RecentActivitySection({ activity }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart size={18} weight="bold" className="text-accent" />
        <h2 className="mb-0 text-lg uppercase tracking-[0.2em] text-muted">
          Friend activity
        </h2>
      </div>
      <div className="grid gap-3">
        {activity.slice(0, 4).map((item) => (
          <ActivityRow key={item.id} {...item} />
        ))}
      </div>
      <button className="rounded-soft bg-white/80 px-4 py-2 text-sm font-semibold text-text shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
        See more
      </button>
    </section>
  )
}
