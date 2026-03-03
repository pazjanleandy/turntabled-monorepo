import { Star } from 'phosphor-react'

export default function AlbumRow({
  title,
  artist,
  year,
  rating,
  note,
  timeAgo,
  elevated = true,
}) {
  const rowClass = elevated
    ? 'flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 p-3 shadow-sm'
    : 'flex items-center gap-3 rounded-xl border border-black/5 bg-white/35 p-3'

  return (
    <div className={rowClass}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-gradient-to-br from-white via-orange-50 to-slate-100">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Log
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-sm font-semibold text-text">{title}</p>
        <p className="mb-0 truncate text-xs text-slate-600">
          {artist} - {year}
        </p>
        {note ? <p className="mb-0 mt-1 line-clamp-1 text-xs text-slate-600">{note}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-accent">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-semibold text-text">{rating}</span>
        </div>
        <span className="text-[11px] text-slate-600">{timeAgo}</span>
      </div>
    </div>
  )
}
