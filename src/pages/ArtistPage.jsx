import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { supabase } from '../supabase.js'

export default function ArtistPage() {
  const { isSignedIn } = useAuthStatus()
  const { normalized_name } = useParams()
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [hasImageError, setHasImageError] = useState(false)

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
          country,
          disambiguation,
          image_url,
          album (
            id,
            title,
            cover_art_url,
            release_date,
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

  useEffect(() => {
    setHasImageError(false)
  }, [artist?.image_url])

  const stats = useMemo(() => {
    const backlogItems = albums.flatMap((album) =>
      Array.isArray(album?.backlog) ? album.backlog : [],
    )
    const ratings = backlogItems
      .map((item) => Number(item?.rating))
      .filter((rating) => Number.isFinite(rating))
    const reviews = backlogItems.filter((item) => String(item?.review_text ?? '').trim()).length
    const favorites = backlogItems.filter((item) => item?.is_favorite === true).length
    const avgRating = ratings.length
      ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
      : '0.0'

    return {
      albums: albums.length,
      avgRating,
      favorites,
      reviews,
    }
  }, [albums])

  const initials = (artist?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  if (isLoading) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          {isSignedIn ? (
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          ) : (
            <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          )}
          <section className="card vinyl-texture">
            <h1 className="mb-2 text-2xl">Loading artist...</h1>
            <p className="mb-0 text-sm text-muted">Fetching artist details and albums.</p>
          </section>
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          {isSignedIn ? (
            <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          ) : (
            <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          )}
          <section className="card vinyl-texture">
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
    )
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="card vinyl-texture p-4">
            <div className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)]">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-accent/15 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)]">
                {artist.image_url && !hasImageError ? (
                  <img
                    src={artist.image_url}
                    alt={`${artist.name} portrait`}
                    className="aspect-square h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setHasImageError(true)}
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-4xl font-semibold text-text">
                    {initials || 'N/A'}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="card vinyl-texture">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                    Artist
                  </p>
                  <h1 className="mb-2 text-3xl">{artist.name}</h1>
                </div>
                <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {artist.country || 'N/A'}
                </span>
              </div>

              <p className="mb-4 mt-2 max-w-3xl text-sm text-muted">
                {artist.disambiguation || 'No description available.'}
              </p>

              <div className="flex flex-wrap gap-2">
                {artist.genres?.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Albums</p>
                <p className="mb-0 text-3xl font-semibold text-text">{stats.albums}</p>
              </article>
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Avg rating</p>
                <p className="mb-0 text-3xl font-semibold text-text">{stats.avgRating}</p>
              </article>
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Followers</p>
                <p className="mb-0 text-3xl font-semibold text-text">{stats.favorites.toLocaleString()}</p>
              </article>
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Reviews</p>
                <p className="mb-0 text-3xl font-semibold text-text">{stats.reviews.toLocaleString()}</p>
              </article>
            </section>

            <section className="card vinyl-texture">
              <h2 className="mb-3 text-lg">Notable albums</h2>
              <ul className="m-0 list-none space-y-2 p-0 text-sm text-muted">
                {albums.map((album) => (
                  <li
                    key={album.id ?? `${album.title}-${album.cover_art_url ?? ''}`}
                    className="flex items-center justify-between"
                  >
                    <span className="text-text">{album.title}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted">
                      {artist.name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}
