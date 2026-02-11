import { Link } from 'react-router-dom'

export default function Stat({ icon, label, value, hint, to }) {
  const Wrapper = to ? Link : 'div'
  const wrapperProps = to ? { to } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={[
        'flex items-start gap-3 rounded-2xl transition',
        to
          ? 'p-2 hover:bg-white/70 hover:shadow-[0_14px_24px_-20px_rgba(15,15,15,0.35)]'
          : '',
      ].join(' ')}
    >
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
    </Wrapper>
  )
}
