import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import PopularAlbumsSection from '../components/PopularAlbumsSection.jsx'
import StatsPanel from '../components/StatsPanel.jsx'
import RecentlyListenedSection from '../components/RecentlyListenedSection.jsx'
import RecentActivitySection from '../components/RecentActivitySection.jsx'
import Footer from '../components/Footer.jsx'
import { ChatCircle, Headphones, Heart, PlusCircle, UserPlus } from 'phosphor-react'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'

const LOG_STATUSES = new Set(['listened'])
const BACKLOG_STATUSES = new Set(['listening', 'unfinished', 'backloggd'])

function formatRelativeTime(value) {
  if (!value) return 'just now'
  const now = Date.now()
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'just now'

  const diffMs = Math.max(0, now - then)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  if (diffMs < minute) return 'just now'
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute)
    return `${n} min${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour)
    return `${n}h ago`
  }
  if (diffMs < week) {
    const n = Math.floor(diffMs / day)
    return `${n} day${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < month) {
    const n = Math.floor(diffMs / week)
    return `${n} week${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < year) {
    const n = Math.floor(diffMs / month)
    return `${n} month${n === 1 ? '' : 's'} ago`
  }

  const n = Math.floor(diffMs / year)
  return `${n} year${n === 1 ? '' : 's'} ago`
}

const recentActivity = [
  {
    id: 'friend-1',
    icon: <Headphones size={16} weight="bold" />,
    text: 'Ari listened to In Rainbows',
    meta: 'Radiohead - 45 min ago',
    cover: '/album/currents.jpg',
  },
  {
    id: 'friend-2',
    icon: <Heart size={16} weight="bold" />,
    text: 'Maya liked your review',
    meta: 'Phoebe Bridgers - 1h ago',
    cover: '/album/igor.jpg',
  },
  {
    id: 'friend-3',
    icon: <ChatCircle size={16} weight="bold" />,
    text: 'Nico commented on your log',
    meta: 'Frank Ocean - 3h ago',
    cover: '/album/blond.jpg',
  },
  {
    id: 'friend-4',
    icon: <PlusCircle size={16} weight="bold" />,
    text: 'June added Renaissance to backlog',
    meta: 'Beyonce - Yesterday',
    cover: '/album/ram.jpg',
  },
  {
    id: 'friend-5',
    icon: <UserPlus size={16} weight="bold" />,
    text: 'Sam followed you',
    meta: 'Indie + Jazz playlists',
  },
]

export default function Home() {
  const { isSignedIn } = useAuthStatus()
  const [search, setSearch] = useState('')
  const [popularAlbums, setPopularAlbums] = useState([])
  const [isPopularLoading, setIsPopularLoading] = useState(false)
  const [popularError, setPopularError] = useState('')
  const [recentlyListened, setRecentlyListened] = useState([])
  const [backlogStats, setBacklogStats] = useState({ listened: 0, backlog: 0, logs: 0 })
  const [userActivity, setUserActivity] = useState([])
  const [isRecentLoading, setIsRecentLoading] = useState(false)
  const [recentError, setRecentError] = useState('')

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadPopularAlbums() {
      setIsPopularLoading(true)
      setPopularError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const response = await fetch(`${apiBase}/api/explore/popular?page=1&limit=20`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load popular albums.')
        }

        const payload = await response.json()
        const items = Array.isArray(payload?.items) ? payload.items : []

        if (!cancelled) {
          setPopularAlbums(items)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setPopularError(error?.message ?? 'Unable to load popular albums.')
          setPopularAlbums([])
        }
      } finally {
        if (!cancelled) {
          setIsPopularLoading(false)
        }
      }
    }

    loadPopularAlbums()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!isSignedIn) {
      setRecentlyListened([])
      setBacklogStats({ listened: 0, backlog: 0, logs: 0 })
      setUserActivity([])
      setRecentError('')
      setIsRecentLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function loadRecentlyListened() {
      setIsRecentLoading(true)
      setRecentError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        const limit = 50
        let page = 1
        let total = 0
        let allItems = []

        while (!cancelled) {
          const response = await fetch(`${apiBase}/api/backlog?page=${page}&limit=${limit}`, {
            headers: authHeaders,
            signal: controller.signal,
          })
          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error?.message ?? 'Failed to load recently listened.')
          }

          const items = Array.isArray(payload?.items) ? payload.items : []
          total = Number(payload?.total ?? 0)
          allItems = allItems.concat(items)

          if (items.length === 0 || allItems.length >= total) break
          page += 1
        }

        const mapped = allItems.map((item) => ({
          id: item.id,
          artist: item.artistNameRaw ?? 'Unknown Artist',
          album: item.albumTitleRaw ?? 'Unknown Album',
          cover: item.coverArtUrl || '/album/am.jpg',
          rating: item.rating ?? 0,
          status: item.status ?? 'backloggd',
          addedAt: item.addedAt ?? null,
        }))

        const logsCount = mapped.reduce(
          (sum, item) => sum + (LOG_STATUSES.has(item.status) ? 1 : 0),
          0,
        )
        const backlogCount = mapped.reduce(
          (sum, item) => sum + (BACKLOG_STATUSES.has(item.status) ? 1 : 0),
          0,
        )
        const activity = mapped.slice(0, 3).map((item) => {
          const isLog = LOG_STATUSES.has(item.status)
          return {
            id: `you-${item.id}`,
            icon: isLog ? (
              <Headphones size={16} weight="bold" />
            ) : (
              <PlusCircle size={16} weight="bold" />
            ),
            text: isLog ? `You logged ${item.album}` : `You added ${item.album} to backlog`,
            meta: `${item.artist} - ${formatRelativeTime(item.addedAt)}`,
            cover: item.cover,
          }
        })

        if (!cancelled) {
          setRecentlyListened(mapped)
          setBacklogStats({
            listened: mapped.length,
            backlog: backlogCount,
            logs: logsCount,
          })
          setUserActivity(activity)
        }
      } catch (error) {
        if (error?.name === 'AbortError') return
        if (!cancelled) {
          setRecentlyListened([])
          setBacklogStats({ listened: 0, backlog: 0, logs: 0 })
          setUserActivity([])
          setRecentError(error?.message ?? 'Unable to load recently listened.')
        }
      } finally {
        if (!cancelled) {
          setIsRecentLoading(false)
        }
      }
    }

    loadRecentlyListened()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSignedIn])

  const filteredPopular = useMemo(() => {
    if (!search.trim()) return popularAlbums

    const term = search.toLowerCase()
    return popularAlbums.filter((item) => {
      const artistName = item?.artist?.name ?? item?.artist?.nameRaw ?? ''
      const albumTitle = item?.album?.title ?? item?.album?.titleRaw ?? ''
      return artistName.toLowerCase().includes(term) || albumTitle.toLowerCase().includes(term)
    })
  }, [popularAlbums, search])

  const stats = useMemo(
    () => [
      { label: 'Listened', value: String(backlogStats.listened) },
      { label: 'Backlog', value: String(backlogStats.backlog) },
      { label: 'Logs', value: String(backlogStats.logs) },
    ],
    [backlogStats],
  )

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="relative">
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        </div>
        <main className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="min-w-0 space-y-8">
            <PopularAlbumsSection
              albums={filteredPopular}
              search={search}
              onSearchChange={setSearch}
              isLoading={isPopularLoading}
              error={popularError}
            />
            <RecentlyListenedSection
              albums={recentlyListened}
              isLoading={isRecentLoading}
              error={recentError}
              isSignedIn={isSignedIn}
            />
          </div>
          <StatsPanel stats={stats} userActivity={userActivity} />
        </main>
        <RecentActivitySection activity={recentActivity} />
        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Featured artists
              </p>
              <h2 className="mb-0 text-xl">Explore artist pages</h2>
            </div>
            <Link
              to="/artist/chouchou"
              className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              View example
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="btn-primary px-3 py-2 text-xs" to="/artist/chouchou">
              chouchou merged syrups.
            </Link>
            <Link
              className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
              to="/artist/starsailor"
            >
              Starsailor
            </Link>
            <Link
              className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
              to="/artist/strokes"
            >
              The Strokes
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  )
}
