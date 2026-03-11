import { useMemo } from 'react'
import { Headphones } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

function getInitials(value = '') {
  const parts = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatRelativeTime(value) {
  if (!value) return ''
  const now = Date.now()
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''

  const diffMs = Math.max(0, now - then)
  const hour = 60 * 60 * 1000
  const day = 24 * hour
  const week = 7 * day

  if (diffMs < hour) {
    const n = Math.max(1, Math.floor(diffMs / (60 * 1000)))
    return `${n}m ago`
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour)
    return `${n}h ago`
  }
  if (diffMs < week) {
    const n = Math.floor(diffMs / day)
    return `${n}d ago`
  }
  const n = Math.floor(diffMs / week)
  return `${n}w ago`
}

export default function HomeMobileRecentlyListenedSection({
  albums = [],
  isLoading = false,
  error = '',
  isSignedIn = false,
  hasFriends = false,
}) {
  const visibleAlbums = useMemo(() => (Array.isArray(albums) ? albums.slice(0, 6) : []), [albums])

  return (
    <section className="space-y-3 border-t border-black/10 pt-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Headphones size={14} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-[1.05rem] leading-tight text-text">Friends are listening</h2>
        </div>
        <p className="mb-0 text-[12px] text-muted">Recent albums from your network.</p>
      </div>

      {isLoading ? (
        <div className="py-2 text-sm text-muted">Loading friends listening activity...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/85 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : !isSignedIn ? (
        <div className="py-2 text-sm text-muted">Sign in to see what your friends are listening to.</div>
      ) : !hasFriends ? (
        <div className="py-2 text-sm text-muted">
          Add friends to see their recent listening activity.
        </div>
      ) : visibleAlbums.length === 0 ? (
        <div className="py-2 text-sm text-muted">No recent listens from friends yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {visibleAlbums.map((item, index) => {
            const key = item?.id ?? `${item?.artist ?? 'artist'}-${item?.album ?? 'album'}-${index}`
            const timeLabel = formatRelativeTime(item?.addedAt)
            return (
              <article key={key} className="min-w-0">
                <CoverImage
                  src={item?.cover || '/album/am.jpg'}
                  alt={`${item?.album ?? 'Album'} by ${item?.artist ?? 'Artist'} cover`}
                  className="w-full border border-black/10 shadow-subtle"
                />
                <div className="mt-2 space-y-1 px-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      {item?.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={`${item?.username || 'Friend'} avatar`}
                          className="h-5 w-5 rounded-full border border-black/10 object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/10 bg-accent/12 text-[8px] font-semibold text-accent">
                          {getInitials(item?.username)}
                        </span>
                      )}
                      <p className="mb-0 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-text">
                        {item?.username ?? 'Unknown friend'}
                      </p>
                    </div>
                    {timeLabel ? <p className="mb-0 text-[10px] text-muted">{timeLabel}</p> : null}
                  </div>
                  <p className="mb-0 overflow-hidden text-[14px] font-semibold leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                    {item?.album ?? 'Unknown album'}
                  </p>
                  <p className="mb-0 truncate text-[12px] text-muted">{item?.artist ?? 'Unknown artist'}</p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
