import { ChartLineUp } from 'phosphor-react'
import { Card } from './Card.jsx'
import ActivityRow from './ActivityRow.jsx'

const STAR_SYMBOL = '\u2605'
const DEFAULT_RATING_DISTRIBUTION = Array.from(
  { length: 9 },
  (_, index) => ({ bucket: 1 + index * 0.5, count: 0 }),
)
const RATING_BUCKET_ORDER = DEFAULT_RATING_DISTRIBUTION.map((item) => Number(item.bucket))

export default function StatsPanel({ stats, userActivity, ratingDistribution = DEFAULT_RATING_DISTRIBUTION }) {
  const safeDistribution = Array.isArray(ratingDistribution) ? ratingDistribution : DEFAULT_RATING_DISTRIBUTION
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

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-[11px]">
            Rating distribution
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {totalRated} rated
          </span>
        </div>

        <div className="border-b border-black/8 pb-1.5 pt-0.5">
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/14"
              aria-hidden="true"
            />

            {totalRated === 0 ? (
              <div className="relative z-[1] flex h-[6.35rem] items-center justify-center text-[11px] font-medium text-muted">
                No ratings yet
              </div>
            ) : (
              <div className="relative z-[1] grid h-[6.35rem] grid-cols-9 items-end gap-x-0.5 pb-px">
                {normalizedDistribution.map((item) => {
                  const bucket = Number(item?.bucket ?? 0)
                  const count = Number(item?.count ?? 0)
                  const isWholeStarBucket = Number.isInteger(bucket)
                  const minHeightPercent = isWholeStarBucket ? 18 : 14
                  const heightPercent = count > 0
                    ? Math.max(minHeightPercent, Math.round((count / maxCount) * 100))
                    : 0

                  return (
                    <div key={bucket} className="flex h-full items-end justify-center">
                      <div
                        className="rounded-t-[6px] transition-[height,opacity] duration-300"
                        style={{
                          height: `${heightPercent}%`,
                          width: isWholeStarBucket ? '1.18rem' : '1.04rem',
                          backgroundColor: 'var(--accent)',
                          opacity: isWholeStarBucket ? 0.9 : 0.58,
                        }}
                        title={`${bucket.toFixed(1)} star${bucket === 1 ? '' : 's'}: ${count}`}
                        aria-label={`${bucket.toFixed(1)} star ratings: ${count}`}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-1.5 grid grid-cols-9 gap-x-0.5 text-[10px] font-semibold text-muted">
            <p className="col-start-1 mb-0 justify-self-center">{`1${STAR_SYMBOL}`}</p>
            <p className="col-start-3 mb-0 justify-self-center">{`2${STAR_SYMBOL}`}</p>
            <p className="col-start-5 mb-0 justify-self-center">{`3${STAR_SYMBOL}`}</p>
            <p className="col-start-7 mb-0 justify-self-center">{`4${STAR_SYMBOL}`}</p>
            <p className="col-start-9 mb-0 justify-self-center">{`5${STAR_SYMBOL}`}</p>
          </div>
        </div>
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
