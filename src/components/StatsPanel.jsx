import { ChartLineUp } from 'phosphor-react'
import { Card, CardHeader } from './Card.jsx'
import ActivityRow from './ActivityRow.jsx'

export default function StatsPanel({ stats, userActivity }) {
  return (
    <Card className="space-y-5 bg-card/90">
      <CardHeader label="Your Stats" title="Listening pulse" icon={<ChartLineUp size={14} />} />
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-soft bg-white/75 px-3 py-2 text-center shadow-subtle">
            <p className="mb-0 text-lg font-semibold text-text">{stat.value}</p>
            <p className="mb-0 text-[0.65rem] uppercase tracking-[0.18em] text-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
          User activity
        </p>
        <div className="grid gap-2">
          {userActivity.map((item) => (
            <ActivityRow key={item.id} {...item} compact />
          ))}
        </div>
      </div>
    </Card>
  )
}
