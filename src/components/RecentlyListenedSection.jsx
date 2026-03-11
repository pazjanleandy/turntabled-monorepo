import { useMemo } from 'react'
import { Headphones } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'
import useHorizontalRail from '../hooks/useHorizontalRail.js'

const BACKLOG_STATUSES = new Set(['listening', 'unfinished', 'backloggd'])

function formatRelativeTime(value) {
  if (!value) return 'Just now'
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime())
  if (Number.isNaN(diffMs)) return 'Just now'

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < hour) {
    const count = Math.max(1, Math.floor(diffMs / minute))
    return `${count}m ago`
  }
  if (diffMs < day) {
    const count = Math.floor(diffMs / hour)
    return `${count}h ago`
  }

  const count = Math.floor(diffMs / day)
  return `${count}d ago`
}

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

function resolveActivityLabel(item) {
  if (item?.type === 'review') {
    if (typeof item?.rating === 'number') return `Rated ${item.rating}/5`
    return 'Reviewed'
  }
  if (item?.type === 'favorite') return 'Favorited'
  if (BACKLOG_STATUSES.has(item?.status)) return 'Added to backlog'
  return 'Listened'
}

function AlbumTile(item) {
  const { album, artist, cover, addedAt, username, avatarUrl } = item
  const activityLabel = resolveActivityLabel(item)

  return (
    <div className="group min-w-0 snap-start">
      <div className="transition duration-300 group-hover:-translate-y-1">
        <CoverImage
          src={cover}
          alt={`${album} by ${artist} cover`}
          rounded="rounded-none"
          className="h-[min(70vw,240px)] w-full sm:h-[172px] md:h-[164px] lg:h-[156px]"
        />
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${username || 'Friend'} avatar`}
                  className="h-6 w-6 rounded-full border border-black/10 object-cover"
                />
              ) : (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-accent/12 text-[9px] font-semibold text-accent">
                  {getInitials(username)}
                </span>
              )}
              <span className="truncate text-[11px] font-semibold text-text">
                {username || 'Unknown friend'}
              </span>
            </div>
            <span className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
              {formatRelativeTime(addedAt)}
            </span>
          </div>
          <p className="mb-0 overflow-hidden text-sm font-semibold leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
            {album}
          </p>
          <p className="mb-0 truncate text-xs text-muted">{artist}</p>
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
            {activityLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

function DesktopFriendListenRow(item) {
  const { album, artist, cover, addedAt, username, avatarUrl } = item
  const activityLabel = resolveActivityLabel(item)
  const actionText =
    activityLabel === 'Favorited'
      ? 'favorited an album'
      : activityLabel === 'Reviewed'
        ? 'reviewed an album'
        : activityLabel.startsWith('Rated')
          ? activityLabel.toLowerCase()
          : BACKLOG_STATUSES.has(item?.status)
            ? 'added to backlog'
            : 'listened'

  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)_60px] items-center gap-2.5 py-1.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${username || 'Friend'} avatar`}
          className="h-9 w-9 rounded-full border border-black/10 object-cover"
        />
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-accent/12 text-[10px] font-semibold text-accent">
          {getInitials(username)}
        </span>
      )}

      <div className="min-w-0">
        <p className="mb-0 truncate text-[13px] font-semibold leading-none text-text">@{username || 'unknown'}</p>
        <p className="mb-0 mt-0.5 truncate text-[11px] leading-none text-muted">{actionText}</p>
        <p className="mb-0 mt-1 truncate text-[14px] font-semibold leading-tight text-text">
          {album}
        </p>
        <p className="mb-0 mt-0.5 truncate text-[12px] leading-none text-muted">
          {artist} <span className="mx-1 text-black/20">-</span> {activityLabel}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <CoverImage
          src={cover}
          alt={`${album} by ${artist} cover`}
          rounded="rounded-md"
          className="h-14 w-14 border border-black/10"
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          {formatRelativeTime(addedAt)}
        </span>
      </div>
    </article>
  )
}

export default function RecentlyListenedSection({
  albums,
  isLoading,
  error,
  isSignedIn,
  hasFriends = false,
}) {
  const visibleAlbums = useMemo(() => albums.slice(0, 6), [albums])
  const desktopRows = useMemo(() => albums.slice(0, 7), [albums])
  const { railRef } = useHorizontalRail(visibleAlbums.length)

  return (
    <section className="space-y-3 sm:space-y-4 lg:border-t lg:border-black/10 lg:pt-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Headphones size={18} weight="bold" className="text-accent" />
            <h2 className="mb-0 text-base uppercase tracking-[0.2em] text-muted sm:text-lg">
              Friends are listening
            </h2>
          </div>
          <p className="mb-0 hidden text-sm text-muted lg:block">
            Recent spins and logs from your friends, ordered from newest to oldest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text">
            {visibleAlbums.length} friends
          </span>
        </div>
      </div>

      <div className="overflow-hidden">
        {isLoading ? (
          <p className="mb-0 text-sm text-muted">Loading friends listening activity...</p>
        ) : error ? (
          <p className="mb-0 text-sm text-muted">{error}</p>
        ) : !isSignedIn ? (
          <p className="mb-0 text-sm text-muted">Sign in to see what your friends are listening to.</p>
        ) : !hasFriends ? (
          <p className="mb-0 text-sm text-muted">
            Add friends to see their listening activity here.
          </p>
        ) : visibleAlbums.length === 0 ? (
          <p className="mb-0 text-sm text-muted">No recent listens from friends yet.</p>
        ) : (
          <>
            <div className="hidden divide-y divide-black/8 border-y border-black/10 lg:block">
              {desktopRows.map((album) => {
                const key = album.id ?? `${album.artist} - ${album.album}`
                return <DesktopFriendListenRow key={key} {...album} />
              })}
            </div>
            <div
              ref={railRef}
              className="scrollbar-sleek grid auto-cols-[72vw] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[172px] md:auto-cols-[176px] lg:hidden"
            >
              {visibleAlbums.map((album) => {
                const key = album.id ?? `${album.artist} - ${album.album}`
                return <AlbumTile key={key} {...album} />
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
