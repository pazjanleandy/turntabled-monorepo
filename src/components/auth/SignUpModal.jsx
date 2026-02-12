import { useState } from 'react'
import { X } from 'phosphor-react'
import { supabase } from '../../supabase'

export default function SignUpModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [acceptAge, setAcceptAge] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [isHuman, setIsHuman] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const resetForm = () => {
    setEmail('')
    setUsername('')
    setPassword('')
    setAcceptAge(false)
    setAcceptPrivacy(false)
    setIsHuman(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUsername = username.trim()

    if (!normalizedEmail || !normalizedUsername || !password) {
      setErrorMessage('Please complete email, username, and password.')
      return
    }

    if (!acceptAge || !acceptPrivacy || !isHuman) {
      setErrorMessage('Please accept all required checkboxes to continue.')
      return
    }

    setIsSubmitting(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { username: normalizedUsername },
      },
    })

    if (signUpError) {
      setErrorMessage(signUpError.message)
      setIsSubmitting(false)
      return
    }

    const userId = signUpData?.user?.id
    if (!userId) {
      setErrorMessage('Account created, but no user ID was returned.')
      setIsSubmitting(false)
      return
    }

    const { error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email: normalizedEmail,
          username: normalizedUsername,
          provider: 'email',
          is_verified: Boolean(signUpData?.user?.email_confirmed_at),
        },
        { onConflict: 'id' }
      )

    if (upsertError) {
      if (upsertError.message?.toLowerCase().includes('row-level security')) {
        setErrorMessage('Signup succeeded, but profile insert was blocked by RLS policy on public.users.')
      } else {
        setErrorMessage(upsertError.message)
      }
      setIsSubmitting(false)
      return
    }

    setSuccessMessage('Account created. Check your email to verify your account.')
    resetForm()
    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
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

        <form className="mt-5 space-y-4 text-sm" onSubmit={handleSubmit}>
          <label className="space-y-2 font-semibold text-text">
            Email address
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 font-semibold text-text">
            Username
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 font-semibold text-text">
            Password
            <input
              type="password"
              placeholder="........"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm text-text outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={acceptAge}
              onChange={(event) => setAcceptAge(event.target.checked)}
            />
            <span>
              I&apos;m at least 16 years old and accept the{' '}
              <span className="font-semibold text-text">Terms of Use</span>.
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={acceptPrivacy}
              onChange={(event) => setAcceptPrivacy(event.target.checked)}
            />
            <span>
              I accept the{' '}
              <span className="font-semibold text-text">Privacy Policy</span>{' '}
              and consent to the processing of my personal information.
            </span>
          </label>

          <div className="rounded-lg border border-black/10 bg-white/80 p-3 text-muted">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-text">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={isHuman}
                  onChange={(event) => setIsHuman(event.target.checked)}
                />
                I am human
              </label>
              <div className="text-[10px] font-semibold text-muted">reCAPTCHA</div>
            </div>
          </div>
          {errorMessage ? (
            <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="text-xs font-semibold text-emerald-700">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            className="btn-primary mt-6 w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  )
}
