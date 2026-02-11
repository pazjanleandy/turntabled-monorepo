import { useEffect, useState } from 'react'
import { X } from 'phosphor-react'

export default function ReviewModal({ isOpen, onClose, albumTitle = '' }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

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
    setTitle('')
    setBody('')
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
        className="w-full max-w-lg rounded-2xl border border-black/5 bg-white/95 p-6 shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)] backdrop-blur-md vinyl-texture"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Write a review
            </p>
            <h2 className="mb-0 text-lg text-text">
              {albumTitle || 'Album review'}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text"
            onClick={onClose}
            aria-label="Close review modal"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <label className="space-y-2 font-semibold text-text">
            Review title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your review a short title"
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 font-semibold text-text">
            Your review
            <textarea
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Share your thoughts on the album."
              className="w-full resize-none rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </div>

        <button type="button" className="btn-primary mt-6 w-full py-2 text-sm">
          Save review
        </button>
      </div>
    </div>
  )
}
