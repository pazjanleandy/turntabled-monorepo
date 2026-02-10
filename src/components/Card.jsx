export function Card({ children, className = '' }) {
  return <section className={`card vinyl-texture ${className}`}>{children}</section>
}

export function CardHeader({ label, title, action, icon }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        {label ? (
          <p className="mb-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            {icon ? <span className="text-accent">{icon}</span> : null}
            {label}
          </p>
        ) : null}
        <h2 className="mb-0 text-xl">{title}</h2>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function Badge({ children, className = '' }) {
  return (
    <span
      className={`rounded-full bg-white/80 px-3 py-1 text-xs font-semibold leading-none text-text shadow-subtle ${className}`}
    >
      {children}
    </span>
  )
}

export function Pill({ children, className = '' }) {
  return (
    <span
      className={`rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold leading-none text-accent ${className}`}
    >
      {children}
    </span>
  )
}
