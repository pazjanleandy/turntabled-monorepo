export default function Stat({ icon, label, value, hint }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {label}
        </p>
        <p className="mb-0 text-xl font-semibold text-text">{value}</p>
        {hint ? <p className="mb-0 mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  )
}
