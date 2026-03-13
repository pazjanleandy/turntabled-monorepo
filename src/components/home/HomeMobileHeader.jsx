import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellSimple, Check, MusicNotes } from 'phosphor-react'
import {
  NOTIFICATIONS_UPDATED_EVENT_NAME,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../lib/notificationsClient.js'

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

export default function HomeMobileHeader({ onOpenMenu, navUser, isSignedIn = false }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [isMarkAllBusy, setIsMarkAllBusy] = useState(false)
  const [markingNotificationIds, setMarkingNotificationIds] = useState({})
  const notificationsRootRef = useRef(null)
  const isNotificationsOpenRef = useRef(false)

  const username = navUser?.username || ''
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  useEffect(() => {
    isNotificationsOpenRef.current = isNotificationsOpen
  }, [isNotificationsOpen])

  const loadUnreadCount = useCallback(async () => {
    if (!isSignedIn) return
    try {
      const payload = await fetchUnreadNotificationCount()
      setUnreadCount(normalizeUnreadCount(payload?.unreadCount))
    } catch {
      // Keep current count on transient failures.
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

        <div ref={notificationsRootRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={username ? `Open notifications for ${username}` : 'Open notifications'}
            aria-expanded={isNotificationsOpen}
            onClick={() => {
              if (!isSignedIn) {
                navigate('/')
                return
              }
              setIsNotificationsOpen((current) => !current)
            }}
            className={[
              'relative inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 shadow-none transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
              isNotificationsOpen ? 'text-accent' : 'text-slate-700 hover:text-accent',
            ].join(' ')}
          >
            <BellSimple size={18} weight="fill" className="block h-[18px] w-[18px] shrink-0 text-current" />
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
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface-elevated)] shadow-[0_28px_58px_-28px_rgba(15,15,15,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
                <div>
                  <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text)]">
                    Notifications
                  </p>
                  <p className="mb-0 text-xs text-[color:var(--text-muted)]">
                    {unreadCount > 0 ? `${unreadCount.toLocaleString()} unread` : 'All caught up'}
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
                    const actorUsername = item?.actor?.username || 'deleted-user'
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
                              {getInitials(actorUsername)}
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={`${actorUsername} avatar`}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                            </span>

                            <span className="min-w-0 flex-1">
                              <p className="mb-0 text-[12px] leading-snug text-[color:var(--text-soft)]">
                                <span className="font-semibold text-[color:var(--text)]">{actorUsername}</span>{' '}
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
      </div>
    </header>
  )
}
