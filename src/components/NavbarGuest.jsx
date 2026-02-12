import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Compass, House, MusicNotes, SignIn } from 'phosphor-react'
import SignInModal from './auth/SignInModal.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'

export default function NavbarGuest({ className = '' }) {
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [modalTop, setModalTop] = useState(null)
  const navRef = useRef(null)
  const navigate = useNavigate()
  const { signIn } = useAuthStatus()

  useLayoutEffect(() => {
    if (!isSignInOpen) return undefined

    const updatePosition = () => {
      if (!navRef.current) return
      const rect = navRef.current.getBoundingClientRect()
      setModalTop(Math.round(rect.bottom))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isSignInOpen])

  const navItemClass = ({ isActive }) =>
    [
      'group flex items-center gap-2 transition duration-200 hover:-translate-y-0.5',
      isActive ? 'text-accent' : 'text-slate-600 hover:text-accent',
    ].join(' ')

  return (
    <>
      <nav
        ref={navRef}
        className={`relative z-40 flex flex-wrap items-center justify-between gap-4 rounded-full bg-white/80 px-5 py-3 text-sm text-slate-900 shadow-lg backdrop-blur-lg min-w-0 ${className}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-accent transition duration-200 hover:-translate-y-0.5 hover:bg-accent/25">
            <MusicNotes size={18} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="mb-0 text-sm font-semibold text-text">Turntabled</p>
            <p className="mb-0 text-xs text-muted">Album logging workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          <NavLink to="/" end className={navItemClass}>
            <House size={14} weight="bold" className="transition" />
            Home
          </NavLink>
          <NavLink to="/explore" className={navItemClass}>
            <Compass size={14} weight="bold" className="transition" />
            Explore
          </NavLink>
          <NavLink to="/artists" className={navItemClass}>
            <MusicNotes size={14} weight="bold" className="transition" />
            Artists
          </NavLink>
        </div>
        <button
          type="button"
          onClick={() => setIsSignInOpen(true)}
          className="inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-subtle transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-accent"
        >
          <SignIn size={14} weight="bold" className="mr-2" />
          Sign in
        </button>
      </nav>

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignIn={() => {
          signIn()
          setIsSignInOpen(false)
          navigate('/home')
        }}
        anchorTop={modalTop}
      />
    </>
  )
}
