import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

const FILTER_OPTIONS = [
  { value: 'a-z', label: 'Alphabetical A-Z' },
  { value: 'z-a', label: 'Alphabetical Z-A' },
  { value: 'user-rating', label: 'User rating' },
  { value: 'personal-rating', label: 'Personal rating' },
  { value: 'popular-year', label: 'Popular year' },
  { value: 'popular-week', label: 'Popular week' },
]

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fallbackFilter = FILTER_OPTIONS[0]?.value ?? 'a-z'
  const activeFilter = searchParams.get('filter') ?? fallbackFilter

  const handleFilterChange = (event) => {
    const next = event.target.value
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('filter', next)
    setSearchParams(nextParams)
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex-1 text-sm font-semibold text-text">
            <span className="sr-only">Search albums</span>
            <input
              type="text"
              placeholder="Search albums, artists, or lists"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="text-sm font-semibold text-text">
            <span className="sr-only">Sort and filter</span>
            <select
              value={activeFilter}
              onChange={handleFilterChange}
              className="w-full min-w-55 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20 md:w-auto"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card vinyl-texture">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Coming soon
            </p>
            <h2 className="mb-1 text-lg text-text">Trending albums</h2>
            <p className="mb-0 text-sm text-muted">
              A leaderboard of what&apos;s on repeat right now.
            </p>
          </div>
          <div className="card vinyl-texture">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Coming soon
            </p>
            <h2 className="mb-1 text-lg text-text">Curated lists</h2>
            <p className="mb-0 text-sm text-muted">
              Hand-picked albums by mood, genre, and era.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
