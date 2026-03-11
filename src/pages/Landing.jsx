import { useState } from 'react'
import { MusicNotes, UserPlus } from 'phosphor-react'
import { useNavigate } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import CreateAccountModal from '../components/auth/CreateAccountModal.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import { supabase } from '../supabase'

export default function Landing() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuthStatus()

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

  const handleSignIn = async (event) => {
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
      const rawMessage = signInError.message || ''
      const normalizedMessage = rawMessage.toLowerCase()

      if (normalizedMessage.includes('email not confirmed')) {
        setErrorMessage('Email not confirmed. Open the verification email, then sign in again.')
      } else {
        setErrorMessage(rawMessage)
      }

      setIsSubmitting(false)
      return
    }

    signIn()
    navigate('/home')
  }

  return (
    <div className="min-h-screen">
      <section className="md:hidden">
        <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-8 pt-5 sm:max-w-lg sm:px-6 sm:pt-6">
          <header className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                <MusicNotes size={13} weight="bold" />
              </span>
              Turntabled
            </div>
            <h1 className="mb-0 text-[1.85rem] leading-tight text-text">Sign in</h1>
            <p className="mb-0 max-w-sm text-sm text-muted">Use your email or username to continue.</p>
          </header>

          <main className="mt-5">
            <form
              className="space-y-3.5 border-t border-black/10 pt-4"
              onSubmit={handleSignIn}
              noValidate
            >
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Email or username
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  inputMode="email"
                  placeholder="you@email.com or username"
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white/72 px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                  aria-invalid={Boolean(errorMessage)}
                  required
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white/72 px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                  aria-invalid={Boolean(errorMessage)}
                  required
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-xs font-semibold text-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Forgot password?
                </button>
              </div>

              {errorMessage ? (
                <p className="mb-0 text-xs font-semibold text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary h-11 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Log in'}
              </button>

              <p className="mb-0 pt-1 text-center text-sm text-muted">
                New to Turntabled?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignupOpen(true)}
                  className="border-0 bg-transparent p-0 font-semibold text-text underline-offset-4 transition hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Create account
                </button>
              </p>
            </form>
          </main>
        </div>
      </section>

      <section className="hidden pb-20 pt-0 md:block">
        <section className="relative isolate w-full px-0">
          <Hero
            showActions={false}
            className="h-[68vh] min-h-[660px] lg:min-h-[700px]"
            contentClassName="mx-auto max-w-2xl"
            actions={
              <button
                type="button"
                onClick={() => setIsSignupOpen(true)}
                className="btn-primary inline-flex items-center px-5 py-2.5 text-sm shadow-[0_16px_30px_-18px_rgba(15,15,15,0.5)]"
              >
                <UserPlus size={16} weight="bold" className="mr-2" />
                Create account
              </button>
            }
          />
          <div className="pointer-events-none absolute left-1/2 top-6 z-30 w-full -translate-x-1/2 px-5 md:px-10 lg:px-16">
            <div className="mx-auto w-full max-w-6xl">
              <NavbarGuest className="pointer-events-auto w-full max-w-none" />
            </div>
          </div>
        </section>

        <section className="relative z-20 mx-auto -mt-14 w-full max-w-6xl px-5 md:px-10 lg:px-16">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              From discovery to memory
            </p>
            <p className="mb-0 text-xs text-white/60">Built for album-first listeners</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.18fr_1fr_1fr]">
            <article className="vinyl-texture rounded-2xl border border-white/14 bg-[#465a69]/72 p-6 shadow-[0_18px_30px_-24px_rgba(15,15,15,0.65)] backdrop-blur-md">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Journaling
              </p>
              <h3 className="mb-2 text-[1.35rem] leading-tight text-white">Log what you actually play</h3>
              <p className="mb-0 text-sm text-white/75">
                Save quick notes and ratings without breaking your listening flow.
              </p>
            </article>

            <article className="rounded-2xl border border-white/12 bg-[#425664]/68 p-5 shadow-[0_16px_26px_-24px_rgba(15,15,15,0.6)] backdrop-blur-md">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Discovery
              </p>
              <h3 className="mb-2 text-lg leading-tight text-white">Find your next spin</h3>
              <p className="mb-0 text-sm text-white/75">
                Follow trends and friends to uncover records worth your time.
              </p>
            </article>

            <article className="rounded-2xl border border-white/12 bg-[#425664]/68 p-5 shadow-[0_16px_26px_-24px_rgba(15,15,15,0.6)] backdrop-blur-md">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Momentum
              </p>
              <h3 className="mb-2 text-lg leading-tight text-white">Keep your backlog moving</h3>
              <p className="mb-0 text-sm text-white/75">
                Build a queue you can return to, so recommendations become real listens.
              </p>
            </article>
          </div>
        </section>
      </section>

      <CreateAccountModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSignIn={() => {
          signIn()
          setIsSignupOpen(false)
          navigate('/home')
        }}
      />
    </div>
  )
}
