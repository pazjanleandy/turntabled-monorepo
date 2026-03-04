import { useEffect, useState } from 'react'
import { X } from 'phosphor-react'
import { buildApiAuthHeaders } from '../../lib/apiAuth.js'

export default function ReviewModal({
  isOpen,
  onClose,
  albumTitle = '',
  backlogId = '',
  initialReviewText = '',
  onSaved = null,
}) {
  const [body, setBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

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
    setBody(initialReviewText || '')
    setSaveError('')
    setIsSaving(false)
  }, [initialReviewText, isOpen])

  const handleSave = async () => {
    if (isSaving) return

    const trimmed = body.trim()
    if (!trimmed) {
      setSaveError('Review cannot be empty or whitespace only.')
      return
    }

    if (!backlogId) {
      setSaveError('Log this album first before writing a review.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const response = await fetch(`${apiBase}/api/backlog?id=${encodeURIComponent(backlogId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ reviewText: trimmed }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to save review.')
      }

      if (typeof onSaved === 'function') {
        onSaved(payload?.item ?? null)
      }
      onClose()
    } catch (error) {
      setSaveError(error?.message ?? 'Unable to save review.')
    } finally {
      setIsSaving(false)
    }
  }

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
            Your review
            <textarea
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Share your thoughts on the album."
              className="w-full resize-none rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </div>

        {saveError ? <p className="mb-0 mt-3 text-sm font-semibold text-red-700">{saveError}</p> : null}

        <button
          type="button"
          className="btn-primary mt-6 w-full py-2 text-sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save review'}
        </button>
      </div>
    </div>
  )
}
