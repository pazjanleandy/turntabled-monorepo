import { Calendar, ListBullets, MusicNotes, Star } from 'phosphor-react'
import Stat from './Stat.jsx'

export default function StatsSection({ statsData = null, compactMobile = false }) {
  const stats = Array.isArray(statsData) && statsData.length === 4 ? statsData : [
    {
      icon: <MusicNotes className="h-4 w-4" />,
      label: 'Albums logged',
      value: '0',
      hint: 'Last 30 days: 0',
    },
    {
      icon: <Star className="h-4 w-4" />,
      label: 'Avg rating',
      value: '0.0',
      hint: 'Most common: N/A',
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'This year',
      value: '0',
      hint: 'Last year: 0',
    },
    {
      icon: <ListBullets className="h-4 w-4" />,
      label: 'Backlog',
      value: '0',
      hint: 'Rated albums: 0',
    },
  ]

  const cellClass = (index) =>
    [
      index % 2 === 0
        ? compactMobile
          ? 'border-r border-black/8 md:border-r md:border-[var(--border)] lg:border-r-0'
          : 'border-r border-[var(--border)] lg:border-r-0'
        : '',
      index < 2
        ? compactMobile
          ? 'border-b border-black/8 md:border-b md:border-[var(--border)] lg:border-b-0'
          : 'border-b border-[var(--border)] lg:border-b-0'
        : '',
      index < 3 ? 'lg:border-r lg:border-[var(--border)]' : '',
    ].join(' ')

  return (
    <section className={compactMobile ? 'space-y-2 md:space-y-3' : 'space-y-3'}>
      <div>
        <p className={compactMobile ? 'mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted md:text-[11px] md:tracking-[0.18em]' : 'mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'}>
          Stats
        </p>
        <h2 className={compactMobile ? 'mb-0 text-base text-text md:text-lg' : 'mb-0 text-lg text-text'}>
          Listening overview
        </h2>
      </div>
      <div className={compactMobile ? 'overflow-hidden rounded-lg border border-black/7 bg-white/18 md:rounded-2xl md:border-[var(--border)] md:bg-[var(--surface-1)]' : 'overflow-hidden rounded-2xl border border-black/5 bg-white/40'}>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Stat
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              className={cellClass(index)}
              compactMobile={compactMobile}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
