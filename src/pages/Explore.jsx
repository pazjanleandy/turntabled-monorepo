import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import BackButton from '../components/BackButton.jsx'
import CoverImage from '../components/CoverImage.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { albumCatalog } from '../data/albumData.js'

const FILTER_OPTIONS = [
  { value: 'a-z', label: 'Alphabetical A-Z' },
  { value: 'z-a', label: 'Alphabetical Z-A' },
  { value: 'user-rating', label: 'User rating' },
  { value: 'personal-rating', label: 'Personal rating' },
  { value: 'popular-year', label: 'Popular year' },
  { value: 'popular-week', label: 'Popular week' },
]

export default function Explore() {
  const { isSignedIn } = useAuthStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const fallbackFilter = FILTER_OPTIONS[0]?.value ?? 'a-z'
  const activeFilter = searchParams.get('filter') ?? fallbackFilter
  const albums = useMemo(() => Object.values(albumCatalog), [])

  const visibleAlbums = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = !term
      ? albums
      : albums.filter(
          (item) =>
            item.title.toLowerCase().includes(term) ||
            item.artist.toLowerCase().includes(term),
        )

    const sorted = [...filtered]
    if (activeFilter === 'a-z') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (activeFilter === 'z-a') {
      sorted.sort((a, b) => b.title.localeCompare(a.title))
    } else if (activeFilter === 'popular-year') {
      sorted.sort((a, b) => Number(b.year) - Number(a.year))
    }

    return sorted
  }, [albums, query, activeFilter])

  const handleFilterChange = (event) => {
    const next = event.target.value
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('filter', next)
    setSearchParams(nextParams)
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}
        <BackButton className="self-start" />

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
          <label className="text-sm font-semibold text-text">
            <span className="sr-only">Sort and filter</span>
            <select
              value={activeFilter}
              onChange={handleFilterChange}
              className="w-full min-w-[220px] rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20 md:w-auto"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="card vinyl-texture">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Explore
              </p>
              <h2 className="mb-0 text-xl text-text">Album catalog</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              {visibleAlbums.length} album{visibleAlbums.length === 1 ? '' : 's'}
            </span>
          </div>

          {visibleAlbums.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
              No albums matched your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleAlbums.map((album) => (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="group relative overflow-hidden rounded-xl border border-black/10 bg-black/70 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.45)] transition hover:-translate-y-1"
                >
                  <CoverImage
                    src={album.cover}
                    alt={`${album.title} cover`}
                    className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75"
                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/65 p-3 opacity-0 transition duration-200 group-hover:opacity-100">
                    <p className="text-center text-sm font-semibold text-white">{album.artist}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

