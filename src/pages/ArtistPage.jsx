import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, MapPinLine, MusicNotes, UserCircle } from 'phosphor-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { readCachedProfile } from '../lib/profileClient.js'
import { supabase } from '../supabase.js'

function formatReleaseYear(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return String(parsed.getFullYear())
}

function getReleaseSortValue(value) {
  if (!value) return 0
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 0
  return parsed.getTime()
}

function formatMetadataSource(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return 'Turntabled'
  if (normalized === 'musicbrainz') return 'MusicBrainz'
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatPrimaryType(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatCatalogFocus(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return 'Mixed releases'
  if (normalized === 'album') return 'Album-led catalog'
  if (normalized === 'ep') return 'EP-led catalog'
  if (normalized === 'single') return 'Single-led catalog'
  return `${formatPrimaryType(value)} catalog`
}

function MobileArtistHeader({ isSignedIn, navUser, onOpenMenu }) {
  const username = navUser?.username || ''
  const avatarUrl = navUser?.avatarUrl || ''
  const initials = (username || 'U').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/82 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-4 sm:px-6">
        {isSignedIn ? (
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onOpenMenu}
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
            className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/70 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text transition hover:bg-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}

function MobileBackRow({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-text shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      aria-label="Go back"
    >
      <ArrowLeft size={13} weight="bold" />
      Back
    </button>
  )
}

function MobileStat({ label, value, helper = '', emphasize = false }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/60 px-2.5 py-2">
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mb-0 text-[1.05rem] font-semibold leading-none ${emphasize ? 'text-accent' : 'text-text'}`}>
        {value}
      </p>
      <p className="mb-0 mt-0.5 truncate text-[10px] text-muted">{helper}</p>
    </div>
  )
}

function MobileAlbumRow({ album, index }) {
  const albumHref = album?.id ? `/album/${album.id}` : ''
  const Wrapper = albumHref ? Link : 'div'
  const typeLabel = String(album?.primaryTypeLabel ?? '').trim()
  const yearLabel = String(album?.year ?? '').trim()
  const metadataLine = [yearLabel, typeLabel].filter(Boolean).join(' - ')
  const ratingCount = Number(album?.ratingCount ?? 0) || 0
  const saveCount = Number(album?.saveCount ?? 0) || 0
  const reviewCount = Number(album?.reviewCount ?? 0) || 0

  return (
    <Wrapper
      {...(albumHref ? { to: albumHref } : {})}
      className="group block py-3 transition hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-5 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="h-[66px] w-[66px] shrink-0 overflow-hidden rounded-[0.95rem] border border-black/10 bg-white shadow-[0_14px_22px_-20px_rgba(15,15,15,0.4)]">
          {album?.cover_art_url ? (
            <img
              src={album.cover_art_url}
              alt={`${album?.title ?? 'Album'} cover`}
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              No art
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="mb-0 truncate text-[15px] leading-tight text-text transition group-hover:text-accent">
                {album?.title || 'Untitled release'}
              </h3>
              <p className="mb-0 mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {metadataLine || 'Release'}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className={`mb-0 text-[13px] font-semibold ${album?.avgRating ? 'text-accent' : 'text-text'}`}>
                {album?.avgRating ?? 'N/A'}
              </p>
              <p className="mb-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                Avg
              </p>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span>{ratingCount ? `${ratingCount.toLocaleString()} ratings` : 'No ratings'}</span>
            <span>{saveCount ? `${saveCount.toLocaleString()} saves` : 'No saves'}</span>
            <span>{reviewCount ? `${reviewCount.toLocaleString()} reviews` : 'No reviews'}</span>
          </div>
        </div>
      </div>
    </Wrapper>
  )
}

function HeroStat({ label, value, helper = '', emphasize = false }) {
  return (
    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/42">
        {label}
      </p>
      <p
        className={`mb-1 text-[1.9rem] font-semibold leading-none sm:text-[2.15rem] ${
          emphasize ? 'text-black/90' : 'text-black/80'
        }`}
      >
        {value}
      </p>
      <p className="mb-0 text-[11px] leading-5 text-black/48">{helper}</p>
    </div>
  )
}

function MetaPill({ label, value, icon = null }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/7 bg-white/62 px-3 py-1.5 text-[11px] leading-none text-black/62">
      {icon ? <span className="text-black/42">{icon}</span> : null}
      <span className="font-semibold uppercase tracking-[0.15em] text-black/40">{label}</span>
      <span className="font-semibold text-black/70">{value}</span>
    </span>
  )
}

function AlbumDatum({ label, value, emphasize = false }) {
  return (
    <div className="min-w-0 text-left lg:text-right">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
        {label}
      </p>
      <p
        className={`mb-0 text-[1.05rem] leading-none ${
          emphasize ? 'font-semibold text-black/88' : 'font-medium text-black/72'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function AlbumListItem({ album, index }) {
  const albumHref = album?.id ? `/album/${album.id}` : ''
  const Wrapper = albumHref ? Link : 'div'

  return (
    <Wrapper
      {...(albumHref ? { to: albumHref } : {})}
      className="group block px-6 py-5 transition hover:bg-white/34 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:px-7 lg:px-8"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-center lg:gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="w-7 shrink-0 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/32">
            {String(index + 1).padStart(2, '0')}
          </div>

          <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[1.15rem] border border-black/10 bg-white shadow-[0_20px_34px_-28px_rgba(15,15,15,0.45)] sm:h-[88px] sm:w-[88px]">
            {album?.cover_art_url ? (
              <img
                src={album.cover_art_url}
                alt={`${album?.title ?? 'Album'} cover`}
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                No art
              </div>
            )}
          </div>

          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <h3 className="mb-0 text-[1.15rem] leading-[1.05] text-black/88 transition group-hover:text-black sm:text-[1.28rem]">
                {album?.title || 'Untitled release'}
              </h3>
              {album?.primaryTypeLabel ? (
                <span className="rounded-full border border-black/7 bg-white/68 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50">
                  {album.primaryTypeLabel}
                </span>
              ) : null}
              {album?.year ? (
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
                  {album.year}
                </span>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/43">
              <span>{album?.ratingCount ? `${album.ratingCount} ratings` : 'No ratings yet'}</span>
              <span>{album?.saveCount ? `${album.saveCount} saves` : 'No saves yet'}</span>
              <span>{album?.reviewCount ? `${album.reviewCount} reviews` : 'No reviews yet'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-black/5 pl-11 pt-3.5 lg:border-t-0 lg:pl-0 lg:pt-0">
          <AlbumDatum
            label="Avg rating"
            value={album?.avgRating ?? 'N/A'}
            emphasize={Boolean(album?.avgRating)}
          />
          <AlbumDatum label="Saves" value={String(album?.saveCount?.toLocaleString?.() ?? 0)} />
          <AlbumDatum label="Reviews" value={String(album?.reviewCount?.toLocaleString?.() ?? 0)} />
        </div>
      </div>
    </Wrapper>
  )
}

export default function ArtistPage() {
  const navigate = useNavigate()
  const { isSignedIn, signOut } = useAuthStatus()
  const { normalized_name } = useParams()
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

    async function fetchArtistProfile() {
      if (!normalized_name) {
        setArtist(null)
        setAlbums([])
        setFetchError('')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setFetchError('')

      const { data, error } = await supabase
        .from('artist')
        .select(
          `
          id,
          mbid,
          name,
          metadata_source,
          country,
          disambiguation,
          image_url,
          album (
            id,
            title,
            cover_art_url,
            release_date,
            primary_type,
            backlog (
              rating,
              review_text,
              is_favorite
            )
          )
          `,
        )
        .eq('normalized_name', normalized_name)
        .single()

      if (cancelled) return

      if (error) {
        setArtist(null)
        setAlbums([])
        if (error.code !== 'PGRST116') {
          setFetchError(error.message || 'Failed to load artist profile.')
        }
        setIsLoading(false)
        return
      }

      const nextAlbums = Array.isArray(data?.album)
        ? [...data.album].sort((left, right) =>
            String(right?.release_date ?? '').localeCompare(String(left?.release_date ?? '')),
          )
        : []

      setArtist({
        id: data?.id ?? '',
        mbid: data?.mbid ?? '',
        name: data?.name ?? '',
        metadata_source: data?.metadata_source ?? '',
        country: data?.country ?? '',
        disambiguation: data?.disambiguation ?? '',
        image_url: data?.image_url ?? '',
        genres: [],
      })
      setAlbums(nextAlbums)
      setIsLoading(false)
    }

    fetchArtistProfile()

    return () => {
      cancelled = true
    }
  }, [normalized_name])

  useEffect(() => {
    let cancelled = false

    async function hydrateArtistImage() {
      if (!artist?.id || !artist?.mbid || artist?.image_url) return

      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const response = await fetch(
        `${apiBase}/api/artists/image?artistId=${encodeURIComponent(artist.id)}`,
      ).catch(() => null)

      if (!response || !response.ok) return
      const payload = await response.json().catch(() => null)
      const imageUrl = String(payload?.imageUrl ?? '').trim()
      if (!imageUrl || cancelled) return

      setArtist((previous) => {
        if (!previous || previous.id !== artist.id) return previous
        return {
          ...previous,
          image_url: imageUrl,
        }
      })
    }

    hydrateArtistImage()

    return () => {
      cancelled = true
    }
  }, [artist?.id, artist?.mbid, artist?.image_url])

  const processedAlbums = useMemo(() => {
    return albums.map((album) => {
      const backlogItems = Array.isArray(album?.backlog) ? album.backlog : []
      const ratingValues = backlogItems
        .map((item) => Number(item?.rating))
        .filter((rating) => Number.isFinite(rating))
      const ratingCount = ratingValues.length
      const ratingSum = ratingValues.reduce((sum, rating) => sum + rating, 0)
      const reviewCount = backlogItems.filter((item) => String(item?.review_text ?? '').trim()).length
      const favoriteCount = backlogItems.filter((item) => item?.is_favorite === true).length
      const saveCount = backlogItems.length
      const avgRating = ratingCount ? (ratingSum / ratingCount).toFixed(1) : null
      const score = saveCount * 3 + reviewCount * 2 + ratingCount + favoriteCount

      return {
        ...album,
        ratingCount,
        ratingSum,
        reviewCount,
        favoriteCount,
        saveCount,
        avgRating,
        score,
        year: formatReleaseYear(album?.release_date),
        sortValue: getReleaseSortValue(album?.release_date),
        primaryTypeLabel: formatPrimaryType(album?.primary_type),
      }
    })
  }, [albums])

  const stats = useMemo(() => {
    let ratingCount = 0
    let ratingSum = 0
    let reviewCount = 0
    let saveCount = 0
    let favoriteCount = 0

    for (const album of processedAlbums) {
      ratingCount += Number(album?.ratingCount ?? 0) || 0
      ratingSum += Number(album?.ratingSum ?? 0) || 0
      reviewCount += Number(album?.reviewCount ?? 0) || 0
      saveCount += Number(album?.saveCount ?? 0) || 0
      favoriteCount += Number(album?.favoriteCount ?? 0) || 0
    }

    const avgRating = ratingCount ? (ratingSum / ratingCount).toFixed(1) : '0.0'

    return {
      albums: processedAlbums.length,
      avgRating,
      saves: saveCount,
      reviews: reviewCount,
      favorites: favoriteCount,
    }
  }, [processedAlbums])

  const releaseSpan = useMemo(() => {
    const years = processedAlbums
      .map((album) => Number(album?.year))
      .filter((year) => Number.isFinite(year))

    if (!years.length) return ''

    const firstYear = Math.min(...years)
    const latestYear = Math.max(...years)
    return firstYear === latestYear ? String(firstYear) : `${firstYear} - ${latestYear}`
  }, [processedAlbums])

  const latestReleaseYear = useMemo(() => {
    const years = processedAlbums
      .map((album) => Number(album?.year))
      .filter((year) => Number.isFinite(year))
    if (!years.length) return ''
    return String(Math.max(...years))
  }, [processedAlbums])

  const catalogFocus = useMemo(() => {
    const counts = new Map()

    for (const album of processedAlbums) {
      const type = String(album?.primary_type ?? '').trim()
      if (!type) continue
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }

    if (!counts.size) return 'Mixed releases'

    const [topType, topCount] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]
    if (topCount / Math.max(processedAlbums.length, 1) < 0.5) return 'Mixed releases'
    return formatCatalogFocus(topType)
  }, [processedAlbums])

  const notableAlbums = useMemo(() => {
    return [...processedAlbums]
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return right.sortValue - left.sortValue
      })
      .slice(0, 10)
  }, [processedAlbums])

  const descriptor = useMemo(() => {
    const disambiguation = String(artist?.disambiguation ?? '').trim()
    if (disambiguation) return disambiguation
    const country = String(artist?.country ?? '').trim()
    if (country) return `Artist profile from ${country}`
    return 'Artist profile and catalog highlights'
  }, [artist?.country, artist?.disambiguation])

  const sourceLabel = formatMetadataSource(artist?.metadata_source)
  const releaseCountLabel = `${stats.albums.toLocaleString()} ${stats.albums === 1 ? 'release' : 'releases'}`
  const archiveStatus = artist?.mbid ? 'Archive linked' : `${sourceLabel} catalog`

  const initials = (artist?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  const imageHasFailed = Boolean(artist?.image_url) && failedImageUrl === artist.image_url

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)
  const handleMobileSignOut = () => {
    signOut()
    closeSidebar()
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <MobileArtistHeader isSignedIn={isSignedIn} navUser={navUser} onOpenMenu={openSidebar} />
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
          <div className="space-y-5 md:space-y-10">
            <div className="hidden md:block">
              {isSignedIn ? (
                <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
              ) : (
                <NavbarGuest className="mx-auto mt-6 w-[min(100%,1080px)]" />
              )}
            </div>

            <div className="pt-3 md:hidden">
              <MobileBackRow onBack={() => navigate(-1)} />
            </div>

            <section className="border-b border-black/10 pb-5 pt-0 md:hidden">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Artist</p>
              <h1 className="mb-1 text-[1.9rem] leading-none text-text">Loading artist...</h1>
              <p className="mb-0 text-sm text-muted">Fetching artist details and albums.</p>
            </section>

            <section className="hidden md:block card vinyl-texture">
              <h1 className="mb-2 text-2xl">Loading artist...</h1>
              <p className="mb-0 text-sm text-muted">Fetching artist details and albums.</p>
            </section>
          </div>
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="min-h-screen">
        <MobileArtistHeader isSignedIn={isSignedIn} navUser={navUser} onOpenMenu={openSidebar} />
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
          <div className="space-y-5 md:space-y-10">
            <div className="hidden md:block">
              {isSignedIn ? (
                <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
              ) : (
                <NavbarGuest className="mx-auto mt-6 w-[min(100%,1080px)]" />
              )}
            </div>

            <div className="pt-3 md:hidden">
              <MobileBackRow onBack={() => navigate(-1)} />
            </div>

            <section className="border-b border-black/10 pb-5 pt-0 md:hidden">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Artist</p>
              <h1 className="mb-2 text-[1.9rem] leading-none text-text">Artist not found</h1>
              <p className="mb-4 text-sm text-muted">
                {fetchError || 'We could not find that artist. Try one of the featured artists instead.'}
              </p>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-500/40 bg-accent px-4 text-sm font-semibold text-[#1f130c] transition hover:bg-[#ef6b2f]"
                to="/artists"
              >
                Browse artists
              </Link>
            </section>

            <section className="hidden md:block card vinyl-texture">
              <h1 className="mb-2 text-2xl">Artist not found</h1>
              <p className="mb-4 text-sm text-muted">
                {fetchError || 'We could not find that artist. Try one of the featured artists instead.'}
              </p>
              <Link className="btn-primary inline-flex px-4 py-2 text-sm" to="/home">
                Back to home
              </Link>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <MobileArtistHeader isSignedIn={isSignedIn} navUser={navUser} onOpenMenu={openSidebar} />
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
        <div className="space-y-5 md:space-y-10">
          <div className="hidden md:block">
            {isSignedIn ? (
              <Navbar className="mx-auto mt-6 w-[min(100%,1080px)]" />
            ) : (
              <NavbarGuest className="mx-auto mt-6 w-[min(100%,1080px)]" />
            )}
          </div>

          <div className="pt-3 md:hidden">
            <MobileBackRow onBack={() => navigate(-1)} />
          </div>

          <section className="border-b border-black/10 pb-5 pt-0 md:hidden">
            <div className="flex items-start gap-3.5">
              <div className="w-[39%] max-w-[150px] shrink-0">
                <div className="overflow-hidden rounded-[1.1rem] border border-black/10 bg-accent/15 shadow-[0_16px_28px_-22px_rgba(15,15,15,0.4)]">
                  {artist.image_url && !imageHasFailed ? (
                    <img
                      src={artist.image_url}
                      alt={`${artist.name} portrait`}
                      className="aspect-[4/4.8] h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImageUrl(artist.image_url)}
                    />
                  ) : (
                    <div className="flex aspect-[4/4.8] items-center justify-center text-4xl font-semibold text-text">
                      {initials || 'N/A'}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Artist</p>
                <h1
                  className="mb-1 text-[2.15rem] leading-[0.9] tracking-[-0.028em] text-black/90"
                  style={{ textWrap: 'balance' }}
                >
                  {artist.name}
                </h1>
                <p className="mb-0 text-[13px] leading-5 text-black/62">{descriptor}</p>

                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">
                  {artist.country ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/65 px-2 py-1">
                      <MapPinLine size={11} />
                      {artist.country}
                    </span>
                  ) : null}
                  {releaseSpan ? (
                    <span className="rounded-full border border-black/10 bg-white/65 px-2 py-1">
                      {releaseSpan}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-black/10 bg-white/65 px-2 py-1">
                    {sourceLabel}
                  </span>
                </div>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-black/10 pt-3 text-[11px]">
              <div>
                <dt className="text-muted">Catalog</dt>
                <dd className="mb-0 mt-0.5 font-semibold text-text">{catalogFocus}</dd>
              </div>
              <div>
                <dt className="text-muted">Releases</dt>
                <dd className="mb-0 mt-0.5 font-semibold text-text">{releaseCountLabel}</dd>
              </div>
              <div>
                <dt className="text-muted">Years</dt>
                <dd className="mb-0 mt-0.5 font-semibold text-text">{releaseSpan || 'No year data'}</dd>
              </div>
              <div>
                <dt className="text-muted">Latest</dt>
                <dd className="mb-0 mt-0.5 font-semibold text-text">{latestReleaseYear || 'N/A'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Archive</dt>
                <dd className="mb-0 mt-0.5 font-semibold text-text">{archiveStatus}</dd>
              </div>
            </dl>

            <div className="mt-3.5">
              <Link
                to="/artists"
                className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-black/10 bg-white/72 px-4 text-sm font-semibold text-black/72 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
              >
                Browse artists
              </Link>
            </div>

            <section className="mt-3.5 rounded-2xl border border-black/10 bg-white/55 p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <MobileStat
                  label="Albums"
                  value={stats.albums.toLocaleString()}
                  helper={releaseSpan ? `${releaseSpan} catalog` : 'Catalog size'}
                />
                <MobileStat
                  label="Avg rating"
                  value={stats.avgRating}
                  helper={stats.avgRating !== '0.0' ? 'Community ratings' : 'No ratings yet'}
                  emphasize={stats.avgRating !== '0.0'}
                />
                <MobileStat
                  label="Saves"
                  value={stats.saves.toLocaleString()}
                  helper="Community logs"
                />
                <MobileStat
                  label="Reviews"
                  value={stats.reviews.toLocaleString()}
                  helper="Written reactions"
                />
              </div>
            </section>
          </section>

          <section id="artist-notable-albums" className="scroll-mt-24 border-b border-black/10 pb-2 pt-4 md:hidden">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Discography
                </p>
                <h2 className="mb-0 text-[1.42rem] leading-tight text-text">Notable albums</h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {notableAlbums.length} shown
              </span>
            </div>

            {notableAlbums.length ? (
              <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
                {notableAlbums.map((album, index) => (
                  <MobileAlbumRow
                    key={album.id ?? `${album.title}-${album.cover_art_url ?? index}`}
                    album={album}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-black/10 bg-white/55 px-3.5 py-3 text-[13px] text-muted">
                No albums are available for this artist yet.
              </div>
            )}
          </section>

          <main className="hidden md:block space-y-5 lg:space-y-6">
            <section className="card vinyl-texture relative overflow-hidden p-0">
              <div className="relative grid lg:grid-cols-[296px_minmax(0,1fr)] lg:items-start">
                <div className="border-b border-black/5 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                  <div className="mx-auto max-w-[310px]">
                    <div className="relative overflow-hidden bg-black/4 shadow-[0_24px_42px_-30px_rgba(15,15,15,0.4)]">
                      {artist.image_url && !imageHasFailed ? (
                        <img
                          src={artist.image_url}
                          alt={`${artist.name} portrait`}
                          className="aspect-[4/4.7] h-full w-full object-cover object-center"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImageUrl(artist.image_url)}
                        />
                      ) : (
                        <div className="flex aspect-[4/4.7] items-center justify-center bg-black/6 text-5xl font-semibold text-text">
                          {initials || 'N/A'}
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(15,15,15,0.18)_100%)]" />
                    </div>

                    <div className="mt-3 rounded-[18px] bg-white/72 px-3 py-2.5 shadow-[0_18px_34px_-28px_rgba(15,15,15,0.32)] backdrop-blur-md">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/52">
                        {artist.country ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-white/72 px-2.5 py-1">
                            <MapPinLine size={11} />
                            {artist.country}
                          </span>
                        ) : null}
                        {releaseSpan ? (
                          <span className="rounded-full border border-black/8 bg-white/72 px-2.5 py-1">
                            {releaseSpan}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-black/8 bg-white/72 px-2.5 py-1">
                          {sourceLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 lg:p-6">
                  <div className="flex h-full flex-col gap-4">
                    <div className="space-y-4">
                      <div className="max-w-[720px]">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
                          Artist
                        </p>
                        <h1
                          className="mb-2 max-w-[11ch] text-[2.9rem] leading-[0.88] tracking-[-0.035em] text-black/90 sm:text-[3.7rem] lg:text-[4.35rem]"
                          style={{ textWrap: 'balance' }}
                        >
                          {artist.name}
                        </h1>
                        <p className="mb-0 max-w-[52ch] text-[15px] leading-6 text-black/64 sm:text-[15.5px]">
                          {descriptor}
                        </p>
                      </div>

                      <div className="space-y-2.5 border-t border-black/5 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {artist.country ? (
                            <MetaPill label="Origin" value={artist.country} icon={<MapPinLine size={12} />} />
                          ) : null}
                          <MetaPill label="Catalog" value={catalogFocus} />
                          <MetaPill label="Releases" value={releaseCountLabel} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <MetaPill label="Years" value={releaseSpan || 'No year data'} />
                          <MetaPill label="Latest" value={latestReleaseYear || 'N/A'} />
                          <MetaPill label="Archive" value={archiveStatus} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <Link
                            to="/artists"
                            className="inline-flex items-center rounded-full border border-black/10 bg-white/82 px-4 py-2 text-sm font-semibold text-black/76 shadow-[0_10px_20px_-18px_rgba(15,15,15,0.32)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
                          >
                            Browse artists
                          </Link>
                        </div>
                      </div>
                    </div>

                    <section className="rounded-[22px] border border-black/5 bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_16px_30px_-28px_rgba(15,15,15,0.32)]">
                      <div className="grid grid-cols-2 divide-y divide-black/5 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        <HeroStat
                          label="Albums"
                          value={stats.albums.toLocaleString()}
                          helper={releaseSpan ? `${releaseSpan} catalog` : 'Catalog size'}
                        />
                        <HeroStat
                          label="Avg rating"
                          value={stats.avgRating ?? 'N/A'}
                          helper={stats.avgRating !== '0.0' ? 'Across community ratings' : 'No ratings yet'}
                          emphasize={stats.avgRating !== '0.0'}
                        />
                        <HeroStat
                          label="Saves"
                          value={stats.saves.toLocaleString()}
                          helper="Community logs"
                        />
                        <HeroStat
                          label="Reviews"
                          value={stats.reviews.toLocaleString()}
                          helper="Written reactions"
                        />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="artist-notable-albums-desktop"
              className="card vinyl-texture scroll-mt-24 overflow-hidden p-0"
            >
              <div className="border-b border-black/5 px-6 py-4 sm:px-7 lg:px-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                      Discography
                    </p>
                    <h2 className="mb-1 text-2xl text-text sm:text-[1.95rem]">Notable albums</h2>
                    <p className="mb-0 max-w-2xl text-sm text-black/58">
                      Album-first catalog highlights shaped by release activity and community response.
                    </p>
                  </div>

                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/38">
                    Showing {notableAlbums.length}
                  </div>
                </div>
              </div>

              {notableAlbums.length ? (
                <div className="divide-y divide-black/5">
                  {notableAlbums.map((album, index) => (
                    <AlbumListItem
                      key={album.id ?? `${album.title}-${album.cover_art_url ?? index}`}
                      album={album}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 sm:px-7 lg:px-8">
                  <div className="rounded-3xl border border-black/5 bg-white/68 px-5 py-6 text-sm text-muted">
                    No albums are available for this artist yet.
                  </div>
                </div>
              )}
            </section>
          </main>
      </div>
    </div>
    </div>
  )
}

