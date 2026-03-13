import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BellSimple, Check, Compass, Disc, House, ListBullets, MusicNotes, SignOut } from 'phosphor-react'
import useAuthStatus from '../hooks/useAuthStatus.js'
import useTheme from '../theme/useTheme.js'
import {
  PROFILE_EVENT_NAME,
  emitProfileUpdated,
  fetchCurrentProfile,
  readCachedProfile,
} from '../lib/profileClient.js'
import {
  NOTIFICATIONS_UPDATED_EVENT_NAME,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../lib/notificationsClient.js'

function formatRelativeTimestamp(value) {
  const parsed = Date.parse(value ?? '')
  if (!Number.isFinite(parsed)) return 'Just now'

  const diffMs = Date.now() - parsed
  const safeDiffMs = Number.isFinite(diffMs) ? Math.max(0, diffMs) : 0
  const second = 1000
  const minute = 60 * second
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (safeDiffMs < minute) return 'Just now'
  if (safeDiffMs < hour) return `${Math.floor(safeDiffMs / minute)}m ago`
  if (safeDiffMs < day) return `${Math.floor(safeDiffMs / hour)}h ago`
  if (safeDiffMs < week) return `${Math.floor(safeDiffMs / day)}d ago`

  const date = new Date(parsed)
  const thisYear = new Date().getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === thisYear ? {} : { year: 'numeric' }),
  })
}

function getInitials(value = '') {
  const normalized = String(value).trim().replace(/^@/, '')
  if (!normalized) return 'U'
  return normalized.slice(0, 2).toUpperCase()
}

function normalizeUnreadCount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

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
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [isMarkAllBusy, setIsMarkAllBusy] = useState(false)
  const [markingNotificationIds, setMarkingNotificationIds] = useState({})
  const notificationsRootRef = useRef(null)
  const isNotificationsOpenRef = useRef(false)

  useEffect(() => {
    isNotificationsOpenRef.current = isNotificationsOpen
  }, [isNotificationsOpen])

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

  const loadUnreadCount = useCallback(async () => {
    if (!isSignedIn) return
    try {
      const payload = await fetchUnreadNotificationCount()
      setUnreadCount(normalizeUnreadCount(payload?.unreadCount))
    } catch {
      // Silent failure keeps current count.
    }
  }, [isSignedIn])

  const loadNotifications = useCallback(async () => {
    if (!isSignedIn) return

    setIsNotificationsLoading(true)
    setNotificationsError('')

    try {
      const payload = await fetchNotifications({ limit: 40 })
      const rows = Array.isArray(payload?.items) ? payload.items : []
      setNotifications(rows)
    } catch (error) {
      setNotificationsError(error?.message ?? 'Unable to load notifications.')
    } finally {
      setIsNotificationsLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (isSignedIn) return

    setNotifications([])
    setUnreadCount(0)
    setIsNotificationsOpen(false)
    setIsNotificationsLoading(false)
    setNotificationsError('')
    setIsMarkAllBusy(false)
    setMarkingNotificationIds({})
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return

    void loadUnreadCount()

    const refreshIntervalId = window.setInterval(() => {
      void loadUnreadCount()
    }, 30000)

    const handleFocus = () => {
      void loadUnreadCount()
      if (isNotificationsOpenRef.current) {
        void loadNotifications()
      }
    }

    const handleNotificationsUpdated = () => {
      void loadUnreadCount()
      if (isNotificationsOpenRef.current) {
        void loadNotifications()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT_NAME, handleNotificationsUpdated)

    return () => {
      window.clearInterval(refreshIntervalId)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT_NAME, handleNotificationsUpdated)
    }
  }, [isSignedIn, loadNotifications, loadUnreadCount])

  useEffect(() => {
    if (!isSignedIn || !isNotificationsOpen) return
    void loadNotifications()
  }, [isSignedIn, isNotificationsOpen, loadNotifications])

  useEffect(() => {
    if (!isNotificationsOpen) return

    const handleDocumentMouseDown = (event) => {
      const target = event?.target
      if (!(target instanceof Node)) return
      if (notificationsRootRef.current?.contains(target)) return
      setIsNotificationsOpen(false)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsOpen])

  const handleSignOut = (event) => {
    event.preventDefault()
    signOut()
    setNavUser({ username: '', avatarUrl: '' })
    navigate('/')
  }

  const handleMarkNotificationRead = async (notificationId, { quiet = false } = {}) => {
    if (!notificationId || markingNotificationIds[notificationId]) return

    const row = notifications.find((item) => item?.id === notificationId)
    const wasUnread = Boolean(row && !row.isRead)

    setNotifications((prev) =>
      prev.map((item) => (item?.id === notificationId ? { ...item, isRead: true } : item)),
    )
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    setMarkingNotificationIds((prev) => ({ ...prev, [notificationId]: true }))

    try {
      const payload = await markNotificationAsRead(notificationId)
      const serverNotification = payload?.notification ?? null
      if (serverNotification?.id) {
        setNotifications((prev) =>
          prev.map((item) => (item?.id === serverNotification.id ? serverNotification : item)),
        )
      }
      if (Number.isFinite(Number(payload?.unreadCount))) {
        setUnreadCount(normalizeUnreadCount(payload.unreadCount))
      }
    } catch (error) {
      if (!quiet) {
        setNotificationsError(error?.message ?? 'Failed to mark notification as read.')
      }
      await Promise.all([loadUnreadCount(), loadNotifications()])
    } finally {
      setMarkingNotificationIds((prev) => {
        const next = { ...prev }
        delete next[notificationId]
        return next
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    if (isMarkAllBusy || unreadCount <= 0) return

    const snapshot = notifications
    setIsMarkAllBusy(true)
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)

    try {
      const payload = await markAllNotificationsAsRead()
      if (Number.isFinite(Number(payload?.unreadCount))) {
        setUnreadCount(normalizeUnreadCount(payload.unreadCount))
      }
    } catch (error) {
      setNotifications(snapshot)
      setNotificationsError(error?.message ?? 'Failed to mark all notifications as read.')
      await Promise.all([loadUnreadCount(), loadNotifications()])
    } finally {
      setIsMarkAllBusy(false)
    }
  }

  const handleOpenNotification = (notification) => {
    if (!notification) return

    if (!notification.isRead && notification.id) {
      void handleMarkNotificationRead(notification.id, { quiet: true })
    }

    setIsNotificationsOpen(false)

    const destination =
      typeof notification.destination === 'string' && notification.destination.trim()
        ? notification.destination.trim()
        : '/activity'
    navigate(destination)
  }

  const navItemClass = ({ isActive }) =>
    [
      'group flex items-center gap-2 transition duration-200 hover:-translate-y-0.5',
      isActive ? 'text-accent' : 'text-slate-600 hover:text-accent',
    ].join(' ')

  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <nav
      className={`relative z-40 flex min-w-0 items-center justify-between gap-5 rounded-full bg-white/80 px-5 py-3 text-sm text-slate-900 shadow-lg backdrop-blur-lg ${className}`}
    >
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-accent transition duration-200 hover:-translate-y-0.5 hover:bg-accent/25">
          <MusicNotes size={18} weight="bold" />
        </span>
        <div className="min-w-0">
          <p className="mb-0 text-sm font-semibold text-text">Turntabled</p>
          <p className="mb-0 text-xs text-muted">Album logging workspace</p>
        </div>
      </div>

      <div className="mx-auto flex min-w-0 flex-1 items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
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

      <div className="flex shrink-0 items-center gap-2.5">
        <div ref={notificationsRootRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="Open notifications"
            aria-expanded={isNotificationsOpen}
            onClick={() => {
              if (!isSignedIn) {
                navigate('/')
                return
              }
              setIsNotificationsOpen((current) => !current)
            }}
            className={[
              'relative inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 shadow-none transition-opacity duration-200',
              'focus-visible:outline-none',
              isDark ? 'text-white' : 'text-slate-700',
              isNotificationsOpen
                ? 'opacity-100'
                : 'opacity-90 hover:opacity-100',
            ].join(' ')}
          >
            <BellSimple
              size={20}
              weight="fill"
              className="block h-5 w-5 shrink-0 text-current"
              aria-hidden="true"
            />
            {unreadCount > 0 ? (
              <span
                className="absolute -right-1.5 -top-1.5 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none shadow-[0_6px_14px_-8px_rgba(15,23,42,0.85)]"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {unreadBadgeLabel}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface-elevated)] shadow-[0_28px_58px_-28px_rgba(15,15,15,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
                <div>
                  <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text)]">
                    Notifications
                  </p>
                  <p className="mb-0 text-xs text-[color:var(--text-muted)]">
                    {unreadCount > 0
                      ? `${unreadCount.toLocaleString()} unread`
                      : 'All caught up'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleMarkAllAsRead()
                  }}
                  disabled={isMarkAllBusy || unreadCount === 0}
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[var(--surface-3)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={11} weight="bold" />
                  {isMarkAllBusy ? 'Marking' : 'Mark all read'}
                </button>
              </div>

              {notificationsError ? (
                <div className="border-b border-red-200 bg-red-50/80 px-4 py-2.5 text-xs text-red-700">
                  {notificationsError}
                </div>
              ) : null}

              {isNotificationsLoading ? (
                <div className="px-4 py-5 text-sm text-[color:var(--text-soft)]">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-5 text-sm text-[color:var(--text-soft)]">
                  No notifications yet. Likes, comments, and follows will show up here.
                </div>
              ) : (
                <ul className="scrollbar-sleek max-h-[24rem] overflow-y-auto">
                  {notifications.map((item) => {
                    const username = item?.actor?.username || 'deleted-user'
                    const avatarUrl = item?.actor?.avatarUrl || ''
                    const id = item?.id || `${item?.type || 'notification'}-${item?.createdAt || ''}`
                    const isRead = Boolean(item?.isRead)
                    const isMarkBusy = Boolean(item?.id && markingNotificationIds[item.id])

                    return (
                      <li
                        key={id}
                        className={[
                          'border-b border-[color:var(--border)] px-3 py-2.5 transition last:border-b-0',
                          isRead ? 'bg-transparent' : 'bg-accent/5',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenNotification(item)}
                            className="flex min-w-0 flex-1 items-start gap-2.5 border-0 bg-transparent p-0 text-left shadow-none hover:translate-y-0 hover:bg-transparent"
                          >
                            <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-accent/12 text-[10px] font-semibold uppercase text-accent">
                              {getInitials(username)}
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={`${username} avatar`}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                            </span>

                            <span className="min-w-0 flex-1">
                              <p className="mb-0 text-[12px] leading-snug text-[color:var(--text-soft)]">
                                <span className="font-semibold text-[color:var(--text)]">{username}</span>{' '}
                                <span>{item?.actionText || 'interacted with your activity'}</span>
                              </p>
                              <p className="mb-0 mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                                {formatRelativeTimestamp(item?.createdAt)}
                              </p>
                            </span>
                          </button>

                          <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                            {!isRead ? (
                              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                            ) : null}
                            {!isRead && item?.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleMarkNotificationRead(item.id)
                                }}
                                disabled={isMarkBusy}
                                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Check size={10} weight="bold" />
                                {isMarkBusy ? 'Marking' : 'Read'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
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
            <span className="max-w-[9rem] truncate">{navUser.username || ' '}</span>
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
      </div>
    </nav>
  )
}
