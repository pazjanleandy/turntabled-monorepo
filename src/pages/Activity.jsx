import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FunnelSimple, MagnifyingGlass, Star } from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import BackButton from '../components/BackButton.jsx'
import CoverImage from '../components/CoverImage.jsx'
import { albumCatalog } from '../data/albumData.js'
import { loggedAlbums } from '../data/loggedAlbums.js'

const FILTER_OPTIONS = [
  { value: 'added-latest', label: 'Added (Latest)' },
  { value: 'added-oldest', label: 'Added (Oldest)' },
  { value: 'rating-desc', label: 'User Rating (Descending)' },
  { value: 'rating-asc', label: 'User Rating (Ascending)' },
  { value: 'title-asc', label: 'Alphabetical (A-Z)' },
  { value: 'title-desc', label: 'Alphabetical (Z-A)' },
]

const DEFAULT_FILTER = 'added-latest'
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const formatDate = (value) => dateFormatter.format(new Date(value))

export default function Activity() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const filterFromUrl = searchParams.get('filter')
  const activeFilter =
    FILTER_OPTIONS.find((option) => option.value === filterFromUrl)?.value ??
    DEFAULT_FILTER

  const logs = useMemo(
    () =>
      loggedAlbums
        .map((entry) => {
          const album = albumCatalog[entry.albumId]
          if (!album) return null
          return {
            ...album,
            ...entry,
            addedTimestamp: new Date(entry.addedAt).getTime(),
            releaseTimestamp: new Date(album.releaseDate).getTime(),
          }
        })
        .filter(Boolean),
    [],
  )

  const summary = useMemo(() => {
    if (!logs.length) {
      return {
        count: 0,
        averageRating: '0.0',
        latestAdded: null,
      }
    }
    const total = logs.reduce((sum, log) => sum + log.rating, 0)
    const latest = logs.reduce((current, log) =>
      log.addedTimestamp > current.addedTimestamp ? log : current,
    )
    return {
      count: logs.length,
      averageRating: (total / logs.length).toFixed(2),
      latestAdded: latest.addedAt,
    }
  }, [logs])

  const visibleLogs = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = !term
      ? logs
      : logs.filter((entry) => {
          const haystack = `${entry.title} ${entry.artist} ${(entry.genres ?? []).join(
            ' ',
          )}`.toLowerCase()
          return haystack.includes(term)
        })

    const sorted = [...filtered]
    if (activeFilter === 'added-oldest') {
      sorted.sort((a, b) => a.addedTimestamp - b.addedTimestamp)
    } else if (activeFilter === 'added-latest') {
      sorted.sort((a, b) => b.addedTimestamp - a.addedTimestamp)
    } else if (activeFilter === 'rating-desc') {
      sorted.sort((a, b) => b.rating - a.rating)
    } else if (activeFilter === 'rating-asc') {
      sorted.sort((a, b) => a.rating - b.rating)
    } else if (activeFilter === 'title-asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (activeFilter === 'title-desc') {
      sorted.sort((a, b) => b.title.localeCompare(a.title))
    }

    return sorted
  }, [logs, query, activeFilter])

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
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Activity
              </p>
              <h1 className="mb-2 text-2xl text-text">Logged albums</h1>
              <p className="mb-0 max-w-2xl text-sm text-muted">
                Search your listening logs, filter by rating, and jump back into each
                release.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              <span className="rounded-full bg-white/80 px-3 py-1 shadow-subtle">
                {summary.count} logs
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 shadow-subtle">
                Avg {summary.averageRating}
              </span>
              {summary.latestAdded ? (
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-subtle">
                  Latest {formatDate(summary.latestAdded)}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1 text-sm font-semibold text-text">
            <span className="sr-only">Search logged albums</span>
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by album, artist, or genre"
              className="w-full rounded-xl border border-black/10 bg-white px-10 py-2 text-sm font-medium text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="relative text-sm font-semibold text-text">
            <span className="sr-only">Sort and filter</span>
            <FunnelSimple
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <select
              value={activeFilter}
              onChange={handleFilterChange}
              className="w-full min-w-[240px] rounded-xl border border-black/10 bg-white px-10 py-2 text-sm font-semibold text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20 md:w-auto"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            <span>Logged albums</span>
            <span>
              {visibleLogs.length} result{visibleLogs.length === 1 ? '' : 's'}
            </span>
          </div>
          {visibleLogs.length === 0 ? (
            <div className="rounded-soft border border-black/5 bg-white/75 p-6 text-sm text-muted shadow-subtle">
              No logs matched your search. Try a different keyword or filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleLogs.map((entry) => (
                <article
                  key={entry.logId}
                  className="rounded-soft border border-black/5 bg-white/75 p-4 shadow-subtle"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-soft border border-black/10 bg-black/5">
                        <CoverImage
                          src={entry.photo}
                          alt={`${entry.title} cover`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Link
                            to={`/album/${entry.albumId}`}
                            className="text-base font-semibold text-text transition hover:text-accent"
                          >
                            {entry.title}
                          </Link>
                          <p className="mb-0 text-xs text-muted">
                            {entry.artist} - {entry.year} - {entry.format}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                          <span className="rounded-full bg-white/80 px-3 py-1 text-text shadow-subtle">
                            Added {formatDate(entry.addedAt)}
                          </span>
                          <span className="rounded-full bg-accent/15 px-3 py-1 text-accent">
                            Released {formatDate(entry.releaseDate)}
                          </span>
                          <span className="rounded-full bg-white/80 px-3 py-1 text-text shadow-subtle">
                            {entry.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm lg:flex-col lg:items-end lg:gap-2">
                      <div className="flex items-center gap-1 text-accent">
                        <Star size={16} weight="fill" className="text-accent" />
                        <span className="text-sm font-semibold text-text">
                          {entry.rating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-muted">
                        {entry.length} - {entry.type}
                      </span>
                    </div>
                  </div>

                  <p className="mb-0 mt-3 text-sm text-muted">&quot;{entry.note}&quot;</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(entry.genres ?? []).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-black/5 bg-white/70 px-3 py-1 text-[11px] font-semibold text-text"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
