import { useEffect, useMemo, useState } from 'react'
import { Calendar, CaretDown, Star, X } from 'phosphor-react'

const statusOptions = [
  { value: 'completed', label: 'Completed', dotClass: 'bg-emerald-400' },
  { value: 'listening', label: 'Listening', dotClass: 'bg-blue-500' },
  { value: 'unfinished', label: 'Unfinished', dotClass: 'bg-amber-500' },
  { value: 'pending', label: 'Pending', dotClass: 'bg-slate-400' },
  { value: 'favorite', label: 'Favorite', dotClass: 'bg-rose-400' },
]

export default function LogDatesModal({
  isOpen,
  onClose,
  albumTitle = '',
  albumArtist = '',
  albumArt = '',
}) {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const today = new Date().toISOString().split('T')[0]
  const selectedStatusOption = useMemo(
    () => statusOptions.find((status) => status.value === selectedStatus) ?? statusOptions[3],
    [selectedStatus]
  )
  const activeRating = hoverRating || selectedRating

  useEffect(() => {
    if (!isOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

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
            <img
              src={albumArt || '/album/am.jpg'}
              alt={`${albumTitle || 'Album'} cover`}
              className="h-[120px] w-[120px] rounded-2xl border border-black/5 object-cover shadow-[0_12px_24px_-18px_rgba(15,15,15,0.35)]"
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
            <div className="flex justify-start gap-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className="rounded-none border-0 bg-transparent px-0 py-0 text-slate-400 shadow-none transition hover:bg-transparent hover:text-amber-500 hover:translate-y-0"
                  aria-label={`Rate ${rating} stars`}
                  onMouseEnter={() => setHoverRating(rating)}
                  onFocus={() => setHoverRating(rating)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => setSelectedRating(rating)}
                >
                  {rating <= activeRating ? (
                    <Star size={22} weight="fill" className="text-amber-500" />
                  ) : (
                    <Star size={22} weight="regular" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Notes
            </span>
            <textarea
              rows={4}
              placeholder="Add quick thoughts about this listen."
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
                defaultValue={today}
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

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-black/15 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-black/5"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_-16px_rgba(15,15,15,0.6)] transition hover:-translate-y-0.5 hover:bg-black/90"
          >
            Save log album
          </button>
        </div>
      </div>
    </div>
  )
}
