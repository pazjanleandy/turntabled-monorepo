import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'phosphor-react'
import { supabase } from '../../supabase'

export default function SignInModal({ isOpen, onClose, anchorTop, onSignIn }) {
  const panelRef = useRef(null)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const closeModal = useCallback(() => {
    setIdentifier('')
    setPassword('')
    setErrorMessage('')
    setIsSubmitting(false)
    onClose?.()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal()
    }

    const onPointerDownCapture = (e) => {
      const panel = panelRef.current
      if (!panel) return

      if (panel.contains(e.target)) return

      closeModal()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDownCapture, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
    }
  }, [isOpen, closeModal])

  const resolveEmail = async (rawIdentifier) => {
    const value = rawIdentifier.trim().toLowerCase()
    if (value.includes('@')) return { email: value, error: null }

    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('username', value)
      .maybeSingle()

    if (error) return { email: null, error }
    if (!data?.email) return { email: null, error: new Error('Username not found') }
    return { email: data.email, error: null }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your email or username and password.')
      return
    }

    setIsSubmitting(true)

    const { email, error: resolveError } = await resolveEmail(identifier)
    if (resolveError || !email) {
      setErrorMessage('Could not find that username. Try using your email instead.')
      setIsSubmitting(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setErrorMessage(signInError.message)
      setIsSubmitting(false)
      return
    }

    onSignIn?.()
    closeModal()
    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <button
        type="button"
        aria-label="Close sign in modal"
        className="absolute inset-0 rounded-none border-0 bg-transparent p-0 shadow-none outline-none pointer-events-auto focus:outline-none"
        onClick={closeModal}
      />

      <div
        className="absolute left-1/2 w-full -translate-x-1/2 px-5 md:px-10 lg:px-16 pointer-events-none"
        style={{ top: anchorTop ?? 96 }}
      >
        <div className="mx-auto w-full max-w-4xl pointer-events-none">
          <div
            ref={panelRef}
            className="relative pointer-events-auto rounded-none border border-black/5 bg-white/90 p-4 shadow-[0_18px_40px_-26px_rgba(15,15,15,0.45)] backdrop-blur-md vinyl-texture"
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full border border-black/10 p-1 text-muted transition hover:text-text"
              onClick={closeModal}
              aria-label="Close sign in"
            >
              <X size={14} weight="bold" />
            </button>

            <form className="flex flex-col gap-3 md:flex-row md:items-end" onSubmit={handleSubmit}>
              <label className="flex-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Email or username
                <input
                  type="text"
                  placeholder="you@email.com or username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </label>

              <label className="flex-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Password
                <input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                />
              </label>

              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent transition hover:text-[#ef6b2f]"
                onClick={closeModal}
              >
                Forgotten?
              </button>

              <label className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                <input type="checkbox" className="h-4 w-4" />
                Remember me
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary inline-flex items-center px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
              {errorMessage ? (
                <p className="w-full text-xs font-semibold text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
