import { Star } from 'phosphor-react'

export default function AlbumRow({ title, artist, year, rating, note, timeAgo }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white/55 p-3 shadow-[0_10px_24px_-20px_rgba(15,15,15,0.35)]">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-black/5" />
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-sm font-semibold text-text">{title}</p>
        <p className="mb-0 truncate text-xs text-muted">
          {artist} - {year}
        </p>
        {note ? <p className="mb-0 mt-1 line-clamp-1 text-xs text-muted">{note}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-accent">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-semibold text-text">{rating}</span>
        </div>
        <span className="text-[11px] text-muted">{timeAgo}</span>
      </div>
    </div>
  )
}
