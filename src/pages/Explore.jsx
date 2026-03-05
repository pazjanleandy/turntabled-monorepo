import { useEffect, useMemo, useRef, useState } from 'react'
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

function parseYearCandidate(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  const match = String(value).match(/\d{4}/)
  return match ? Number.parseInt(match[0], 10) : 0
}

export default function Explore() {
  const { isSignedIn } = useAuthStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [decadeFilter, setDecadeFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('all')
  const [apiAlbums, setApiAlbums] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const lastFetchAtRef = useRef(0)
  const fallbackFilter = FILTER_OPTIONS[0]?.value ?? 'a-z'
  const activeFilter = searchParams.get('filter') ?? fallbackFilter

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    let debounceTimer = null

    const loadExploreAlbums = async () => {
      setIsLoading(true)
      setLoadError('')

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

        const minIntervalMs = 1000
        const elapsedMs = Date.now() - lastFetchAtRef.current
        if (elapsedMs < minIntervalMs) {
          await new Promise((resolve) => {
            setTimeout(resolve, minIntervalMs - elapsedMs)
          })
        }

        const response = await fetch(`${apiBase}/api/explore?page=1&limit=50`, {
          headers,
          signal: controller.signal,
        })
        lastFetchAtRef.current = Date.now()

        if (!response.ok) {
          throw new Error('Failed to load explore albums.')
        }

        const payload = await response.json()
        const items = Array.isArray(payload?.items) ? payload.items : []

        const mapped = items.map((item) => {
          const title = item?.albumTitle ?? 'Unknown Album'
          const artist = item?.artistName ?? 'Unknown Artist'
          const albumId = item?.albumId ?? null
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
            id: item?.backlogId ?? item?.albumId ?? `${artist}-${title}`,
            albumId,
            title,
            artist,
            cover: item?.coverArtUrl || '/album/am.jpg',
            year: releaseYear ? String(releaseYear) : '0',
            genres,
          }
        })

        if (!cancelled) {
          setApiAlbums(mapped)
        }

      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setLoadError(error?.message ?? 'Unable to load albums.')
          setApiAlbums([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    debounceTimer = setTimeout(() => {
      loadExploreAlbums()
    }, 250)

    return () => {
      cancelled = true
      controller.abort()
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [isSignedIn])

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

  const handleFilterChange = (event) => {
    const next = event.target.value
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('filter', next)
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search albums, artists, or lists"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-text">
              <span className="sr-only">Filter by decade</span>
              <select
                value={decadeFilter}
                onChange={(event) => setDecadeFilter(event.target.value)}
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
                onChange={(event) => setGenreFilter(event.target.value)}
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
            <div
              className="grid gap-3 sm:gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
            >
              {visibleAlbums.map((album) => (
                <ExploreAlbumTile key={album.id} album={album} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

