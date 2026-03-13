import { buildApiAuthHeaders } from './apiAuth.js'

export const NOTIFICATIONS_UPDATED_EVENT_NAME = 'turntabled:notifications-updated'

function getApiBase() {
  return import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
}

function emitNotificationsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT_NAME))
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload
  throw new Error(payload?.error?.message ?? fallbackMessage)
}

export async function fetchNotifications({ limit = 40 } = {}) {
  const authHeaders = await buildApiAuthHeaders()
  const params = new URLSearchParams()
  params.set('limit', String(limit))

  const response = await fetch(`${getApiBase()}/api/notifications?${params.toString()}`, {
    headers: authHeaders,
    cache: 'no-store',
  })
  return parseJsonResponse(response, 'Failed to load notifications.')
}

export async function fetchUnreadNotificationCount() {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(`${getApiBase()}/api/notifications/unread-count`, {
    headers: authHeaders,
    cache: 'no-store',
  })
  return parseJsonResponse(response, 'Failed to load unread notification count.')
}

export async function markNotificationAsRead(notificationId) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(
    `${getApiBase()}/api/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'PATCH',
      headers: authHeaders,
    },
  )
  const payload = await parseJsonResponse(response, 'Failed to mark notification as read.')
  emitNotificationsUpdated()
  return payload
}

export async function markAllNotificationsAsRead() {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(`${getApiBase()}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders,
  })
  const payload = await parseJsonResponse(response, 'Failed to mark all notifications as read.')
  emitNotificationsUpdated()
  return payload
}

export { emitNotificationsUpdated }
