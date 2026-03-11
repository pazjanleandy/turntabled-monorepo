import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FunnelSimple, MusicNotes, X } from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import BackButton from '../components/BackButton.jsx'
import AlbumGridItem from '../components/logged/AlbumGridItem.jsx'
import LoggedToolbar from '../components/logged/LoggedToolbar.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'
import { readCachedProfile } from '../lib/profileClient.js'

const SORT_OPTIONS = [
  { value: 'date-logged-desc', label: 'Date logged (newest)' },
  { value: 'date-logged-asc', label: 'Date logged (oldest)' },
  { value: 'release-date-desc', label: 'Release date (newest)' },
  { value: 'release-date-asc', label: 'Release date (oldest)' },
  { value: 'rating-desc', label: 'Rating (high to low)' },
  { value: 'rating-asc', label: 'Rating (low to high)' },
  { value: 'title-asc', label: 'Album title (A-Z)' },
]

function parseYearCandidate(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value)
  }
  const match = String(value).match(/\d{4}/)
  return match ? Number.parseInt(match[0], 10) : 0
}

function getReleaseYear(item) {
  return (
    parseYearCandidate(item?.releaseYear) ||
    parseYearCandidate(item?.releaseDate) ||
    parseYearCandidate(item?.year)
  )
}

function getLoggedTime(item) {
  const raw = item?.listenedOn ?? item?.addedAt ?? item?.updatedAt ?? ''
  const timestamp = Date.parse(raw)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getReleaseTime(item) {
  const releaseYear = getReleaseYear(item)
  if (releaseYear) {
    return Date.UTC(releaseYear, 0, 1)
  }
  return 0
}

function getItemDecade(item) {
  const loggedTime = getLoggedTime(item)
  const loggedYear = loggedTime ? new Date(loggedTime).getUTCFullYear() : 0
  const year = getReleaseYear(item) || loggedYear
  if (!year) return 0
  return Math.floor(year / 10) * 10
}

function getItemGenres(item) {
  if (Array.isArray(item?.genres)) return item.genres.filter(Boolean)
  if (typeof item?.genre === 'string' && item.genre.trim()) return [item.genre.trim()]
  return []
}

function getItemStatus(item) {
  const status = item?.status ?? ''
  return typeof status === 'string' ? status.trim().toLowerCase() : ''
}

function getAvatarInitials(value = '') {
  const normalized = String(value).trim().replace(/^@/, '')
  if (!normalized) return 'U'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export default function Backlog() {
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [ratingFilter, setRatingFilter] = useState('all')
  const [decadeFilter, setDecadeFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-logged-desc')
  const cachedProfile = readCachedProfile()
  const currentDisplayName =
    cachedProfile?.fullName?.trim() || cachedProfile?.username?.trim() || 'You'
  const currentHandle = cachedProfile?.username?.trim()
    ? `@${cachedProfile.username.trim().replace(/^@/, '')}`
    : ''
  const currentAvatarUrl =
    typeof cachedProfile?.avatarUrl === 'string' ? cachedProfile.avatarUrl.trim() : ''
  const currentInitials = getAvatarInitials(currentDisplayName || currentHandle || 'You')
  const navUsername = currentHandle.replace(/^@/, '') || currentDisplayName || 'you'
  const navUser = {
    username: navUsername,
    avatarUrl: currentAvatarUrl,
  }
  const hasActiveFilters =
    ratingFilter !== 'all' ||
    decadeFilter !== 'all' ||
    genreFilter !== 'all' ||
    statusFilter !== 'all'
  const mobileFilterCount =
    (ratingFilter !== 'all' ? 1 : 0) +
    (decadeFilter !== 'all' ? 1 : 0) +
    (genreFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0)

  useEffect(() => {
    if (!isSignedIn) {
      setItems([])
      setIsSidebarOpen(false)
      setIsMobileFiltersOpen(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const loadBacklog = async () => {
      setIsLoading(true)
      setError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        const response = await fetch(`${apiBase}/api/backlog?page=1&limit=50`, {
          headers: authHeaders,
          signal: controller.signal,
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Failed to load logged albums.')
        }

        if (!cancelled) {
          setItems(Array.isArray(payload?.items) ? payload.items : [])
        }
      } catch (loadErr) {
        if (loadErr?.name === 'AbortError') return
        if (!cancelled) {
          setItems([])
          setError(loadErr?.message ?? 'Unable to load logged albums.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadBacklog()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSidebarOpen && !isMobileFiltersOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSidebarOpen, isMobileFiltersOpen])

  useEffect(() => {
    if (!isMobileFiltersOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMobileFiltersOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileFiltersOpen])

  const loggedCollection = useMemo(() => {
    // Temporary source until a dedicated /logged endpoint is introduced.
    return Array.isArray(items) ? items : []
  }, [items])

  const decadeOptions = useMemo(() => {
    const uniqueDecades = new Set()
    for (const item of loggedCollection) {
      const decade = getItemDecade(item)
      if (decade) uniqueDecades.add(decade)
    }
    return Array.from(uniqueDecades)
      .sort((a, b) => b - a)
      .map((decade) => ({ value: String(decade), label: `${decade}s` }))
  }, [loggedCollection])

  const genreOptions = useMemo(() => {
    const uniqueGenres = new Map()
    for (const item of loggedCollection) {
      for (const genre of getItemGenres(item)) {
        const key = genre.toLowerCase()
        if (!uniqueGenres.has(key)) {
          uniqueGenres.set(key, genre)
        }
      }
    }
    return Array.from(uniqueGenres.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [loggedCollection])

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Map()
    for (const item of loggedCollection) {
      const status = getItemStatus(item)
      if (!status) continue
      if (!uniqueStatuses.has(status)) {
        const label = status.charAt(0).toUpperCase() + status.slice(1)
        uniqueStatuses.set(status, label)
      }
    }
    return Array.from(uniqueStatuses.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [loggedCollection])

  const visibleLogged = useMemo(() => {
    const filtered = loggedCollection.filter((item) => {
      const ratingValue = Number(ratingFilter)
      if (ratingFilter !== 'all' && Number.isFinite(ratingValue)) {
        const itemRating = Number(item?.rating ?? 0)
        if (itemRating < ratingValue) return false
      }

      if (decadeFilter !== 'all') {
        const decade = getItemDecade(item)
        if (!decade || String(decade) !== decadeFilter) return false
      }

      if (genreFilter !== 'all') {
        const hasGenre = getItemGenres(item).some((genre) => genre.toLowerCase() === genreFilter)
        if (!hasGenre) return false
      }

      if (statusFilter !== 'all') {
        const status = getItemStatus(item)
        if (status !== statusFilter) return false
      }

      return true
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sortBy === 'date-logged-asc') return getLoggedTime(a) - getLoggedTime(b)
      if (sortBy === 'date-logged-desc') return getLoggedTime(b) - getLoggedTime(a)
      if (sortBy === 'release-date-desc') return getReleaseTime(b) - getReleaseTime(a)
      if (sortBy === 'release-date-asc') return getReleaseTime(a) - getReleaseTime(b)
      if (sortBy === 'rating-desc') return Number(b?.rating ?? 0) - Number(a?.rating ?? 0)
      if (sortBy === 'rating-asc') return Number(a?.rating ?? 0) - Number(b?.rating ?? 0)
      if (sortBy === 'title-asc') {
        return String(a?.albumTitleRaw ?? a?.title ?? '').localeCompare(String(b?.albumTitleRaw ?? b?.title ?? ''))
      }
      return 0
    })

    return sorted
  }, [loggedCollection, ratingFilter, decadeFilter, genreFilter, statusFilter, sortBy])

  const updateRating = async (itemId, rating) => {
    if (!itemId || busyItemId) return
    setBusyItemId(itemId)
    setError('')

    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const response = await fetch(`${apiBase}/api/backlog/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ rating }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to update logged rating.')
      }

      const nextItem = payload?.item
      setItems((current) =>
        current.map((item) => (item.id === itemId ? { ...item, rating: nextItem?.rating ?? rating } : item)),
      )
    } catch (updateErr) {
      setError(updateErr?.message ?? 'Unable to update logged rating.')
    } finally {
      setBusyItemId('')
    }
  }

  const removeItem = async (itemId) => {
    if (!itemId || busyItemId) return
    setBusyItemId(itemId)
    setError('')

    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const response = await fetch(`${apiBase}/api/backlog?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message ?? 'Failed to remove logged album.')
      }
      setItems((current) => current.filter((item) => item.id !== itemId))
    } catch (deleteErr) {
      setError(deleteErr?.message ?? 'Unable to remove logged album.')
    } finally {
      setBusyItemId('')
    }
  }

  const handleEditRating = async (item) => {
    const itemId = item?.id
    if (!itemId || busyItemId) return

    const raw = window.prompt('Set a rating from 1 to 5.', String(item?.rating ?? ''))
    if (raw == null) return

    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
      setError('Rating must be a number between 1 and 5.')
      return
    }

    const nextRating = Math.round(parsed * 2) / 2
    await updateRating(itemId, nextRating)
  }

  const resetFilters = () => {
    setRatingFilter('all')
    setDecadeFilter('all')
    setGenreFilter('all')
    setStatusFilter('all')
  }

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleMobileSignOut = () => {
    signOut()
    closeSidebar()
    navigate('/')
  }

  const gridClass = 'grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:gap-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/82 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-4 sm:px-6">
          {isSignedIn ? (
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={openSidebar}
              className="inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-700 shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M1 1H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M1 6H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M1 11H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <span className="inline-flex h-8 w-8" aria-hidden="true" />
          )}

          <Link
            to={isSignedIn ? '/home' : '/'}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
              <MusicNotes size={13} weight="bold" />
            </span>
            Turntabled
          </Link>

          {isSignedIn ? (
            <Link
              to="/profile"
              aria-label="Open profile"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white/70 p-0 text-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={`${currentDisplayName} avatar`}
                  className="h-6 w-6 rounded-md object-cover"
                />
              ) : (
                <span className="text-[10px] font-bold uppercase text-accent">{currentInitials}</span>
              )}
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/70 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text transition hover:bg-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {isSignedIn ? (
        <div className="md:hidden">
          <HomeMobileSidebar
            isOpen={isSidebarOpen}
            navUser={navUser}
            isSignedIn={isSignedIn}
            onClose={closeSidebar}
            onSignOut={handleMobileSignOut}
          />
        </div>
      ) : null}

      <div
        className={[
          'fixed inset-0 z-50 transition md:hidden',
          isMobileFiltersOpen ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
        aria-hidden={!isMobileFiltersOpen}
      >
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setIsMobileFiltersOpen(false)}
          className={[
            'absolute inset-0 bg-slate-950/45 transition',
            isMobileFiltersOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />

        <section
          aria-label="Logged album filters"
          className={[
            'absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200',
            isMobileFiltersOpen ? 'translate-y-0' : 'translate-y-[105%]',
          ].join(' ')}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Refine collection
              </p>
              <h3 className="mb-0 mt-1 text-lg text-text">Filters</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              aria-label="Close filters"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/75 p-0 text-muted transition hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-text">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted">
                Rating
              </span>
              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-semibold text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
                <option value="2">2+ stars</option>
                <option value="1">1+ stars</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-text">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted">
                Decade
              </span>
              <select
                value={decadeFilter}
                onChange={(event) => setDecadeFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-semibold text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">All decades</option>
                {decadeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-text">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted">
                Genre
              </span>
              <select
                value={genreFilter}
                onChange={(event) => setGenreFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-semibold text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">All genres</option>
                {genreOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-text">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-semibold text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-orange-500/45 bg-accent px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1f130c] transition hover:bg-[#ef6b2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              Apply
            </button>
          </div>
        </section>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 md:px-10 lg:px-16">
        <div className="space-y-6 md:space-y-10">
          <div className="hidden md:block">
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          </div>
          <div className="hidden md:block">
            <BackButton className="self-start" />
          </div>

          <section className="border-b border-black/10 pb-4 pt-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-text shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                aria-label="Go back"
              >
                <ArrowLeft size={13} weight="bold" />
                Back
              </button>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {visibleLogged.length} shown
              </span>
            </div>

            <div className="mt-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Your collection
                </p>
                <h1 className="mb-0 mt-1 text-[1.9rem] leading-none text-text">Logged</h1>
                <p className="mb-0 mt-1 text-[12px] text-muted">Cover-first view of your logged albums.</p>
              </div>

              {isSignedIn ? (
                <Link
                  to="/profile"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/68 px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  {currentAvatarUrl ? (
                    <img
                      src={currentAvatarUrl}
                      alt={`${currentDisplayName} avatar`}
                      className="h-7 w-7 rounded-full border border-black/10 object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-[10px] font-semibold uppercase text-accent">
                      {currentInitials}
                    </span>
                  )}
                  <span className="max-w-[96px] truncate text-[11px] font-semibold text-text">
                    {currentDisplayName}
                  </span>
                </Link>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <p className="mb-0 mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Filtered results
              </p>
            ) : null}
          </section>

          <section className="hidden md:block card vinyl-texture">
            <div className="grid gap-y-3 md:grid-cols-[180px_1fr_auto] md:items-start md:gap-x-2">
              <div className="md:col-start-1 md:row-span-2">
                {isSignedIn ? (
                  <Link
                    to="/profile"
                    className="inline-flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    {currentAvatarUrl ? (
                      <img
                        src={currentAvatarUrl}
                        alt={`${currentDisplayName} avatar`}
                        className="h-10 w-10 rounded-full border border-black/10 object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-sm font-semibold uppercase text-accent">
                        {currentInitials}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-text">{currentDisplayName}</span>
                      {currentHandle ? (
                        <span className="block truncate text-[11px] text-muted">{currentHandle}</span>
                      ) : null}
                    </span>
                  </Link>
                ) : null}
              </div>

              <div className="md:col-start-2 md:row-start-1">
                <h1 className="mb-0 text-2xl text-text">Logged</h1>
              </div>

              <div className="text-right md:col-start-3 md:row-start-1 md:pt-0.5">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {visibleLogged.length} shown
                </span>
                {hasActiveFilters ? (
                  <span className="mt-1 block text-[11px] text-muted">Filtered results</span>
                ) : null}
              </div>

              <p className="md:col-start-2 md:row-start-2 md:mb-0 md:max-w-prose md:text-sm md:text-muted">
                Cover-first view of your logged albums.
              </p>
            </div>
          </section>

          {!isSignedIn ? (
            <section className="card vinyl-texture">
              <p className="mb-0 text-sm text-muted">Sign in to view your logged albums.</p>
            </section>
          ) : isLoading ? (
            <section className="card vinyl-texture">
              <p className="mb-0 text-sm text-muted">Loading your logged albums...</p>
            </section>
          ) : !loggedCollection.length ? (
            <section className="card vinyl-texture">
              <p className="mb-2 text-sm text-muted">No albums logged yet.</p>
              <Link
                to="/explore"
                className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-900"
              >
                Explore albums
              </Link>
            </section>
          ) : (
            <>
              <div className="sticky top-[3.15rem] z-20 space-y-2 md:hidden">
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="logged-mobile-sort">
                    Sort albums
                  </label>
                  <select
                    id="logged-mobile-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-full border border-black/10 bg-white/72 px-3 text-[12px] font-semibold text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/72 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text shadow-subtle transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  >
                    <FunnelSimple size={13} weight="bold" className="text-accent" />
                    Filters
                    {mobileFilterCount > 0 ? (
                      <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-[#1f130c]">
                        {mobileFilterCount}
                      </span>
                    ) : null}
                  </button>
                </div>

                {hasActiveFilters ? (
                  <div className="flex items-center justify-between px-0.5">
                    <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {mobileFilterCount} active filter{mobileFilterCount === 1 ? '' : 's'}
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="border-0 bg-transparent p-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent transition hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="sticky top-3 z-20 hidden md:block">
                <LoggedToolbar
                  ratingFilter={ratingFilter}
                  onRatingFilterChange={setRatingFilter}
                  decadeFilter={decadeFilter}
                  onDecadeFilterChange={setDecadeFilter}
                  genreFilter={genreFilter}
                  onGenreFilterChange={setGenreFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  decadeOptions={decadeOptions}
                  genreOptions={genreOptions}
                  statusOptions={statusOptions}
                  sortOptions={SORT_OPTIONS}
                />
              </div>

              {visibleLogged.length === 0 ? (
                <>
                  <section className="rounded-xl border border-black/10 bg-white/60 px-3.5 py-3 text-[13px] text-muted md:hidden">
                    No logged albums match your current filters.
                  </section>
                  <section className="hidden md:block card vinyl-texture">
                    <p className="mb-0 text-sm text-muted">
                      No logged albums match your current filters.
                    </p>
                  </section>
                </>
              ) : (
                <section className={gridClass}>
                  {visibleLogged.map((item, index) => {
                    const key = item?.id ?? `${item?.albumTitleRaw ?? 'album'}-${item?.artistNameRaw ?? 'artist'}-${index}`
                    return (
                      <AlbumGridItem
                        key={key}
                        item={item}
                        isBusy={busyItemId === item?.id}
                        onEditRating={handleEditRating}
                        onRemove={(entry) => removeItem(entry?.id)}
                      />
                    )
                  })}
                </section>
              )}
            </>
          )}

          {error ? <p className="mb-0 text-sm font-semibold text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
