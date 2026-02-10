import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { loadArtists } from '../data/loadArtists.js'

export default function ArtistPage() {
  const { artistId } = useParams()
  const artists = useMemo(() => loadArtists(), [])
  const artist = artists.find((item) => item.id === artistId)

  if (!artist) {
    return (
      <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
          <section className="card vinyl-texture">
            <h1 className="mb-2 text-2xl">Artist not found</h1>
            <p className="mb-4 text-sm text-muted">
              We could not find that artist. Try one of the featured artists instead.
            </p>
            <Link className="btn-primary inline-flex px-4 py-2 text-sm" to="/">
              Back to home
            </Link>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

        <section className="card vinyl-texture">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Artist
          </p>
          <h1 className="mb-2 text-3xl">{artist.name}</h1>
          <p className="mb-4 text-sm text-muted">{artist.bio}</p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
              {artist.origin}
            </span>
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
    </div>
  )
}

