import { ChartLineUp } from 'phosphor-react'

export default function HomeMobileStatsSection({ stats = [] }) {
  return (
    <section className="space-y-3 border-t border-black/10 pt-6">
      <div className="flex items-center gap-2">
        <ChartLineUp size={14} weight="bold" className="text-accent" />
        <h2 className="mb-0 text-[1.05rem] leading-tight text-text">Your stats</h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-black/8 bg-white/75 px-2 py-2.5 text-center"
          >
            <p className="mb-0 text-base font-semibold leading-tight text-text">{stat.value}</p>
            <p className="mb-0 mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {stat.label}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
