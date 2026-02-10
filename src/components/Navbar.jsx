import { Link } from 'react-router-dom'
import { BookOpen, Compass, House, MusicNotes } from 'phosphor-react'

export default function Navbar({ className = '' }) {
  return (
    <nav
      className={`flex flex-wrap items-center justify-between gap-4 rounded-full bg-white/80 px-5 py-3 text-sm text-slate-900 shadow-lg backdrop-blur-lg ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-accent">
          <MusicNotes size={18} weight="bold" />
        </span>
        <div>
          <p className="mb-0 text-sm font-semibold text-text">Turntabled</p>
          <p className="mb-0 text-xs text-muted">Album logging workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
        <Link to="/" className="flex items-center gap-2 text-slate-900">
          <House size={14} weight="bold" />
          Home
        </Link>
        <span className="flex items-center gap-2">
          <Compass size={14} weight="bold" />
          Explore
        </span>
        <span className="flex items-center gap-2">
          <BookOpen size={14} weight="bold" />
          My Backlog
        </span>
      </div>
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-subtle transition hover:-translate-y-0.5"
      >
        <img
          src="/profile/rainy.jpg"
          alt="user1 avatar"
          className="h-8 w-8 rounded-full object-cover"
        />
        user1
      </Link>
    </nav>
  )
}
