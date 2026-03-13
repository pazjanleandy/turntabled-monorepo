import { Link } from 'react-router-dom'
import { UsersThree } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'

function getInitials(value = '') {
  const parts = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'U'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function normalizeAction(value = '') {
  const action = String(value ?? '').trim()
  if (!action) return 'updated'
  if (action.toLowerCase() === 'added to backlog') return 'added'
  return action
}

function ListeningPreview({ items = [] }) {
  const covers = (Array.isArray(items) ? items : []).slice(0, 5)
  if (covers.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {covers.map((item, index) => (
          <div
            key={item?.id ?? `${item?.album ?? 'album'}-${index}`}
            className="h-7 w-7 overflow-hidden rounded-full border border-black/12 bg-black/5"
          >
            <CoverImage
              src={item?.cover || '/album/am.jpg'}
              alt={`${item?.album ?? 'Album'} cover`}
              className="h-full w-full"
            />
          </div>
        ))}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {covers.length} now spinning
      </span>
    </div>
  )
}

function SocialFeedRow({ item, compact = false }) {
  const username = item?.username || 'Unknown user'
  const action = normalizeAction(item?.action)
  const albumTitle = item?.albumTitle || 'Unknown album'
  const artistName = item?.artistName || 'Unknown artist'
  const time = item?.time || ''
  const avatarUrl = item?.avatarUrl || ''
  const rating =
    typeof item?.ratingValue === 'number' && Number.isFinite(item.ratingValue)
      ? item.ratingValue.toFixed(1)
      : ''
  const avatarSize = compact ? 'h-8 w-8' : 'h-9 w-9'
  const coverSize = compact ? 'h-9 w-9' : 'h-10 w-10'
  const textSize = compact ? 'text-[12.5px]' : 'text-[13.5px]'

  return (
    <article className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 ${compact ? 'py-2.5' : 'py-3'}`}>
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${username} avatar`}
            className={`${avatarSize} rounded-full border border-black/12 object-cover`}
          />
        ) : (
          <span className={`inline-flex ${avatarSize} items-center justify-center rounded-full border border-black/12 bg-accent/12 text-[10px] font-semibold text-accent`}>
            {getInitials(username)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className={`mb-0 flex min-w-0 items-baseline gap-1 ${textSize}`}>
          <span className="shrink-0 font-semibold text-text">@{username.replace(/^@/, '')}</span>
          <span className="shrink-0 text-black/58">{action}</span>
          <span className="min-w-0 truncate font-semibold italic text-text">{albumTitle}</span>
          {rating ? (
            <span className="shrink-0 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent">
              {rating}/5
            </span>
          ) : null}
        </p>
        <p className="mb-0 mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted">
          <span className="truncate">{artistName}</span>
          {time ? <span className="inline-flex h-1 w-1 shrink-0 rounded-full bg-black/18" /> : null}
          {time ? <span className="shrink-0">{time}</span> : null}
        </p>
      </div>

      <div className="shrink-0">
        <CoverImage
          src={item?.cover || '/album/am.jpg'}
          alt={`${albumTitle} by ${artistName} cover`}
          rounded="rounded-[10px]"
          className={`${coverSize} border border-black/10 opacity-88`}
        />
      </div>
    </article>
  )
}

export default function FriendSocialSection({
  activity = [],
  listening = [],
  isLoading = false,
  error = '',
  isSignedIn = false,
  hasFriends = false,
  emptyMessage = 'No friend activity yet.',
  compact = false,
}) {
  const feedItems = Array.isArray(activity) ? activity : []
  const visibleFeed = feedItems.slice(0, compact ? 6 : 9)

  return (
    <section className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="mb-0 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            <UsersThree size={compact ? 13 : 15} weight="bold" className="text-accent" />
            Social
          </p>
          <h2 className={compact ? 'mb-0 mt-1 text-[1.2rem] leading-tight text-text' : 'mb-0 mt-1 text-[1.52rem] leading-tight text-text'}>
            Friend activity
          </h2>
        </div>
        <Link
          to="/activity"
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition hover:text-accent"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-[16px] border border-black/8 bg-white/62 px-4 py-4 text-sm text-muted">
          Loading friend activity...
        </div>
      ) : error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50/85 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : !isSignedIn ? (
        <div className="rounded-[16px] border border-black/8 bg-white/62 px-4 py-4 text-sm text-muted">
          Sign in to see your social feed.
        </div>
      ) : !hasFriends ? (
        <div className="rounded-[16px] border border-black/8 bg-white/62 px-4 py-4 text-sm text-muted">
          Add friends to unlock your social activity feed.
        </div>
      ) : visibleFeed.length === 0 ? (
        <div className="rounded-[16px] border border-black/8 bg-white/62 px-4 py-4 text-sm text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-black/8 bg-white/60 backdrop-blur-sm shadow-[0_16px_34px_-30px_rgba(15,23,42,0.48)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 px-3.5 py-2.5">
            <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Mixed social updates
            </p>
            <ListeningPreview items={listening} />
          </div>
          <div className="divide-y divide-black/7">
            {visibleFeed.map((item) => (
              <SocialFeedRow key={item.id} item={item} compact={compact} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
