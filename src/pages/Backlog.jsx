import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import BackButton from '../components/BackButton.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { buildApiAuthHeaders } from '../lib/apiAuth.js'

function StarEditor({ rating, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value)}
          className="rounded-none border-0 bg-transparent p-0 text-lg leading-none text-slate-300 shadow-none transition hover:translate-y-0 hover:bg-transparent disabled:cursor-not-allowed"
          aria-label={`Set rating to ${value}`}
        >
          <Star size={18} weight={value <= rating ? 'fill' : 'regular'} className={value <= rating ? 'text-amber-500' : 'text-slate-300'} />
        </button>
      ))}
    </div>
  )
}

export default function Backlog() {
  const { isSignedIn } = useAuthStatus()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState('')

  useEffect(() => {
    if (!isSignedIn) {
      setItems([])
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const loadBacklog = async () => {
      setIsLoading(true)
      setError('')

      try {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        const response = await fetch(`${apiBase}/api/backlog?page=1&limit=50`, {
          headers: authHeaders,
          signal: controller.signal,
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Failed to load backlog.')
        }

        if (!cancelled) {
          setItems(Array.isArray(payload?.items) ? payload.items : [])
        }
      } catch (loadErr) {
        if (loadErr?.name === 'AbortError') return
        if (!cancelled) {
          setItems([])
          setError(loadErr?.message ?? 'Unable to load backlog.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadBacklog()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isSignedIn])

  const hasItems = useMemo(() => items.length > 0, [items.length])

  const updateRating = async (itemId, rating) => {
    if (!itemId || busyItemId) return
    setBusyItemId(itemId)
    setError('')

    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const response = await fetch(`${apiBase}/api/backlog/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ rating }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to update rating.')
      }

      const nextItem = payload?.item
      setItems((current) =>
        current.map((item) => (item.id === itemId ? { ...item, rating: nextItem?.rating ?? rating } : item)),
      )
    } catch (updateErr) {
      setError(updateErr?.message ?? 'Unable to update rating.')
    } finally {
      setBusyItemId('')
    }
  }

  const removeItem = async (itemId) => {
    if (!itemId || busyItemId) return
    setBusyItemId(itemId)
    setError('')

    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const response = await fetch(`${apiBase}/api/backlog?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message ?? 'Failed to remove item.')
      }
      setItems((current) => current.filter((item) => item.id !== itemId))
    } catch (deleteErr) {
      setError(deleteErr?.message ?? 'Unable to remove backlog item.')
    } finally {
      setBusyItemId('')
    }
  }

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        <BackButton className="self-start" />

        <section className="card vinyl-texture">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-0 text-xs font-semibold uppercase tracking-[0.25em] text-muted">My Backlog</p>
              <h1 className="mb-0 text-2xl text-text">Albums to spin next</h1>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {items.length} saved
            </span>
          </div>
        </section>

        {!isSignedIn ? (
          <section className="card vinyl-texture">
            <p className="mb-0 text-sm text-muted">Sign in to view your private backlog.</p>
          </section>
        ) : isLoading ? (
          <section className="card vinyl-texture">
            <p className="mb-0 text-sm text-muted">Loading your backlog...</p>
          </section>
        ) : !hasItems ? (
          <section className="card vinyl-texture">
            <p className="mb-2 text-sm text-muted">No albums logged yet.</p>
            <Link to="/explore" className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-900">
              Explore albums
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-[0_16px_30px_-24px_rgba(15,15,15,0.35)]"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={item.coverArtUrl || '/album/am.jpg'}
                    alt={`${item.albumTitleRaw} cover`}
                    className="h-20 w-20 rounded-xl border border-black/5 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="mb-1 truncate text-lg text-text">{item.albumTitleRaw}</h2>
                    <p className="mb-1 truncate text-sm font-semibold text-slate-700">{item.artistNameRaw}</p>
                    <p className="mb-2 text-xs text-muted">
                      Added {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'Unknown'}
                    </p>
                    <StarEditor
                      rating={item.rating ?? 0}
                      disabled={busyItemId === item.id}
                      onChange={(rating) => updateRating(item.id, rating)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={busyItemId === item.id}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-none transition hover:bg-black/5 hover:translate-y-0 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {error ? <p className="mb-0 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    </div>
  )
}
