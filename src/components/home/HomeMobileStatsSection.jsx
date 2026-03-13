import { ChartLineUp } from 'phosphor-react'

const STAR_SYMBOL = '\u2605'
const DEFAULT_RATING_DISTRIBUTION = Array.from(
  { length: 9 },
  (_, index) => ({ bucket: 1 + index * 0.5, count: 0 }),
)
const RATING_BUCKET_ORDER = DEFAULT_RATING_DISTRIBUTION.map((item) => Number(item.bucket))

export default function HomeMobileStatsSection({
  stats = [],
  ratingDistribution = DEFAULT_RATING_DISTRIBUTION,
}) {
  const safeDistribution = Array.isArray(ratingDistribution)
    ? ratingDistribution
    : DEFAULT_RATING_DISTRIBUTION
  const distributionMap = new Map(
    safeDistribution.map((item) => [Number(item?.bucket ?? 0).toFixed(1), Number(item?.count ?? 0)]),
  )
  const normalizedDistribution = RATING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    count: distributionMap.get(bucket.toFixed(1)) ?? 0,
  }))
  const maxCount = Math.max(1, ...normalizedDistribution.map((item) => Number(item?.count ?? 0)))
  const totalRated = normalizedDistribution.reduce((sum, item) => sum + Number(item?.count ?? 0), 0)

  return (
    <section className="space-y-3 border-t border-black/10 pt-6">
      <div className="flex items-center gap-2">
        <ChartLineUp size={14} weight="bold" className="text-accent" />
        <h2 className="mb-0 text-[1.05rem] leading-tight text-text">Your stats</h2>
      </div>

      <div className="rounded-xl border border-black/8 bg-white/75 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Rating distribution
          </p>
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {totalRated} rated
          </p>
        </div>

        {totalRated === 0 ? (
          <div className="mt-3 flex h-[4.9rem] items-center justify-center text-[12px] text-muted">
            No ratings yet
          </div>
        ) : (
          <>
            <div className="mt-3 border-b border-black/8 pb-1.5 pt-0.5">
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/14"
                  aria-hidden="true"
                />
                <div className="relative z-[1] grid h-[4.9rem] grid-cols-9 items-end gap-x-0.5 pb-px">
                  {normalizedDistribution.map((item) => {
                    const bucket = Number(item?.bucket ?? 0)
                    const count = Number(item?.count ?? 0)
                    const isWholeStarBucket = Number.isInteger(bucket)
                    const minHeightPercent = isWholeStarBucket ? 18 : 14
                    const heightPercent =
                      count > 0 ? Math.max(minHeightPercent, Math.round((count / maxCount) * 100)) : 0

                    return (
                      <div key={bucket} className="flex h-full items-end justify-center">
                        <div
                          className="rounded-t-[5px] transition-[height,opacity] duration-300"
                          style={{
                            height: `${heightPercent}%`,
                            width: isWholeStarBucket ? '0.96rem' : '0.86rem',
                            backgroundColor: 'var(--accent)',
                            opacity: isWholeStarBucket ? 0.9 : 0.58,
                          }}
                          title={`${bucket.toFixed(1)} stars: ${count}`}
                          aria-label={`${bucket.toFixed(1)} star ratings: ${count}`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-9 gap-x-0.5 text-[9px] font-semibold text-muted">
              <p className="col-start-1 mb-0 justify-self-center">{`1${STAR_SYMBOL}`}</p>
              <p className="col-start-3 mb-0 justify-self-center">{`2${STAR_SYMBOL}`}</p>
              <p className="col-start-5 mb-0 justify-self-center">{`3${STAR_SYMBOL}`}</p>
              <p className="col-start-7 mb-0 justify-self-center">{`4${STAR_SYMBOL}`}</p>
              <p className="col-start-9 mb-0 justify-self-center">{`5${STAR_SYMBOL}`}</p>
            </div>
          </>
        )}
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
