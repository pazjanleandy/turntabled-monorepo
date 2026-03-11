export default function Stat({ icon, label, value, hint, className = '', compactMobile = false }) {
  const itemClass = compactMobile
    ? `min-w-0 px-2.5 py-2 md:px-4 md:py-4 sm:px-5 ${className}`
    : `min-w-0 px-4 py-4 sm:px-5 ${className}`

  return (
    <article className={itemClass}>
      <div className={compactMobile ? 'flex items-center gap-1.5 md:gap-2' : 'flex items-center gap-2'}>
        <span className={compactMobile ? 'inline-flex h-4 w-4 items-center justify-center text-accent/65 md:h-5 md:w-5 md:text-accent/70' : 'inline-flex h-5 w-5 items-center justify-center text-accent/70'}>
          {icon}
        </span>
        <p className={compactMobile ? 'mb-0 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-muted/90 md:text-[11px] md:tracking-[0.16em] md:text-muted' : 'mb-0 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted'}>
          {label}
        </p>
      </div>
      <p className={compactMobile ? 'mb-0 mt-1 text-[1.7rem] font-semibold leading-none text-text md:mt-2 md:text-3xl' : 'mb-0 mt-2 text-3xl font-semibold leading-none text-text'}>
        {value}
      </p>
      {hint ? (
        <p className={compactMobile ? 'mb-0 mt-0.5 text-[10px] text-slate-500/95 md:mt-2 md:text-xs md:text-slate-600' : 'mb-0 mt-2 text-xs text-slate-600'}>
          {hint}
        </p>
      ) : null}
    </article>
  )
}
