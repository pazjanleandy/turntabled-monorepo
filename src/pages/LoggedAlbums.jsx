import { useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Queue,
  Star,
  StarHalf,
  ListChecks,
} from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import BackButton from '../components/BackButton.jsx'
import CoverImage from '../components/CoverImage.jsx'
import StarRating from '../components/StarRating.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { loggedAlbums } from '../data/loggedAlbums.js'

const FILTER_OPTIONS = [
  { id: 'user-rating', label: 'User rating', icon: Star },
  { id: 'plan', label: 'Plan to listen', icon: Queue },
  { id: 'avg-rating', label: 'Avg rating', icon: StarHalf, mapTo: 'rating-desc' },
  { id: 'rating-desc', label: 'User rating desc', icon: ArrowDown },
  { id: 'rating-asc', label: 'User rating asc', icon: ArrowUp },
]

function resolveFilter(filter) {
  if (filter === 'avg-rating') return 'rating-desc'
  return filter
}

function applyFilter(items, filter) {
  const resolved = resolveFilter(filter)

  if (resolved === 'plan') {
    return items.filter((item) => item.status === 'plan')
  }

  const rated = items.filter((item) => item.rating > 0)

  if (resolved === 'rating-desc') {
    return [...rated].sort((a, b) => b.rating - a.rating)
  }

  if (resolved === 'rating-asc') {
    return [...rated].sort((a, b) => a.rating - b.rating)
  }

  return rated
}

export default function LoggedAlbums() {
  const { isSignedIn } = useAuthStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('filter') ?? 'user-rating'
  const filteredAlbums = useMemo(
    () => applyFilter(loggedAlbums, activeFilter),
    [activeFilter],
  )

  const handleFilterSelect = (option) => {
    const next = option.mapTo ?? option.id
    setSearchParams({ filter: next })
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {isSignedIn ? (
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        ) : (
          <NavbarGuest className="mx-auto mt-6 w-[min(100%,900px)]" />
        )}
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Logged albums
              </p>
              <h1 className="mb-0 text-2xl text-text">Your library</h1>
              <p className="mb-0 mt-2 text-sm text-muted">
                Track what you have rated and what is still in the queue.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-semibold text-text">
              <ListChecks size={14} weight="bold" />
              {filteredAlbums.length} items
            </div>
          </div>
        </section>

        <section className="card vinyl-texture">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Filter
            </span>
            {FILTER_OPTIONS.map((option) => {
              const Icon = option.icon
              const isActive =
                resolveFilter(activeFilter) === resolveFilter(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleFilterSelect(option)}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition',
                    isActive
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-black/10 bg-white/70 text-muted hover:text-text',
                  ].join(' ')}
                >
                  <Icon size={14} weight="bold" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          {filteredAlbums.map((album) => {
            const statusLabel =
              album.status === 'plan' ? 'Plan to listen' : 'Logged'
            const albumLink = album.releaseId
              ? `/album/${album.releaseId}`
              : null

            return (
              <article
                key={album.id}
                className="card vinyl-texture flex flex-col gap-4 md:flex-row md:items-center"
              >
                <div className="flex items-center gap-4">
                  <CoverImage
                    src={album.cover}
                    alt={`${album.title} cover`}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    {albumLink ? (
                      <Link
                        to={albumLink}
                        className="mb-0 block text-sm font-semibold text-text transition hover:text-accent"
                      >
                        {album.title}
                      </Link>
                    ) : (
                      <p className="mb-0 text-sm font-semibold text-text">
                        {album.title}
                      </p>
                    )}
                    <p className="mb-0 text-xs text-muted">
                      {album.artist} · {album.year}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {statusLabel}
                  </span>
                  {album.rating > 0 ? (
                    <StarRating value={album.rating} readOnly size={14} />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      Not rated
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </div>
  )
}
