import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import ArtistRow from '../components/artists/ArtistRow.jsx'
import ArtistsAZIndex from '../components/artists/ArtistsAZIndex.jsx'
import ArtistSectionHeader from '../components/artists/ArtistSectionHeader.jsx'
import { loadArtists } from '../data/loadArtists.js'
import useAuthStatus from '../hooks/useAuthStatus.js'
import {
  getAvailableLetters,
  groupArtistsByLetter,
  sortLetters,
  toTimestamp,
} from '../lib/artistsDirectory.js'

const SORT_OPTIONS = [
  { value: 'az', label: 'A-Z' },
  { value: 'most-logged', label: 'Most logged' },
  { value: 'recently-logged', label: 'Recently logged' },
]

function ArtistRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(15,15,15,0.35)]"
    >
      <div className="h-10 w-10 animate-pulse rounded-full border border-black/10 bg-black/10" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-2/5 animate-pulse rounded bg-black/10" />
        <div className="h-2.5 w-3/5 animate-pulse rounded bg-black/10" />
      </div>
      <div className="h-2.5 w-12 animate-pulse rounded bg-black/10" />
    </div>
  )
}

export default function Artists() {
  const { isSignedIn } = useAuthStatus()
  const [artists, setArtists] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value)
  const [activeLetter, setActiveLetter] = useState('A')
  const sectionRefs = useRef({})
  const visibleSectionsRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(() => {
      if (cancelled) return
      setArtists(loadArtists())
      setIsLoading(false)
    }, 150)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const enrichedArtists = useMemo(
    () =>
      artists.map((artist) => ({
        ...artist,
        albumsLogged: Array.isArray(artist?.notableAlbums) ? artist.notableAlbums.length : 0,
        recentlyLoggedAtMs: toTimestamp(
          artist?.recentlyLoggedAt ?? artist?.lastLoggedAt ?? artist?.updatedAt,
        ),
      })),
    [artists],
  )

  const filteredArtists = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return enrichedArtists

    return enrichedArtists.filter((artist) => {
      const genres = Array.isArray(artist?.genres) ? artist.genres.join(' ') : ''
      return [artist?.name, artist?.origin, genres].some((field) =>
        String(field ?? '')
          .toLowerCase()
          .includes(term),
      )
    })
  }, [enrichedArtists, search])

  const sortedArtists = useMemo(() => {
    const sorted = [...filteredArtists]

    sorted.sort((left, right) => {
      if (sortBy === 'most-logged') {
        const byLogged = right.albumsLogged - left.albumsLogged
        if (byLogged !== 0) return byLogged
      } else if (sortBy === 'recently-logged') {
        const byRecent = right.recentlyLoggedAtMs - left.recentlyLoggedAtMs
        if (byRecent !== 0) return byRecent
      }

      return String(left?.name ?? '').localeCompare(String(right?.name ?? ''))
    })

    return sorted
  }, [filteredArtists, sortBy])

  const isAlphabetical = sortBy === 'az'
  const groupedArtists = useMemo(() => groupArtistsByLetter(sortedArtists), [sortedArtists])
  const groupedLetters = useMemo(
    () => Object.keys(groupedArtists).sort(sortLetters),
    [groupedArtists],
  )
  const availableLetters = useMemo(() => getAvailableLetters(groupedArtists), [groupedArtists])
  const visibleActiveLetter = useMemo(() => {
    if (availableLetters.has(activeLetter)) return activeLetter
    return groupedLetters[0] ?? 'A'
  }, [activeLetter, availableLetters, groupedLetters])
  const showRail = isAlphabetical && groupedLetters.length > 0 && !isLoading

  useEffect(() => {
    if (!showRail) return undefined
    const visibleSections = visibleSectionsRef.current

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const letter = entry.target.getAttribute('data-letter')
          if (!letter) continue

          if (entry.isIntersecting) {
            visibleSections.set(letter, entry)
          } else {
            visibleSections.delete(letter)
          }
        }

        const nextActive = Array.from(visibleSections.entries())
          .sort((left, right) => {
            const leftTop = Math.abs(left[1].boundingClientRect.top)
            const rightTop = Math.abs(right[1].boundingClientRect.top)
            return leftTop - rightTop
          })
          .map(([letter]) => letter)[0]

        if (nextActive && availableLetters.has(nextActive)) {
          setActiveLetter((previous) => (previous === nextActive ? previous : nextActive))
        }
      },
      {
        threshold: [0, 0.15, 0.35, 0.6, 1],
        rootMargin: '-22% 0px -60% 0px',
      },
    )

    for (const letter of groupedLetters) {
      const node = sectionRefs.current[letter]
      if (node) observer.observe(node)
    }

    return () => {
      observer.disconnect()
      visibleSections.clear()
    }
  }, [availableLetters, groupedLetters, showRail])

  const handleSelectLetter = (letter) => {
    if (!showRail || !availableLetters.has(letter)) return
    setActiveLetter(letter)

    const target = sectionRefs.current[letter]
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}

        <section className="card vinyl-texture space-y-4">
          <div className="space-y-2">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Artists</p>
            <h1 className="mb-0 text-2xl text-text">Artist directory</h1>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="text-sm font-semibold text-text">
              <span className="sr-only">Search artists</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search artists"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="text-sm font-semibold text-text">
              <span className="sr-only">Sort artists</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {showRail ? (
          <div className="sticky top-3 z-20 lg:hidden">
            <ArtistsAZIndex
              orientation="horizontal"
              activeLetter={visibleActiveLetter}
              availableLetters={availableLetters}
              onSelectLetter={handleSelectLetter}
            />
          </div>
        ) : null}

        <section
          className={
            showRail
              ? 'grid items-start gap-4 lg:grid-cols-[64px_minmax(0,1fr)]'
              : 'grid items-start gap-4'
          }
        >
          {showRail ? (
            <div className="hidden lg:block lg:sticky lg:top-6">
              <ArtistsAZIndex
                orientation="vertical"
                activeLetter={visibleActiveLetter}
                availableLetters={availableLetters}
                onSelectLetter={handleSelectLetter}
              />
            </div>
          ) : null}

          <div className="space-y-7">
            {isLoading ? (
              <section>
                <ArtistSectionHeader label="Loading" />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                  {Array.from({ length: 12 }, (_, index) => (
                    <ArtistRowSkeleton key={`artist-skeleton-${index}`} />
                  ))}
                </div>
              </section>
            ) : sortedArtists.length === 0 ? (
              <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-muted">
                <p className="mb-3">No artists matched your search.</p>
                {search.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="rounded-xl border border-black/10 bg-white/90 px-3 py-1.5 text-xs font-semibold text-text transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    Clear search
                  </button>
                ) : null}
              </div>
            ) : isAlphabetical ? (
              groupedLetters.map((letter) => (
                <section
                  key={letter}
                  id={`artist-section-${letter}`}
                  data-letter={letter}
                  ref={(node) => {
                    if (node) {
                      sectionRefs.current[letter] = node
                      return
                    }
                    delete sectionRefs.current[letter]
                  }}
                  className="scroll-mt-24"
                >
                  <ArtistSectionHeader label={letter} sticky />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                    {groupedArtists[letter].map((artist) => (
                      <ArtistRow key={artist.id} artist={artist} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <section>
                <ArtistSectionHeader label={sortBy === 'most-logged' ? 'Most logged' : 'Recently logged'} />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                  {sortedArtists.map((artist) => (
                    <ArtistRow key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
