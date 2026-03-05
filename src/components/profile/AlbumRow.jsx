import CoverImage from '../CoverImage.jsx'

export default function AlbumRow({
  title,
  artist,
  cover,
  rating,
  timeAgo,
  elevated = true,
}) {
  const rowClass = elevated
    ? 'flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-3 py-2.5 shadow-sm'
    : 'flex items-center gap-3 rounded-xl border border-black/5 bg-white/55 px-3 py-2.5'

  return (
    <div className={rowClass}>
      <div className="h-12 w-12 shrink-0 overflow-hidden border border-black/10 bg-black/5">
        <CoverImage
          src={cover || '/album/am.jpg'}
          alt={`${title || 'Album'} by ${artist || 'Unknown artist'} cover`}
          className="h-full w-full"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-sm font-semibold text-text">{title}</p>
        <p className="mb-0 truncate text-xs text-slate-600">{artist}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
          {rating ?? 0}/5
        </span>
        <span className="text-[11px] text-slate-600">{timeAgo}</span>
      </div>
    </div>
  )
}
