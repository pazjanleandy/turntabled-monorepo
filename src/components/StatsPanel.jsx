import { ChartLineUp } from 'phosphor-react'
import { Card } from './Card.jsx'
import ActivityRow from './ActivityRow.jsx'

export default function StatsPanel({ stats, userActivity }) {
  return (
    <Card className="space-y-3 bg-card/82 sm:space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="mb-0 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            <span className="text-accent">
              <ChartLineUp size={14} />
            </span>
            Your stats
          </p>
          <h2 className="mb-0 text-lg sm:text-[1.15rem]">Listening pulse</h2>
        </div>
        <span className="hidden rounded-full bg-black/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted lg:inline-flex">
          Snapshot
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-black/7 border-y border-black/7 py-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="px-2 text-center sm:px-3"
          >
            <p className="mb-0 text-[0.98rem] font-semibold text-text sm:text-[1.05rem]">
              {stat.value}
            </p>
            <p className="mb-0 text-[0.62rem] uppercase tracking-[0.16em] text-muted sm:text-[0.65rem] sm:tracking-[0.18em]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted sm:text-xs sm:tracking-[0.25em]">
            User activity
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {userActivity.length} recent
          </span>
        </div>
        <div className="divide-y divide-black/6">
          {userActivity.map((item) => (
            <ActivityRow key={item.id} {...item} compact sidebarMinimal />
          ))}
        </div>
      </div>
    </Card>
  )
}
