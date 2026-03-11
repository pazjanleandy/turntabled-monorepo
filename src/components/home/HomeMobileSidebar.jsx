import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ChartLineUp,
  Compass,
  Disc,
  House,
  ListBullets,
  MoonStars,
  MusicNotes,
  SignOut,
  UserCircle,
  Users,
} from 'phosphor-react'
import useTheme from '../../theme/useTheme.js'

function navLinkClass(isActive, tone = 'main') {
  const weight = tone === 'main' ? 'font-semibold' : 'font-medium'
  const base = [
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
    weight,
  ].join(' ')

  if (isActive) {
    return `${base} bg-accent/16 text-accent shadow-subtle`
  }

  if (tone === 'main') return `${base} text-slate-900 hover:bg-black/5 hover:text-accent`
  return `${base} text-slate-900 hover:bg-black/5 hover:text-accent`
}

function iconClass(isActive, tone = 'main') {
  if (isActive) return 'text-accent'
  if (tone === 'main') return 'text-slate-900 transition group-hover:text-accent'
  return 'text-slate-900 transition group-hover:text-accent'
}

function textClass(isActive, tone = 'main') {
  if (isActive) return 'text-accent'
  if (tone === 'main') return 'text-slate-900'
  return 'text-slate-900 transition group-hover:text-accent'
}

function SidebarNavLink({ to, icon, label, onNavigate, tone = 'main' }) {
  return (
    <NavLink to={to} onClick={onNavigate} className={({ isActive }) => navLinkClass(isActive, tone)}>
      {({ isActive }) => (
        <>
          <span className={iconClass(isActive, tone)}>{icon}</span>
          <span className={textClass(isActive, tone)}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
      {children}
    </p>
  )
}

function getFocusableElements(container) {
  if (!container) return []
  const elements = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  return Array.from(elements).filter((element) => {
    if (element instanceof HTMLElement) {
      return !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
    }
    return false
  })
}

export default function HomeMobileSidebar({
  isOpen,
  navUser,
  isSignedIn,
  onClose,
  onSignOut,
}) {
  const panelRef = useRef(null)
  const { isDark, toggleTheme } = useTheme()
  const username = navUser?.username || ''
  const avatarUrl = navUser?.avatarUrl || ''
  const initials = (username || 'U').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current
    const focusableElements = getFocusableElements(panel)
    focusableElements[0]?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const scopedFocusable = getFocusableElements(panelRef.current)
      if (scopedFocusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = scopedFocusable[0]
      const last = scopedFocusable[scopedFocusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleNavigate = () => onClose()
  const handleSignOut = () => {
    onSignOut()
    onClose()
  }

  return (
    <div
      className={[
        'fixed inset-0 z-50 transition lg:hidden',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={[
          'absolute inset-0 bg-slate-950/45 transition',
          isOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      <aside
        ref={panelRef}
        aria-label="Mobile navigation"
        className={[
          'absolute inset-y-3 left-3 flex w-[min(80vw,332px)] flex-col overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-[120%]',
        ].join(' ')}
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
            <MusicNotes size={14} className="text-accent" />
            Turntabled
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
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
        </div>

        <section className="mt-3 rounded-xl bg-black/5 px-2.5 py-2.5">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${username || 'User'} avatar`}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xs font-bold uppercase text-accent">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="mb-0 truncate text-sm font-semibold text-text">
                {username ? `@${username}` : 'Your profile'}
              </p>
              <p className="mb-0 text-[12px] text-muted">
                {isSignedIn ? 'Signed in' : 'Guest mode'}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto pr-1">
            <SectionLabel>Main navigation</SectionLabel>
            <nav className="space-y-1">
              <SidebarNavLink
                to="/home"
                icon={<House size={16} weight="bold" />}
                label="Home"
                onNavigate={handleNavigate}
                tone="main"
              />
              <SidebarNavLink
                to="/explore"
                icon={<Compass size={16} weight="bold" />}
                label="Explore"
                onNavigate={handleNavigate}
                tone="main"
              />
              <SidebarNavLink
                to="/backlog"
                icon={<Disc size={16} weight="bold" />}
                label="Albums"
                onNavigate={handleNavigate}
                tone="main"
              />
              <SidebarNavLink
                to="/lists"
                icon={<ListBullets size={16} weight="bold" />}
                label="Lists"
                onNavigate={handleNavigate}
                tone="main"
              />
              <SidebarNavLink
                to="/artists"
                icon={<MusicNotes size={16} weight="bold" />}
                label="Artists"
                onNavigate={handleNavigate}
                tone="main"
              />
            </nav>

            <div className="mt-4">
              <SectionLabel>Account</SectionLabel>
              <nav className="space-y-1">
                <SidebarNavLink
                  to="/profile"
                  icon={<UserCircle size={16} weight="bold" />}
                  label="Profile"
                  onNavigate={handleNavigate}
                  tone="secondary"
                />
                <SidebarNavLink
                  to="/activity"
                  icon={<ChartLineUp size={16} weight="bold" />}
                  label="Activity"
                  onNavigate={handleNavigate}
                  tone="secondary"
                />
                <SidebarNavLink
                  to="/friends"
                  icon={<Users size={16} weight="bold" />}
                  label="Friends"
                  onNavigate={handleNavigate}
                  tone="secondary"
                />
              </nav>
            </div>

            <div className="mt-4">
              <SectionLabel>Preferences</SectionLabel>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-black/5 px-3.5 py-3">
                <span className="inline-flex items-center gap-2.5 text-sm font-medium text-text">
                  <MoonStars size={16} weight="bold" className="text-accent" />
                  Dark mode
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label="Toggle dark mode"
                  onClick={toggleTheme}
                  className={[
                    'relative inline-flex h-6 w-11 items-center rounded-full border p-0 transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
                    isDark ? 'border-orange-500/55 bg-accent/90' : 'border-black/15 bg-black/10',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute h-5 w-5 rounded-full transition-transform',
                      isDark ? 'translate-x-[21px] bg-[#1f130c]' : 'translate-x-[1px] bg-white',
                    ].join(' ')}
                  />
                </button>
              </div>
            </div>
          </div>

          {isSignedIn ? (
            <div className="mt-4 border-t border-black/10 pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-300 bg-red-50/80 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <SignOut size={16} weight="bold" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
