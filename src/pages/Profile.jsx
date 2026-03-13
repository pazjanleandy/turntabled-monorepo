import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ListBullets, MusicNotes, Star } from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import CoverImage from '../components/CoverImage.jsx'
import ReviewModal from '../components/album/ReviewModal.jsx'
import EditProfileModal from '../components/profile/EditProfileModal.jsx'
import FavoritesSection from '../components/profile/FavoritesSection.jsx'
import FavoritesReorderModal from '../components/profile/FavoritesReorderModal.jsx'
import LastFmRecentTracks from '../components/profile/LastFmRecentTracks.jsx'
import LatestLogsSection from '../components/profile/LatestLogsSection.jsx'
import MobileProfileMediaSection from '../components/profile/MobileProfileMediaSection.jsx'
import ProfileCTA from '../components/profile/ProfileCTA.jsx'
import ProfileHeader from '../components/profile/ProfileHeader.jsx'
import ReviewsSection from '../components/profile/ReviewsSection.jsx'
import StatsSection from '../components/profile/StatsSection.jsx'
import HomeMobileHeader from '../components/home/HomeMobileHeader.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import { profileUser } from '../data/profileData.js'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'
import {
  PROFILE_EVENT_NAME,
  fetchCurrentProfile,
  readCachedProfile,
  uploadCoverAndPersistUrl,
} from '../lib/profileClient.js'
import { supabase } from '../supabase.js'

const BACKLOG_UPDATED_EVENT_NAME = 'turntabled:backlog-updated'
const PROFILE_BACKLOG_STATUSES = new Set(['backloggd', 'pending', 'listening', 'unfinished'])
const PROFILE_BACKLOG_PREVIEW_STATUS = 'backloggd'

function getNormalizedBacklogStatus(item) {
  const rawStatus = String(item?.statusRaw ?? '').trim().toLowerCase()
  if (rawStatus) return rawStatus
  return String(item?.status ?? '').trim().toLowerCase()
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
    return `${n}d ago`
  }
  if (diffMs < month) {
    const n = Math.floor(diffMs / week)
    return `${n}w ago`
  }
  if (diffMs < year) {
    const n = Math.floor(diffMs / month)
    return `${n}mo ago`
  }

  const n = Math.floor(diffMs / year)
  return `${n}y ago`
}

function mapApiFavoritesToAlbums(payload) {
  const favorites = Array.isArray(payload?.favorites) ? payload.favorites : []
  return favorites.map((item) => ({
    backlogId: item?.backlogId ?? null,
    title: item?.album?.title ?? 'Unknown album',
    artist: item?.album?.artistName ?? 'Unknown artist',
    cover: item?.album?.coverArtUrl || '',
    releaseId: item?.album?.releaseId ?? null,
    rating: item?.rating ?? 0,
  }))
}

function mapBacklogFavoritesToAlbums(items = [], currentFavorites = []) {
  const favoriteRows = (Array.isArray(items) ? items : []).filter((item) => Boolean(item?.isFavorite))
  const favoriteByBacklogId = new Map(
    favoriteRows
      .filter((item) => item?.id)
      .map((item) => [item.id, item])
  )

  const ordered = []
  const current = Array.isArray(currentFavorites) ? currentFavorites : []
  for (const favorite of current) {
    const backlogId = favorite?.backlogId
    if (!backlogId || !favoriteByBacklogId.has(backlogId)) continue

    const row = favoriteByBacklogId.get(backlogId)
    ordered.push({
      backlogId,
      title: row?.albumTitleRaw ?? favorite?.title ?? 'Unknown album',
      artist: row?.artistNameRaw ?? favorite?.artist ?? 'Unknown artist',
      cover: row?.coverArtUrl || favorite?.cover || '/album/am.jpg',
      releaseId: favorite?.releaseId ?? null,
      rating: row?.rating ?? favorite?.rating ?? 0,
    })
    favoriteByBacklogId.delete(backlogId)
  }

  for (const row of favoriteRows) {
    const backlogId = row?.id ?? null
    if (!backlogId || !favoriteByBacklogId.has(backlogId)) continue

    ordered.push({
      backlogId,
      title: row?.albumTitleRaw ?? 'Unknown album',
      artist: row?.artistNameRaw ?? 'Unknown artist',
      cover: row?.coverArtUrl || '/album/am.jpg',
      releaseId: null,
      rating: row?.rating ?? 0,
    })
    favoriteByBacklogId.delete(backlogId)
  }

  return ordered
}

function mapBacklogReviews(items = []) {
  return items
    .filter((item) => typeof item?.reviewText === 'string' && item.reviewText.trim())
    .sort((a, b) => {
      const aTime = Date.parse(a?.reviewedAt ?? '') || 0
      const bTime = Date.parse(b?.reviewedAt ?? '') || 0
      return bTime - aTime
    })
    .map((item) => ({
      backlogId: item?.id ?? null,
      title: item?.albumTitleRaw ?? 'Unknown album',
      artist: item?.artistNameRaw ?? 'Unknown artist',
      cover: item?.coverArtUrl || '/album/am.jpg',
      reviewText: item?.reviewText ?? '',
      rating: item?.rating ?? 0,
      reviewedAt: item?.reviewedAt ?? null,
    }))
}

function mapUnifiedRecentToCarousel(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    id: `${item?.source ?? 'recent'}-${item?.played_at ?? item?.logged_at ?? ''}-${index}`,
    title: item?.album ?? item?.track ?? 'Unknown album',
    artist: item?.artist ?? 'Unknown artist',
    cover: item?.cover_art || '/album/am.jpg',
    rating: 0,
    status: 'listened',
    addedAt: item?.played_at ?? item?.logged_at ?? null,
  }))
}

const RECENT_CAROUSEL_PLACEHOLDERS = [
  '/album/am.jpg',
  '/album/blond.jpg',
  '/album/currents.jpg',
  '/album/igor.jpg',
  '/album/ram.jpg',
]

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

function mapRecentTracksToCarousel(tracks = []) {
  return (Array.isArray(tracks) ? tracks : []).map((track, index) => ({
    id: `lastfm-track-${index}`,
    title: track?.album || track?.name || 'Unknown album',
    artist: track?.artist || 'Unknown artist',
    cover: track?.coverArt || RECENT_CAROUSEL_PLACEHOLDERS[index % RECENT_CAROUSEL_PLACEHOLDERS.length],
    rating: 0,
    status: 'listened',
    addedAt: null,
  }))
}

function formatStatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Number(value) || 0))
}

function mapApiProfileToViewModel(profilePayload, fallbackUser) {
  const apiUser = profilePayload?.user ?? {}
  const normalizedUsername =
    typeof apiUser.username === 'string' && apiUser.username.trim()
      ? apiUser.username.trim()
      : ''
  const fullName = apiUser.fullName?.trim() || normalizedUsername || fallbackUser.name
  const handle = apiUser.username ? `@${String(apiUser.username).replace(/^@/, '')}` : fallbackUser.handle

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || fallbackUser.initials

  return {
    user: {
      ...fallbackUser,
      name: fullName,
      handle,
      initials,
      bio: apiUser.bio ?? fallbackUser.bio,
    },
    avatarUrl: apiUser.avatarUrl ?? '',
    coverUrl: apiUser.coverUrl ?? '',
  }
}

function mapApiSocialCounts(profilePayload) {
  const followers = Number(profilePayload?.social?.followers)
  const following = Number(profilePayload?.social?.following)
  return {
    followers: Number.isFinite(followers) ? Math.max(0, followers) : 0,
    following: Number.isFinite(following) ? Math.max(0, following) : 0,
  }
}

export default function Profile() {
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const cachedProfile = readCachedProfile()
  const [profileView, setProfileView] = useState(() => ({
    user: {
      ...profileUser,
      name: cachedProfile?.fullName || cachedProfile?.username || profileUser.name,
      handle: cachedProfile?.username ? `@${cachedProfile.username}` : profileUser.handle,
      bio: cachedProfile?.bio || profileUser.bio,
    },
    avatarUrl: cachedProfile?.avatarUrl || '',
    coverUrl: cachedProfile?.coverUrl || '',
  }))
  const user = profileView.user
  const [profileFavorites, setProfileFavorites] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [socialCounts, setSocialCounts] = useState({ followers: 0, following: 0 })
  const [recentCarousel, setRecentCarousel] = useState([])
  const [recentActivityLogs, setRecentActivityLogs] = useState([])
  const [reviewList, setReviewList] = useState([])
  const favorites = profileFavorites
  const recent = recentActivityLogs

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [lastfmUsername, setLastfmUsername] = useState('')
  const [recentTracks, setRecentTracks] = useState([])
  const [tracksStatus, setTracksStatus] = useState({
    loading: false,
    error: '',
  })
  const [recentCarouselLoading, setRecentCarouselLoading] = useState(false)
  const [backlogPreview, setBacklogPreview] = useState([])
  const [backlogItems, setBacklogItems] = useState([])
  const [backlogLoading, setBacklogLoading] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [isDeletingReview, setIsDeletingReview] = useState(false)
  const [isFavoritesManageOpen, setIsFavoritesManageOpen] = useState(false)
  const [isSavingFavoritesOrder, setIsSavingFavoritesOrder] = useState(false)
  const [favoriteOrderDraft, setFavoriteOrderDraft] = useState([])
  const [favoriteOrderError, setFavoriteOrderError] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const favoriteCovers = {}
  const backloggdPreview = useMemo(
    () =>
      (Array.isArray(backlogPreview) ? backlogPreview : []).filter(
        (item) => getNormalizedBacklogStatus(item) === PROFILE_BACKLOG_PREVIEW_STATUS
      ),
    [backlogPreview],
  )
  const recentCarouselForFavorites = useMemo(() => {
    if (recentCarousel.length > 0) return recentCarousel
    return mapRecentTracksToCarousel(recentTracks)
  }, [recentCarousel, recentTracks])

  useEffect(() => {
    if (!isEditOpen && !isFavoritesManageOpen && !isSidebarOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isEditOpen, isFavoritesManageOpen, isSidebarOpen])

  useEffect(() => {
    if (!isSignedIn) {
      setBacklogPreview([])
      setBacklogItems([])
      setRecentActivityLogs([])
      setReviewList([])
      setProfileFavorites([])
      setFavoritesLoading(false)
      return
    }

    let cancelled = false
    let realtimeChannel = null

    async function loadBacklogPreview() {
      setBacklogLoading(true)
      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()

        const limit = 50
        let page = 1
        let total = 0
        let allItems = []

        while (!cancelled) {
          const response = await fetch(`${apiBase}/api/backlog?page=${page}&limit=${limit}`, {
            headers: authHeaders,
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(payload?.error?.message ?? 'Failed to load backlog.')
          }

          const items = Array.isArray(payload?.items) ? payload.items : []
          total = Number(payload?.total ?? 0)
          allItems = allItems.concat(items)

          if (items.length === 0 || allItems.length >= total) break
          page += 1
        }

        const sortedItems = [...allItems].sort((a, b) => {
          const aTime = Date.parse(a?.addedAt ?? a?.updatedAt ?? '') || 0
          const bTime = Date.parse(b?.addedAt ?? b?.updatedAt ?? '') || 0
          return bTime - aTime
        })
        const backlogPreviewItems = sortedItems.filter(
          (item) => getNormalizedBacklogStatus(item) === PROFILE_BACKLOG_PREVIEW_STATUS
        )
        const latestLogs = sortedItems
          .slice(0, 5)
          .map((item) => ({
            title: item?.albumTitleRaw ?? 'Unknown album',
            artist: item?.artistNameRaw ?? 'Unknown artist',
            cover: item?.coverArtUrl || '/album/am.jpg',
            year: item?.addedAt ? String(new Date(item.addedAt).getUTCFullYear()) : 'Unknown year',
            rating:
              typeof item?.rating === 'number' ? item.rating.toFixed(1) : String(item?.rating ?? '0.0'),
            note: '',
            timeAgo: formatRelativeTime(item?.addedAt),
          }))

        if (!cancelled) {
          setBacklogPreview(backlogPreviewItems.slice(0, 8))
          setBacklogItems(sortedItems)
          setRecentActivityLogs(latestLogs)
          setReviewList(mapBacklogReviews(sortedItems))
          setProfileFavorites((current) => mapBacklogFavoritesToAlbums(sortedItems, current))
        }
      } catch {
        if (!cancelled) {
          setBacklogPreview([])
          setBacklogItems([])
          setRecentCarousel([])
          setRecentActivityLogs([])
          setReviewList([])
        }
      } finally {
        if (!cancelled) {
          setBacklogLoading(false)
        }
      }
    }

    const handleBacklogUpdated = () => {
      if (cancelled) return
      loadBacklogPreview()
    }

    const subscribeToRealtimeBacklog = async () => {
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId || cancelled) return

      realtimeChannel = supabase
        .channel(`profile-backlog-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'backlog', filter: `user_id=eq.${userId}` },
          handleBacklogUpdated
        )
        .subscribe()
    }

    window.addEventListener(BACKLOG_UPDATED_EVENT_NAME, handleBacklogUpdated)
    loadBacklogPreview()
    subscribeToRealtimeBacklog()
    return () => {
      cancelled = true
      window.removeEventListener(BACKLOG_UPDATED_EVENT_NAME, handleBacklogUpdated)
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [isSignedIn])

  const statsOverview = useMemo(() => {
    const now = new Date()
    const currentYear = now.getUTCFullYear()
    const previousYear = currentYear - 1
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000

    const rows = Array.isArray(backlogItems) ? backlogItems : []
    const totalLogs = rows.length

    let logsLast30Days = 0
    let totalRating = 0
    let ratedCount = 0
    let thisYearCount = 0
    let lastYearCount = 0
    let backlogCount = 0
    const ratingFrequency = new Map()

    for (const item of rows) {
      const addedRaw = item?.addedAt ?? item?.updatedAt ?? ''
      const addedTime = Date.parse(addedRaw)
      const addedDate = Number.isNaN(addedTime) ? null : new Date(addedTime)
      if (addedDate) {
        if (addedTime >= thirtyDaysAgo) logsLast30Days += 1
        const year = addedDate.getUTCFullYear()
        if (year === currentYear) thisYearCount += 1
        if (year === previousYear) lastYearCount += 1
      }

      const rating = Number(item?.rating)
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        ratedCount += 1
        totalRating += rating
        const key = rating.toFixed(1)
        ratingFrequency.set(key, (ratingFrequency.get(key) ?? 0) + 1)
      }

      const normalizedStatus = String(item?.status ?? '').trim().toLowerCase()
      if (PROFILE_BACKLOG_STATUSES.has(normalizedStatus)) {
        backlogCount += 1
      }
    }

    let mostCommonRating = null
    let mostCommonCount = 0
    for (const [ratingValue, count] of ratingFrequency.entries()) {
      const currentBest = mostCommonRating == null ? -Infinity : Number(mostCommonRating)
      const candidate = Number(ratingValue)
      if (count > mostCommonCount || (count === mostCommonCount && candidate > currentBest)) {
        mostCommonCount = count
        mostCommonRating = ratingValue
      }
    }

    const avgRatingValue = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '0.0'

    return [
      {
        icon: <MusicNotes className="h-4 w-4" />,
        label: 'Albums logged',
        value: formatStatNumber(totalLogs),
        hint: `Last 30 days: ${formatStatNumber(logsLast30Days)}`,
      },
      {
        icon: <Star className="h-4 w-4" />,
        label: 'Avg rating',
        value: avgRatingValue,
        hint: mostCommonRating ? `Most common: ${mostCommonRating}` : 'Most common: N/A',
      },
      {
        icon: <Calendar className="h-4 w-4" />,
        label: 'This year',
        value: formatStatNumber(thisYearCount),
        hint: `Last year: ${formatStatNumber(lastYearCount)}`,
      },
      {
        icon: <ListBullets className="h-4 w-4" />,
        label: 'Backlog',
        value: formatStatNumber(backlogCount),
        hint: `Rated albums: ${formatStatNumber(ratedCount)}`,
      },
    ]
  }, [backlogItems])

  useEffect(() => {
    if (!isSignedIn) {
      setRecentCarousel([])
      setRecentCarouselLoading(false)
      return
    }

    let cancelled = false

    async function loadRecentCarousel() {
      setRecentCarouselLoading(true)
      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        const recentResponse = await fetch(`${apiBase}/api/users/me/recently-listened`, {
          headers: authHeaders,
          cache: 'no-store',
        })
        const recentPayload = await recentResponse.json().catch(() => null)
        if (!recentResponse.ok) {
          throw new Error('Failed to load recently listened.')
        }

        if (!cancelled) {
          setRecentCarousel(mapUnifiedRecentToCarousel(recentPayload))
        }
      } catch {
        if (!cancelled) {
          setRecentCarousel([])
        }
      } finally {
        if (!cancelled) {
          setRecentCarouselLoading(false)
        }
      }
    }

    loadRecentCarousel()
    return () => {
      cancelled = true
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) {
      setProfileView({ user: profileUser, avatarUrl: '', coverUrl: '' })
      setSocialCounts({ followers: 0, following: 0 })
      setFavoritesLoading(false)
      return
    }

    let cancelled = false

    async function loadProfile() {
      setFavoritesLoading(true)
      try {
        const [clientProfile, apiPayload] = await Promise.all([
          fetchCurrentProfile().catch(() => null),
          (async () => {
            const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
            const authHeaders = await buildApiAuthHeaders()
            const response = await fetch(`${apiBase}/api/profile`, { headers: authHeaders })
            const payload = await response.json().catch(() => null)
            if (!response.ok) return null
            return payload
          })(),
        ])

        const payload = apiPayload ?? {}
        payload.user = payload.user ?? {}

        if (apiPayload) {
          setProfileFavorites(mapApiFavoritesToAlbums(apiPayload))
        }

        if (clientProfile) {
          payload.user.username = payload.user.username || clientProfile.username
          payload.user.fullName = payload.user.fullName || clientProfile.fullName
          payload.user.bio = payload.user.bio ?? clientProfile.bio
          payload.user.avatarUrl = clientProfile.avatarUrl
          payload.user.coverUrl = clientProfile.coverUrl
        } else {
          const latestCached = readCachedProfile()
          if (latestCached) {
            payload.user.username = payload.user.username || latestCached.username
            payload.user.fullName = payload.user.fullName || latestCached.fullName
            payload.user.bio = payload.user.bio ?? latestCached.bio
            payload.user.avatarUrl = payload.user.avatarUrl || latestCached.avatarUrl || ''
            payload.user.coverUrl = payload.user.coverUrl || latestCached.coverUrl || ''
          }
        }

        if (!cancelled) {
          setProfileView(mapApiProfileToViewModel(payload, profileUser))
          setSocialCounts(mapApiSocialCounts(payload))
          const apiLastfmUsername =
            typeof payload?.user?.lastfmUsername === 'string' ? payload.user.lastfmUsername.trim() : ''
          setLastfmUsername(apiLastfmUsername)
        }
      } catch {
        if (!cancelled) {
          setProfileView({ user: profileUser, avatarUrl: '', coverUrl: '' })
          setSocialCounts({ followers: 0, following: 0 })
          setLastfmUsername('')
        }
      } finally {
        if (!cancelled) {
          setFavoritesLoading(false)
        }
      }
    }

    const handleProfileUpdate = (event) => {
      const profile = event?.detail
      if (!profile || cancelled) return
      const payload = {
        user: {
          username: profile.username,
          fullName: profile.fullName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          coverUrl: profile.coverUrl,
        },
      }
      setProfileView(mapApiProfileToViewModel(payload, profileUser))
      const nextLastfmUsername =
        typeof profile?.lastfmUsername === 'string' ? profile.lastfmUsername.trim() : ''
      setLastfmUsername(nextLastfmUsername)
    }

    window.addEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    loadProfile()
    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!lastfmUsername) {
      setRecentTracks([])
      setTracksStatus({ loading: false, error: '' })
      return
    }

    const apiKey = import.meta.env.VITE_LASTFM_API_KEY
    if (!apiKey) {
      setTracksStatus({
        loading: false,
        error: 'Missing VITE_LASTFM_API_KEY.',
      })
      return
    }

    let cancelled = false
    async function loadRecentTracks() {
      setTracksStatus({ loading: true, error: '' })
      try {
        const params = new URLSearchParams({
          method: 'user.getRecentTracks',
          user: lastfmUsername,
          api_key: apiKey,
          format: 'json',
          limit: '10',
        })
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch recent tracks.')
        }
        const data = await response.json()
        if (data?.error) {
          throw new Error(data.message || 'Last.fm error.')
        }

        const items = data?.recenttracks?.track ?? []
        const mapped = items.map((track) => ({
          name: track?.name ?? 'Unknown track',
          artist: track?.artist?.['#text'] ?? 'Unknown artist',
          album: track?.album?.['#text'] ?? '',
          nowPlaying: track?.['@attr']?.nowplaying === 'true',
          coverArt: pickLastFmCoverArt(track?.image),
        }))

        if (!cancelled) {
          setRecentTracks(mapped)
          setTracksStatus({ loading: false, error: '' })
        }
      } catch (err) {
        if (cancelled) return
        setTracksStatus({
          loading: false,
          error: err?.message || 'Unexpected error.',
        })
      }
    }

    loadRecentTracks()
    return () => {
      cancelled = true
    }
  }, [lastfmUsername])

  const closeEditModal = () => {
    setIsEditOpen(false)
  }

  const handleDisconnectLastFm = () => {
    localStorage.removeItem('lastfmUsername')
    localStorage.removeItem('lastfmSessionKey')
    setLastfmUsername('')
  }

  const handleProfileSaved = (payload) => {
    setProfileView(mapApiProfileToViewModel(payload, profileUser))
    setSocialCounts(mapApiSocialCounts(payload))
    if (payload?.favorites) {
      setProfileFavorites(mapApiFavoritesToAlbums(payload))
    }
  }

  const handleCoverUpload = async (file) => {
    const profile = await uploadCoverAndPersistUrl(file)
    const payload = {
      user: {
        username: profile.username,
        fullName: profile.fullName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
      },
    }
    setProfileView(mapApiProfileToViewModel(payload, profileUser))
  }

  const handleSaveFavorites = async (favoriteBacklogIds) => {
    const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
    const authHeaders = await buildApiAuthHeaders()
    if (!authHeaders?.Authorization) {
      throw new Error('You are not authenticated. Please sign in again.')
    }

    const response = await fetch(`${apiBase}/api/profile/favorites`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        favoriteBacklogIds: Array.isArray(favoriteBacklogIds) ? favoriteBacklogIds : [],
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Failed to update favorite (HTTP ${response.status}).`)
    }

    setProfileFavorites(mapApiFavoritesToAlbums(payload))
    return payload
  }

  const openFavoritesManageModal = () => {
    setFavoriteOrderDraft(Array.isArray(favorites) ? favorites : [])
    setFavoriteOrderError('')
    setIsFavoritesManageOpen(true)
  }

  const closeFavoritesManageModal = () => {
    if (isSavingFavoritesOrder) return
    setIsFavoritesManageOpen(false)
    setFavoriteOrderError('')
  }

  const handleFavoriteReorder = (nextOrder) => {
    setFavoriteOrderDraft(Array.isArray(nextOrder) ? nextOrder : [])
  }

  const handleSaveFavoriteOrder = async () => {
    const favoriteBacklogIds = favoriteOrderDraft
      .map((item) => item?.backlogId)
      .filter((id) => typeof id === 'string' && id)

    setFavoriteOrderError('')
    setIsSavingFavoritesOrder(true)
    try {
      await handleSaveFavorites(favoriteBacklogIds)
      setIsFavoritesManageOpen(false)
    } catch (error) {
      setFavoriteOrderError(error?.message ?? 'Failed to update favorite order.')
    } finally {
      setIsSavingFavoritesOrder(false)
    }
  }

  const emitBacklogUpdated = () => {
    window.dispatchEvent(new CustomEvent(BACKLOG_UPDATED_EVENT_NAME))
  }

  const handleEditReview = (review) => {
    setEditingReview(review ?? null)
  }

  const handleDeleteReview = async (review) => {
    const backlogId = review?.backlogId
    if (!backlogId || isDeletingReview) return

    const confirmed = window.confirm('Delete this review? The album log will remain in your backlog.')
    if (!confirmed) return

    setIsDeletingReview(true)
    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const response = await fetch(`${apiBase}/api/backlog?id=${encodeURIComponent(backlogId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ clearReview: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete review.')
      }

      emitBacklogUpdated()
    } catch {
      // Keep UX lightweight for now; refresh cycle continues on next successful sync.
    } finally {
      setIsDeletingReview(false)
    }
  }

  const navUser = useMemo(
    () => ({
      username: String(user?.handle ?? '').replace(/^@/, ''),
      avatarUrl: profileView.avatarUrl || '',
    }),
    [profileView.avatarUrl, user?.handle],
  )

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleMobileSignOut = () => {
    signOut()
    setIsSidebarOpen(false)
    navigate('/')
  }

  return (
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

          <main className="overflow-visible rounded-none border-0 bg-transparent shadow-none md:overflow-hidden md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--card)] md:backdrop-blur-md md:shadow-sm">
            <div className="divide-y divide-black/8 md:divide-[var(--border)]">
              <section className="py-0">
                <ProfileHeader
                  embedded
                  compactMobile
                  user={user}
                  avatarSrc={profileView.avatarUrl || ''}
                  bannerSrc={profileView.coverUrl || '/hero/hero1.jpg'}
                  followerCount={socialCounts.followers}
                  followingCount={socialCounts.following}
                  onCoverUpload={handleCoverUpload}
                  onEdit={() => setIsEditOpen(true)}
                />
              </section>

              <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
                <StatsSection statsData={statsOverview} compactMobile />
              </section>

              <section className="px-0 py-4 md:px-6 md:py-6 lg:px-8">
                <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12">
                  <aside className="flex flex-col gap-5 md:gap-6 lg:col-span-8">
                    <FavoritesSection
                      favorites={favorites}
                      isLoadingFavorites={favoritesLoading}
                      favoriteCovers={favoriteCovers}
                      recentCarousel={recentCarouselForFavorites}
                      isLoadingRecent={recentCarouselLoading}
                      onManageFavorites={openFavoritesManageModal}
                      manageDisabled={favoritesLoading}
                      compactMobile
                    />
                    <ReviewsSection
                      reviews={reviewList}
                      onEditReview={handleEditReview}
                      onDeleteReview={handleDeleteReview}
                      isReviewActionBusy={isDeletingReview}
                      asCard={false}
                      compactMobile
                    />
                  </aside>

                  <aside className="flex flex-col gap-5 md:gap-6 lg:col-span-4">
                    <MobileProfileMediaSection
                      backlogItems={backloggdPreview}
                      isBacklogLoading={backlogLoading}
                      latestLogs={recent}
                      tracks={recentTracks}
                      isTracksLoading={tracksStatus.loading}
                      tracksError={tracksStatus.error}
                      hasLastFmConnection={Boolean(lastfmUsername)}
                    />

                    <section className="hidden space-y-2.5 md:block md:rounded-2xl md:border md:border-[var(--border)] md:bg-[var(--surface-2)] md:p-5 md:shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                            Backlog
                          </p>
                          <h3 className="mb-0 text-lg text-text">Backloggd albums</h3>
                        </div>
                      </div>
                      {backlogLoading ? (
                        <p className="mb-0 text-sm text-slate-600">Loading backlog...</p>
                      ) : backloggdPreview.length === 0 ? (
                        <p className="mb-0 text-sm text-slate-600">No backloggd albums yet.</p>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {backloggdPreview.map((item) => (
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
                        username={lastfmUsername}
                        tracks={recentTracks}
                        isLoading={tracksStatus.loading}
                        error={tracksStatus.error}
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
          </main>
        </div>
      </div>

      <FavoritesReorderModal
        isOpen={isFavoritesManageOpen}
        orderedFavorites={favoriteOrderDraft}
        errorMessage={favoriteOrderError}
        isSaving={isSavingFavoritesOrder}
        onClose={closeFavoritesManageModal}
        onReorder={handleFavoriteReorder}
        onSave={handleSaveFavoriteOrder}
      />

      <EditProfileModal
        isOpen={isEditOpen}
        user={user}
        avatarSrc={profileView.avatarUrl || '/profile/rainy.jpg'}
        bannerSrc={profileView.coverUrl || '/hero/hero1.jpg'}
        lastfmUsername={lastfmUsername}
        onDisconnectLastFm={handleDisconnectLastFm}
        onClose={closeEditModal}
        onSaved={handleProfileSaved}
      />
      <ReviewModal
        isOpen={Boolean(editingReview)}
        onClose={() => setEditingReview(null)}
        backlogId={editingReview?.backlogId ?? ''}
        albumTitle={editingReview?.title ?? ''}
        initialReviewText={editingReview?.reviewText ?? ''}
        onSaved={() => {
          setEditingReview(null)
          emitBacklogUpdated()
        }}
      />
    </div>
  )
}

