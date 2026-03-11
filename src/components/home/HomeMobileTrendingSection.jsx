import { Link } from 'react-router-dom'
import { ChatCircle, Heart, TrendUp } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

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

  if (diffMs < minute) return 'Now'
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute)
    return `${n}m`
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour)
    return `${n}h`
  }
  if (diffMs < week) {
    const n = Math.floor(diffMs / day)
    return `${n}d`
  }
  const n = Math.floor(diffMs / week)
  return `${n}w`
}

function formatWindowLabel(windowDays) {
  const numericWindow = Number(windowDays)
  if (!Number.isFinite(numericWindow) || numericWindow < 1) return 'Now'
  if (numericWindow === 1) return 'Today'
  if (numericWindow === 7) return 'This week'
  return `Last ${numericWindow}d`
}

function buildAlbumReviewPath(review) {
  const routeId = review?.album?.routeId
  if (typeof routeId !== 'string' || !routeId.trim()) return ''
  return `/album/${encodeURIComponent(routeId)}#album-community-reviews`
}

function reviewerLabel(review) {
  const username = review?.reviewer?.username
  if (typeof username !== 'string' || !username.trim()) return 'Community'
  return `@${username.replace(/^@/, '')}`
}

function excerptClampStyle(lines) {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
  }
}

function FeaturedReview({ review }) {
  const albumPath = buildAlbumReviewPath(review)
  const albumTitle = review?.album?.title ?? 'Unknown album'
  const artistName = review?.album?.artistName ?? 'Unknown artist'
  const excerpt = review?.previewText || review?.reviewText || 'No review excerpt available.'
  const likeCount = Number(review?.engagement?.likeCount ?? 0)
  const commentCount = Number(review?.engagement?.commentCount ?? 0)
  const rating =
    typeof review?.rating === 'number' && !Number.isNaN(review.rating)
      ? review.rating.toFixed(1)
      : ''

  return (
    <article className="rounded-2xl border border-black/10 bg-white/75 p-3 shadow-subtle">
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
        {albumPath ? (
          <Link
            to={albumPath}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <CoverImage
              src={review?.album?.coverArtUrl || '/album/am.jpg'}
              alt={`${albumTitle} by ${artistName} cover`}
              className="h-[104px] w-[104px] border border-black/10 shadow-subtle"
            />
          </Link>
        ) : (
          <CoverImage
            src={review?.album?.coverArtUrl || '/album/am.jpg'}
            alt={`${albumTitle} by ${artistName} cover`}
            className="h-[104px] w-[104px] border border-black/10 shadow-subtle"
          />
        )}

        <div className="min-w-0">
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Featured review
          </p>
          {albumPath ? (
            <Link
              to={albumPath}
              className="mt-1 block text-[1.16rem] leading-tight text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              {albumTitle}
            </Link>
          ) : (
            <h3 className="mb-0 mt-1 text-[1.16rem] leading-tight text-text">{albumTitle}</h3>
          )}
          <p className="mb-0 mt-1 text-[12px] text-muted">{artistName}</p>
          <p className="mb-0 mt-1 text-[11px] text-muted">
            {reviewerLabel(review)} -{' '}
            {formatRelativeTime(review?.latestActivityAt ?? review?.reviewedAt ?? review?.addedAt)}
            {rating ? ` - ${rating}/5` : ''}
          </p>
        </div>
      </div>

      <p className="mb-0 mt-3 text-[13px] leading-6 text-slate-700" style={excerptClampStyle(3)}>
        {excerpt}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
        {albumPath ? (
          <Link to={albumPath} className="text-accent transition hover:text-accent-strong">
            Read
          </Link>
        ) : (
          <span className="text-muted">Review</span>
        )}
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Heart size={11} weight="fill" className="text-accent" />
            {likeCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <ChatCircle size={11} weight="bold" />
            {commentCount.toLocaleString()}
          </span>
        </span>
      </div>
    </article>
  )
}

function SecondaryReviewItem({ review }) {
  const albumPath = buildAlbumReviewPath(review)
  const albumTitle = review?.album?.title ?? 'Unknown album'
  const artistName = review?.album?.artistName ?? 'Unknown artist'
  const likeCount = Number(review?.engagement?.likeCount ?? 0)
  const content = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <CoverImage
        src={review?.album?.coverArtUrl || '/album/am.jpg'}
        alt={`${albumTitle} by ${artistName} cover`}
        className="h-12 w-12 shrink-0 border border-black/10"
      />
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-[13px] font-semibold text-text">{albumTitle}</p>
        <p className="mb-0 truncate text-[11px] text-muted">{artistName}</p>
        <p className="mb-0 mt-0.5 truncate text-[10px] text-muted">
          {reviewerLabel(review)} -{' '}
          {formatRelativeTime(review?.latestActivityAt ?? review?.reviewedAt ?? review?.addedAt)}
        </p>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
        {likeCount.toLocaleString()} likes
      </span>
    </div>
  )

  if (!albumPath) {
    return <div>{content}</div>
  }

  return (
    <Link
      to={albumPath}
      className="block transition hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}

export default function HomeMobileTrendingSection({
  reviews = [],
  isLoading = false,
  error = '',
  windowDays = 7,
}) {
  const items = Array.isArray(reviews) ? reviews : []
  const featuredReview = items[0] ?? null
  const secondaryReviews = items.slice(1, 4)

  return (
    <section className="space-y-3 border-t border-black/10 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-0 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <TrendUp size={12} className="text-accent" weight="bold" />
            Trending reviews
          </p>
          <h2 className="mb-0 mt-1 text-[1.32rem] leading-tight text-text">Community pulse</h2>
        </div>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {formatWindowLabel(windowDays)}
        </span>
      </div>

      {isLoading ? (
        <div className="py-2 text-sm text-muted">Loading trending reviews...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/85 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : !featuredReview ? (
        <div className="py-2 text-sm text-muted">No trending reviews yet.</div>
      ) : (
        <>
          <FeaturedReview review={featuredReview} />
          {secondaryReviews.length ? (
            <div className="overflow-hidden rounded-xl border border-black/8 bg-white/60">
              {secondaryReviews.map((review, index) => (
                <div key={review?.backlogId ?? `${review?.reviewer?.id ?? 'review'}-${index}`}>
                  <SecondaryReviewItem review={review} />
                  {index < secondaryReviews.length - 1 ? <div className="h-px bg-black/8" /> : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
