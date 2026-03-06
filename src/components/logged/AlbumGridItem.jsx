import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'phosphor-react'
import AlbumCover from '../album/AlbumCover.jsx'

function formatLoggedDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

function formatRating(value) {
  if (value == null || value === '') return '--'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return '--'
  return Number.isInteger(numeric) ? `${numeric}.0` : numeric.toFixed(1)
}

const STATUS_STYLES = {
  listened: { label: 'Listened', dotClass: 'bg-emerald-400' },
  listening: { label: 'Listening', dotClass: 'bg-blue-500' },
  unfinished: { label: 'Unfinished', dotClass: 'bg-amber-500' },
  backloggd: { label: 'Backloggd', dotClass: 'bg-slate-400' },
}

function formatStatusLabel(value) {
  if (typeof value !== 'string') return 'Unknown'
  const normalized = value.trim()
  if (!normalized) return 'Unknown'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getStatusMeta(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return STATUS_STYLES[normalized] ?? { label: formatStatusLabel(value), dotClass: 'bg-slate-300' }
}

export default function AlbumGridItem({
  item,
  density = 'comfortable',
  isBusy = false,
  onEditRating,
  onRemove,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRootRef = useRef(null)

  const albumTitle = item?.albumTitleRaw ?? item?.title ?? 'Unknown album'
  const artistName = item?.artistNameRaw ?? item?.artistName ?? item?.artist ?? 'Unknown artist'
  const coverSrc = item?.coverArtUrl ?? item?.cover ?? '/album/am.jpg'
  const releaseId = item?.albumId ?? item?.releaseId ?? ''
  const loggedAt = item?.listenedOn ?? item?.addedAt ?? item?.updatedAt ?? ''
  const statusMeta = getStatusMeta(item?.status)
  const detailHref = releaseId ? `/album/${releaseId}` : ''

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!menuRootRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const handleEditRating = () => {
    setIsMenuOpen(false)
    onEditRating?.(item)
  }

  const handleRemove = () => {
    setIsMenuOpen(false)
    onRemove?.(item)
  }

  const tileSpacing = density === 'compact' ? 'space-y-1' : 'space-y-1.5'
  const metaTextSize = density === 'compact' ? 'text-[10px]' : 'text-[11px]'

  return (
    <article className={tileSpacing}>
      <div className="group/tile relative">
        {detailHref ? (
          <Link
            to={detailHref}
            className="block overflow-hidden border border-black/10 bg-black/5 shadow-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            aria-label={`View ${albumTitle} details`}
            title={`${albumTitle} by ${artistName}`}
          >
            <AlbumCover
              src={coverSrc}
              alt={`${albumTitle} by ${artistName} cover`}
              className="transition duration-300 group-hover/tile:scale-[1.02]"
            />
          </Link>
        ) : (
          <div
            className="overflow-hidden border border-black/10 bg-black/5 shadow-subtle"
            title={`${albumTitle} by ${artistName}`}
          >
            <AlbumCover src={coverSrc} alt={`${albumTitle} by ${artistName} cover`} />
          </div>
        )}

        <div ref={menuRootRef} className="absolute right-2 top-2 z-20">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/15 bg-white/90 text-xs font-bold leading-none text-text shadow-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 opacity-100 sm:opacity-0 sm:group-hover/tile:opacity-100 sm:group-focus-within/tile:opacity-100"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Open actions for ${albumTitle}`}
            disabled={isBusy}
          >
            ...
          </button>

          {isMenuOpen ? (
            <div
              className="absolute right-0 mt-2 w-40 rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-lg"
              role="menu"
            >
              {detailHref ? (
                <Link
                  to={detailHref}
                  role="menuitem"
                  className="block rounded-lg px-2.5 py-2 text-xs font-semibold text-text transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  onClick={() => setIsMenuOpen(false)}
                >
                  View details
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-muted"
                  disabled
                >
                  View details
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-text transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleEditRating}
                disabled={isBusy}
              >
                Edit rating
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleRemove}
                disabled={isBusy}
              >
                Remove from logged
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`flex items-center justify-between text-muted ${metaTextSize} font-semibold uppercase tracking-[0.12em]`}
      >
        <span className="inline-flex items-center gap-1 text-text">
          <span
            className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`}
            title={`Status: ${statusMeta.label}`}
            aria-hidden="true"
          />
          <span className="sr-only">{`Status: ${statusMeta.label}`}</span>
          <Star size={12} weight="fill" className="text-amber-500" />
          {formatRating(item?.rating)}
        </span>
        <span>{formatLoggedDate(loggedAt)}</span>
      </div>
    </article>
  )
}
