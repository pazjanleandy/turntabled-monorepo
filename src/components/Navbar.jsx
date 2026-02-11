import { NavLink } from 'react-router-dom'
import { BookOpen, Compass, House, MusicNotes } from 'phosphor-react'

export default function Navbar({ className = '' }) {
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
        <NavLink to="/" end className={navItemClass}>
          <House size={14} weight="bold" className="transition" />
          Home
        </NavLink>
        <NavLink to="/explore" className={navItemClass}>
          <Compass size={14} weight="bold" className="transition" />
          Explore
        </NavLink>
        <NavLink to="/backlog" className={navItemClass}>
          <BookOpen size={14} weight="bold" className="transition" />
          My Backlog
        </NavLink>
        <NavLink to="/artists" className={navItemClass}>
          <MusicNotes size={14} weight="bold" className="transition" />
          Artists
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
          <img
            src="/profile/rainy.jpg"
            alt="user1 avatar"
            className="h-8 w-8 rounded-full object-cover transition duration-200 group-hover:scale-105"
          />
          user1
        </NavLink>

        <div className="pointer-events-none absolute right-0 top-full z-40 w-48 translate-y-1 pt-2 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-2xl border border-black/5 bg-white/95 p-2 text-xs font-semibold text-slate-900 shadow-lg">
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
              to="/favorites"
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-black/5',
                  isActive ? 'text-accent' : 'text-slate-900',
                ].join(' ')
              }
            >
              Favorites
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
          </div>
        </div>
      </div>
    </nav>
  )
}
