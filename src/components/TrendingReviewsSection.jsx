import { Link, useNavigate } from 'react-router-dom'
import { ChatCircle, Heart, TrendUp } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'
import StarRating from './StarRating.jsx'

function formatRelativeTime(value) {
  if (!value) return 'Recently'
  const now = Date.now()
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'Recently'

  const diffMs = Math.max(0, now - then)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (diffMs < minute) return 'Just now'
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute)
    return `${n} min${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour)
    return `${n}h ago`
  }
  if (diffMs < week) {
    const n = Math.floor(diffMs / day)
    return `${n} day${n === 1 ? '' : 's'} ago`
  }
  const n = Math.floor(diffMs / week)
  return `${n} week${n === 1 ? '' : 's'} ago`
}

function formatWindowLabel(windowDays) {
  const numericWindow = Number(windowDays)
  if (!Number.isFinite(numericWindow) || numericWindow < 1) return 'Trending now'
  if (numericWindow === 1) return 'Today'
  if (numericWindow === 7) return 'This week'
  return `Last ${numericWindow} days`
}

function createInitials(username = '') {
  const normalized = String(username).trim().replace(/^@/, '')
  if (!normalized) return 'U'
  return normalized.slice(0, 2).toUpperCase()
}

function buildAlbumReviewPath(review) {
  const routeId = review?.album?.routeId
  if (typeof routeId !== 'string' || !routeId.trim()) return ''
  return `/album/${encodeURIComponent(routeId)}#album-community-reviews`
}

function buildProfilePathFromUsername(username) {
  if (typeof username !== 'string' || !username.trim() || username === 'unknown-user') return ''
  return `/friends/${encodeURIComponent(username.trim())}`
}

function buildProfilePath(review) {
  return buildProfilePathFromUsername(review?.reviewer?.username)
}

function excerptClampStyle(lines) {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
  }
}

function stopCardNavigation(event) {
  event.stopPropagation()
}

function ReviewerIdentity({ review, compact = false }) {
  const profilePath = buildProfilePath(review)
  const username = review?.reviewer?.username ?? 'unknown-user'
  const avatarUrl = review?.reviewer?.avatarUrl
  const label = `@${String(username).replace(/^@/, '')}`
  const timeLabel = formatRelativeTime(review?.latestActivityAt ?? review?.reviewedAt ?? review?.addedAt)
  const avatarSizeClass = compact ? 'h-6 w-6' : 'h-7 w-7'
  const initialsSizeClass = compact ? 'text-[9px]' : 'text-[10px]'
  const textSizeClass = compact ? 'text-[11px]' : 'text-xs'

  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ${textSizeClass} text-muted`}>
      {profilePath ? (
        <Link
          to={profilePath}
          onClick={stopCardNavigation}
          className="inline-flex items-center gap-2 text-text transition hover:text-accent"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${label} avatar`}
              className={`${avatarSizeClass} rounded-none object-cover`}
            />
          ) : (
            <span
              className={`inline-flex ${avatarSizeClass} items-center justify-center rounded-none bg-accent/12 ${initialsSizeClass} font-semibold uppercase text-accent`}
            >
              {createInitials(username)}
            </span>
          )}
          <span className="font-semibold text-text">{label}</span>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${label} avatar`}
              className={`${avatarSizeClass} rounded-none object-cover`}
            />
          ) : (
            <span
              className={`inline-flex ${avatarSizeClass} items-center justify-center rounded-none bg-accent/12 ${initialsSizeClass} font-semibold uppercase text-accent`}
            >
              {createInitials(username)}
            </span>
          )}
          <span className="font-semibold text-text">{label}</span>
        </span>
      )}
      <span className="uppercase tracking-[0.14em] text-muted/85">{timeLabel}</span>
    </div>
  )
}

function ReviewRating({ rating, compact = false }) {
  if (typeof rating !== 'number' || Number.isNaN(rating)) {
    return (
      <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold uppercase tracking-[0.16em] text-muted`}>
        No rating
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={rating} readOnly size={compact ? 11 : 12} />
      <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold uppercase tracking-[0.16em] text-muted`}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

function EngagementInline({ likeCount, commentCount, compact = false, className = '' }) {
  const textClass = compact ? 'text-[10px]' : 'text-[11px]'
  const iconSize = compact ? 11 : 12
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 uppercase tracking-[0.14em] text-muted ${textClass} ${className}`}>
      <span className="inline-flex items-center gap-1">
        <Heart size={iconSize} weight="fill" className="text-accent" />
        {likeCount.toLocaleString()} likes
      </span>
      <span className="inline-flex items-center gap-1">
        <ChatCircle size={iconSize} weight="bold" className="text-text" />
        {commentCount.toLocaleString()} comments
      </span>
    </div>
  )
}

function TopCommentsPreview({ comments = [], compact = false }) {
  const commentItems = (Array.isArray(comments) ? comments : [])
    .filter((comment) => typeof comment?.commentText === 'string' && comment.commentText.trim())
    .slice(0, 2)

  if (commentItems.length === 0) return null

  const avatarSizeClass = compact ? 'h-5 w-5' : 'h-6 w-6'
  const avatarTextClass = compact ? 'text-[8px]' : 'text-[9px]'
  const bodyTextClass = compact ? 'text-[11px] leading-5' : 'text-xs leading-6'
  const clampLines = compact ? 1 : 2

  return (
    <div className={`${compact ? 'mt-2' : 'mt-3'} border-l border-black/10 pl-3`}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        Top comments
      </p>
      <div className="space-y-1.5">
        {commentItems.map((comment, index) => {
          const username = comment?.user?.username ?? 'unknown-user'
          const profilePath = buildProfilePathFromUsername(username)
          const displayLabel = `@${String(username).replace(/^@/, '')}`
          const avatarUrl = comment?.user?.avatarUrl
          return (
            <div
              key={comment?.id ?? `${username}-${comment?.createdAt ?? ''}-${index}`}
              className="flex items-start gap-2"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${displayLabel} avatar`}
                  className={`${avatarSizeClass} rounded-none object-cover`}
                />
              ) : (
                <span
                  className={`inline-flex ${avatarSizeClass} items-center justify-center rounded-none bg-accent/12 ${avatarTextClass} font-semibold uppercase text-accent`}
                >
                  {createInitials(username)}
                </span>
              )}

              <p className={`mb-0 min-w-0 ${bodyTextClass} text-slate-700`} style={excerptClampStyle(clampLines)}>
                {profilePath ? (
                  <Link
                    to={profilePath}
                    onClick={stopCardNavigation}
                    className="mr-1 font-semibold text-text transition hover:text-accent"
                  >
                    {displayLabel}
                  </Link>
                ) : (
                  <span className="mr-1 font-semibold text-text">{displayLabel}</span>
                )}
                {comment.commentText.trim()}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FeaturedTrendingReview({ review }) {
  const navigate = useNavigate()
  const albumPath = buildAlbumReviewPath(review)
  const albumTitle = review?.album?.title ?? 'Unknown album'
  const artistName = review?.album?.artistName ?? 'Unknown artist'
  const excerpt = review?.previewText || review?.reviewText || 'No preview available yet.'
  const interactionCount = Number(review?.engagement?.interactionCount ?? 0)
  const likeCount = Number(review?.engagement?.likeCount ?? 0)
  const commentCount = Number(review?.engagement?.commentCount ?? 0)

  const handleActivate = () => {
    if (albumPath) navigate(albumPath)
  }

  const handleKeyDown = (event) => {
    if (!albumPath) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleActivate()
    }
  }

  return (
    <article
      className={albumPath ? 'cursor-pointer' : ''}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      role={albumPath ? 'link' : undefined}
      tabIndex={albumPath ? 0 : -1}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">Featured</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {interactionCount.toLocaleString()} interactions
        </span>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[124px_minmax(0,1fr)] lg:gap-5">
        <div className="self-start">
          {albumPath ? (
            <Link to={albumPath} onClick={stopCardNavigation} className="block w-[min(62vw,220px)] sm:w-[124px]">
              <CoverImage
                src={review?.album?.coverArtUrl || '/album/am.jpg'}
                alt={`${albumTitle} by ${artistName} cover`}
                rounded={false}
                className="h-[min(62vw,220px)] w-[min(62vw,220px)] border border-black/10 shadow-[0_14px_24px_-20px_rgba(15,15,15,0.3)] sm:h-[124px] sm:w-[124px]"
              />
            </Link>
          ) : (
            <CoverImage
              src={review?.album?.coverArtUrl || '/album/am.jpg'}
              alt={`${albumTitle} by ${artistName} cover`}
              rounded={false}
              className="h-[min(62vw,220px)] w-[min(62vw,220px)] border border-black/10 shadow-[0_14px_24px_-20px_rgba(15,15,15,0.3)] sm:h-[124px] sm:w-[124px]"
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Trending review
          </p>
          {albumPath ? (
            <Link
              to={albumPath}
              onClick={stopCardNavigation}
              className="block text-[1.45rem] leading-[1.05] text-text transition hover:text-accent sm:text-[1.85rem]"
            >
              {albumTitle}
            </Link>
          ) : (
            <h3 className="mb-0 text-[1.45rem] leading-[1.05] text-text sm:text-[1.85rem]">{albumTitle}</h3>
          )}
          <p className="mb-0 mt-1.5 text-sm text-muted">{artistName}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ReviewerIdentity review={review} />
            <ReviewRating rating={review?.rating} />
          </div>

          <p className="mb-0 mt-3 text-[14px] leading-7 text-slate-700" style={excerptClampStyle(5)}>
            {excerpt}
          </p>

          <TopCommentsPreview comments={review?.topComments} />

          <EngagementInline likeCount={likeCount} commentCount={commentCount} className="mt-3" />
        </div>
      </div>
    </article>
  )
}

function TrendingReviewRow({ review, rank }) {
  const navigate = useNavigate()
  const albumPath = buildAlbumReviewPath(review)
  const albumTitle = review?.album?.title ?? 'Unknown album'
  const artistName = review?.album?.artistName ?? 'Unknown artist'
  const excerpt = review?.previewText || review?.reviewText || 'No preview available yet.'
  const likeCount = Number(review?.engagement?.likeCount ?? 0)
  const commentCount = Number(review?.engagement?.commentCount ?? 0)

  const handleActivate = () => {
    if (albumPath) navigate(albumPath)
  }

  const handleKeyDown = (event) => {
    if (!albumPath) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleActivate()
    }
  }

  return (
    <article
      className={albumPath ? 'group cursor-pointer py-4 first:pt-0 last:pb-0' : 'group py-4 first:pt-0 last:pb-0'}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      role={albumPath ? 'link' : undefined}
      tabIndex={albumPath ? 0 : -1}
    >
      <div className="grid gap-3 sm:grid-cols-[24px_60px_minmax(0,1fr)] lg:grid-cols-[24px_60px_minmax(0,1fr)_auto] lg:gap-4">
        <span className="pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          {String(rank).padStart(2, '0')}
        </span>

        <div className="self-start">
          {albumPath ? (
            <Link to={albumPath} onClick={stopCardNavigation} className="block w-[60px]">
              <CoverImage
                src={review?.album?.coverArtUrl || '/album/am.jpg'}
                alt={`${albumTitle} by ${artistName} cover`}
                rounded={false}
                className="h-[60px] w-[60px] border border-black/10 shadow-[0_12px_20px_-18px_rgba(15,15,15,0.35)]"
              />
            </Link>
          ) : (
            <CoverImage
              src={review?.album?.coverArtUrl || '/album/am.jpg'}
              alt={`${albumTitle} by ${artistName} cover`}
              rounded={false}
              className="h-[60px] w-[60px] border border-black/10 shadow-[0_12px_20px_-18px_rgba(15,15,15,0.35)]"
            />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {albumPath ? (
              <Link
                to={albumPath}
                onClick={stopCardNavigation}
                className="text-[1.02rem] leading-tight text-text transition hover:text-accent"
              >
                {albumTitle}
              </Link>
            ) : (
              <h3 className="mb-0 text-[1.02rem] leading-tight text-text">{albumTitle}</h3>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {review?.album?.primaryType || 'Review'}
            </span>
          </div>
          <p className="mb-0 mt-1 text-xs text-muted">{artistName}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ReviewerIdentity review={review} compact />
            <ReviewRating rating={review?.rating} compact />
          </div>

          <p className="mb-0 mt-2 text-sm leading-6 text-slate-700" style={excerptClampStyle(2)}>
            {excerpt}
          </p>
        </div>

        <EngagementInline
          likeCount={likeCount}
          commentCount={commentCount}
          compact
          className="lg:flex-col lg:items-end lg:gap-y-1"
        />
      </div>
    </article>
  )
}

function LoadingState() {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="animate-pulse">
        <div className="h-3 w-24 bg-black/8" />
        <div className="mt-3 grid gap-4 sm:grid-cols-[124px_minmax(0,1fr)]">
          <div className="h-[124px] w-[124px] bg-black/8" />
          <div>
            <div className="h-3 w-24 bg-black/8" />
            <div className="mt-3 h-10 w-3/4 bg-black/8" />
            <div className="mt-3 h-4 w-1/3 bg-black/8" />
            <div className="mt-3 h-4 w-2/3 bg-black/8" />
            <div className="mt-2 h-4 w-full bg-black/8" />
            <div className="mt-2 h-4 w-[88%] bg-black/8" />
          </div>
        </div>
      </div>

      <div className="border-t border-black/6 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <div className="h-3 w-32 bg-black/8" />
        <div className="mt-3 divide-y divide-black/7">
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[24px_60px_minmax(0,1fr)]">
              <div className="h-3 w-4 bg-black/8" />
              <div className="h-[60px] w-[60px] bg-black/8" />
              <div>
                <div className="h-4 w-1/2 bg-black/8" />
                <div className="mt-2 h-3 w-1/3 bg-black/8" />
                <div className="mt-2 h-3 w-2/3 bg-black/8" />
                <div className="mt-2 h-3 w-full bg-black/8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TrendingReviewsSection({
  reviews = [],
  isLoading = false,
  error = '',
  windowDays = 7,
}) {
  const items = Array.isArray(reviews) ? reviews : []
  const featuredReview = items[0] ?? null
  const secondaryReviews = items.slice(1, 4)

  return (
    <section className="card vinyl-texture !rounded-none p-4 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <TrendUp size={18} weight="bold" className="text-accent" />
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Trending Reviews
            </p>
          </div>
          <h2 className="mb-0 mt-2 text-[1.45rem] leading-tight text-text sm:text-[2rem]">
            The most talked-about reviews in the community right now.
          </h2>
          <p className="mb-0 mt-3 max-w-2xl text-sm leading-7 text-muted">
            Editorial picks powered by recent likes, comments, and overall review activity across
            Turntabled.
          </p>
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          {formatWindowLabel(windowDays)}
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <div className="mt-6 border border-red-200 bg-red-50/85 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : !featuredReview ? (
        <div className="mt-6 border border-black/8 bg-white/50 px-4 py-4 text-sm text-muted">
          Not enough review activity yet. Once the community starts discussing albums here, trending
          reviews will appear in this section.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <FeaturedTrendingReview review={featuredReview} />

          <div className="border-t border-black/6 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                Also trending
              </p>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {secondaryReviews.length} picks
              </span>
            </div>

            {secondaryReviews.length ? (
              <div className="divide-y divide-black/7">
                {secondaryReviews.map((review, index) => (
                  <TrendingReviewRow
                    key={review?.backlogId ?? `${review?.reviewer?.id ?? 'review'}-${index}`}
                    review={review}
                    rank={index + 2}
                  />
                ))}
              </div>
            ) : (
              <p className="mb-0 py-3 text-sm text-muted">More trending entries will appear here soon.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
