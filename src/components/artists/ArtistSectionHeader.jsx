export default function ArtistSectionHeader({ label, sticky = false, className = '' }) {
  return (
    <div
      className={[
        'mb-3 flex items-center gap-3',
        sticky ? 'md:sticky md:top-16 md:z-10 md:py-1 lg:top-3' : '',
        className,
      ].join(' ')}
    >
      <h2 className="mb-0 text-xs font-semibold uppercase tracking-[0.3em] text-muted">{label}</h2>
      <span className="h-px flex-1 bg-black/10" />
    </div>
  )
}
