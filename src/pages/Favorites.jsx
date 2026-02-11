import Navbar from '../components/Navbar.jsx'
import BackButton from '../components/BackButton.jsx'

export default function Favorites() {
  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="flex flex-col gap-3">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Favorites
            </p>
            <h1 className="mb-0 text-2xl text-text">Your top albums</h1>
            <p className="mb-0 max-w-2xl text-sm text-muted">
              Placeholder page for your favorite albums and saved highlights.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card vinyl-texture">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Coming soon
            </p>
            <h2 className="mb-1 text-lg text-text">Pinned favorites</h2>
            <p className="mb-0 text-sm text-muted">
              A spotlight on the albums you never skip.
            </p>
          </div>
          <div className="card vinyl-texture">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Coming soon
            </p>
            <h2 className="mb-1 text-lg text-text">Favorite artists</h2>
            <p className="mb-0 text-sm text-muted">
              The artists you return to the most.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
