import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookmarkSimple, Heart, MusicNotes, Queue, Star } from 'phosphor-react'
import NavbarGuest from '../components/NavbarGuest.jsx'
import StarRating from '../components/StarRating.jsx'
import { loadArtists } from '../data/loadArtists.js'

export default function ArtistPage() {
  const { artistId } = useParams()
  const artists = useMemo(() => loadArtists(), [])
  const artist = artists.find((item) => item.id === artistId)
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState('listening')
  const initials = (artist?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  if (!artist) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
          <section className="card vinyl-texture">
            <h1 className="mb-2 text-2xl">Artist not found</h1>
            <p className="mb-4 text-sm text-muted">
              We could not find that artist. Try one of the featured artists instead.
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
        <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="card vinyl-texture p-4">
            <div className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)]">
              <div className="mb-4 flex aspect-square items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(247,121,62,0.25),rgba(15,15,15,0.12))] text-4xl font-semibold text-text">
                {initials}
              </div>
              <button className="btn-primary mb-3 w-full py-2 text-sm">Log or review</button>
              <div className="mb-4 flex justify-center">
                <StarRating
                  value={rating}
                  onChange={setRating}
                  step={0.5}
                  size={20}
                  ariaLabel={`Rate ${artist.name}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    status === 'played'
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-black/5 bg-white/70 text-text hover:bg-white'
                  }`}
                  onClick={() => setStatus('played')}
                >
                  <span className="flex items-center justify-center gap-1">
                    <MusicNotes size={14} />
                    Played
                  </span>
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    status === 'listening'
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-black/5 bg-white/70 text-text hover:bg-white'
                  }`}
                  onClick={() => setStatus('listening')}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Star size={14} />
                    Listening
                  </span>
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    status === 'backlog'
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-black/5 bg-white/70 text-text hover:bg-white'
                  }`}
                  onClick={() => setStatus('backlog')}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Queue size={14} />
                    Backlog
                  </span>
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    status === 'wishlist'
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-black/5 bg-white/70 text-text hover:bg-white'
                  }`}
                  onClick={() => setStatus('wishlist')}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Heart size={14} />
                    Wishlist
                  </span>
                </button>
              </div>
              <button className="mt-3 w-full rounded-xl border border-black/5 bg-white/70 py-2 text-sm font-semibold text-text transition hover:bg-white">
                <span className="flex items-center justify-center gap-1">
                  <BookmarkSimple size={16} />
                  Add to lists
                </span>
              </button>
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
                  {artist.origin}
                </span>
              </div>

              <p className="mb-4 mt-2 max-w-3xl text-sm text-muted">{artist.bio}</p>

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
                <p className="mb-0 text-3xl font-semibold text-text">
                  {artist.notableAlbums?.length ?? 0}
                </p>
              </article>
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Avg rating</p>
                <p className="mb-0 text-3xl font-semibold text-text">
                  {(3.2 + (artist.notableAlbums?.length ?? 0) * 0.3).toFixed(1)}
                </p>
              </article>
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Followers</p>
                <p className="mb-0 text-3xl font-semibold text-text">
                  {(artist.name.length * 97).toLocaleString()}
                </p>
              </article>
              <article className="card vinyl-texture p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Reviews</p>
                <p className="mb-0 text-3xl font-semibold text-text">
                  {(artist.name.length * 11).toLocaleString()}
                </p>
              </article>
            </section>

            <section className="card vinyl-texture">
              <h2 className="mb-3 text-lg">Notable albums</h2>
              <ul className="m-0 list-none space-y-2 p-0 text-sm text-muted">
                {artist.notableAlbums?.map((album) => (
                  <li key={album} className="flex items-center justify-between">
                    <span className="text-text">{album}</span>
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
