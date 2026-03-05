import { useState } from 'react'
import { DotsSixVertical, X } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

function moveItem(items, fromIndex, toIndex) {
  if (!Array.isArray(items)) return []
  if (fromIndex === toIndex) return items
  if (fromIndex < 0 || fromIndex >= items.length) return items
  if (toIndex < 0 || toIndex >= items.length) return items

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export default function FavoritesReorderModal({
  isOpen,
  orderedFavorites = [],
  errorMessage = '',
  isSaving = false,
  onClose,
  onReorder,
  onSave,
}) {
  const [dragIndex, setDragIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)

  if (!isOpen) return null

  const clearDragState = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragStart = (index, event) => {
    if (isSaving) return
    setDragIndex(index)
    setDropIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (index, event) => {
    if (isSaving) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropIndex !== index) {
      setDropIndex(index)
    }
  }

  const handleDrop = (index, event) => {
    if (isSaving) return
    event.preventDefault()

    const rawSourceIndex = event.dataTransfer.getData('text/plain')
    const parsedSourceIndex = Number.parseInt(rawSourceIndex, 10)
    const sourceIndex = Number.isInteger(parsedSourceIndex) ? parsedSourceIndex : dragIndex

    if (!Number.isInteger(sourceIndex)) {
      clearDragState()
      return
    }

    const nextOrder = moveItem(orderedFavorites, sourceIndex, index)
    if (nextOrder !== orderedFavorites) {
      onReorder?.(nextOrder)
    }
    clearDragState()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="scrollbar-sleek w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Favorites
            </p>
            <h2 className="mb-0 text-xl text-text">Reorder top albums</h2>
            <p className="mb-0 mt-1 text-xs text-slate-600">
              Drag and drop albums to change their order.
            </p>
          </div>
          <button
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text"
            onClick={onClose}
            aria-label="Close favorites manager"
            disabled={isSaving}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {orderedFavorites.length === 0 ? (
          <p className="mb-0 mt-4 text-sm text-slate-600">
            No favorites to reorder yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {orderedFavorites.map((item, index) => (
              <li
                key={item?.backlogId ?? `${item?.artist}-${item?.title}-${index}`}
                draggable={!isSaving}
                onDragStart={(event) => handleDragStart(index, event)}
                onDragOver={(event) => handleDragOver(index, event)}
                onDrop={(event) => handleDrop(index, event)}
                onDragEnd={clearDragState}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                  dragIndex === index
                    ? 'border-orange-500/30 bg-accent/10 opacity-75'
                    : dropIndex === index
                      ? 'border-orange-500/40 bg-accent/15'
                      : 'border-black/5 bg-white/70'
                } ${isSaving ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <span className="w-6 text-center text-xs font-semibold text-muted select-none">
                  {index + 1}
                </span>
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-muted"
                  aria-hidden="true"
                >
                  <DotsSixVertical size={14} weight="bold" />
                </span>
                <div className="h-12 w-12 overflow-hidden border border-black/10 bg-black/5">
                  <CoverImage
                    src={item?.cover || '/album/am.jpg'}
                    alt={`${item?.title || 'Album'} by ${item?.artist || 'Unknown artist'} cover`}
                    className="h-full w-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0 truncate text-sm font-semibold text-text">
                    {item?.title || 'Unknown album'}
                  </p>
                  <p className="mb-0 truncate text-xs text-slate-600">
                    {item?.artist || 'Unknown artist'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {errorMessage ? (
          <p className="mb-0 mt-4 text-xs font-semibold text-red-600">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSave}
            disabled={isSaving || orderedFavorites.length === 0}
          >
            {isSaving ? 'Saving order...' : 'Save order'}
          </button>
        </div>
      </div>
    </div>
  )
}
