import CoverImage from '../CoverImage.jsx'

export default function AlbumRow({
  title,
  artist,
  cover,
  rating,
  timeAgo,
  elevated = true,
  compactMobile = false,
}) {
  const rowClass = compactMobile
    ? elevated
      ? 'flex items-center gap-2.5 rounded-lg border border-black/8 bg-white/60 px-2.5 py-2 shadow-none md:gap-3 md:rounded-2xl md:border-[var(--border)] md:bg-[var(--surface-3)] md:px-3 md:py-2.5 md:shadow-sm'
      : 'flex items-center gap-2.5 rounded-lg border border-black/8 bg-white/28 px-2.5 py-2 md:gap-3 md:rounded-xl md:border-[var(--border)] md:bg-[var(--surface-2)] md:px-3 md:py-2.5'
    : elevated
    ? 'flex items-center gap-3 rounded-2xl border border-black/5 bg-white/80 px-3 py-2.5 shadow-sm'
    : 'flex items-center gap-3 rounded-xl border border-black/5 bg-white/55 px-3 py-2.5'

  return (
    <div className={rowClass}>
      <div className={compactMobile ? 'h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black/5 md:h-12 md:w-12 md:rounded-none' : 'h-12 w-12 shrink-0 overflow-hidden border border-black/10 bg-black/5'}>
        <CoverImage
          src={cover || '/album/am.jpg'}
          alt={`${title || 'Album'} by ${artist || 'Unknown artist'} cover`}
          className="h-full w-full"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={compactMobile ? 'mb-0 truncate text-[13px] font-semibold text-text md:text-sm' : 'mb-0 truncate text-sm font-semibold text-text'}>{title}</p>
        <p className={compactMobile ? 'mb-0 truncate text-[10px] text-slate-600 md:text-xs' : 'mb-0 truncate text-xs text-slate-600'}>{artist}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={compactMobile ? 'rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 md:px-2 md:py-1 md:text-[10px]' : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700'}>
          {rating ?? 0}/5
        </span>
        <span className={compactMobile ? 'text-[10px] text-slate-600 md:text-[11px]' : 'text-[11px] text-slate-600'}>{timeAgo}</span>
      </div>
    </div>
  )
}
