import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import BackButton from '../components/BackButton.jsx'
import ExploreAlbumTile from '../components/explore/ExploreAlbumTile.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
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

export default function Explore() {
  const { isSignedIn } = useAuthStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [decadeFilter, setDecadeFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('all')
  const [apiAlbums, setApiAlbums] = useState([])
  const [totalAlbums, setTotalAlbums] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [currentFetchPage, setCurrentFetchPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const lastFetchAtRef = useRef(0)
  const authEpochRef = useRef(0)
  const fetchedPageSetRef = useRef(new Set())
  const fetchingPageSetRef = useRef(new Set())
  const fetchedIdSetRef = useRef(new Set())
  const hasMoreRef = useRef(true)
  const currentFetchPageRef = useRef(0)
  const fallbackFilter = FILTER_OPTIONS[0]?.value ?? 'a-z'
  const activeFilter = searchParams.get('filter') ?? fallbackFilter
  const activePage = parsePositiveInt(searchParams.get('page'), 1)

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
    const primaryType =
      typeof item?.primaryType === 'string' && item.primaryType.trim()
        ? item.primaryType.trim()
        : ''
    const genres = sourceGenres
      .map((value) => String(value).trim())
      .filter(Boolean)

    if (genres.length === 0 && primaryType) {
      genres.push(primaryType)
    }

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
    setApiAlbums([])
    setTotalAlbums(0)
    setHasMore(true)
    setCurrentFetchPage(0)
    setIsLoading(false)
    setLoadError('')
    fetchedPageSetRef.current.clear()
    fetchingPageSetRef.current.clear()
    fetchedIdSetRef.current.clear()
    hasMoreRef.current = true
    currentFetchPageRef.current = 0
  }, [])

  const fetchExplorePage = useCallback(async (page) => {
    if (!isSignedIn) return { fetched: false, reason: 'signed-out' }
    if (!Number.isInteger(page) || page < 1) return { fetched: false, reason: 'invalid-page' }
    if (fetchedPageSetRef.current.has(page)) return { fetched: false, reason: 'already-fetched' }
    if (fetchingPageSetRef.current.has(page)) return { fetched: false, reason: 'already-fetching' }
    if (!hasMoreRef.current && page > currentFetchPageRef.current + 1) {
      return { fetched: false, reason: 'no-more' }
    }

    const runEpoch = authEpochRef.current
    fetchingPageSetRef.current.add(page)
    setIsLoading(true)

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

      const minIntervalMs = 500
      const elapsedMs = Date.now() - lastFetchAtRef.current
      if (elapsedMs < minIntervalMs) {
        await new Promise((resolve) => {
          setTimeout(resolve, minIntervalMs - elapsedMs)
        })
      }

      const response = await fetch(`${apiBase}/api/explore?page=${page}&limit=${PAGE_SIZE}`, {
        headers,
      })
      lastFetchAtRef.current = Date.now()

      if (!response.ok) {
        throw new Error('Failed to load explore albums.')
      }

      const payload = await response.json()
      const items = Array.isArray(payload?.items) ? payload.items : []
      const mappedItems = items.map(mapApiAlbum).filter(Boolean)
      const total = Number(payload?.total)
      const safeTotal = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0
      const totalPagesFromApi = Math.max(1, Math.ceil(safeTotal / PAGE_SIZE))
      const nextHasMore = page < totalPagesFromApi

      if (runEpoch !== authEpochRef.current) {
        return { fetched: false, reason: 'stale-run' }
      }

      setTotalAlbums(safeTotal)
      setHasMore(nextHasMore)
      setCurrentFetchPage((prev) => Math.max(prev, page))
      setApiAlbums((prev) => {
        // Merge by id to prevent duplicate cards when pages overlap in dev/strict reruns.
        const byId = new Map()
        for (const album of prev) {
          if (!album?.id) continue
          byId.set(album.id, album)
        }
        for (const album of mappedItems) {
          if (!album?.id) continue
          byId.set(album.id, album)
          fetchedIdSetRef.current.add(album.id)
        }
        return Array.from(byId.values())
      })

      fetchedPageSetRef.current.add(page)
      currentFetchPageRef.current = Math.max(currentFetchPageRef.current, page)
      hasMoreRef.current = nextHasMore
      setLoadError('')
      return { fetched: true }
    } catch (error) {
      if (runEpoch !== authEpochRef.current) {
        return { fetched: false, reason: 'stale-run' }
      }
      setLoadError(error?.message ?? 'Unable to load albums.')
      return { fetched: false, reason: 'error' }
    } finally {
      fetchingPageSetRef.current.delete(page)
      if (fetchingPageSetRef.current.size === 0) {
        setIsLoading(false)
      }
    }
  }, [isSignedIn, mapApiAlbum])

  useEffect(() => {
    authEpochRef.current += 1
    const currentAuthEpoch = authEpochRef.current

    if (!isSignedIn) {
      resetExploreState()
      return undefined
    }

    // Reset + bootstrap per auth epoch. In Strict Mode dev, the first run is
    // invalidated by authEpoch and the second run becomes the authoritative fetch.
    resetExploreState()

    let cancelled = false
    const bootstrap = async () => {
      if (cancelled || currentAuthEpoch !== authEpochRef.current) return
      await fetchExplorePage(1)
    }
    bootstrap()

    return () => {
      cancelled = true
    }
  }, [isSignedIn, fetchExplorePage, resetExploreState])

  useEffect(() => {
    if (!isSignedIn) return undefined
    let cancelled = false

    const ensurePageLoaded = async () => {
      for (let page = 1; page <= activePage; page += 1) {
        if (cancelled) return
        await fetchExplorePage(page)
      }
    }

    ensurePageLoaded()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, activePage, fetchExplorePage])

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
        if (!normalized) continue
        const key = normalized.toLowerCase()
        if (!genres.has(key)) {
          genres.set(key, normalized)
        }
      }
    }
    return Array.from(genres.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [albums])

  const visibleAlbums = useMemo(() => {
    const term = query.trim().toLowerCase()
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
          (genre) => String(genre).trim().toLowerCase() === genreFilter,
        )
        if (!hasGenre) return false
      }

      return true
    })

    const sorted = [...filtered]
    if (activeFilter === 'a-z') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (activeFilter === 'z-a') {
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
    () =>
      Math.max(
        1,
        Math.ceil((hasClientFilters ? visibleAlbums.length : totalAlbums) / PAGE_SIZE),
      ),
    [hasClientFilters, visibleAlbums.length, totalAlbums]
  )

  const paginatedVisibleAlbums = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE
    return visibleAlbums.slice(start, start + PAGE_SIZE)
  }, [visibleAlbums, activePage])

  useEffect(() => {
    if (!isSignedIn || !hasClientFilters || !hasMore) return undefined
    let cancelled = false

    const hydrateRemainingCatalog = async () => {
      let nextPage = currentFetchPage + 1
      while (!cancelled && hasMoreRef.current) {
        const result = await fetchExplorePage(nextPage)
        if (!result?.fetched) break
        nextPage += 1
      }
    }

    hydrateRemainingCatalog()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, hasClientFilters, hasMore, currentFetchPage, fetchExplorePage])

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
    setGenreFilter(event.target.value)
    if (activePage === 1) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('page')
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

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 md:gap-6">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}

        <BackButton className="self-start" />

        <div className="flex flex-col gap-2">
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

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Explore
              </p>
              <h2 className="mb-0 text-xl text-text">Album catalog</h2>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                {visibleAlbums.length} album{visibleAlbums.length === 1 ? '' : 's'}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Page {activePage} of {totalPages}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
              Loading albums...
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {loadError}
            </div>
          ) : visibleAlbums.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
              No albums matched your search.
            </div>
          ) : (
            <>
              <div
                className="grid gap-3 sm:gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
              >
                {paginatedVisibleAlbums.map((album) => (
                  <ExploreAlbumTile key={album.id} album={album} />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/10 pt-3">
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
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

