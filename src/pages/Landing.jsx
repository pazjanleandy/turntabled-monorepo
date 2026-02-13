import { useState } from 'react'
import { UserPlus } from 'phosphor-react'
import { useNavigate } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import CreateAccountModal from '../components/auth/CreateAccountModal.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'

export default function Landing() {
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuthStatus()

  return (
    <div className="min-h-screen pb-16 pt-0">
      <section className="relative w-full px-0">
        <Hero
          showActions={false}
          className="h-[70vh] min-h-[720px]"
          actions={
            <button
              type="button"
              onClick={() => setIsSignupOpen(true)}
              className="btn-primary inline-flex items-center px-5 py-2.5 text-sm"
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

      <CreateAccountModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSignIn={() => {
          signIn()
          setIsSignupOpen(false)
          navigate('/home')
        }}
      />

      <section className="mx-auto -mt-10 grid w-full max-w-6xl grid-cols-1 gap-4 px-5 md:grid-cols-3 md:px-10 lg:px-16">
        <div className="card vinyl-texture p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-28px_rgba(15,15,15,0.5)]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Journaling
          </p>
          <h3 className="mb-2 text-xl text-text">Log every listen</h3>
          <p className="mb-0 text-base text-muted">
            Capture quick notes, ratings, and the albums you keep coming back to.
          </p>
        </div>
        <div className="card vinyl-texture p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-28px_rgba(15,15,15,0.5)]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Discovery
          </p>
          <h3 className="mb-2 text-xl text-text">Find what fits your mood</h3>
          <p className="mb-0 text-base text-muted">
            Explore trending picks, curated lists, and your friends' spins.
          </p>
        </div>
        <div className="card vinyl-texture p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-28px_rgba(15,15,15,0.5)]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Momentum
          </p>
          <h3 className="mb-2 text-xl text-text">Build your backlog</h3>
          <p className="mb-0 text-base text-muted">
            Keep a personal queue so you always know what to play next.
          </p>
        </div>
      </section>
    </div>
  )
}
