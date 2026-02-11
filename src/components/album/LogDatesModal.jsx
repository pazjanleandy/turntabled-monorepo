import { useEffect, useState } from 'react'
import { Calendar, X } from 'phosphor-react'

export default function LogDatesModal({ isOpen, onClose, albumTitle = '' }) {
  const [dateValue, setDateValue] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setDateValue('')
    setNotes('')
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-black/5 bg-white/95 p-6 shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)] backdrop-blur-md vinyl-texture"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Log your dates
            </p>
            <h2 className="mb-0 text-lg text-text">
              {albumTitle || 'Album log'}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text"
            onClick={onClose}
            aria-label="Close log dates modal"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <label className="space-y-2 font-semibold text-text">
            Date listened
            <div className="relative">
              <input
                type="date"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 pr-10 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
              <Calendar
                size={16}
                weight="bold"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </label>

          <label className="space-y-2 font-semibold text-text">
            Notes (optional)
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add quick thoughts about this listen."
              className="w-full resize-none rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </div>

        <button type="button" className="btn-primary mt-6 w-full py-2 text-sm">
          Save log
        </button>
      </div>
    </div>
  )
}
