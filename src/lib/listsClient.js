import { buildApiAuthHeaders } from './apiAuth.js'

function getApiBase() {
  return import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
}

function getListItemEndpoint(listId) {
  const params = new URLSearchParams()
  params.set('id', String(listId ?? ''))
  return `${getApiBase()}/api/lists/item?${params.toString()}`
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload
  throw new Error(payload?.error?.message ?? fallbackMessage)
}

export async function fetchPublishedLists({
  sort = 'trending',
  tag = '',
  query = '',
  page = 1,
  limit = 50,
} = {}) {
  const authHeaders = await buildApiAuthHeaders()
  const params = new URLSearchParams()
  params.set('sort', sort)
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (tag && tag !== 'All') params.set('tag', tag)
  if (query.trim()) params.set('q', query.trim())

  const response = await fetch(`${getApiBase()}/api/lists?${params.toString()}`, {
    headers: authHeaders,
  })
  return parseJsonResponse(response, 'Failed to load community lists.')
}

export async function fetchListDetail(listId) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(getListItemEndpoint(listId), {
    headers: authHeaders,
  })
  const payload = await parseJsonResponse(response, 'Failed to load list details.')
  return payload?.item ?? null
}

export async function publishCommunityList({ title, description, tags, albumIds }) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(`${getApiBase()}/api/lists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ title, description, tags, albumIds }),
  })
  const payload = await parseJsonResponse(response, 'Failed to publish list.')
  return payload?.item ?? null
}

export async function updateCommunityList(listId, { title, description, tags, albumIds } = {}) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(getListItemEndpoint(listId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ title, description, tags, albumIds }),
  })
  const payload = await parseJsonResponse(response, 'Failed to update list.')
  return payload?.item ?? null
}

export async function deleteCommunityList(listId) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(getListItemEndpoint(listId), {
    method: 'DELETE',
    headers: authHeaders,
  })
  return parseJsonResponse(response, 'Failed to delete list.')
}

export async function toggleCommunityListFavorite(listId, favorited) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(getListItemEndpoint(listId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      action: 'favorite',
      favorited,
    }),
  })
  return parseJsonResponse(response, 'Failed to update list favorite.')
}

export async function addCommunityListComment(listId, comment) {
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(getListItemEndpoint(listId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      action: 'comment',
      comment,
    }),
  })
  return parseJsonResponse(response, 'Failed to add comment.')
}

export async function searchAlbumsForListBuilder({ query = '', page = 1, limit = 24 } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (query.trim()) params.set('q', query.trim())

  const response = await fetch(`${getApiBase()}/api/lists/albums?${params.toString()}`)
  return parseJsonResponse(response, 'Failed to load albums.')
}
