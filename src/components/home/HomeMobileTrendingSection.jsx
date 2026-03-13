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
    <article className="space-y-4">
      <div className="grid grid-cols-[102px_minmax(0,1fr)] gap-3.5">
        {albumPath ? (
          <Link
            to={albumPath}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <CoverImage
              src={review?.album?.coverArtUrl || '/album/am.jpg'}
              alt={`${albumTitle} by ${artistName} cover`}
              className="h-[102px] w-[102px] border border-black/10"
            />
          </Link>
        ) : (
          <CoverImage
            src={review?.album?.coverArtUrl || '/album/am.jpg'}
            alt={`${albumTitle} by ${artistName} cover`}
            className="h-[102px] w-[102px] border border-black/10"
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
          <p className="mb-0 mt-1.5 text-[11px] text-muted">
            {reviewerLabel(review)} <span className="mx-1 text-black/20">-</span>{' '}
            {formatRelativeTime(review?.latestActivityAt ?? review?.reviewedAt ?? review?.addedAt)}
            {rating ? ` - ${rating}/5` : ''}
          </p>
        </div>
      </div>

      <blockquote className="border-l border-black/12 pl-3.5">
        <p
          className="mb-0 font-serif text-[1.03rem] leading-7 text-slate-700"
          style={excerptClampStyle(4)}
        >
          "{excerpt}"
        </p>
      </blockquote>

      <div className="flex items-center justify-between gap-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
        {albumPath ? (
          <Link to={albumPath} className="text-accent transition hover:text-accent-strong">
            Read review
          </Link>
        ) : (
          <span className="text-muted">Featured</span>
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
  const commentCount = Number(review?.engagement?.commentCount ?? 0)
  const reviewedAt = formatRelativeTime(review?.latestActivityAt ?? review?.reviewedAt ?? review?.addedAt)

  const content = (
    <article className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <CoverImage
        src={review?.album?.coverArtUrl || '/album/am.jpg'}
        alt={`${albumTitle} by ${artistName} cover`}
        className="h-[52px] w-[52px] shrink-0 border border-black/10"
      />
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-[13.5px] font-semibold text-text">{albumTitle}</p>
        <p className="mb-0 mt-0.5 truncate text-[11px] text-muted">{artistName}</p>
        <p className="mb-0 mt-1 truncate text-[10px] text-muted">
          {reviewerLabel(review)} <span className="mx-1 text-black/20">-</span> {reviewedAt}
        </p>
      </div>
      <div className="space-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        <span className="inline-flex items-center gap-1">
          <Heart size={10} weight="fill" className="text-accent" />
          {likeCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <ChatCircle size={10} weight="bold" />
          {commentCount.toLocaleString()}
        </span>
      </div>
    </article>
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
    <section className="space-y-4 border-t border-black/10 pt-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mb-0 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <TrendUp size={12} className="text-accent" weight="bold" />
            Trending reviews
          </p>
          <span className="inline-flex border border-black/10 bg-white/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            {formatWindowLabel(windowDays)}
          </span>
        </div>
        <h2 className="mb-0 text-[1.32rem] leading-tight text-text">Community pulse</h2>
        <p className="mb-0 text-[12px] leading-relaxed text-muted">
          One featured review, plus more from the conversation.
        </p>
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
            <div className="space-y-1 pt-1">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Also trending
              </p>
              <div className="divide-y divide-black/8">
                {secondaryReviews.map((review, index) => (
                  <SecondaryReviewItem
                    key={review?.backlogId ?? `${review?.reviewer?.id ?? 'review'}-${index}`}
                    review={review}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
