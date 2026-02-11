import Navbar from '../components/Navbar.jsx'

export default function Activity() {
  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

        <section className="card vinyl-texture">
          <div className="flex flex-col gap-3">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Activity
            </p>
            <h1 className="mb-0 text-2xl text-text">Your recent logs</h1>
            <p className="mb-0 max-w-2xl text-sm text-muted">
              Placeholder page for your listening history and recent reviews.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card vinyl-texture">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Coming soon
            </p>
            <h2 className="mb-1 text-lg text-text">Latest listens</h2>
            <p className="mb-0 text-sm text-muted">
              A feed of the albums you logged most recently.
            </p>
          </div>
          <div className="card vinyl-texture">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Coming soon
            </p>
            <h2 className="mb-1 text-lg text-text">Review snapshots</h2>
            <p className="mb-0 text-sm text-muted">
              Quick access to your notes and ratings.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
