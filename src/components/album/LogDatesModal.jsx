import { useEffect, useMemo, useState } from 'react'
import { Calendar, CaretDown, X } from 'phosphor-react'
import { buildApiAuthHeaders } from '../../lib/apiAuth.js'
import CoverImage from '../CoverImage.jsx'
import StarRating from '../StarRating.jsx'

const statusOptions = [
  { value: 'listened', label: 'Listened', dotClass: 'bg-emerald-400' },
  { value: 'listening', label: 'Listening', dotClass: 'bg-blue-500' },
  { value: 'unfinished', label: 'Unfinished', dotClass: 'bg-amber-500' },
  { value: 'backloggd', label: 'Backloggd', dotClass: 'bg-slate-400' },
]
const validStatusValues = new Set(statusOptions.map((status) => status.value))

function getTodayDateInputValue() {
  return new Date().toISOString().split('T')[0]
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return 'backloggd'
  const normalized = value.trim().toLowerCase()
  return validStatusValues.has(normalized) ? normalized : 'backloggd'
}

function normalizeRating(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) return 0
  const snapped = Math.round(numeric * 2) / 2
  if (Math.abs(numeric - snapped) > 0.001) return 0
  return snapped
}

function normalizeReviewText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeListenedOn(value, fallbackDate) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim()
  }

  const parsed = new Date(value ?? '')
  if (Number.isNaN(parsed.getTime())) return fallbackDate
  return parsed.toISOString().split('T')[0]
}

export default function LogDatesModal({
  isOpen,
  onClose,
  albumId = '',
  backlogId = '',
  albumTitle = '',
  albumArtist = '',
  albumArt = '',
  initialStatus = 'backloggd',
  initialRating = 0,
  initialReviewText = '',
  initialListenedOn = '',
  onSaved = null,
}) {
  const today = useMemo(() => getTodayDateInputValue(), [])
  const initialStatusValue = useMemo(() => normalizeStatus(initialStatus), [initialStatus])
  const initialRatingValue = useMemo(() => normalizeRating(initialRating), [initialRating])
  const initialReviewValue = useMemo(() => normalizeReviewText(initialReviewText), [initialReviewText])
  const initialListenedOnValue = useMemo(
    () => normalizeListenedOn(initialListenedOn, today),
    [initialListenedOn, today]
  )
  const normalizedBacklogId = useMemo(
    () => (typeof backlogId === 'string' ? backlogId.trim() : ''),
    [backlogId]
  )
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(initialStatusValue)
  const [selectedRating, setSelectedRating] = useState(initialRatingValue)
  const [reviewText, setReviewText] = useState(initialReviewValue)
  const [listenedOn, setListenedOn] = useState(initialListenedOnValue)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const selectedStatusOption = useMemo(
    () => statusOptions.find((status) => status.value === selectedStatus) ?? statusOptions[3],
    [selectedStatus]
  )
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
    setIsStatusOpen(false)
    setSelectedStatus(initialStatusValue)
    setSelectedRating(initialRatingValue)
    setReviewText(initialReviewValue)
    setListenedOn(initialListenedOnValue)
    setSaveError('')
  }, [isOpen, initialStatusValue, initialRatingValue, initialReviewValue, initialListenedOnValue])

  const handleSave = async () => {
    if (!albumId || isSaving) return
    if (
      selectedRating < 1 ||
      selectedRating > 5 ||
      Math.abs(selectedRating * 2 - Math.round(selectedRating * 2)) > 0.001
    ) {
      setSaveError('Please select a rating from 1 to 5 stars in 0.5 increments.')
      return
    }

    const trimmedReview = reviewText.trim()

    setIsSaving(true)
    setSaveError('')

    try {
      const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
      const authHeaders = await buildApiAuthHeaders()
      const isEditingExisting = Boolean(normalizedBacklogId)
      const endpoint = isEditingExisting
        ? `${apiBase}/api/backlog?id=${encodeURIComponent(normalizedBacklogId)}`
        : `${apiBase}/api/backlog`
      const requestPayload = {
        albumId,
        artistNameRaw: albumArtist,
        albumTitleRaw: albumTitle,
        status: selectedStatus,
        rating: selectedRating,
        listenedOn,
      }
      const response = await fetch(endpoint, {
        method: isEditingExisting ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(
          isEditingExisting
            ? {
                ...requestPayload,
                ...(trimmedReview ? { reviewText: trimmedReview } : { clearReview: true }),
              }
            : {
                ...requestPayload,
                ...(trimmedReview ? { reviewText: trimmedReview } : {}),
              }
        ),
      })

      const responsePayload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(responsePayload?.error?.message ?? 'Failed to save album log.')
      }

      if (typeof onSaved === 'function') {
        onSaved(responsePayload?.item ?? null)
      }
      onClose()
    } catch (error) {
      setSaveError(error?.message ?? 'Unable to save album log.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[24px] border border-black/10 bg-[#f5f2f0]/95 p-5 shadow-[0_28px_70px_-44px_rgba(15,15,15,0.45)] backdrop-blur-md md:p-7 vinyl-texture"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid flex-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
            <CoverImage
              src={albumArt || '/album/am.jpg'}
              alt={`${albumTitle || 'Album'} by ${albumArtist || 'Unknown artist'} cover`}
              className="h-[120px] w-[120px] border border-black/5 shadow-[0_12px_24px_-18px_rgba(15,15,15,0.35)]"
            />
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Log Album
              </p>
              <h2 className="mb-1 truncate text-3xl leading-tight text-[#171717] font-['Instrument_Serif']">
                {albumTitle || 'Album title'}
              </h2>
              <p className="mb-0 truncate text-sm font-semibold text-slate-700">
                {albumArtist || 'Unknown artist'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/10 bg-white/70 p-2 text-slate-500 transition hover:text-slate-800"
            onClick={onClose}
            aria-label="Close log album modal"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 text-sm">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Status
            </span>
            <div className="relative z-20">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-full border border-[#e5e5e5] bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_-24px_rgba(15,15,15,0.35)] outline-none transition hover:border-slate-300"
                onClick={() => setIsStatusOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isStatusOpen}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${selectedStatusOption.dotClass}`} />
                  {selectedStatusOption.label}
                </span>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={`text-slate-500 transition-transform duration-200 ${isStatusOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isStatusOpen ? (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-[#e5e5e5] bg-white p-2 shadow-[0_28px_60px_-42px_rgba(15,15,15,0.45)]"
                  role="listbox"
                >
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-[#f5f5f5]"
                      onClick={() => {
                        setSelectedStatus(status.value)
                        setIsStatusOpen(false)
                      }}
                    >
                      <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                      {status.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Rating
            </legend>
            <div className="space-y-1.5">
              <StarRating
                value={selectedRating}
                onChange={setSelectedRating}
                step={0.5}
                size={22}
                ariaLabel="Album rating"
              />
              {selectedRating ? (
                <p className="mb-0 text-xs font-semibold text-slate-600">{selectedRating.toFixed(1)}/5</p>
              ) : (
                <p className="mb-0 text-xs text-slate-500">Select a rating</p>
              )}
            </div>
          </fieldset>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Review (optional)
            </span>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder="Share your thoughts on the album."
              className="w-full resize-none rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/30"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Date
            </span>
            <div className="relative">
              <input
                type="date"
                value={listenedOn}
                onChange={(event) => setListenedOn(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-black/30"
              />
              <Calendar
                size={16}
                weight="bold"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </label>
        </div>

        {saveError ? <p className="mb-0 mt-3 text-sm font-semibold text-red-700">{saveError}</p> : null}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-black/15 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-black/5"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-16px_rgba(15,15,15,0.6)] transition hover:-translate-y-0.5 hover:bg-black/90"
            onClick={handleSave}
            disabled={isSaving || !albumId}
          >
            {isSaving ? 'Saving...' : 'Save log album'}
          </button>
        </div>
      </div>
    </div>
  )
}
