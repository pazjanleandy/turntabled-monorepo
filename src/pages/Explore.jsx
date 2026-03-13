import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FunnelSimple, MagnifyingGlass, MusicNotes, UserCircle, X } from 'phosphor-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import BackButton from '../components/BackButton.jsx'
import ExploreAlbumTile from '../components/explore/ExploreAlbumTile.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import {
  PROFILE_EVENT_NAME,
  emitProfileUpdated,
  fetchCurrentProfile,
  readCachedProfile,
} from '../lib/profileClient.js'
import { supabase } from '../supabase.js'

const FILTER_OPTIONS = [
  { value: 'a-z', label: 'Alphabetical A-Z' },
  { value: 'z-a', label: 'Alphabetical Z-A' },
  { value: 'user-rating', label: 'User rating' },
  { value: 'personal-rating', label: 'Personal rating' },
  { value: 'popular-year', label: 'Popular year' },
  { value: 'popular-week', label: 'Popular week' },
]
const PAGE_SIZE = 48

function parseYearCandidate(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  const match = String(value).match(/\d{4}/)
  return match ? Number.parseInt(match[0], 10) : 0
}

function parsePositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

function normalizeGenreKey(value) {
  const source = String(value ?? '').trim()
  if (!source) return ''

  return source
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[/_+\-&]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function formatGenreLabelFromKey(value) {
  const normalized = normalizeGenreKey(value)
  if (!normalized) return ''
  return normalized
    .split(' ')
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ''))
    .join(' ')
}

export default function Explore() {
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [navUser, setNavUser] = useState(() => {
    const cached = readCachedProfile()
    return {
      username: cached?.username || '',
      avatarUrl: cached?.avatarUrl || '',
    }
  })
  const [query, setQuery] = useState('')
  const [decadeFilter, setDecadeFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState(() => {
    const initialGenre = normalizeGenreKey(searchParams.get('genre'))
    return initialGenre || 'all'
  })
  const [apiAlbums, setApiAlbums] = useState([])
  const [totalAlbums, setTotalAlbums] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const activeRequestIdRef = useRef(0)
  const fallbackFilter = FILTER_OPTIONS[0]?.value ?? 'a-z'
  const activeFilter = searchParams.get('filter') ?? fallbackFilter
  const activePage = parsePositiveInt(searchParams.get('page'), 1)
  const activeGenreParam = searchParams.get('genre') ?? ''

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
        // Keep cached value on fetch failure.
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

  const handlePageChange = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages)
    if (safePage === activePage) return

    const nextParams = new URLSearchParams(searchParams)
    if (safePage === 1) {
      nextParams.delete('page')
    } else {
      nextParams.set('page', String(safePage))
    }
    setSearchParams(nextParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mapApiAlbum = useCallback((item) => {
    const albumId =
      typeof item?.albumId === 'string' && item.albumId.trim()
        ? item.albumId.trim()
        : null
    if (!albumId) return null

    const title = item?.albumTitle ?? 'Unknown Album'
    const artist = item?.artistName ?? 'Unknown Artist'
    const sourceGenres = Array.isArray(item?.genres) ? item.genres : []
    const genres = sourceGenres
      .map((value) => String(value).trim())
      .filter(Boolean)

    const releaseYear =
      parseYearCandidate(item?.releaseDate) ||
      parseYearCandidate(item?.lastSyncedAt) ||
      0

    return {
      id: albumId,
      albumId,
      title,
      artist,
      cover: item?.coverArtUrl || '/album/am.jpg',
      year: releaseYear ? String(releaseYear) : '0',
      genres,
    }
  }, [])

  const resetExploreState = useCallback(() => {
    activeRequestIdRef.current += 1
    setApiAlbums([])
    setTotalAlbums(0)
    setIsLoading(false)
    setLoadError('')
  }, [])

  useEffect(() => {
    if (!isSignedIn) {
      resetExploreState()
      return undefined
    }

    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    const controller = new AbortController()
    let cancelled = false

    const loadPage = async () => {
      setIsLoading(true)
      setLoadError('')
      setApiAlbums([])
      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const username = window.localStorage.getItem('lastfmUsername')
        const headers = {}
        const { data } = await supabase.auth.getSession()
        const userId = data?.session?.user?.id

        if (userId) {
          headers['x-user-id'] = userId
        }
        if (username) {
          headers['x-username'] = username
        }

        const normalizedFilter = String(activeFilter || fallbackFilter).trim().toLowerCase() || fallbackFilter
        const response = await fetch(
          `${apiBase}/api/explore?page=${activePage}&limit=${PAGE_SIZE}&filter=${encodeURIComponent(normalizedFilter)}`,
          {
          headers,
          signal: controller.signal,
          },
        )
        if (!response.ok) {
          throw new Error('Failed to load explore albums.')
        }

        const payload = await response.json()
        if (cancelled || controller.signal.aborted || requestId !== activeRequestIdRef.current) return

        const items = Array.isArray(payload?.items) ? payload.items : []
        const mappedItems = items.map(mapApiAlbum).filter(Boolean)
        const total = Number(payload?.total)
        const safeTotal = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0

        setApiAlbums(mappedItems)
        setTotalAlbums(safeTotal)
        setLoadError('')
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (cancelled || requestId !== activeRequestIdRef.current) return
        setApiAlbums([])
        setLoadError(error?.message ?? 'Unable to load albums.')
      } finally {
        if (!cancelled && requestId === activeRequestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    loadPage()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSignedIn, activePage, activeFilter, fallbackFilter, mapApiAlbum, resetExploreState])

  useEffect(() => {
    const nextGenre = normalizeGenreKey(activeGenreParam) || 'all'
    setGenreFilter((prev) => (prev === nextGenre ? prev : nextGenre))
  }, [activeGenreParam])

  const albums = useMemo(() => apiAlbums, [apiAlbums])

  const decadeOptions = useMemo(() => {
    const decades = new Set()
    for (const item of albums) {
      const year = parseYearCandidate(item?.year)
      if (!year) continue
      decades.add(Math.floor(year / 10) * 10)
    }
    return Array.from(decades)
      .sort((a, b) => b - a)
      .map((decade) => ({ value: String(decade), label: `${decade}s` }))
  }, [albums])

  const genreOptions = useMemo(() => {
    const genres = new Map()
    for (const item of albums) {
      const values = Array.isArray(item?.genres) ? item.genres : []
      for (const genre of values) {
        const normalized = String(genre).trim()
        const key = normalizeGenreKey(normalized)
        if (!normalized || !key) continue
        if (!genres.has(key)) {
          genres.set(key, formatGenreLabelFromKey(normalized))
        }
      }
    }

    if (genreFilter !== 'all' && !genres.has(genreFilter)) {
      genres.set(genreFilter, formatGenreLabelFromKey(activeGenreParam || genreFilter))
    }

    return Array.from(genres.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [albums, genreFilter, activeGenreParam])

  const selectedDecadeLabel = useMemo(() => {
    if (decadeFilter === 'all') return ''
    return decadeOptions.find((option) => option.value === decadeFilter)?.label ?? ''
  }, [decadeFilter, decadeOptions])

  const selectedGenreLabel = useMemo(() => {
    if (genreFilter === 'all') return ''
    return (
      genreOptions.find((option) => option.value === genreFilter)?.label ??
      formatGenreLabelFromKey(activeGenreParam || genreFilter)
    )
  }, [genreFilter, genreOptions, activeGenreParam])

  const selectedSortLabel = useMemo(() => {
    return FILTER_OPTIONS.find((option) => option.value === activeFilter)?.label ?? ''
  }, [activeFilter])

  const mobileFilterCount =
    (decadeFilter !== 'all' ? 1 : 0) +
    (genreFilter !== 'all' ? 1 : 0) +
    (activeFilter !== fallbackFilter ? 1 : 0)

  const visibleAlbums = useMemo(() => {
    const term = query.trim().toLowerCase()
    const hasInlineClientFilters = term.length > 0 || decadeFilter !== 'all' || genreFilter !== 'all'
    const filtered = albums.filter((item) => {
      if (
        term &&
        !item.title.toLowerCase().includes(term) &&
        !item.artist.toLowerCase().includes(term)
      ) {
        return false
      }

      if (decadeFilter !== 'all') {
        const year = parseYearCandidate(item?.year)
        const decade = year ? Math.floor(year / 10) * 10 : 0
        if (!decade || String(decade) !== decadeFilter) return false
      }

      if (genreFilter !== 'all') {
        const hasGenre = (Array.isArray(item?.genres) ? item.genres : []).some(
          (genre) => normalizeGenreKey(genre) === genreFilter,
        )
        if (!hasGenre) return false
      }

      return true
    })

    const sorted = [...filtered]
    if (activeFilter === 'a-z' && hasInlineClientFilters) {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (activeFilter === 'z-a' && hasInlineClientFilters) {
      sorted.sort((a, b) => b.title.localeCompare(a.title))
    } else if (activeFilter === 'popular-year') {
      sorted.sort((a, b) => Number(b.year) - Number(a.year))
    }

    return sorted
  }, [albums, query, activeFilter, decadeFilter, genreFilter])

  const hasClientFilters =
    query.trim().length > 0 ||
    decadeFilter !== 'all' ||
    genreFilter !== 'all'

  const totalPages = useMemo(
    () => (hasClientFilters ? 1 : Math.max(1, Math.ceil(totalAlbums / PAGE_SIZE))),
    [hasClientFilters, totalAlbums]
  )
  const paginatedVisibleAlbums = visibleAlbums
  const displayAlbumCount = hasClientFilters ? visibleAlbums.length : totalAlbums

  useEffect(() => {
    if (!hasClientFilters && totalAlbums === 0 && isLoading) return
    if (activePage <= totalPages) return
    const nextParams = new URLSearchParams(searchParams)
    if (totalPages === 1) {
      nextParams.delete('page')
    } else {
      nextParams.set('page', String(totalPages))
    }
    setSearchParams(nextParams, { replace: true })
  }, [activePage, totalPages, searchParams, setSearchParams, hasClientFilters, totalAlbums, isLoading])

  const handleSearchChange = (event) => {
    setQuery(event.target.value)
    if (activePage === 1) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('page')
    setSearchParams(nextParams, { replace: true })
  }

  const handleDecadeFilterChange = (event) => {
    setDecadeFilter(event.target.value)
    if (activePage === 1) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleGenreFilterChange = (event) => {
    const nextGenre = normalizeGenreKey(event.target.value)
    const isAllGenres = !nextGenre || nextGenre === 'all'
    setGenreFilter(isAllGenres ? 'all' : nextGenre)
    const nextParams = new URLSearchParams(searchParams)
    if (!isAllGenres) {
      nextParams.set('genre', nextGenre)
    } else {
      nextParams.delete('genre')
    }
    if (activePage !== 1) {
      nextParams.delete('page')
    }
    setSearchParams(nextParams)
  }

  const handleFilterChange = (event) => {
    const next = event.target.value
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('filter', next)
    if (activePage !== 1) {
      nextParams.delete('page')
    }
    setSearchParams(nextParams)
  }

  const clearMobileFilters = () => {
    setDecadeFilter('all')
    setGenreFilter('all')

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('filter')
    nextParams.delete('genre')
    nextParams.delete('page')
    setSearchParams(nextParams, { replace: true })
  }

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleMobileSignOut = () => {
    signOut()
    setNavUser({ username: '', avatarUrl: '' })
    navigate('/')
  }

  const username = navUser?.username || ''
  const avatarUrl = navUser?.avatarUrl || ''
  const initials = (username || 'U').slice(0, 2).toUpperCase()

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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${username || 'User'} avatar`}
                  className="h-6 w-6 rounded-md object-cover"
                />
              ) : username ? (
                <span className="text-[10px] font-bold uppercase text-accent">{initials}</span>
              ) : (
                <UserCircle size={16} weight="duotone" />
              )}
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/70 px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text transition hover:bg-white"
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
          aria-label="Explore filters"
          className={[
            'absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200',
            isMobileFiltersOpen ? 'translate-y-0' : 'translate-y-[105%]',
          ].join(' ')}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                Refine catalog
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

          <div className="space-y-3.5">
            <label className="block text-sm font-semibold text-text">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted">
                Decade
              </span>
              <select
                value={decadeFilter}
                onChange={handleDecadeFilterChange}
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
                onChange={handleGenreFilterChange}
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
                Sort
              </span>
              <select
                value={activeFilter}
                onChange={handleFilterChange}
                className="h-11 w-full rounded-xl border border-black/10 bg-white/75 px-3 text-sm font-semibold text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-black/10 pt-3">
            <button
              type="button"
              onClick={clearMobileFilters}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="btn-primary inline-flex h-10 flex-1 items-center justify-center px-3 text-xs uppercase tracking-[0.14em]"
            >
              Done
            </button>
          </div>
        </section>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-10 lg:px-16 lg:pb-12">
        <div className="space-y-4 md:space-y-5">
          <div className="hidden md:block">
            {isSignedIn ? (
              <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
            ) : (
              <NavbarGuest className="mx-auto mt-6 w-[min(100%,1080px)]" />
            )}
          </div>

          <section className="space-y-3 pt-2 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-text shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <ArrowLeft size={13} weight="bold" />
                Back
              </button>

              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(true)}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <FunnelSimple size={13} weight="bold" className="text-accent" />
                Filters
                {mobileFilterCount > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-[#1f130c]">
                    {mobileFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <label className="block">
              <span className="sr-only">Search albums</span>
              <div className="relative">
                <MagnifyingGlass
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  value={query}
                  onChange={handleSearchChange}
                  placeholder="Search album or artist"
                  className="h-10 w-full rounded-xl border border-black/10 bg-white/72 pl-9 pr-3 text-sm font-medium text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedDecadeLabel ? (
                <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
                  {selectedDecadeLabel}
                </span>
              ) : null}
              {selectedGenreLabel ? (
                <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
                  {selectedGenreLabel}
                </span>
              ) : null}
              {activeFilter !== fallbackFilter ? (
                <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
                  {selectedSortLabel}
                </span>
              ) : null}
              {mobileFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearMobileFilters}
                  className="border-0 bg-transparent p-0 text-[11px] font-semibold text-accent transition hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Clear all
                </button>
              ) : null}
            </div>
          </section>

          <div className="hidden md:block">
            <BackButton className="self-start" />

            <div className="mt-3 flex flex-col gap-2">
              <label className="flex-1 text-sm font-semibold text-text">
                <span className="sr-only">Search albums</span>
                <input
                  type="text"
                  value={query}
                  onChange={handleSearchChange}
                  placeholder="Search albums, artists, or lists"
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-semibold text-text">
                  <span className="sr-only">Filter by decade</span>
                  <select
                    value={decadeFilter}
                    onChange={handleDecadeFilterChange}
                    className="min-w-[170px] rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="all">All decades</option>
                    {decadeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-text">
                  <span className="sr-only">Filter by genre</span>
                  <select
                    value={genreFilter}
                    onChange={handleGenreFilterChange}
                    className="min-w-[170px] rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="all">All genres</option>
                    {genreOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-text">
                  <span className="sr-only">Sort and filter</span>
                  <select
                    value={activeFilter}
                    onChange={handleFilterChange}
                    className="min-w-[220px] rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                  >
                    {FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <section className="space-y-3 md:space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-black/10 pb-2">
              <div>
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted md:mb-1 md:text-xs md:tracking-[0.25em]">
                  Explore
                </p>
                <h2 className="mb-0 text-lg text-text md:text-xl">Album catalog</h2>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2 md:gap-3">
                <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:rounded-none md:bg-transparent md:px-0 md:py-0 md:text-xs md:tracking-[0.25em]">
                  {displayAlbumCount} album{displayAlbumCount === 1 ? '' : 's'}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:text-xs md:tracking-[0.25em]">
                  Page {activePage} of {totalPages}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted md:p-6">
                Loading albums...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:p-6">
                {loadError}
              </div>
            ) : visibleAlbums.length === 0 ? (
              <div className="rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted md:p-6">
                No albums matched your search.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:hidden">
                  {paginatedVisibleAlbums.map((album) => (
                    <ExploreAlbumTile key={album.id} album={album} />
                  ))}
                </div>

                <div
                  className="hidden gap-3 sm:gap-4 md:grid"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                >
                  {paginatedVisibleAlbums.map((album) => (
                    <ExploreAlbumTile key={album.id} album={album} />
                  ))}
                </div>

                {totalPages > 1 ? (
                  <>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 md:hidden">
                      <button
                        type="button"
                        className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/72 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handlePageChange(activePage - 1)}
                        disabled={isLoading || activePage <= 1}
                      >
                        Previous
                      </button>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {activePage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/72 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handlePageChange(activePage + 1)}
                        disabled={isLoading || activePage >= totalPages}
                      >
                        Next
                      </button>
                    </div>

                    <div className="hidden flex-wrap items-center justify-end gap-2 border-t border-black/10 pt-3 md:flex">
                      <button
                        type="button"
                        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-text transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handlePageChange(activePage - 1)}
                        disabled={isLoading || activePage <= 1}
                      >
                        Previous
                      </button>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {activePage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-text transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handlePageChange(activePage + 1)}
                        disabled={isLoading || activePage >= totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}


