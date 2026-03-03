export default function Stat({ icon, label, value, hint, className = '' }) {
  return (
    <article className={`min-w-0 px-4 py-4 sm:px-5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center text-accent/70">
          {icon}
        </span>
        <p className="mb-0 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
      </div>
      <p className="mb-0 mt-2 text-3xl font-semibold leading-none text-text">{value}</p>
      {hint ? <p className="mb-0 mt-2 text-xs text-slate-600">{hint}</p> : null}
    </article>
  )
}
