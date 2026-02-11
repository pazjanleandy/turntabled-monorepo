import { Link } from 'react-router-dom'
import NavbarGuest from '../components/NavbarGuest.jsx'

const artists = [
  {
    name: 'chouchou merged syrups.',
    id: 'chouchou',
    initials: 'CS',
    note: 'Dream pop / shoegaze',
  },
  {
    name: 'Starsailor',
    id: 'starsailor',
    initials: 'SS',
    note: 'Alt rock / indie',
  },
  {
    name: 'The Strokes',
    id: 'strokes',
    initials: 'TS',
    note: 'Indie rock / garage',
  },
]

export default function Artists() {
  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />

        <section className="card vinyl-texture">
          <div className="flex flex-col gap-3">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Artists
            </p>
            <h1 className="mb-0 text-2xl text-text">View artists</h1>
            <p className="mb-0 max-w-2xl text-sm text-muted">
              Placeholder list of featured artists. Jump into any profile.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              to={`/artist/${artist.id}`}
              className="group rounded-2xl border border-black/5 bg-white/75 p-4 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)] transition hover:-translate-y-1 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/5 bg-accent/15 text-sm font-semibold text-accent">
                  {artist.initials}
                </div>
                <div className="min-w-0">
                  <p className="mb-1 truncate text-sm font-semibold text-text">
                    {artist.name}
                  </p>
                  <p className="mb-0 text-xs text-muted">{artist.note}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
