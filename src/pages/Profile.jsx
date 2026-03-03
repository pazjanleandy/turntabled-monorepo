import { useEffect, useState } from 'react'
import { Radio } from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import CoverImage from '../components/CoverImage.jsx'
import LastFmConnectButton from '../components/LastFmConnectButton.jsx'
import EditProfileModal from '../components/profile/EditProfileModal.jsx'
import FavoritesSection from '../components/profile/FavoritesSection.jsx'
import FriendsSection from '../components/profile/FriendsSection.jsx'
import LastFmRecentTracks from '../components/profile/LastFmRecentTracks.jsx'
import LatestLogsSection from '../components/profile/LatestLogsSection.jsx'
import ProfileCTA from '../components/profile/ProfileCTA.jsx'
import ProfileHeader from '../components/profile/ProfileHeader.jsx'
import ReplaceFavoriteModal from '../components/profile/ReplaceFavoriteModal.jsx'
import ReviewsSection from '../components/profile/ReviewsSection.jsx'
import StatsSection from '../components/profile/StatsSection.jsx'
import {
  favoriteAlbums,
  friends,
  profileUser,
  recentCarouselAlbums,
  recentLogs,
  reviews,
} from '../data/profileData.js'
import useAlbumCovers from '../hooks/useAlbumCovers.js'
import useAlbumRatings from '../hooks/useAlbumRatings.js'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'
import {
  PROFILE_EVENT_NAME,
  fetchCurrentProfile,
  readCachedProfile,
} from '../lib/profileClient.js'

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
  }
}

export default function Profile() {
  const { isSignedIn } = useAuthStatus()
  const cachedProfile = readCachedProfile()
  const [profileView, setProfileView] = useState(() => ({
    user: {
      ...profileUser,
      name: cachedProfile?.fullName || cachedProfile?.username || profileUser.name,
      handle: cachedProfile?.username ? `@${cachedProfile.username}` : profileUser.handle,
      bio: cachedProfile?.bio || profileUser.bio,
    },
    avatarUrl: cachedProfile?.avatarUrl || '',
  }))
  const user = profileView.user
  const favorites = favoriteAlbums
  const recentCarousel = recentCarouselAlbums
  const recent = recentLogs
  const friendsList = friends
  const reviewList = reviews

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [replaceFavoriteIndex, setReplaceFavoriteIndex] = useState(null)
  const [lastfmUsername, setLastfmUsername] = useState(
    () => localStorage.getItem('lastfmUsername') ?? '',
  )
  const [recentTracks, setRecentTracks] = useState([])
  const [tracksStatus, setTracksStatus] = useState({
    loading: false,
    error: '',
  })
  const [backlogPreview, setBacklogPreview] = useState([])
  const [backlogLoading, setBacklogLoading] = useState(false)

  const favoriteCovers = useAlbumCovers(favorites)

  const { ratings: favoriteRatings, updateRating: handleFavoriteRatingChange } =
    useAlbumRatings(favorites)

  const { ratings: recentRatings, updateRating: handleRecentRatingChange } =
    useAlbumRatings(recentCarousel)

  useEffect(() => {
    if (!isEditOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isEditOpen])

  useEffect(() => {
    if (!isSignedIn) {
      setBacklogPreview([])
      return
    }

    let cancelled = false

    async function loadBacklogPreview() {
      setBacklogLoading(true)
      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        const response = await fetch(`${apiBase}/api/backlog?page=1&limit=5`, {
          headers: authHeaders,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Failed to load backlog.')
        }

        if (!cancelled) {
          setBacklogPreview(Array.isArray(payload?.items) ? payload.items : [])
        }
      } catch {
        if (!cancelled) {
          setBacklogPreview([])
        }
      } finally {
        if (!cancelled) {
          setBacklogLoading(false)
        }
      }
    }

    loadBacklogPreview()
    return () => {
      cancelled = true
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) {
      setProfileView({ user: profileUser, avatarUrl: '' })
      return
    }

    let cancelled = false

    async function loadProfile() {
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
        if (clientProfile) {
          payload.user = payload.user ?? {}
          payload.user.username = payload.user.username || clientProfile.username
          payload.user.fullName = payload.user.fullName || clientProfile.fullName
          payload.user.bio = payload.user.bio ?? clientProfile.bio
          payload.user.avatarUrl = clientProfile.avatarUrl
        }

        if (!cancelled) {
          setProfileView(mapApiProfileToViewModel(payload, profileUser))
        }
      } catch {
        if (!cancelled) {
          setProfileView({ user: profileUser, avatarUrl: '' })
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
        },
      }
      setProfileView(mapApiProfileToViewModel(payload, profileUser))
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
    setReplaceFavoriteIndex(null)
  }

  const handleDisconnectLastFm = () => {
    localStorage.removeItem('lastfmUsername')
    localStorage.removeItem('lastfmSessionKey')
    setLastfmUsername('')
  }

  const handleProfileSaved = (payload) => {
    setProfileView(mapApiProfileToViewModel(payload, profileUser))
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
                  user={user}
                  avatarSrc={profileView.avatarUrl || '/profile/rainy.jpg'}
                  onEdit={() => setIsEditOpen(true)}
                />
              </section>

              <section className="px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/25 bg-accent/15 text-accent">
                      <Radio size={16} weight="bold" />
                    </span>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                        Integrations
                      </p>
                      <h2 className="mb-0 text-lg text-text">Last.fm connection</h2>
                      <p className="mb-0 mt-2 text-sm text-slate-600">
                        Link Last.fm to pull your recent listening history into your
                        profile.
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    {lastfmUsername ? (
                      <>
                        <span className="inline-flex items-center rounded-full border border-orange-500/25 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                          Connected as {lastfmUsername}
                        </span>
                        <button
                          type="button"
                          className="rounded-xl border border-red-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-none transition hover:-translate-y-0.5 hover:border-red-300 hover:text-red-700 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                          onClick={handleDisconnectLastFm}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <LastFmConnectButton className="w-full sm:w-auto shadow-none" />
                    )}
                  </div>
                </div>
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
                          <h3 className="mb-0 text-lg text-text">Saved albums</h3>
                        </div>
                      </div>
                      {backlogLoading ? (
                        <p className="mb-0 text-sm text-slate-600">Loading backlog...</p>
                      ) : backlogPreview.length === 0 ? (
                        <p className="mb-0 text-sm text-slate-600">No backlog items yet.</p>
                      ) : (
                        <ul className="divide-y divide-black/5">
                          {backlogPreview.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 py-2.5">
                              <div className="h-12 w-12 overflow-hidden rounded-xl border border-black/10 bg-black/5">
                                <CoverImage
                                  src={item.coverArtUrl || '/album/am.jpg'}
                                  alt={`${item.albumTitleRaw} cover`}
                                  className="h-full w-full object-cover"
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
                                {item.rating ?? 0}/5
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <LatestLogsSection recent={recent} asCard={false} />
                    <FriendsSection friends={friendsList} asCard={false} />
                    <LastFmRecentTracks
                      username={lastfmUsername}
                      tracks={recentTracks}
                      isLoading={tracksStatus.loading}
                      error={tracksStatus.error}
                      asCard={false}
                    />
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

      <EditProfileModal
        isOpen={isEditOpen}
        user={user}
        favorites={favorites}
        favoriteCovers={favoriteCovers}
        onClose={closeEditModal}
        onReplaceFavorite={setReplaceFavoriteIndex}
        onSaved={handleProfileSaved}
      />

      <ReplaceFavoriteModal
        index={replaceFavoriteIndex}
        onClose={() => setReplaceFavoriteIndex(null)}
      />
    </div>
  )
}
