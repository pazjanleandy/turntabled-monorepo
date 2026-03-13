import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import CoverImage from '../components/CoverImage.jsx'
import FavoritesSection from '../components/profile/FavoritesSection.jsx'
import LastFmRecentTracks from '../components/profile/LastFmRecentTracks.jsx'
import LatestLogsSection from '../components/profile/LatestLogsSection.jsx'
import MobileProfileMediaSection from '../components/profile/MobileProfileMediaSection.jsx'
import ProfileCTA from '../components/profile/ProfileCTA.jsx'
import ProfileHeader from '../components/profile/ProfileHeader.jsx'
import ReviewsSection from '../components/profile/ReviewsSection.jsx'
import StatsSection from '../components/profile/StatsSection.jsx'
import HomeMobileHeader from '../components/home/HomeMobileHeader.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import {
  Calendar,
  Check,
  ListBullets,
  MusicNotes,
  Star,
  UserMinus,
  UserPlus,
} from 'phosphor-react'
import useAlbumCovers from '../hooks/useAlbumCovers.js'
import useAlbumRatings from '../hooks/useAlbumRatings.js'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'
import { readCachedProfile } from '../lib/profileClient.js'
import {
  fetchFollowStateWithUser,
  followUser,
  unfollowUser,
} from '../lib/friendsClient.js'

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
    cover: item?.album?.coverArtUrl || '/album/am.jpg',
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

function mapRecentlyListenedToCarousel(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 5).map((item, index) => ({
    id: `${item?.source ?? 'recent'}-${item?.played_at ?? item?.logged_at ?? ''}-${index}`,
    title: item?.album ?? item?.track ?? 'Unknown album',
    artist: item?.artist ?? 'Unknown artist',
    cover: item?.cover_art || '/album/am.jpg',
    rating: 0,
  }))
}

function mapRecentlyListenedToTracks(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    name: item?.track || item?.album || 'Unknown track',
    artist: item?.artist || 'Unknown artist',
    album: item?.album || '',
    nowPlaying: item?.played_at == null && item?.source === 'lastfm',
  }))
}

function pickLastFmCoverArt(images = []) {
  if (!Array.isArray(images)) return ''
  const orderedSizes = ['mega', 'extralarge', 'large', 'medium', 'small']
  for (const size of orderedSizes) {
    const match = images.find((item) => item?.size === size && typeof item?.['#text'] === 'string')
    const url = typeof match?.['#text'] === 'string' ? match['#text'].trim() : ''
    if (url) return url
  }
  return ''
}

function mapLastFmTrackRowsToUnified(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((track) => {
    const uts = typeof track?.date?.uts === 'string' ? track.date.uts.trim() : ''
    const playedAt = uts ? new Date(Number.parseInt(uts, 10) * 1000).toISOString() : null
    return {
      source: 'lastfm',
      track: track?.name ?? null,
      artist: track?.artist?.['#text'] ?? null,
      album: track?.album?.['#text'] ?? null,
      played_at: playedAt,
      logged_at: null,
      cover_art: pickLastFmCoverArt(track?.image),
    }
  })
}

function toTimestamp(value) {
  const parsed = Date.parse(value ?? '')
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatStatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Number(value) || 0))
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
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const { friendSlug } = useParams()
  const targetIdentifier = friendSlug ?? ''
  const cachedProfile = readCachedProfile()

  const [payload, setPayload] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentlyListened, setRecentlyListened] = useState([])
  const [recentlyListenedLoading, setRecentlyListenedLoading] = useState(false)
  const [recentlyListenedError, setRecentlyListenedError] = useState('')
  const [followState, setFollowState] = useState({ status: 'not_following', followedAt: null })
  const [followStateLoading, setFollowStateLoading] = useState(false)
  const [followStateError, setFollowStateError] = useState('')
  const [followActionLoading, setFollowActionLoading] = useState(false)
  const [isFollowingHovered, setIsFollowingHovered] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [navUser, setNavUser] = useState(() => ({
    username: cachedProfile?.username || '',
    avatarUrl: cachedProfile?.avatarUrl || '',
  }))

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
      setRecentlyListenedError('')

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

        setRecentlyListenedLoading(true)

        let recentPayload = null
        let recentResponseOk = false
        const ownerLastfmUsername =
          typeof result?.user?.lastfmUsername === 'string' ? result.user.lastfmUsername.trim() : ''
        const lastfmApiKey = import.meta.env.VITE_LASTFM_API_KEY

        if (ownerLastfmUsername && typeof lastfmApiKey === 'string' && lastfmApiKey.trim()) {
          const params = new URLSearchParams({
            method: 'user.getRecentTracks',
            user: ownerLastfmUsername,
            api_key: lastfmApiKey.trim(),
            format: 'json',
            limit: '5',
          })
          const lastfmResponse = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
            cache: 'no-store',
          })
          const lastfmData = await lastfmResponse.json().catch(() => null)
          if (lastfmResponse.ok && !lastfmData?.error) {
            const rows = Array.isArray(lastfmData?.recenttracks?.track)
              ? lastfmData.recenttracks.track
              : []
            recentPayload = mapLastFmTrackRowsToUnified(rows)
            recentResponseOk = true
          }
        }

        if (!recentResponseOk) {
          const recentIdentifier =
            typeof result?.user?.id === 'string' && result.user.id.trim()
              ? result.user.id.trim()
              : typeof result?.user?.username === 'string' && result.user.username.trim()
                ? result.user.username.trim()
                : normalizedTarget.replace(/^@/, '')
          const recentResponse = await fetch(
            `${apiBase}/api/users/${encodeURIComponent(recentIdentifier)}/recently-listened`,
            {
              headers,
              cache: 'no-store',
            },
          )
          recentPayload = await recentResponse.json().catch(() => null)
          recentResponseOk = recentResponse.ok
        }

        if (cancelled) return
        setPayload(result)
        if (recentResponseOk && Array.isArray(recentPayload)) {
          setRecentlyListened(recentPayload)
          setRecentlyListenedError('')
        } else {
          setRecentlyListened([])
          setRecentlyListenedError('This user has no public recent listening activity.')
        }
      } catch (loadError) {
        if (cancelled) return
        setPayload(null)
        setError(loadError?.message ?? 'Failed to load profile.')
        setRecentlyListened([])
      } finally {
        if (!cancelled) {
          setRecentlyListenedLoading(false)
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [isSignedIn, targetIdentifier])

  useEffect(() => {
    let cancelled = false

    async function loadFollowState() {
      const targetUserId = payload?.user?.id
      if (!isSignedIn || !targetUserId) {
        setFollowState({ status: 'not_following', followedAt: null })
        setFollowStateError('')
        setFollowStateLoading(false)
        return
      }

      setFollowStateLoading(true)
      setFollowStateError('')
      try {
        const next = await fetchFollowStateWithUser(targetUserId)
        if (!cancelled) {
          setFollowState(next)
        }
      } catch (loadError) {
        if (!cancelled) {
          setFollowState({ status: 'not_following', followedAt: null })
          setFollowStateError(loadError?.message ?? 'Failed to load follow state.')
        }
      } finally {
        if (!cancelled) {
          setFollowStateLoading(false)
        }
      }
    }

    loadFollowState()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, payload?.user?.id])

  const refreshFollowState = async () => {
    const targetUserId = payload?.user?.id
    if (!targetUserId) return
    const next = await fetchFollowStateWithUser(targetUserId)
    setFollowState(next)
  }

  const runFollowAction = async (task) => {
    setFollowStateError('')
    setFollowActionLoading(true)
    try {
      await task()
      await refreshFollowState()
    } catch (actionError) {
      setFollowStateError(actionError?.message ?? 'Follow action failed.')
    } finally {
      setFollowActionLoading(false)
    }
  }
  const targetUserId = payload?.user?.id ?? ''
  const isFollowing = followState.status === 'following'
  const showUnfollowOnHover = isFollowing && isFollowingHovered
  const followButtonBusy = followStateLoading || followActionLoading
  const followButtonLabel = followStateLoading
    ? 'Checking...'
    : followActionLoading
      ? 'Updating...'
      : showUnfollowOnHover
        ? 'Unfollow'
        : isFollowing
          ? 'Following'
        : 'Follow'
  const followButtonClassName = isFollowing
    ? 'inline-flex w-40 h-9 items-center justify-center gap-2 rounded-xl border border-orange-500/35 bg-accent px-4 text-[15px] font-semibold tracking-tight text-[#1f130c] shadow-sm transition hover:bg-[#ef6b2f] active:bg-[#e86124] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
    : 'inline-flex w-40 h-9 items-center justify-center gap-2 rounded-xl border border-black/12 bg-white/45 px-4 text-[15px] font-semibold tracking-tight text-black/80 shadow-none transition hover:bg-white/75 active:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
  const followButtonDisabled =
    followButtonBusy || !isSignedIn || !targetUserId || followState.status === 'self'
  const handleHeaderFollowAction = () => {
    if (followButtonDisabled) return
    if (isFollowing) {
      void runFollowAction(() => unfollowUser(targetUserId))
      return
    }
    void runFollowAction(() => followUser(targetUserId))
  }

  useEffect(() => {
    if (!isFollowing) {
      setIsFollowingHovered(false)
    }
  }, [isFollowing])

  useEffect(() => {
    if (!isSidebarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSidebarOpen])

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleMobileSignOut = () => {
    signOut()
    setNavUser({ username: '', avatarUrl: '' })
    setIsSidebarOpen(false)
    navigate('/')
  }

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
  const recentCarousel = useMemo(
    () =>
      recentlyListened.length > 0
        ? mapRecentlyListenedToCarousel(recentlyListened)
        : mapCompletedToCarousel(publicActivity),
    [publicActivity, recentlyListened],
  )
  const recentTracks = useMemo(() => mapRecentlyListenedToTracks(recentlyListened), [recentlyListened])
  const recent = useMemo(() => mapCompletedToRecent(publicActivity), [publicActivity])
  const reviewList = useMemo(
    () => mapReviews(Array.isArray(payload?.reviews) ? payload.reviews : []),
    [payload],
  )

  const favoriteCovers = useAlbumCovers(favorites)
  const { ratings: favoriteRatings, updateRating: handleFavoriteRatingChange } =
    useAlbumRatings(favorites)

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
  const socialCounts = useMemo(() => {
    const followers = Number(payload?.social?.followers)
    const following = Number(payload?.social?.following)
    return {
      followers: Number.isFinite(followers) ? Math.max(0, followers) : 0,
      following: Number.isFinite(following) ? Math.max(0, following) : 0,
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
        status: 'backloggd',
      })),
    [publicActivity, targetIdentifier],
  )
  const statsOverview = useMemo(() => {
    const stats = payload?.stats
    if (!stats || typeof stats !== 'object') {
      return null
    }

    const avgRating = Number(stats?.avgRating ?? 0)
    const avgLabel = Number.isFinite(avgRating) ? avgRating.toFixed(1) : '0.0'
    const mostCommon =
      typeof stats?.mostCommonRating === 'string' && stats.mostCommonRating.trim()
        ? stats.mostCommonRating.trim()
        : null

    return [
      {
        icon: <MusicNotes className="h-4 w-4" />,
        label: 'Albums logged',
        value: formatStatNumber(stats?.totalLogs ?? 0),
        hint: `Last 30 days: ${formatStatNumber(stats?.logsLast30Days ?? 0)}`,
      },
      {
        icon: <Star className="h-4 w-4" />,
        label: 'Avg rating',
        value: avgLabel,
        hint: mostCommon ? `Most common: ${mostCommon}` : 'Most common: N/A',
      },
      {
        icon: <Calendar className="h-4 w-4" />,
        label: 'This year',
        value: formatStatNumber(stats?.thisYearCount ?? 0),
        hint: `Last year: ${formatStatNumber(stats?.lastYearCount ?? 0)}`,
      },
      {
        icon: <ListBullets className="h-4 w-4" />,
        label: 'Backlog',
        value: formatStatNumber(stats?.backlogCount ?? 0),
        hint: `Rated albums: ${formatStatNumber(stats?.ratedCount ?? 0)}`,
      },
    ]
  }, [payload])
  const hasLastFmConnection = Boolean(
    typeof payload?.user?.lastfmUsername === 'string' && payload.user.lastfmUsername.trim(),
  )

  const renderScaffold = (content) => (
    <div className="min-h-screen">
      <div className="md:hidden">
        <HomeMobileHeader onOpenMenu={openSidebar} navUser={navUser} isSignedIn={isSignedIn} />
      </div>
      <div className="md:hidden">
        <HomeMobileSidebar
          isOpen={isSidebarOpen}
          navUser={navUser}
          isSignedIn={isSignedIn}
          onClose={closeSidebar}
          onSignOut={handleMobileSignOut}
        />
      </div>

      <div className="mx-auto w-full max-w-[430px] px-4 pb-8 pt-0 sm:px-5 md:max-w-6xl md:px-6 md:py-6 lg:px-8">
        <div className="space-y-0 md:space-y-6">
          <div className="hidden md:block">
            <Navbar className="mx-auto w-[min(100%,1080px)]" />
          </div>
          {content}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return renderScaffold(
      <main className="overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--card)] md:backdrop-blur-md md:shadow-sm">
        <div className="divide-y divide-black/8 md:divide-[var(--border)]">
          <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
            <p className="mb-0 text-sm text-slate-600">Loading profile...</p>
          </section>
        </div>
      </main>,
    )
  }

  if (error) {
    return renderScaffold(
      <main className="overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--card)] md:backdrop-blur-md md:shadow-sm">
        <div className="divide-y divide-black/8 md:divide-[var(--border)]">
          <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
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
      </main>,
    )
  }

  return renderScaffold(
    <main className="overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--card)] md:backdrop-blur-md md:shadow-sm">
      <div className="divide-y divide-black/8 md:divide-[var(--border)]">
        <section className="py-0">
          <ProfileHeader
            embedded
            compactMobile
            allowProfileEditing={false}
            user={user}
            avatarSrc={payload?.user?.avatarUrl || '/profile/rainy.jpg'}
            bannerSrc={payload?.user?.coverUrl || '/hero/hero1.jpg'}
            followerCount={socialCounts.followers}
            followingCount={socialCounts.following}
            showSecondaryAction={followState.status !== 'self'}
            secondaryActionLabel={followButtonLabel}
            secondaryActionIcon={
              showUnfollowOnHover ? (
                <UserMinus className="h-4 w-4" weight="bold" />
              ) : isFollowing ? (
                <Check className="h-4 w-4" weight="bold" />
              ) : (
                <UserPlus className="h-4 w-4" weight="bold" />
              )
            }
            onSecondaryAction={handleHeaderFollowAction}
            secondaryActionDisabled={followButtonDisabled}
            secondaryActionClassName={followButtonClassName}
            onSecondaryActionMouseEnter={() => {
              if (isFollowing && !followButtonDisabled) setIsFollowingHovered(true)
            }}
            onSecondaryActionMouseLeave={() => setIsFollowingHovered(false)}
            onSecondaryActionFocus={() => {
              if (isFollowing && !followButtonDisabled) setIsFollowingHovered(true)
            }}
            onSecondaryActionBlur={() => setIsFollowingHovered(false)}
          />
        </section>

        {followStateError ? (
          <section className="px-0 py-4 md:px-6 md:py-4 lg:px-8">
            <p className="mb-0 text-sm text-red-700">{followStateError}</p>
          </section>
        ) : null}

        <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
          <StatsSection statsData={statsOverview} compactMobile />
        </section>

        <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12">
            <aside className="flex flex-col gap-5 md:gap-6 lg:col-span-8">
              <FavoritesSection
                favorites={favorites}
                favoriteCovers={favoriteCovers}
                favoriteRatings={favoriteRatings}
                onFavoriteRatingChange={handleFavoriteRatingChange}
                recentCarousel={recentCarousel}
                isLoadingRecent={recentlyListenedLoading}
                compactMobile
              />
              <ReviewsSection reviews={reviewList} asCard={false} compactMobile />
            </aside>

            <aside className="flex flex-col gap-5 md:gap-6 lg:col-span-4">
              <MobileProfileMediaSection
                backlogItems={backlogPreview}
                isBacklogLoading={false}
                latestLogs={recent}
                tracks={recentTracks}
                isTracksLoading={recentlyListenedLoading}
                tracksError={recentlyListenedError}
                hasLastFmConnection={hasLastFmConnection}
              />

              <section className="hidden space-y-2.5 md:block md:rounded-2xl md:border md:border-[var(--border)] md:bg-[var(--surface-2)] md:p-5 md:shadow-md">
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
                  <ul className="divide-y divide-[var(--border)]">
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

              <div className="hidden md:block">
                <LatestLogsSection recent={recent} asCard={false} />
              </div>
              <div className="hidden md:block">
                <LastFmRecentTracks
                  username={payload?.user?.username ?? ''}
                  tracks={recentTracks}
                  isLoading={recentlyListenedLoading}
                  error={recentlyListenedError}
                  asCard={false}
                />
              </div>
            </aside>
          </div>
        </section>

        <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
          <ProfileCTA asCard={false} compactMobile />
        </section>
      </div>
    </main>,
  )
}

