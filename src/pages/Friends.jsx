import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DotsThreeOutlineVertical,
  Flame,
  FunnelSimple,
  ListBullets,
  MagnifyingGlass,
  MapPinLine,
  MusicNotesSimple,
  Plus,
  Sparkle,
  SquaresFour,
  Star,
  Users,
} from 'phosphor-react'
import BackButton from '../components/BackButton.jsx'
import Navbar from '../components/Navbar.jsx'
import { friends, profileUser } from '../data/profileData.js'

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
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
        active
          ? 'border-orange-500/35 bg-accent/15 text-accent'
          : 'border-black/10 bg-white/70 text-black/70 hover:bg-white',
        disabled ? 'cursor-not-allowed opacity-45 hover:bg-white/70' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function FriendRow({ friend, onNavigate }) {
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
              <span className="font-medium text-black/75">
                {friend.stats?.streakDays ?? 0}d
              </span>
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
              >
                Remove friend
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
      className="group relative rounded-2xl border border-black/5 bg-white/50 p-4 shadow-sm backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:border-black/12 hover:shadow-md active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
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
    </Link>
  )
}

export default function Friends() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!homeCity && filters.sameCity) {
      setFilters((previous) => ({ ...previous, sameCity: false }))
    }
  }, [filters.sameCity, homeCity])

  const filteredFriends = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

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
  }, [filters, homeCity, searchTerm])

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
      recentlyActive.length
        ? { title: 'Recently active', items: recentlyActive }
        : null,
      allFriends.length ? { title: 'All friends', items: allFriends } : null,
    ].filter(Boolean)
  }, [sortedFriends])

  const hasNoFriends = friends.length === 0
  const hasNoResults = !hasNoFriends && sortedFriends.length === 0
  const hasActiveFilters = Object.values(filters).some(Boolean)

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
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Navbar className="w-full" />
          <BackButton className="self-start" />

          <header className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-1 text-sm uppercase tracking-widest text-black/45">
                  Connections
                </p>
                <h1 className="mb-0 text-3xl font-semibold text-black/90">Friends</h1>
                <p className="mb-0 mt-1 text-base text-black/60">Your connections</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-black/65 shadow-sm">
                  <Users className="h-3.5 w-3.5" />
                  {friends.length} friends
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-black/65 shadow-sm">
                  <Sparkle className="h-3.5 w-3.5" />
                  Mock profiles enabled
                </span>
              </div>
            </div>
          </header>

          <section className="space-y-4 rounded-2xl border border-black/5 bg-white/50 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <label className="relative block">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, handle, or location"
                  className="h-10 w-full rounded-xl border border-black/10 bg-white/70 pl-9 pr-3 text-sm text-black/80 transition duration-200 ease-out placeholder:text-black/40 hover:border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  aria-label="Search friends by name, handle, or location"
                />
              </label>

              <label className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-sm text-black/75">
                <FunnelSimple className="h-4 w-4 text-black/45" />
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
                  Sort
                </span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="h-10 bg-transparent pr-1 text-sm font-medium text-black/80 focus:outline-none"
                  aria-label="Sort friends"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="inline-flex rounded-xl border border-black/10 bg-white/70 p-1">
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

            <div className="flex flex-wrap items-center gap-2">
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
              {hasActiveFilters || searchTerm ? (
                <button
                  type="button"
                  onClick={handleClearSearchAndFilters}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-black/65 transition duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Clear all
                </button>
              ) : null}
            </div>
          </section>

          {hasNoFriends ? (
            <section className="rounded-2xl border border-black/5 bg-white/50 p-8 text-center shadow-sm backdrop-blur">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-black/20 bg-white/70">
                <Users className="h-8 w-8 text-black/40" />
              </div>
              <h2 className="mb-1 text-xl font-semibold text-black/85">No friends yet</h2>
              <p className="mb-0 text-sm text-black/60">
                Start building your circle and discover what others are spinning.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-orange-500/35 bg-accent px-4 text-sm font-semibold text-[#1f130c] shadow-sm transition duration-200 ease-out hover:bg-[#ef6b2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  <Plus className="h-4 w-4" />
                  Find friends
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-xl border border-black/10 bg-white/75 px-4 text-sm font-semibold text-black/75 transition duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Invite
                </button>
              </div>
            </section>
          ) : hasNoResults ? (
            <section className="rounded-2xl border border-black/5 bg-white/50 p-8 text-center shadow-sm backdrop-blur">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-black/20 bg-white/70">
                <MagnifyingGlass className="h-8 w-8 text-black/40" />
              </div>
              <h2 className="mb-1 text-xl font-semibold text-black/85">
                No results for "{searchTerm.trim()}"
              </h2>
              <p className="mb-0 text-sm text-black/60">
                Try another keyword or clear your filters.
              </p>
              <button
                type="button"
                onClick={handleClearSearchAndFilters}
                className="mt-5 inline-flex h-9 items-center rounded-xl border border-black/10 bg-white/75 px-4 text-sm font-semibold text-black/75 transition duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                Clear filters
              </button>
            </section>
          ) : viewMode === 'list' ? (
            <div className="space-y-6">
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
                        key={friend.handle}
                        friend={friend}
                        onNavigate={(slug) => navigate(`/friends/${slug}`)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedFriends.map((friend) => (
                <FriendGridCard key={friend.handle} friend={friend} />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
