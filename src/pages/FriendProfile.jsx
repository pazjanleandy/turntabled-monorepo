import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import CoverImage from '../components/CoverImage.jsx'
import FavoritesSection from '../components/profile/FavoritesSection.jsx'
import LatestLogsSection from '../components/profile/LatestLogsSection.jsx'
import ProfileCTA from '../components/profile/ProfileCTA.jsx'
import ProfileHeader from '../components/profile/ProfileHeader.jsx'
import ReviewsSection from '../components/profile/ReviewsSection.jsx'
import StatsSection from '../components/profile/StatsSection.jsx'
import useAlbumCovers from '../hooks/useAlbumCovers.js'
import useAlbumRatings from '../hooks/useAlbumRatings.js'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'

function isUuidLike(value = '') {
  const normalized = String(value).trim()
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(normalized)
}

function createInitials(value = '') {
  const normalized = value.trim()
  if (!normalized) return 'U'
  return normalized.slice(0, 2).toUpperCase()
}

function formatRelativeTime(value) {
  if (!value) return 'just now'
  const now = Date.now()
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'just now'

  const diffMs = Math.max(0, now - then)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return 'just now'
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute)
    return `${n} min${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour)
    return `${n}h ago`
  }
  const n = Math.floor(diffMs / day)
  return `${n}d ago`
}

function mapFavoriteAlbums(items = []) {
  return items.map((item) => ({
    backlogId: item?.backlogId ?? null,
    title: item?.album?.title ?? 'Unknown album',
    artist: item?.album?.artistName ?? 'Unknown artist',
    cover: item?.album?.coverArtUrl || '/album/am.jpg',
    releaseId: item?.album?.releaseId ?? null,
    rating: item?.rating ?? 0,
  }))
}

function mapCompletedToRecent(items = []) {
  return items.map((item) => ({
    title: item?.album?.title ?? 'Unknown album',
    artist: item?.album?.artistName ?? 'Unknown artist',
    year: '',
    note: '',
    rating:
      typeof item?.rating === 'number'
        ? item.rating.toFixed(1)
        : '0.0',
    timeAgo: formatRelativeTime(item?.updatedAt ?? item?.addedAt),
  }))
}

function mapCompletedToCarousel(items = []) {
  return items.slice(0, 5).map((item) => ({
    title: item?.album?.title ?? 'Unknown album',
    artist: item?.album?.artistName ?? 'Unknown artist',
    cover: item?.album?.coverArtUrl || '/album/am.jpg',
    rating: item?.rating ?? 0,
  }))
}

function toTimestamp(value) {
  const parsed = Date.parse(value ?? '')
  return Number.isNaN(parsed) ? 0 : parsed
}

function mergePublicActivity({ completed = [], favorites = [], reviews = [] }) {
  const merged = new Map()

  const push = (item) => {
    const id = item?.backlogId
    if (!id) return

    const existing = merged.get(id)
    const nextTimestamp = Math.max(
      toTimestamp(item?.updatedAt),
      toTimestamp(item?.reviewedAt),
      toTimestamp(item?.addedAt),
    )

    if (!existing) {
      merged.set(id, { ...item, _sortTime: nextTimestamp })
      return
    }

    const prevTimestamp = existing._sortTime ?? 0
    if (nextTimestamp >= prevTimestamp) {
      merged.set(id, { ...existing, ...item, _sortTime: nextTimestamp })
    } else {
      merged.set(id, { ...item, ...existing, _sortTime: prevTimestamp })
    }
  }

  completed.forEach(push)
  favorites.forEach(push)
  reviews.forEach(push)

  return Array.from(merged.values()).sort((a, b) => (b._sortTime ?? 0) - (a._sortTime ?? 0))
}

function mapReviews(items = []) {
  return items.map((item) => ({
    backlogId: item?.backlogId ?? null,
    title: item?.album?.title ?? 'Unknown album',
    artist: item?.album?.artistName ?? 'Unknown artist',
    cover: item?.album?.coverArtUrl || '/album/am.jpg',
    reviewText: item?.reviewText ?? '',
    rating: item?.rating ?? 0,
    reviewedAt: item?.reviewedAt ?? null,
  }))
}

export default function FriendProfile() {
  const { isSignedIn } = useAuthStatus()
  const { friendSlug } = useParams()
  const targetIdentifier = friendSlug ?? ''

  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      const normalizedTarget = targetIdentifier.trim()
      if (!normalizedTarget) {
        setPayload(null)
        setError('Profile not found.')
        setIsLoading(false)
        return
      }

      if (!isSignedIn) {
        setPayload(null)
        setError('Sign in to view user profiles.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const headers = await buildApiAuthHeaders()
        const targetQuery = isUuidLike(normalizedTarget)
          ? `userId=${encodeURIComponent(normalizedTarget)}`
          : `username=${encodeURIComponent(normalizedTarget.replace(/^@/, ''))}`
        const response = await fetch(
          `${apiBase}/api/profile/view?${targetQuery}`,
          { headers },
        )
        const result = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(result?.error?.message ?? 'Failed to load profile.')
        }

        if (cancelled) return
        setPayload(result)
      } catch (loadError) {
        if (cancelled) return
        setPayload(null)
        setError(loadError?.message ?? 'Failed to load profile.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [isSignedIn, targetIdentifier])

  const favorites = useMemo(
    () => mapFavoriteAlbums(Array.isArray(payload?.favorites) ? payload.favorites : []),
    [payload],
  )
  const publicActivity = useMemo(
    () =>
      mergePublicActivity({
        completed: Array.isArray(payload?.completed) ? payload.completed : [],
        favorites: Array.isArray(payload?.favorites) ? payload.favorites : [],
        reviews: Array.isArray(payload?.reviews) ? payload.reviews : [],
      }),
    [payload],
  )
  const recentCarousel = useMemo(() => mapCompletedToCarousel(publicActivity), [publicActivity])
  const recent = useMemo(() => mapCompletedToRecent(publicActivity), [publicActivity])
  const reviewList = useMemo(
    () => mapReviews(Array.isArray(payload?.reviews) ? payload.reviews : []),
    [payload],
  )

  const favoriteCovers = useAlbumCovers(favorites)
  const { ratings: favoriteRatings, updateRating: handleFavoriteRatingChange } =
    useAlbumRatings(favorites)
  const { ratings: recentRatings, updateRating: handleRecentRatingChange } =
    useAlbumRatings(recentCarousel)

  const user = useMemo(() => {
    const username = payload?.user?.username?.trim() || 'unknown'
    return {
      name: username,
      handle: `@${username.replace(/^@/, '')}`,
      bio: payload?.user?.bio?.trim() || 'No bio added yet.',
      location: 'Public profile',
      joined: 'Member',
      initials: createInitials(username),
    }
  }, [payload])

  const backlogPreview = useMemo(
    () =>
      publicActivity.slice(0, 5).map((item, index) => ({
        id: item?.backlogId ?? `${targetIdentifier}-${index}`,
        albumTitleRaw: item?.album?.title ?? 'Unknown album',
        artistNameRaw: item?.album?.artistName ?? 'Unknown artist',
        coverArtUrl: item?.album?.coverArtUrl || '/album/am.jpg',
        rating: item?.rating ?? 0,
      })),
    [publicActivity, targetIdentifier],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Navbar className="w-full" />
            <section className="card vinyl-texture border border-black/5 shadow-sm">
              <p className="mb-0 text-sm text-slate-600">Loading profile...</p>
            </section>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Navbar className="w-full" />
            <section className="card vinyl-texture border border-black/5 shadow-sm">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Friends
              </p>
              <h1 className="mb-2 text-2xl text-text">Profile unavailable</h1>
              <p className="mb-4 text-sm text-slate-600">{error}</p>
              <Link
                to="/friends"
                className="inline-flex rounded-xl border border-black/10 bg-white/85 px-4 py-2 text-sm font-semibold text-text shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                Back to friends
              </Link>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Navbar className="w-full" />
          <main className="overflow-hidden rounded-3xl border border-black/5 bg-white/60 backdrop-blur-md shadow-sm">
            <div className="divide-y divide-black/5">
              <section className="py-0">
                <ProfileHeader
                  embedded
                  allowProfileEditing={false}
                  user={user}
                  avatarSrc={payload?.user?.avatarUrl || '/profile/rainy.jpg'}
                  bannerSrc={payload?.user?.coverUrl || '/hero/hero1.jpg'}
                />
              </section>

              <section className="px-6 py-6 sm:px-8">
                <StatsSection />
              </section>

              <section className="px-6 py-6 sm:px-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <aside className="flex flex-col gap-6 lg:col-span-8">
                    <FavoritesSection
                      favorites={favorites}
                      favoriteCovers={favoriteCovers}
                      favoriteRatings={favoriteRatings}
                      onFavoriteRatingChange={handleFavoriteRatingChange}
                      recentCarousel={recentCarousel}
                      recentRatings={recentRatings}
                      onRecentRatingChange={handleRecentRatingChange}
                    />
                    <ReviewsSection reviews={reviewList} asCard={false} />
                  </aside>

                  <aside className="flex flex-col gap-6 lg:col-span-4">
                    <section className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                            Backlog
                          </p>
                          <h3 className="mb-0 text-lg text-text">Completed albums</h3>
                        </div>
                      </div>
                      {backlogPreview.length === 0 ? (
                        <p className="mb-0 text-sm text-slate-600">No completed items yet.</p>
                      ) : (
                        <ul className="divide-y divide-black/5">
                          {backlogPreview.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 py-2.5">
                              <div className="h-12 w-12 overflow-hidden border border-black/10 bg-black/5">
                                <CoverImage
                                  src={item.coverArtUrl || '/album/am.jpg'}
                                  alt={`${item.albumTitleRaw} by ${item.artistNameRaw} cover`}
                                  className="h-full w-full"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="mb-0 truncate text-sm font-semibold text-text">
                                  {item.albumTitleRaw}
                                </p>
                                <p className="mb-0 truncate text-xs text-slate-600">
                                  {item.artistNameRaw}
                                </p>
                              </div>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                {item.rating}/5
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <LatestLogsSection recent={recent} asCard={false} />
                  </aside>
                </div>
              </section>

              <section className="px-6 py-6 sm:px-8">
                <ProfileCTA asCard={false} />
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
