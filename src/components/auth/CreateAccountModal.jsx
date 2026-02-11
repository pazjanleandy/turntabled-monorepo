import { useEffect } from 'react'
import { X } from 'phosphor-react'

export default function CreateAccountModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="scrollbar-sleek w-full max-w-md rounded-2xl border border-black/5 bg-white/90 p-6 text-text shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)] backdrop-blur-md vinyl-texture"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Join Turntabled
            </p>
            <h2 className="mb-0 text-lg text-text">Create your account</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text"
            onClick={onClose}
            aria-label="Close create account"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <label className="space-y-2 font-semibold text-text">
            Email address
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 font-semibold text-text">
            Username
            <input
              type="text"
              placeholder="username"
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 font-semibold text-text">
            Password
            <input
              type="password"
              placeholder="********"
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" className="mt-1 h-4 w-4" />
            <span>
              I&apos;m at least 16 years old and accept the{' '}
              <span className="font-semibold text-text">Terms of Use</span>.
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" className="mt-1 h-4 w-4" />
            <span>
              I accept the{' '}
              <span className="font-semibold text-text">Privacy Policy</span>{' '}
              and consent to the processing of my personal information.
            </span>
          </label>

          <div className="rounded-lg border border-black/10 bg-white/80 p-3 text-muted">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-text">
                <input type="checkbox" className="h-4 w-4" />
                I am human
              </label>
              <div className="text-[10px] font-semibold text-muted">
                reCAPTCHA
              </div>
            </div>
          </div>
        </div>

        <button type="button" className="btn-primary mt-6 w-full py-2 text-sm">
          Sign up
        </button>
      </div>
    </div>
  )
}
