import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Compass, Disc, House, ListBullets, MusicNotes, SignOut } from 'phosphor-react'
import useAuthStatus from '../hooks/useAuthStatus.js'
import useTheme from '../theme/useTheme.js'
import {
  emitProfileUpdated,
  PROFILE_EVENT_NAME,
  fetchCurrentProfile,
  readCachedProfile,
} from '../lib/profileClient.js'

export default function Navbar({ className = '' }) {
  const navigate = useNavigate()
  const { signOut, isSignedIn } = useAuthStatus()
  const { isDark, toggleTheme } = useTheme()
  const [navUser, setNavUser] = useState(() => {
    const cached = readCachedProfile()
    return {
      username: cached?.username || '',
      avatarUrl: cached?.avatarUrl || '',
    }
  })

  useEffect(() => {
    if (!isSignedIn) return

    let cancelled = false

    async function loadNavUser() {
      try {
        const profile = await fetchCurrentProfile()
        if (!cancelled) {
          emitProfileUpdated(profile)
          setNavUser({ username: profile.username, avatarUrl: profile.avatarUrl })
        }
      } catch {
        // Keep cached value on fetch failure.
      }
    }

    const handleProfileUpdate = (event) => {
      const profile = event?.detail
      if (!profile) return
      setNavUser({
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
      })
    }

    window.addEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    loadNavUser()

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    }
  }, [isSignedIn])

  const handleSignOut = (event) => {
    event.preventDefault()
    signOut()
    setNavUser({ username: '', avatarUrl: '' })
    navigate('/')
  }

  const navItemClass = ({ isActive }) =>
    [
      'group flex items-center gap-2 transition duration-200 hover:-translate-y-0.5',
      isActive ? 'text-accent' : 'text-slate-600 hover:text-accent',
    ].join(' ')

  return (
    <nav
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
        <NavLink to="/home" end className={navItemClass}>
          <House size={14} weight="bold" className="transition" />
          Home
        </NavLink>
        <NavLink to="/explore" className={navItemClass}>
          <Compass size={14} weight="bold" className="transition" />
          Explore
        </NavLink>
        <NavLink to="/backlog" className={navItemClass}>
          <Disc size={14} weight="bold" className="transition" />
          Albums
        </NavLink>
        <NavLink to="/artists" className={navItemClass}>
          <MusicNotes size={14} weight="bold" className="transition" />
          Artists
        </NavLink>
        <NavLink to="/lists" className={navItemClass}>
          <ListBullets size={14} weight="bold" className="transition" />
          Lists
        </NavLink>
      </div>
      <div className="group relative">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-subtle transition duration-200 hover:-translate-y-0.5 hover:bg-white',
              isActive ? 'text-accent' : 'text-slate-900 hover:text-accent',
            ].join(' ')
          }
        >
          {navUser.avatarUrl ? (
            <img
              src={navUser.avatarUrl}
              alt={`${navUser.username || 'User'} avatar`}
              className="h-8 w-8 rounded-full object-cover transition duration-200 group-hover:scale-105"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
              {(navUser.username || 'U').slice(0, 2).toUpperCase()}
            </span>
          )}
          {navUser.username || ' '}
        </NavLink>

        <div className="pointer-events-none absolute right-0 top-full z-40 w-56 translate-y-1 pt-2 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="rounded-2xl border border-black/5 bg-white/95 p-2 text-xs font-semibold text-slate-900 shadow-lg">
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                toggleTheme()
              }}
              className="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-900 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <span>Dark mode</span>
              <span
                className={[
                  'relative inline-flex h-5 w-9 items-center rounded-full border transition',
                  isDark
                    ? 'border-orange-500/50 bg-accent/90'
                    : 'border-black/15 bg-black/10',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute h-4 w-4 rounded-full transition-transform',
                    isDark ? 'translate-x-[17px] bg-[#1f130c]' : 'translate-x-[2px] bg-white',
                  ].join(' ')}
                />
              </span>
            </button>

            <div className="mb-1 h-px bg-black/10" />
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-black/5',
                  isActive ? 'text-accent' : 'text-slate-900',
                ].join(' ')
              }
            >
              Profile
            </NavLink>
            <NavLink
              to="/activity"
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-black/5',
                  isActive ? 'text-accent' : 'text-slate-900',
                ].join(' ')
              }
            >
              Activity
            </NavLink>
            <NavLink
              to="/friends"
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-black/5',
                  isActive ? 'text-accent' : 'text-slate-900',
                ].join(' ')
              }
            >
              Friends
            </NavLink>
            <NavLink
              to="/"
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-900 transition hover:bg-black/5"
            >
              <SignOut size={14} weight="bold" />
              Sign out
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}
