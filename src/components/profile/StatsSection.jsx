import { Calendar, ListBullets, MusicNotes, Star } from 'phosphor-react'
import Stat from './Stat.jsx'

export default function StatsSection() {
  const stats = [
    {
      icon: <MusicNotes className="h-4 w-4" />,
      label: 'Albums logged',
      value: '214',
      hint: 'Last 30 days: 18',
    },
    {
      icon: <Star className="h-4 w-4" />,
      label: 'Avg rating',
      value: '3.9',
      hint: 'Most common: 4.0',
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'This year',
      value: '46',
      hint: 'Goal: 120 albums',
    },
    {
      icon: <ListBullets className="h-4 w-4" />,
      label: 'Backlog',
      value: '83',
      hint: 'Up next: 12 saved',
    },
  ]

  const cellClass = (index) =>
    [
      index % 2 === 0 ? 'border-r border-black/5 lg:border-r-0' : '',
      index < 2 ? 'border-b border-black/5 lg:border-b-0' : '',
      index < 3 ? 'lg:border-r lg:border-black/5' : '',
    ].join(' ')

  return (
    <section className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Stats
        </p>
        <h2 className="mb-0 text-lg text-text">Listening overview</h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/40">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Stat
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              className={cellClass(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
