import { Link } from 'react-router-dom'
import { Heart } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

function ActivityFeedItem({ item }) {
  return (
    <article className="flex items-center gap-2.5 px-3 py-2.5">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/14 text-accent">
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-[13px] font-semibold text-text">{item.text}</p>
        <p className="mb-0 truncate text-[11px] text-muted">{item.meta}</p>
      </div>
      {item.cover ? (
        <CoverImage
          src={item.cover}
          alt={`${item.text} cover`}
          className="h-9 w-9 shrink-0 border border-black/10"
        />
      ) : null}
    </article>
  )
}

export default function HomeMobileFriendActivitySection({
  activity = [],
  isLoading = false,
  error = '',
  emptyMessage = 'No friend activity yet.',
}) {
  const hasItems = Array.isArray(activity) && activity.length > 0

  return (
    <section className="space-y-3 border-t border-black/10 pt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Heart size={14} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-[1.05rem] leading-tight text-text">Friend activity</h2>
        </div>
        <Link
          to="/activity"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-accent"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="py-2 text-sm text-muted">Loading friend activity...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/85 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : hasItems ? (
        <div className="overflow-hidden rounded-xl border border-black/8 bg-white/60">
          {activity.slice(0, 4).map((item, index) => (
            <div key={item.id}>
              <ActivityFeedItem item={item} />
              {index < Math.min(activity.length, 4) - 1 ? <div className="h-px bg-black/8" /> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-2 text-sm text-muted">{emptyMessage}</div>
      )}
    </section>
  )
}
