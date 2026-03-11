import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  Clock,
  DotsThreeOutlineVertical,
  Flame,
  FunnelSimple,
  ListBullets,
  MagnifyingGlass,
  MapPinLine,
  MusicNotesSimple,
  Plus,
  SquaresFour,
  Star,
  Users,
  X,
} from 'phosphor-react'
import BackButton from '../components/BackButton.jsx'
import Navbar from '../components/Navbar.jsx'
import HomeMobileHeader from '../components/home/HomeMobileHeader.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import useFriendsData from '../hooks/useFriendsData.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'
import { readCachedProfile } from '../lib/profileClient.js'
import { profileUser } from '../data/profileData.js'

const VIEW_MODE_STORAGE_KEY = 'turntabled:friends:view-mode'

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently active' },
  { value: 'logs', label: 'Most logs' },
  { value: 'rating', label: 'Highest avg rating' },
  { value: 'streak', label: 'Longest streak' },
]

const FILTER_OPTIONS = [
  { key: 'nowSpinning', label: 'Online / Now spinning' },
  { key: 'recentlyActive', label: 'Recently active' },
  { key: 'sameCity', label: 'Same city' },
]

function getCity(location = '') {
  return location.split(',')[0]?.trim().toLowerCase() ?? ''
}

function parseActivityHours(activity = '') {
  const normalized = activity.toLowerCase()
  if (normalized.includes('now spinning')) return 0

  const hoursMatch = normalized.match(/(\d+)\s*h\s*ago/)
  if (hoursMatch) return Number(hoursMatch[1])

  if (normalized.includes('yesterday')) return 24

  const daysMatch = normalized.match(/(\d+)\s*d\s*ago/)
  if (daysMatch) return Number(daysMatch[1]) * 24

  const weeksMatch = normalized.match(/(\d+)\s*w\s*ago/)
  if (weeksMatch) return Number(weeksMatch[1]) * 24 * 7

  return Number.POSITIVE_INFINITY
}

function isNowSpinning(friend) {
  return friend.activity?.toLowerCase().includes('now spinning')
}

function isRecentlyActive(friend) {
  return parseActivityHours(friend.activity) <= 72
}

function getPresence(friend) {
  if (isNowSpinning(friend)) {
    return {
      label: 'Now spinning',
      className:
        'inline-flex items-center rounded-full border border-orange-500/30 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent',
    }
  }

  if (isRecentlyActive(friend)) {
    return {
      label: 'Active',
      className:
        'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-100/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700',
    }
  }

  return {
    label: 'Offline',
    className:
      'inline-flex items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-black/55',
  }
}

function FriendAvatar({ friend, sizeClass = 'h-11 w-11' }) {
  return (
    <div
      className={[
        'relative shrink-0 overflow-hidden rounded-full border border-orange-500/20 bg-accent/15',
        sizeClass,
      ].join(' ')}
    >
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-accent">
        {friend.initials}
      </span>
      {friend.avatarSrc ? (
        <img
          src={friend.avatarSrc}
          alt={`${friend.name} avatar`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : null}
    </div>
  )
}

function FilterChip({ active, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        'shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:rounded-full md:px-3 md:py-1.5 md:text-xs',
        active
          ? 'border-orange-500/35 bg-accent/12 text-accent md:bg-accent/15'
          : 'border-black/10 bg-transparent text-muted hover:bg-black/5 md:bg-white/70 md:text-black/70 md:hover:bg-white',
        disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent md:hover:bg-white/70' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function FriendRow({ friend, onNavigate, onRemove, removeBusy = false }) {
  const presence = getPresence(friend)

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => onNavigate(friend.slug)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onNavigate(friend.slug)
        }
      }}
      className="group rounded-2xl border border-black/5 bg-white/50 p-4 shadow-sm backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:border-black/12 hover:shadow-md active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      aria-label={`View ${friend.name} profile`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <FriendAvatar friend={friend} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="mb-0 text-base font-semibold text-black/85">{friend.name}</p>
            <p className="mb-0 text-sm text-black/55">{friend.handle}</p>
            {friend.location ? (
              <p className="mb-0 inline-flex items-center gap-1 text-sm text-black/50">
                <MapPinLine className="h-3.5 w-3.5" />
                {friend.location}
              </p>
            ) : null}
          </div>

          {friend.note ? (
            <p className="mb-0 mt-1 truncate text-sm text-black/65">{friend.note}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-black/60">
            <span className="inline-flex items-center gap-1">
              <MusicNotesSimple className="h-3.5 w-3.5 text-black/45" />
              <span className="font-medium text-black/75">{friend.stats?.logs ?? 0}</span>
              logs
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-black/45" />
              <span className="font-medium text-black/75">
                {(friend.stats?.averageRating ?? 0).toFixed(1)}
              </span>
              avg
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-black/45" />
              <span className="font-medium text-black/75">{friend.stats?.streakDays ?? 0}d</span>
              streak
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <span className={presence.className}>{presence.label}</span>

          <details
            className="relative"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-black/10 bg-white/75 text-black/60 transition duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <DotsThreeOutlineVertical className="h-4 w-4" />
              <span className="sr-only">Open actions for {friend.name}</span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-md backdrop-blur">
              <button
                type="button"
                className="flex w-full rounded-lg px-2.5 py-2 text-left text-sm text-black/75 transition hover:bg-black/5"
                onClick={(event) => {
                  event.stopPropagation()
                  onNavigate(friend.slug)
                }}
              >
                View profile
              </button>
              <button
                type="button"
                className="flex w-full rounded-lg px-2.5 py-2 text-left text-sm text-black/75 transition hover:bg-black/5"
                disabled={removeBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(friend.friendUserId || friend.id)
                }}
              >
                {removeBusy ? 'Removing...' : 'Remove friend'}
              </button>
              <button
                type="button"
                className="flex w-full rounded-lg px-2.5 py-2 text-left text-sm text-black/75 transition hover:bg-black/5"
              >
                Mute activity
              </button>
            </div>
          </details>
        </div>
      </div>
    </article>
  )
}

function FriendGridCard({ friend }) {
  return (
    <Link
      to={`/friends/${friend.slug}`}
      className="group relative rounded-xl border border-black/8 bg-[var(--surface-1)] px-3 py-2.5 shadow-none transition duration-200 ease-out hover:border-black/15 hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-4 md:shadow-sm md:backdrop-blur md:hover:-translate-y-0.5 md:hover:border-black/12 md:hover:shadow-md md:active:translate-y-0.5"
    >
      <div className="md:hidden">
        <div className="flex items-start gap-2.5">
          <FriendAvatar friend={friend} sizeClass="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="mb-0 truncate text-[15px] font-semibold text-text">{friend.name}</p>
                <p className="mb-0 mt-0.5 truncate text-[11px] text-muted">
                  {friend.handle}
                  {friend.location ? ` - ${friend.location}` : ''}
                </p>
              </div>
              {isNowSpinning(friend) ? (
                <span className="inline-flex shrink-0 rounded-full border border-orange-500/30 bg-accent/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-accent">
                  Now spinning
                </span>
              ) : null}
            </div>

            <p className="mb-0 mt-1.5 overflow-hidden text-[12px] leading-snug text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {friend.bio || 'No bio added yet.'}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <MusicNotesSimple className="h-3.5 w-3.5" />
                {friend.stats?.logs ?? 0} logs
              </span>
              <span aria-hidden="true" className="text-black/30">
                |
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {(friend.stats?.averageRating ?? 0).toFixed(1)} avg
              </span>
              <span aria-hidden="true" className="text-black/30">
                |
              </span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                {friend.stats?.streakDays ?? 0}d streak
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        {isNowSpinning(friend) ? (
          <span className="absolute right-3 top-3 inline-flex rounded-full border border-orange-500/30 bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            Now spinning
          </span>
        ) : null}

        <div className="flex items-center gap-3">
          <FriendAvatar friend={friend} sizeClass="h-12 w-12" />
          <div className="min-w-0">
            <p className="mb-0 truncate text-base font-semibold text-black/85">{friend.name}</p>
            <p className="mb-0 truncate text-sm text-black/55">
              {friend.handle}
              {friend.location ? ` · ${friend.location}` : ''}
            </p>
          </div>
        </div>

        <p className="mb-0 mt-3 overflow-hidden text-sm leading-relaxed text-black/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {friend.bio || 'No bio added yet.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs text-black/65">
            <MusicNotesSimple className="h-3.5 w-3.5 text-black/45" />
            <span className="font-medium text-black/75">{friend.stats?.logs ?? 0}</span>
            logs
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs text-black/65">
            <Star className="h-3.5 w-3.5 text-black/45" />
            <span className="font-medium text-black/75">
              {(friend.stats?.averageRating ?? 0).toFixed(1)}
            </span>
            avg
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs text-black/65">
            <Flame className="h-3.5 w-3.5 text-black/45" />
            <span className="font-medium text-black/75">{friend.stats?.streakDays ?? 0}d</span>
            streak
          </span>
        </div>
      </div>
    </Link>
  )
}

function SearchResultAvatar({ user, sizeClass = 'h-11 w-11' }) {
  const username = typeof user?.username === 'string' ? user.username.trim() : ''
  const initials = username ? username.slice(0, 2).toUpperCase() : 'U'

  return (
    <div
      className={[
        'relative shrink-0 overflow-hidden rounded-full border border-orange-500/20 bg-accent/15',
        sizeClass,
      ].join(' ')}
    >
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-accent">
        {initials}
      </span>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${username || 'User'} avatar`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : null}
    </div>
  )
}

function SearchResultRow({ user, onNavigate }) {
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => onNavigate(user.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onNavigate(user.id)
        }
      }}
      className="group rounded-2xl border border-black/5 bg-white/50 p-4 shadow-sm backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:border-black/12 hover:shadow-md active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      aria-label={`View @${user.username} profile`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <SearchResultAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="mb-0 truncate text-base font-semibold text-black/85">
            @{user.username || 'unknown'}
          </p>
          <p className="mb-0 mt-1 text-sm text-black/55">Public profile</p>
        </div>
      </div>
    </article>
  )
}

function SearchResultGridCard({ user }) {
  return (
    <Link
      to={`/friends/${user.id}`}
      className="group relative rounded-xl border border-black/8 bg-[var(--surface-1)] px-3 py-2.5 shadow-none transition duration-200 ease-out hover:border-black/15 hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-4 md:shadow-sm md:backdrop-blur md:hover:-translate-y-0.5 md:hover:border-black/12 md:hover:shadow-md md:active:translate-y-0.5"
    >
      <div className="flex items-center gap-2.5 md:gap-3">
        <SearchResultAvatar user={user} sizeClass="h-10 w-10 md:h-12 md:w-12" />
        <div className="min-w-0">
          <p className="mb-0 truncate text-[15px] font-semibold text-text md:text-base md:text-black/85">
            @{user.username || 'unknown'}
          </p>
          <p className="mb-0 truncate text-[11px] text-muted md:text-sm md:text-black/55">
            Public profile
          </p>
        </div>
      </div>
    </Link>
  )
}

function FriendMobileRow({ friend }) {
  return (
    <Link
      to={`/friends/${friend.slug}`}
      className="block overflow-hidden rounded-xl border border-black/10 bg-[var(--surface-2)] px-3 py-3 shadow-subtle transition duration-200 ease-out hover:border-black/15 hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-2.5">
        <FriendAvatar friend={friend} sizeClass="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="mb-0 truncate text-[15px] font-semibold text-text">{friend.name}</p>
              <p className="mb-0 mt-0.5 truncate text-[11px] text-muted">
                {friend.handle}
                {friend.location ? ` - ${friend.location}` : ''}
              </p>
            </div>
            {isNowSpinning(friend) ? (
              <span className="inline-flex shrink-0 rounded-full border border-orange-500/30 bg-accent/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-accent">
                Now spinning
              </span>
            ) : null}
          </div>

          <p className="mb-0 mt-1.5 overflow-hidden text-[12px] leading-snug text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {friend.bio || 'No bio added yet.'}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <MusicNotesSimple className="h-3.5 w-3.5" />
              {friend.stats?.logs ?? 0} logs
            </span>
            <span className="h-1 w-1 rounded-full bg-black/25" aria-hidden="true" />
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {(friend.stats?.averageRating ?? 0).toFixed(1)} avg
            </span>
            <span className="h-1 w-1 rounded-full bg-black/25" aria-hidden="true" />
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              {friend.stats?.streakDays ?? 0}d streak
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SearchResultMobileRow({ user }) {
  return (
    <Link
      to={`/friends/${user.id}`}
      className="block overflow-hidden rounded-xl border border-black/10 bg-[var(--surface-2)] px-3 py-3 shadow-subtle transition duration-200 ease-out hover:border-black/15 hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-2.5">
        <SearchResultAvatar user={user} sizeClass="h-10 w-10" />
        <div className="min-w-0">
          <p className="mb-0 truncate text-[15px] font-semibold text-text">
            @{user.username || 'unknown'}
          </p>
          <p className="mb-0 mt-0.5 truncate text-[11px] text-muted">Public profile</p>
        </div>
      </div>
    </Link>
  )
}

export default function Friends() {
  const { isSignedIn, signOut } = useAuthStatus()
  const {
    friends: friendRows,
    incomingRequests,
    isLoading: friendsLoading,
    error: friendsError,
    actionError,
    actionKey,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriendsData({ isSignedIn })
  const navigate = useNavigate()
  const cachedProfile = readCachedProfile()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [navUser, setNavUser] = useState(() => ({
    username: cachedProfile?.username || '',
    avatarUrl: cachedProfile?.avatarUrl || '',
  }))
  const [filters, setFilters] = useState({
    nowSpinning: false,
    recentlyActive: false,
    sameCity: false,
  })
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'list'
    const storedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return storedMode === 'grid' ? 'grid' : 'list'
  })

  const homeCity = getCity(profileUser?.location)
  const friends = useMemo(
    () =>
      friendRows.map((row) => {
        const username = row?.friend?.username || 'unknown'
        const normalized = username.replace(/^@/, '')
        return {
          id: row?.friend?.id || row?.id || normalized,
          friendUserId: row?.friend?.id || '',
          slug: row?.friend?.id || normalized,
          name: normalized,
          handle: `@${normalized}`,
          location: '',
          activity: 'Offline',
          note: row?.friend?.bio || '',
          bio: row?.friend?.bio || '',
          initials: normalized.slice(0, 2).toUpperCase() || 'U',
          avatarSrc: row?.friend?.avatarUrl || '',
          stats: {
            logs: 0,
            averageRating: 0,
            streakDays: 0,
          },
        }
      }),
    [friendRows],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!homeCity && filters.sameCity) {
      setFilters((previous) => ({ ...previous, sameCity: false }))
    }
  }, [filters.sameCity, homeCity])

  useEffect(() => {
    const next = searchTerm.trim()
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(next)
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchTerm])

  useEffect(() => {
    let cancelled = false

    async function runSearch() {
      if (!debouncedSearchTerm) {
        setSearchResults([])
        setSearchError('')
        setSearchLoading(false)
        return
      }

      if (!isSignedIn) {
        setSearchResults([])
        setSearchError('Sign in to search users.')
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      setSearchError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const headers = await buildApiAuthHeaders()
        const query = encodeURIComponent(debouncedSearchTerm)
        const response = await fetch(`${apiBase}/api/profile/search?q=${query}`, { headers })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Failed to search users.')
        }

        const rows = Array.isArray(payload?.results) ? payload.results : []
        if (cancelled) return
        setSearchResults(
          rows.map((row) => ({
            id: row?.id ?? '',
            username: row?.username ?? '',
            avatarUrl: row?.avatarUrl || '',
          })),
        )
      } catch (error) {
        if (cancelled) return
        setSearchResults([])
        setSearchError(error?.message ?? 'Failed to search users.')
      } finally {
        if (!cancelled) {
          setSearchLoading(false)
        }
      }
    }

    runSearch()

    return () => {
      cancelled = true
    }
  }, [debouncedSearchTerm, isSignedIn])

  const hasSearchQuery = searchTerm.trim().length > 0

  const filteredFriends = useMemo(() => {
    const query = hasSearchQuery ? '' : searchTerm.trim().toLowerCase()

    return friends.filter((friend) => {
      const searchableText = [friend.name, friend.handle, friend.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (query && !searchableText.includes(query)) return false
      if (filters.nowSpinning && !isNowSpinning(friend)) return false
      if (filters.recentlyActive && !isRecentlyActive(friend)) return false
      if (filters.sameCity && getCity(friend.location) !== homeCity) return false

      return true
    })
  }, [filters, friends, hasSearchQuery, homeCity, searchTerm])

  const sortedFriends = useMemo(() => {
    const items = [...filteredFriends]

    items.sort((a, b) => {
      if (sortBy === 'logs') {
        return (b.stats?.logs ?? 0) - (a.stats?.logs ?? 0)
      }
      if (sortBy === 'rating') {
        return (b.stats?.averageRating ?? 0) - (a.stats?.averageRating ?? 0)
      }
      if (sortBy === 'streak') {
        return (b.stats?.streakDays ?? 0) - (a.stats?.streakDays ?? 0)
      }
      return parseActivityHours(a.activity) - parseActivityHours(b.activity)
    })

    return items
  }, [filteredFriends, sortBy])

  const groupedFriends = useMemo(() => {
    const nowSpinning = sortedFriends.filter((friend) => isNowSpinning(friend))
    const recentlyActive = sortedFriends.filter(
      (friend) => !isNowSpinning(friend) && isRecentlyActive(friend),
    )
    const allFriends = sortedFriends.filter(
      (friend) => !isNowSpinning(friend) && !isRecentlyActive(friend),
    )

    return [
      nowSpinning.length ? { title: 'Now spinning', items: nowSpinning } : null,
      recentlyActive.length ? { title: 'Recently active', items: recentlyActive } : null,
      allFriends.length ? { title: 'All friends', items: allFriends } : null,
    ].filter(Boolean)
  }, [sortedFriends])

  const hasNoFriends = friends.length === 0
  const hasNoResults = hasSearchQuery
    ? !searchLoading && !searchError && searchResults.length === 0
    : !hasNoFriends && sortedFriends.length === 0
  const hasActiveFilters = Object.values(filters).some(Boolean)

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

  const handleClearSearchAndFilters = () => {
    setSearchTerm('')
    setFilters({
      nowSpinning: false,
      recentlyActive: false,
      sameCity: false,
    })
  }

  return (
    <div className="min-h-screen">
      <div className="md:hidden">
        <HomeMobileHeader onOpenMenu={openSidebar} navUser={navUser} />
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
        <div className="space-y-4 md:space-y-6">
          <div className="hidden md:block">
            <Navbar className="w-full" />
          </div>
          <BackButton className="self-start !rounded-lg !px-2.5 !py-1 !text-[10px] md:!rounded-full md:!px-3 md:!py-1.5 md:!text-xs" />

          <header className="space-y-2.5 md:space-y-4">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between md:gap-4">
              <div>
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted md:mb-1 md:text-sm md:font-normal md:tracking-widest md:text-black/45">
                  Connections
                </p>
                <h1 className="mb-0 mt-0.5 text-[2rem] leading-[0.95] text-text md:mt-0 md:text-3xl md:font-semibold md:text-black/90">
                  Friends
                </h1>
                <p className="mb-0 mt-1 text-sm text-muted md:text-base md:text-black/60">
                  Your connections
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-muted shadow-none md:bg-white/70 md:px-3 md:py-1.5 md:text-xs md:text-black/65 md:shadow-sm">
                  <Users className="h-3.5 w-3.5" />
                  {friends.length} friends
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-muted shadow-none md:bg-white/70 md:px-3 md:py-1.5 md:text-xs md:text-black/65 md:shadow-sm">
                  <Clock className="h-3.5 w-3.5" />
                  {incomingRequests.length}{' '}
                  <span className="md:hidden">pending</span>
                  <span className="hidden md:inline">pending requests</span>
                </span>
              </div>
            </div>
          </header>

          {friendsError ? (
            <section className="rounded-xl border border-red-500/25 bg-red-50/55 p-3 text-sm text-red-700 md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-4 md:shadow-sm md:backdrop-blur">
              {friendsError}
            </section>
          ) : null}
          {actionError ? (
            <section className="rounded-xl border border-red-500/25 bg-red-50/55 p-3 text-sm text-red-700 md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-4 md:shadow-sm md:backdrop-blur">
              {actionError}
            </section>
          ) : null}

          <section className="space-y-3 border-b border-black/10 pb-3 md:space-y-4 md:rounded-2xl md:border md:border-black/5 md:bg-white/50 md:p-5 md:shadow-sm md:backdrop-blur">
            <div className="space-y-2.5 md:grid md:gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <label className="relative block">
                <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted md:left-3 md:h-4 md:w-4 md:text-black/40" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search users by username"
                  className="h-9 w-full rounded-lg border border-black/12 bg-[var(--surface-2)] pl-8 pr-3 text-[13px] text-text transition duration-200 ease-out placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:h-10 md:rounded-xl md:border-black/10 md:bg-white/70 md:pl-9 md:text-sm md:text-black/80 md:placeholder:text-black/40 md:hover:border-black/15"
                  aria-label="Search users by username"
                />
              </label>

              <div className="flex items-center gap-2">
                <label className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-black/12 bg-[var(--surface-2)] px-2.5 text-[12px] text-text md:h-10 md:flex-none md:rounded-xl md:border-black/10 md:bg-white/70 md:px-3 md:text-sm md:text-black/75">
                  <FunnelSimple className="h-3.5 w-3.5 text-muted md:h-4 md:w-4 md:text-black/45" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:text-xs md:text-black/50">
                    Sort
                  </span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent p-0 text-[13px] font-medium text-text focus:outline-none md:pr-1 md:text-sm md:text-black/80"
                    aria-label="Sort friends"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {hasActiveFilters || searchTerm ? (
                  <button
                    type="button"
                    onClick={handleClearSearchAndFilters}
                    className="h-9 shrink-0 rounded-md border border-black/10 bg-transparent px-2.5 text-[11px] font-semibold text-muted transition duration-200 ease-out hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:h-10 md:rounded-xl md:bg-white/70 md:px-3 md:text-xs md:text-black/65 md:hover:bg-white"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>

              <div className="hidden rounded-xl border border-black/10 bg-white/70 p-1 md:inline-flex">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={[
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
                    viewMode === 'list'
                      ? 'bg-accent/15 text-accent'
                      : 'text-black/60 hover:bg-white',
                  ].join(' ')}
                >
                  <ListBullets className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={[
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
                    viewMode === 'grid'
                      ? 'bg-accent/15 text-accent'
                      : 'text-black/60 hover:bg-white',
                  ].join(' ')}
                >
                  <SquaresFour className="h-3.5 w-3.5" />
                  Grid
                </button>
              </div>
            </div>

            <div className="-mx-1 overflow-x-auto pb-0.5 md:mx-0 md:overflow-visible md:pb-0">
              <div className="flex min-w-max items-center gap-1.5 px-1 md:min-w-0 md:flex-wrap md:gap-2 md:px-0">
                {FILTER_OPTIONS.map((filter) => (
                  <FilterChip
                    key={filter.key}
                    active={filters[filter.key]}
                    disabled={filter.key === 'sameCity' && !homeCity}
                    onClick={() =>
                      setFilters((previous) => ({
                        ...previous,
                        [filter.key]: !previous[filter.key],
                      }))
                    }
                  >
                    {filter.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </section>

          {!hasSearchQuery ? (
            <section className="space-y-3 border-b border-black/10 pb-3 md:space-y-4 md:rounded-2xl md:border md:border-black/5 md:bg-white/50 md:p-5 md:shadow-sm md:backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted md:mb-1 md:text-sm md:font-normal md:tracking-widest md:text-black/45">
                    Friend requests
                  </p>
                  <p className="mb-0 text-[12px] text-muted md:text-sm md:text-black/60">
                    Incoming requests waiting for your response
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-black/10 bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-muted md:bg-white/70 md:px-2.5 md:py-1 md:text-xs md:text-black/65">
                  {incomingRequests.length}
                </span>
              </div>

              {friendsLoading ? (
                <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                  Loading requests...
                </p>
              ) : incomingRequests.length === 0 ? (
                <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                  No incoming friend requests.
                </p>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((request) => {
                    const senderUsername = request?.sender?.username || 'unknown'
                    const senderId = request?.sender?.id || request?.senderId
                    const senderAvatarUrl = request?.sender?.avatarUrl || ''
                    const pendingAccept = actionKey === `accept:${request.id}`
                    const pendingReject = actionKey === `reject:${request.id}`
                    return (
                      <article
                        key={request.id}
                        className="group rounded-lg border border-black/10 bg-[var(--surface-1)] p-2.5 md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-4 md:shadow-sm md:backdrop-blur"
                      >
                        <div className="flex items-center justify-between gap-2.5 md:gap-3">
                          <div
                            className="flex min-w-0 flex-1 items-center gap-2.5"
                            onClick={() => navigate(`/friends/${encodeURIComponent(senderId)}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                navigate(`/friends/${encodeURIComponent(senderId)}`)
                              }
                            }}
                          >
                            <SearchResultAvatar
                              user={{ username: senderUsername, avatarUrl: senderAvatarUrl }}
                              sizeClass="h-9 w-9 md:h-11 md:w-11"
                            />
                            <div className="min-w-0 cursor-pointer">
                              <p className="mb-0 truncate text-[14px] font-semibold text-text md:text-base md:text-black/85">
                                @{senderUsername.replace(/^@/, '')}
                              </p>
                              <p className="mb-0 mt-0.5 text-[11px] text-muted md:mt-1 md:text-sm md:text-black/55">
                                Wants to be your friend
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <button
                              type="button"
                              disabled={pendingAccept || pendingReject}
                              onClick={() => acceptRequest(request.id).catch(() => {})}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-100/70 px-2.5 text-[11px] font-semibold text-emerald-700 transition duration-200 ease-out hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 md:h-9 md:gap-1.5 md:rounded-xl md:px-3 md:text-xs"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {pendingAccept ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              disabled={pendingAccept || pendingReject}
                              onClick={() => rejectRequest(request.id).catch(() => {})}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-500/35 bg-red-100/70 px-2.5 text-[11px] font-semibold text-red-700 transition duration-200 ease-out hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 md:h-9 md:gap-1.5 md:rounded-xl md:px-3 md:text-xs"
                            >
                              <X className="h-3.5 w-3.5" />
                              {pendingReject ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          ) : null}

          {hasSearchQuery ? (
            searchLoading ? (
              <section className="rounded-xl border border-black/10 bg-[var(--surface-1)] p-5 text-center md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-8 md:shadow-sm md:backdrop-blur">
                <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                  Searching users...
                </p>
              </section>
            ) : searchError ? (
              <section className="rounded-xl border border-black/10 bg-[var(--surface-1)] p-5 text-center md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-8 md:shadow-sm md:backdrop-blur">
                <h2 className="mb-1 text-xl font-semibold text-text md:text-black/85">
                  Search unavailable
                </h2>
                <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">{searchError}</p>
              </section>
            ) : hasNoResults ? (
              <section className="rounded-xl border border-black/10 bg-[var(--surface-1)] p-5 text-center md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-8 md:shadow-sm md:backdrop-blur">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-black/20 bg-[var(--surface-2)] md:mb-4 md:h-20 md:w-20 md:rounded-2xl md:bg-white/70">
                  <MagnifyingGlass className="h-6 w-6 text-muted md:h-8 md:w-8 md:text-black/40" />
                </div>
                <h2 className="mb-1 text-xl font-semibold text-text md:text-black/85">
                  No users found for "{searchTerm.trim()}"
                </h2>
                <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                  Try a different username query.
                </p>
              </section>
            ) : (
              <>
                <section className="space-y-2.5 md:hidden">
                  {searchResults.map((user) => (
                    <SearchResultMobileRow key={user.id} user={user} />
                  ))}
                </section>
                {viewMode === 'list' ? (
                  <section className="hidden md:block md:space-y-2">
                    {searchResults.map((user) => (
                      <SearchResultRow
                        key={user.id}
                        user={user}
                        onNavigate={(id) => navigate(`/friends/${id}`)}
                      />
                    ))}
                  </section>
                ) : (
                  <section className="hidden md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                    {searchResults.map((user) => (
                      <SearchResultGridCard key={user.id} user={user} />
                    ))}
                  </section>
                )}
              </>
            )
          ) : friendsLoading ? (
            <section className="rounded-xl border border-black/10 bg-[var(--surface-1)] p-5 text-center md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-8 md:shadow-sm md:backdrop-blur">
              <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                Loading friends...
              </p>
            </section>
          ) : hasNoFriends ? (
            <section className="rounded-xl border border-black/10 bg-[var(--surface-1)] p-5 text-center md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-8 md:shadow-sm md:backdrop-blur">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-black/20 bg-[var(--surface-2)] md:mb-4 md:h-20 md:w-20 md:rounded-2xl md:bg-white/70">
                <Users className="h-6 w-6 text-muted md:h-8 md:w-8 md:text-black/40" />
              </div>
              <h2 className="mb-1 text-xl font-semibold text-text md:text-black/85">No friends yet</h2>
              <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                Start building your circle and discover what others are spinning.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 md:mt-5">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-orange-500/35 bg-accent px-3 text-[12px] font-semibold text-[#1f130c] shadow-sm transition duration-200 ease-out hover:bg-[#ef6b2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:h-9 md:gap-1.5 md:rounded-xl md:px-4 md:text-sm"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Find friends
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white/75 px-3 text-[12px] font-semibold text-black/75 transition duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:h-9 md:rounded-xl md:px-4 md:text-sm"
                >
                  Invite
                </button>
              </div>
            </section>
          ) : hasNoResults ? (
            <section className="rounded-xl border border-black/10 bg-[var(--surface-1)] p-5 text-center md:rounded-2xl md:border-black/5 md:bg-white/50 md:p-8 md:shadow-sm md:backdrop-blur">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-black/20 bg-[var(--surface-2)] md:mb-4 md:h-20 md:w-20 md:rounded-2xl md:bg-white/70">
                <MagnifyingGlass className="h-6 w-6 text-muted md:h-8 md:w-8 md:text-black/40" />
              </div>
              <h2 className="mb-1 text-xl font-semibold text-text md:text-black/85">
                No results for "{searchTerm.trim()}"
              </h2>
              <p className="mb-0 text-[13px] text-muted md:text-sm md:text-black/60">
                Try another keyword or clear your filters.
              </p>
              <button
                type="button"
                onClick={handleClearSearchAndFilters}
                className="mt-4 inline-flex h-8 items-center rounded-lg border border-black/10 bg-white/75 px-3 text-[12px] font-semibold text-black/75 transition duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:mt-5 md:h-9 md:rounded-xl md:px-4 md:text-sm"
              >
                Clear filters
              </button>
            </section>
          ) : (
            <>
              <section className="space-y-2.5 md:hidden">
                {sortedFriends.map((friend) => (
                  <FriendMobileRow key={friend.id} friend={friend} />
                ))}
              </section>
              {viewMode === 'list' ? (
                <div className="hidden md:block md:space-y-6">
                  {groupedFriends.map((group) => (
                    <section key={group.title} className="space-y-2">
                      <div className="sticky top-20 z-10 py-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1.5 shadow-sm backdrop-blur">
                          <p className="mb-0 text-sm uppercase tracking-widest text-black/45">
                            {group.title}
                          </p>
                          <span className="text-xs font-semibold text-black/50">
                            {group.items.length}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((friend) => (
                          <FriendRow
                            key={friend.id}
                            friend={friend}
                            onNavigate={(slug) => navigate(`/friends/${slug}`)}
                            onRemove={(friendUserId) => removeFriend(friendUserId).catch(() => {})}
                            removeBusy={actionKey === `remove:${friend.friendUserId}`}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <section className="hidden md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                  {sortedFriends.map((friend) => (
                    <FriendGridCard key={friend.id} friend={friend} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

