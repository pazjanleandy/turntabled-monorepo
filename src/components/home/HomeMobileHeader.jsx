import { Link } from 'react-router-dom'
import { MusicNotes, UserCircle } from 'phosphor-react'

export default function HomeMobileHeader({ onOpenMenu, navUser }) {
  const username = navUser?.username || ''
  const avatarUrl = navUser?.avatarUrl || ''
  const initials = (username || 'U').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onOpenMenu}
          className="inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-700 shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M1 1H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M1 6H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M1 11H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <MusicNotes size={13} weight="bold" />
          </span>
          Turntabled
        </Link>

        <Link
          to="/profile"
          aria-label="Open profile"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white/70 text-text transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${username || 'User'} avatar`}
              className="h-6 w-6 rounded-md object-cover"
            />
          ) : username ? (
            <span className="text-[10px] font-bold uppercase text-accent">{initials}</span>
          ) : (
            <UserCircle size={16} weight="duotone" />
          )}
        </Link>
      </div>
    </header>
  )
}
