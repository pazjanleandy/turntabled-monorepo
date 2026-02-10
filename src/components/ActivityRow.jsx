import CoverImage from './CoverImage.jsx'

export default function ActivityRow({ icon, text, meta, cover, compact = false }) {
  const rowClasses = compact
    ? 'gap-3 px-3 py-2'
    : 'gap-4 px-4 py-3'
  const iconClasses = compact ? 'h-8 w-8' : 'h-9 w-9'
  const coverClasses = compact ? 'h-10 w-10' : 'h-12 w-12'
  const metaSpacing = compact ? 'space-y-0.5' : 'space-y-1'

  return (
    <div className={`vinyl-texture flex items-center justify-between rounded-soft bg-white/85 shadow-subtle ${rowClasses}`}>
      <div className="flex items-center gap-3">
        <span className={`flex items-center justify-center rounded-full bg-accent/12 text-accent ${iconClasses}`}>
          {icon}
        </span>
        <div className={metaSpacing}>
          <p className="mb-0 text-sm font-semibold text-text">{text}</p>
          <p className="mb-0 text-xs text-muted">{meta}</p>
        </div>
      </div>
      {cover ? (
        <CoverImage
          src={cover}
          alt="album cover"
          className={`rounded-soft object-cover shadow-subtle ${coverClasses}`}
        />
      ) : null}
    </div>
  )
}
