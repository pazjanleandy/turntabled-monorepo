import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import PopularAlbumsSection from '../components/PopularAlbumsSection.jsx'
import StatsPanel from '../components/StatsPanel.jsx'
import TrendingReviewsSection from '../components/TrendingReviewsSection.jsx'
import BecauseCommunityLovesSection from '../components/BecauseCommunityLovesSection.jsx'
import GrammyWinnersSection from '../components/GrammyWinnersSection.jsx'
import FriendSocialSection from '../components/FriendSocialSection.jsx'
import Footer from '../components/Footer.jsx'
import { Headphones, PlusCircle } from 'phosphor-react'
import useAuthStatus from '../hooks/useAuthStatus.js'
import useFriendActivity from '../hooks/useFriendActivity.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'
import { mapFriendActivityFeed } from '../lib/friendActivityFeed.jsx'
import {
  PROFILE_EVENT_NAME,
  emitProfileUpdated,
  fetchCurrentProfile,
  readCachedProfile,
} from '../lib/profileClient.js'
import HomeMobileHeader from '../components/home/HomeMobileHeader.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import HomeMobilePopularSection from '../components/home/HomeMobilePopularSection.jsx'
import HomeMobileTrendingSection from '../components/home/HomeMobileTrendingSection.jsx'
import HomeMobileStatsSection from '../components/home/HomeMobileStatsSection.jsx'

const LOG_STATUSES = new Set(['listened'])
const BACKLOG_STATUSES = new Set(['listening', 'unfinished', 'backloggd'])
const LASTFM_RECENT_LIMIT = 5
const RATING_BUCKETS = Array.from({ length: 9 }, (_, index) => 1 + index * 0.5)

function buildRatingDistribution(items = []) {
  const counts = new Map(RATING_BUCKETS.map((bucket) => [bucket.toFixed(1), 0]))

  for (const item of items) {
    const rating = Number(item?.rating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue
    const bucket = Math.min(5, Math.max(1, Math.round(rating * 2) / 2))
    const bucketKey = bucket.toFixed(1)
    counts.set(bucketKey, (counts.get(bucketKey) ?? 0) + 1)
  }

  return RATING_BUCKETS.map((bucket) => ({
    bucket,
    count: counts.get(bucket.toFixed(1)) ?? 0,
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

function collapseConsecutiveRecentlyListened(items = []) {
  const rows = Array.isArray(items) ? items : []
  const result = []
  let previousKey = ''

  for (const item of rows) {
    const album = normalizeRecentKeyPart(item?.album)
    const artist = normalizeRecentKeyPart(item?.artist)
    const key = `${artist}::${album}`

    if (result.length > 0 && key && key === previousKey) {
      continue
    }

    result.push(item)
    previousKey = key
  }

  return result
}

function normalizeRecentKeyPart(value) {
  if (typeof value !== 'string') return ''
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function mapFriendListeningRows(items = []) {
  const rows = Array.isArray(items) ? items : []
  const directListenRows = rows.filter((item) => item?.type === 'log')
  const fallbackRows = rows.filter((item) => item?.type !== 'log')
  const candidateRows = directListenRows.length >= 6 ? directListenRows : [...directListenRows, ...fallbackRows]
  const seenKeys = new Set()
  const result = []

  for (const item of candidateRows) {
    const userId = item?.user?.id || item?.userId || item?.user?.username || 'friend'
    const album = item?.albumTitle || 'Unknown album'
    const artist = item?.artistName || 'Unknown artist'
    const key = `${userId}::${normalizeRecentKeyPart(artist)}::${normalizeRecentKeyPart(album)}`

    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    result.push({
      id: item?.id ?? key,
      username: item?.user?.username || 'Unknown user',
      avatarUrl: item?.user?.avatarUrl || '',
      album,
      artist,
      cover: item?.coverArtUrl || '/album/am.jpg',
      addedAt: item?.addedAt || item?.updatedAt || item?.reviewedAt || null,
      type: item?.type || 'log',
      status: item?.status || '',
      rating: typeof item?.rating === 'number' ? item.rating : null,
    })

    if (result.length >= 10) break
  }

  return result
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
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  if (diffMs < minute) return 'just now'
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
  if (diffMs < month) {
    const n = Math.floor(diffMs / week)
    return `${n} week${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < year) {
    const n = Math.floor(diffMs / month)
    return `${n} month${n === 1 ? '' : 's'} ago`
  }

  const n = Math.floor(diffMs / year)
  return `${n} year${n === 1 ? '' : 's'} ago`
}

export default function Home() {
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const {
    activities: friendActivities,
    isLoading: isFriendActivityLoading,
    error: friendActivityError,
    hasFriends,
  } = useFriendActivity({ isSignedIn, limit: 24 })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [navUser, setNavUser] = useState(() => {
    const cached = readCachedProfile()
    return {
      username: cached?.username || '',
      avatarUrl: cached?.avatarUrl || '',
    }
  })
  const [search, setSearch] = useState('')
  const [popularAlbums, setPopularAlbums] = useState([])
  const [isPopularLoading, setIsPopularLoading] = useState(false)
  const [popularError, setPopularError] = useState('')
  const [trendingReviews, setTrendingReviews] = useState([])
  const [isTrendingLoading, setIsTrendingLoading] = useState(false)
  const [trendingError, setTrendingError] = useState('')
  const [trendingWindowDays, setTrendingWindowDays] = useState(7)
  const [grammyWinners, setGrammyWinners] = useState([])
  const [isGrammyLoading, setIsGrammyLoading] = useState(false)
  const [, setRecentlyListened] = useState([])
  const [backlogStats, setBacklogStats] = useState({ listened: 0, backlog: 0, logs: 0 })
  const [ratingDistribution, setRatingDistribution] = useState(() => buildRatingDistribution([]))
  const [userActivity, setUserActivity] = useState([])
  const [, setIsRecentLoading] = useState(false)
  const [, setRecentError] = useState('')

  useEffect(() => {
    if (!isSignedIn) {
      setNavUser({ username: '', avatarUrl: '' })
      return
    }

    let cancelled = false

    async function loadNavUser() {
      try {
        const profile = await fetchCurrentProfile()
        if (!cancelled) {
          emitProfileUpdated(profile)
          setNavUser({ username: profile.username || '', avatarUrl: profile.avatarUrl || '' })
        }
      } catch {
        // Keep cached value on failure.
      }
    }

    const handleProfileUpdate = (event) => {
      const profile = event?.detail
      if (!profile) return
      setNavUser({
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
      })
    }

    window.addEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    loadNavUser()

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSidebarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSidebarOpen])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadPopularAlbums() {
      setIsPopularLoading(true)
      setPopularError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const response = await fetch(`${apiBase}/api/explore/popular?page=1&limit=20`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load popular albums.')
        }

        const payload = await response.json()
        const items = Array.isArray(payload?.items) ? payload.items : []

        if (!cancelled) {
          setPopularAlbums(items)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setPopularError(error?.message ?? 'Unable to load popular albums.')
          setPopularAlbums([])
        }
      } finally {
        if (!cancelled) {
          setIsPopularLoading(false)
        }
      }
    }

    loadPopularAlbums()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadTrendingReviews() {
      setIsTrendingLoading(true)
      setTrendingError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const response = await fetch(`${apiBase}/api/explore/trending-reviews?limit=4`, {
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Failed to load trending reviews.')
        }

        if (!cancelled) {
          setTrendingReviews(Array.isArray(payload?.items) ? payload.items : [])
          setTrendingWindowDays(Number(payload?.windowDays ?? 7) || 7)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setTrendingReviews([])
          setTrendingError(error?.message ?? 'Unable to load trending reviews.')
        }
      } finally {
        if (!cancelled) {
          setIsTrendingLoading(false)
        }
      }
    }

    loadTrendingReviews()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadGrammyWinners() {
      setIsGrammyLoading(true)

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const response = await fetch(`${apiBase}/api/explore/grammy-winners`, {
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Failed to load GRAMMY winners.')
        }

        if (!cancelled) {
          const items = Array.isArray(payload?.items) ? payload.items : []
          setGrammyWinners(items)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setGrammyWinners([])
        }
      } finally {
        if (!cancelled) {
          setIsGrammyLoading(false)
        }
      }
    }

    loadGrammyWinners()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!isSignedIn) {
      setRecentlyListened([])
      setBacklogStats({ listened: 0, backlog: 0, logs: 0 })
      setRatingDistribution(buildRatingDistribution([]))
      setUserActivity([])
      setRecentError('')
      setIsRecentLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function loadRecentlyListened() {
      setIsRecentLoading(true)
      setRecentError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        let recentMapped = null
        const recentResponse = await fetch(`${apiBase}/api/users/me/recently-listened`, {
          headers: authHeaders,
          signal: controller.signal,
          cache: 'no-store',
        })
        const recentPayload = await recentResponse.json().catch(() => null)
        const recentItems = Array.isArray(recentPayload) ? recentPayload : []
        if (recentResponse.ok) {
          recentMapped = recentItems.map((item, index) => ({
            id:
              `${item?.source ?? 'lastfm'}-${item?.played_at ?? item?.logged_at ?? ''}-${index}`,
            artist: item?.artist ?? 'Unknown Artist',
            album: item?.album ?? item?.track ?? 'Unknown Album',
            cover: item?.cover_art || '/album/am.jpg',
            rating: 0,
            status: 'listened',
            addedAt: item?.played_at ?? item?.logged_at ?? null,
          }))
        }

        if ((!Array.isArray(recentMapped) || recentMapped.length === 0) && recentResponse.ok) {
          const profileResponse = await fetch(`${apiBase}/api/profile`, {
            headers: authHeaders,
            signal: controller.signal,
            cache: 'no-store',
          })
          const profilePayload = await profileResponse.json().catch(() => null)
          const lastfmUsername = profilePayload?.user?.lastfmUsername
          const lastfmApiKey = import.meta.env.VITE_LASTFM_API_KEY

          if (
            profileResponse.ok &&
            typeof lastfmUsername === 'string' &&
            lastfmUsername.trim() &&
            typeof lastfmApiKey === 'string' &&
            lastfmApiKey.trim()
          ) {
            const params = new URLSearchParams({
              method: 'user.getRecentTracks',
              user: lastfmUsername.trim(),
              api_key: lastfmApiKey.trim(),
              format: 'json',
              limit: String(LASTFM_RECENT_LIMIT),
            })
            const lastfmResponse = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
              signal: controller.signal,
              cache: 'no-store',
            })
            const lastfmPayload = await lastfmResponse.json().catch(() => null)
            const rawTracks = Array.isArray(lastfmPayload?.recenttracks?.track)
              ? lastfmPayload.recenttracks.track
              : []
            if (lastfmResponse.ok && !lastfmPayload?.error) {
              recentMapped = rawTracks.map((track, index) => ({
                id: `lastfm-direct-${index}`,
                artist: track?.artist?.['#text'] ?? 'Unknown Artist',
                album: track?.album?.['#text'] || track?.name || 'Unknown Album',
                cover: pickLastFmCoverArt(track?.image) || '/album/am.jpg',
                rating: 0,
                status: 'listened',
                addedAt:
                  typeof track?.date?.uts === 'string' && track.date.uts.trim()
                    ? new Date(Number.parseInt(track.date.uts, 10) * 1000).toISOString()
                    : null,
              }))
            }
          }
        }

        const limit = 50
        let page = 1
        let total = 0
        let allItems = []

        while (!cancelled) {
          const response = await fetch(`${apiBase}/api/backlog?page=${page}&limit=${limit}`, {
            headers: authHeaders,
            signal: controller.signal,
          })
          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error?.message ?? 'Failed to load recently listened.')
          }

          const items = Array.isArray(payload?.items) ? payload.items : []
          total = Number(payload?.total ?? 0)
          allItems = allItems.concat(items)

          if (items.length === 0 || allItems.length >= total) break
          page += 1
        }

        const mapped = allItems.map((item) => ({
          id: item.id,
          artist: item.artistNameRaw ?? 'Unknown Artist',
          album: item.albumTitleRaw ?? 'Unknown Album',
          cover: item.coverArtUrl || '/album/am.jpg',
          rating: item.rating ?? 0,
          status: item.status ?? 'backloggd',
          addedAt: item.addedAt ?? null,
        }))

        const logsCount = mapped.reduce(
          (sum, item) => sum + (LOG_STATUSES.has(item.status) ? 1 : 0),
          0,
        )
        const backlogCount = mapped.reduce(
          (sum, item) => sum + (BACKLOG_STATUSES.has(item.status) ? 1 : 0),
          0,
        )
        const activity = mapped.slice(0, 5).map((item) => {
          const isLog = LOG_STATUSES.has(item.status)
          return {
            id: `you-${item.id}`,
            icon: isLog ? (
              <Headphones size={16} weight="bold" />
            ) : (
              <PlusCircle size={16} weight="bold" />
            ),
            text: isLog ? `You logged ${item.album}` : `You added ${item.album} to backlog`,
            meta: `${item.artist} - ${formatRelativeTime(item.addedAt)}`,
            cover: item.cover,
          }
        })

        if (!cancelled) {
          setRecentlyListened(collapseConsecutiveRecentlyListened(recentMapped))
          setBacklogStats({
            listened: mapped.length,
            backlog: backlogCount,
            logs: logsCount,
          })
          setRatingDistribution(buildRatingDistribution(mapped))
          setUserActivity(activity)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setRecentlyListened([])
          setBacklogStats({ listened: 0, backlog: 0, logs: 0 })
          setRatingDistribution(buildRatingDistribution([]))
          setUserActivity([])
          setRecentError(error?.message ?? 'Unable to load recently listened.')
        }
      } finally {
        if (!cancelled) {
          setIsRecentLoading(false)
        }
      }
    }

    loadRecentlyListened()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSignedIn])

  const filteredPopular = useMemo(() => {
    if (!search.trim()) return popularAlbums

    const term = search.toLowerCase()
    return popularAlbums.filter((item) => {
      const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? ''
      const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? ''
      return artistName.toLowerCase().includes(term) || albumTitle.toLowerCase().includes(term)
    })
  }, [popularAlbums, search])

  const stats = useMemo(
    () => [
      { label: 'Listened', value: String(backlogStats.listened) },
      { label: 'Backlog', value: String(backlogStats.backlog) },
      { label: 'Logs', value: String(backlogStats.logs) },
    ],
    [backlogStats],
  )
  const friendActivityRows = useMemo(
    () => mapFriendActivityFeed(friendActivities),
    [friendActivities],
  )
  const friendListeningRows = useMemo(
    () => mapFriendListeningRows(friendActivities),
    [friendActivities],
  )

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleMobileSignOut = () => {
    signOut()
    setNavUser({ username: '', avatarUrl: '' })
    navigate('/')
  }

  return (
    <div className="min-h-screen">
      <HomeMobileHeader onOpenMenu={openSidebar} navUser={navUser} isSignedIn={isSignedIn} />
      <HomeMobileSidebar
        isOpen={isSidebarOpen}
        navUser={navUser}
        isSignedIn={isSignedIn}
        onClose={closeSidebar}
        onSignOut={handleMobileSignOut}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8 lg:pb-12">
        <div className="space-y-10 lg:space-y-12">
          <div className="relative hidden lg:block">
            <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
          </div>

          <main className="space-y-10 pt-1 lg:hidden">
            <HomeMobilePopularSection
              albums={popularAlbums}
              isLoading={isPopularLoading}
              error={popularError}
            />
            <HomeMobileStatsSection stats={stats} ratingDistribution={ratingDistribution} />
            <div className="py-3 sm:py-4">
              <GrammyWinnersSection items={grammyWinners} isLoading={isGrammyLoading} />
            </div>
            <HomeMobileTrendingSection
              reviews={trendingReviews}
              isLoading={isTrendingLoading}
              error={trendingError}
              windowDays={trendingWindowDays}
            />
            <FriendSocialSection
              activity={friendActivityRows}
              listening={friendListeningRows}
              isLoading={isFriendActivityLoading}
              error={friendActivityError}
              isSignedIn={isSignedIn}
              hasFriends={hasFriends}
              compact
              emptyMessage={
                hasFriends
                  ? 'No friend activity yet.'
                  : 'No friend activity yet. Add friends to see their music activity.'
              }
            />
            <BecauseCommunityLovesSection />
          </main>

          <main className="hidden space-y-14 lg:block">
            <section className="grid grid-cols-[1.6fr_0.92fr] items-start gap-6 xl:gap-7">
              <div className="min-w-0">
                <PopularAlbumsSection
                  albums={filteredPopular}
                  search={search}
                  onSearchChange={setSearch}
                  isLoading={isPopularLoading}
                  error={popularError}
                />
              </div>
              <aside className="min-w-0 self-start">
                <StatsPanel
                  stats={stats}
                  userActivity={userActivity}
                  ratingDistribution={ratingDistribution}
                />
              </aside>
            </section>

            <section className="space-y-12">
              <div className="py-2 xl:py-3">
                <GrammyWinnersSection items={grammyWinners} isLoading={isGrammyLoading} />
              </div>
              <TrendingReviewsSection
                reviews={trendingReviews}
                isLoading={isTrendingLoading}
                error={trendingError}
                windowDays={trendingWindowDays}
              />
            </section>

            <FriendSocialSection
              activity={friendActivityRows}
              listening={friendListeningRows}
              isLoading={isFriendActivityLoading}
              error={friendActivityError}
              isSignedIn={isSignedIn}
              hasFriends={hasFriends}
              emptyMessage={
                hasFriends
                  ? 'No friend activity yet.'
                  : 'No friend activity yet. Add friends to see their music activity.'
              }
            />

            <BecauseCommunityLovesSection />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

