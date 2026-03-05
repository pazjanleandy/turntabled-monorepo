import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import BackButton from '../components/BackButton.jsx'
import AlbumGridItem from '../components/logged/AlbumGridItem.jsx'
import LoggedToolbar from '../components/logged/LoggedToolbar.jsx'
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
  const { isSignedIn } = useAuthStatus()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState('')
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
  const hasActiveFilters =
    ratingFilter !== 'all' ||
    decadeFilter !== 'all' ||
    genreFilter !== 'all' ||
    statusFilter !== 'all'

  useEffect(() => {
    if (!isSignedIn) {
      setItems([])
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

  const gridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="grid gap-y-3 md:grid-cols-[180px_1fr_auto] md:items-start md:gap-x-2">
            <div className="flex items-center justify-between gap-3 md:hidden">
              {isSignedIn ? (
                <Link
                  to="/profile"
                  className="inline-flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  {currentAvatarUrl ? (
                    <img
                      src={currentAvatarUrl}
                      alt={`${currentDisplayName} avatar`}
                      className="h-8 w-8 rounded-full border border-black/10 object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-xs font-semibold uppercase text-accent">
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
              ) : (
                <div />
              )}
              <div className="shrink-0 text-right">
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {visibleLogged.length} shown
                </span>
                {hasActiveFilters ? (
                  <span className="block text-[11px] text-muted">Filtered results</span>
                ) : null}
              </div>
            </div>

            <div className="hidden md:block md:col-start-1 md:row-span-2">
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

            <div className="text-left md:hidden">
              <h1 className="mb-1 text-2xl text-text">Logged</h1>
              <p className="mb-0 max-w-prose text-sm text-muted">Cover-first view of your logged albums.</p>
            </div>

            <div className="hidden md:block md:col-start-2 md:row-start-1">
              <h1 className="mb-0 text-2xl text-text">Logged</h1>
            </div>

            <div className="hidden text-right md:block md:col-start-3 md:row-start-1 md:pt-0.5">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {visibleLogged.length} shown
              </span>
              {hasActiveFilters ? (
                <span className="mt-1 block text-[11px] text-muted">Filtered results</span>
              ) : null}
            </div>

            <p className="hidden md:col-start-2 md:row-start-2 md:mb-0 md:block md:max-w-prose md:text-sm md:text-muted">
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
            <Link to="/explore" className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-900">
              Explore albums
            </Link>
          </section>
        ) : (
          <>
            <div className="sticky top-3 z-20">
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
              <section className="card vinyl-texture">
                <p className="mb-0 text-sm text-muted">
                  No logged albums match your current filters.
                </p>
              </section>
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
  )
}
