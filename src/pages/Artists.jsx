import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MagnifyingGlass, MusicNotes, UserCircle } from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import ArtistRow from '../components/artists/ArtistRow.jsx'
import ArtistsAZIndex from '../components/artists/ArtistsAZIndex.jsx'
import ArtistSectionHeader from '../components/artists/ArtistSectionHeader.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { supabase } from '../supabase.js'
import {
  ALPHABET_LETTERS,
  getAvailableLetters,
  groupArtistsByLetter,
  sortLetters,
  toTimestamp,
} from '../lib/artistsDirectory.js'
import { readCachedProfile } from '../lib/profileClient.js'

const SORT_OPTIONS = [
  { value: 'az', label: 'A-Z' },
  { value: 'most-logged', label: 'Most logged' },
  { value: 'recently-logged', label: 'Recently logged' },
]

function ArtistRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-3 border-b border-black/10 bg-transparent px-0 py-2.5 shadow-none md:rounded-xl md:border md:border-[var(--border)] md:bg-card md:px-3 md:py-2.5 md:shadow-[0_10px_24px_-18px_rgba(15,15,15,0.35)]"
    >
      <div className="h-9 w-9 animate-pulse rounded-full border border-black/10 bg-black/10 md:h-10 md:w-10" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-2/5 animate-pulse rounded bg-black/10" />
        <div className="h-2.5 w-3/5 animate-pulse rounded bg-black/10" />
      </div>
      <div className="h-2.5 w-12 animate-pulse rounded bg-black/10" />
    </div>
  )
}

export default function Artists() {
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [artists, setArtists] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value)
  const [activeLetter, setActiveLetter] = useState('A')
  const sectionRefs = useRef({})
  const visibleSectionsRef = useRef(new Map())
  const cachedProfile = readCachedProfile()
  const currentDisplayName =
    cachedProfile?.fullName?.trim() || cachedProfile?.username?.trim() || 'You'
  const currentAvatarUrl =
    typeof cachedProfile?.avatarUrl === 'string' ? cachedProfile.avatarUrl.trim() : ''
  const navUser = {
    username:
      String(cachedProfile?.username ?? '').trim().replace(/^@/, '') ||
      currentDisplayName ||
      'you',
    avatarUrl: currentAvatarUrl,
  }

  useEffect(() => {
    if (!isSidebarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSidebarOpen])

  useEffect(() => {
    let cancelled = false

    async function fetchArtists() {
      const { data, error } = await supabase
        .from('artist')
        .select(
          `
          id,
          name,
          normalized_name,
          mbid,
          country,
          disambiguation,
          image_url,
          created_at,
          updated_at,
          album (
            id,
            updated_at,
            backlog (
              id,
              updated_at
            )
          )
          `,
        )
        .order('name', { ascending: true })

      if (cancelled) return

      if (error) {
        setArtists([])
        setIsLoading(false)
        return
      }

      setArtists(Array.isArray(data) ? data : [])
      setIsLoading(false)
    }

    fetchArtists()

    return () => {
      cancelled = true
    }
  }, [])

  const enrichedArtists = useMemo(
    () =>
      artists.map((artist) => ({
        ...artist,
        origin: artist?.country ?? '',
        genres: [],
        albumsLogged: Array.isArray(artist?.album)
          ? artist.album.reduce(
              (total, entry) =>
                total + (Array.isArray(entry?.backlog) ? entry.backlog.length : 0),
              0,
            )
          : 0,
        recentlyLoggedAtMs: toTimestamp(
          Array.isArray(artist?.album)
            ? artist.album
                .flatMap((entry) =>
                  Array.isArray(entry?.backlog) ? entry.backlog.map((log) => log?.updated_at) : [],
                )
                .filter(Boolean)
                .sort((left, right) => String(right).localeCompare(String(left)))[0]
            : null,
        ) || toTimestamp(
          artist?.updated_at ?? artist?.created_at,
        ),
      })),
    [artists],
  )

  const filteredArtists = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return enrichedArtists

    return enrichedArtists.filter((artist) => {
      return [artist?.name, artist?.country, artist?.disambiguation].some((field) =>
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

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleMobileSignOut = () => {
    signOut()
    closeSidebar()
    navigate('/')
  }

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

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-10 lg:px-16">
        <div className="space-y-4 md:space-y-8">
          <div className="hidden md:block">
            {isSignedIn ? (
              <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
            ) : (
              <NavbarGuest className="mx-auto mt-6 w-[min(100%,1080px)]" />
            )}
          </div>

          <section className="border-b border-black/10 pb-4 pt-3 md:hidden">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-text shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              aria-label="Go back"
            >
              <ArrowLeft size={13} weight="bold" />
              Back
            </button>

            <div className="mt-3.5 space-y-1.5">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Artists</p>
              <h1 className="mb-0 text-[1.85rem] leading-none text-text">Artist directory</h1>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_120px] gap-2">
              <label className="block">
                <span className="sr-only">Search artists</span>
                <div className="relative">
                  <MagnifyingGlass
                    size={13}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search artists"
                    className="h-10 w-full rounded-xl border border-black/10 bg-white/72 pl-9 pr-3 text-sm font-medium text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </label>

              <label className="block">
                <span className="sr-only">Sort artists</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white/72 px-3 text-sm font-semibold text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
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

          <section className="hidden md:block card vinyl-texture space-y-4">
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
            <div className="sticky top-[3.1rem] z-20 -mx-1 md:hidden">
              <nav
                aria-label="Artist alphabetical index"
                className="scrollbar-sleek flex items-center gap-1 overflow-x-auto px-1 py-1"
              >
                {ALPHABET_LETTERS.map((letter) => {
                  const isAvailable = availableLetters.has(letter)
                  const isActive = visibleActiveLetter === letter
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => isAvailable && handleSelectLetter(letter)}
                      disabled={!isAvailable}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={`Jump to ${letter}`}
                      className={[
                        'inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition',
                        isAvailable
                          ? isActive
                            ? 'bg-accent text-[#1f130c]'
                            : 'text-text hover:bg-black/5 hover:text-accent'
                          : 'cursor-not-allowed text-muted/35',
                      ].join(' ')}
                    >
                      {letter}
                    </button>
                  )
                })}
              </nav>
            </div>
          ) : null}

          {showRail ? (
            <div className="sticky top-3 z-20 hidden md:block lg:hidden">
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
                ? 'grid items-start gap-3 md:gap-4 lg:grid-cols-[64px_minmax(0,1fr)]'
                : 'grid items-start gap-3 md:gap-4'
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

            <div className="space-y-5 md:space-y-7">
              {isLoading ? (
                <section>
                  <ArtistSectionHeader label="Loading" />
                  <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-2 2xl:grid-cols-3">
                    {Array.from({ length: 12 }, (_, index) => (
                      <ArtistRowSkeleton key={`artist-skeleton-${index}`} />
                    ))}
                  </div>
                </section>
              ) : sortedArtists.length === 0 ? (
                <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-sm text-muted md:rounded-2xl md:border-black/5 md:bg-white/70 md:p-6">
                  <p className="mb-3">No artists matched your search.</p>
                  {search.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="rounded-lg border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-white md:rounded-xl md:bg-white/90 md:hover:-translate-y-0.5"
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
                    className="scroll-mt-20 md:scroll-mt-24"
                  >
                    <ArtistSectionHeader label={letter} sticky className="mb-2 md:mb-3" />
                    <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-2 2xl:grid-cols-3">
                      {groupedArtists[letter].map((artist) => (
                        <ArtistRow key={artist.id} artist={artist} compact />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <section>
                  <ArtistSectionHeader
                    label={sortBy === 'most-logged' ? 'Most logged' : 'Recently logged'}
                  />
                  <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-2 2xl:grid-cols-3">
                    {sortedArtists.map((artist) => (
                      <ArtistRow key={artist.id} artist={artist} compact />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

