import { supabase } from '../supabase.js'
import { buildApiAuthHeaders } from './apiAuth.js'

export const FRIENDS_UPDATED_EVENT_NAME = 'turntabled:friends-updated'

function emitFriendsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FRIENDS_UPDATED_EVENT_NAME))
}

async function requireAuthUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw new Error(error.message || 'Failed to resolve authenticated user.')
  }

  const userId = data?.user?.id
  if (!userId) {
    throw new Error('You must be signed in.')
  }

  return userId
}

function isRlsError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('row-level security') || message.includes('permission denied')
}

function buildAvatarUrl(avatarValue) {
  if (typeof avatarValue !== 'string' || !avatarValue.trim()) return ''
  const normalized = avatarValue.trim()
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(normalized)
  return data?.publicUrl || ''
}

function resolvePublicAvatarUrl(userAvatarUrl, profileAvatarPath) {
  const fromProfile = buildAvatarUrl(profileAvatarPath)
  if (fromProfile) return fromProfile
  return buildAvatarUrl(userAvatarUrl)
}

function mapPublicUser(row) {
  return {
    id: row?.id ?? '',
    username: row?.username ?? '',
    bio: row?.bio ?? '',
    avatarUrl: row?.avatar_url ?? '',
  }
}

function mapFriendRow(row) {
  return {
    id: row?.id ?? '',
    createdAt: row?.created_at ?? null,
    friendId: row?.friend_id ?? '',
    friend: mapPublicUser(row?.friend),
  }
}

function getFriendFromAcceptedRequest(row, currentUserId) {
  if (!row || !currentUserId) return null
  const senderId = row?.sender_id ?? ''
  const receiverId = row?.receiver_id ?? ''
  const isSender = senderId === currentUserId
  const friendId = isSender ? receiverId : senderId
  const friendUser = isSender ? row?.receiver : row?.sender

  if (!friendId) return null
  return {
    id: row?.id ?? `accepted-${currentUserId}-${friendId}`,
    createdAt: row?.updated_at ?? row?.created_at ?? null,
    friendId,
    friend: mapPublicUser(friendUser),
  }
}

function mapFriendRequestRow(row) {
  return {
    id: row?.id ?? '',
    senderId: row?.sender_id ?? '',
    receiverId: row?.receiver_id ?? '',
    status: row?.status ?? 'pending',
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
    sender: mapPublicUser(row?.sender),
    receiver: mapPublicUser(row?.receiver),
  }
}

function getFriendActivityType(row) {
  const reviewText = typeof row?.review_text === 'string' ? row.review_text.trim() : ''
  if (reviewText) return 'review'
  if (row?.is_favorite) return 'favorite'
  return 'log'
}

function mapFriendActivityRow(row) {
  const type = getFriendActivityType(row)
  return {
    id: row?.id ?? '',
    type,
    userId: row?.user_id ?? '',
    status: row?.status ?? '',
    user: mapPublicUser(row?.user),
    albumTitle: row?.album?.title ?? row?.album_title_raw ?? 'Unknown album',
    artistName: row?.album?.artist?.name ?? row?.artist_name_raw ?? 'Unknown artist',
    coverArtUrl: row?.album?.cover_art_url ?? '',
    rating: typeof row?.rating === 'number' ? row.rating : null,
    reviewedAt: row?.reviewed_at ?? null,
    addedAt: row?.added_at ?? null,
    updatedAt: row?.updated_at ?? null,
  }
}

async function findRelationshipRequest(currentUserId, targetUserId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id,sender_id,receiver_id,status,created_at,updated_at')
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`,
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to check friend request state.')
  }

  return data
}

async function fetchAcceptedRequestRowsForUser(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(
      'id,sender_id,receiver_id,status,created_at,updated_at,sender:sender_id(id,username,bio,avatar_url),receiver:receiver_id(id,username,bio,avatar_url)',
    )
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load accepted friendships.')
  }

  return Array.isArray(data) ? data : []
}

async function listProfileAvatarPathsByUserIds(userIds) {
  const normalizedIds = Array.isArray(userIds)
    ? userIds.filter((value) => typeof value === 'string' && value.trim())
    : []
  if (normalizedIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select('id,avatar_path')
    .in('id', normalizedIds)

  if (error) {
    return new Map()
  }

  return new Map(
    (Array.isArray(data) ? data : [])
      .filter((row) => typeof row?.id === 'string' && row.id.trim())
      .map((row) => [row.id, row?.avatar_path ?? '']),
  )
}

function withResolvedFriendAvatar(entry, avatarPathByUserId) {
  const friendUserId = entry?.friend?.id || entry?.friendId
  const profileAvatarPath = friendUserId ? avatarPathByUserId.get(friendUserId) ?? '' : ''
  return {
    ...entry,
    friend: {
      ...(entry?.friend ?? {}),
      avatarUrl: resolvePublicAvatarUrl(entry?.friend?.avatarUrl, profileAvatarPath),
    },
  }
}

async function fetchPublicProfileAvatarUrlsByUserIds(userIds) {
  const normalizedIds = Array.isArray(userIds)
    ? userIds.filter((value) => typeof value === 'string' && value.trim())
    : []
  if (normalizedIds.length === 0) return new Map()

  const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
  const headers = await buildApiAuthHeaders().catch(() => ({}))

  const avatarPairs = await Promise.all(
    normalizedIds.map(async (userId) => {
      try {
        const response = await fetch(
          `${apiBase}/api/profile/view?userId=${encodeURIComponent(userId)}`,
          { headers, cache: 'no-store' },
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) return null
        const avatarUrl = typeof payload?.user?.avatarUrl === 'string' ? payload.user.avatarUrl.trim() : ''
        if (!avatarUrl) return null
        return [userId, avatarUrl]
      } catch {
        return null
      }
    }),
  )

  return new Map(avatarPairs.filter(Boolean))
}

export async function fetchFriends() {
  const userId = await requireAuthUserId()

  const { data: friendRows, error } = await supabase
    .from('friends')
    .select('id,friend_id,created_at,friend:friend_id(id,username,bio,avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load friends.')
  }

  const acceptedRows = await fetchAcceptedRequestRowsForUser(userId)
  const mergedByFriendId = new Map()

  for (const row of friendRows ?? []) {
    const mapped = mapFriendRow(row)
    if (!mapped.friendId) continue
    mergedByFriendId.set(mapped.friendId, mapped)
  }

  for (const row of acceptedRows) {
    const mapped = getFriendFromAcceptedRequest(row, userId)
    if (!mapped?.friendId || mergedByFriendId.has(mapped.friendId)) continue
    mergedByFriendId.set(mapped.friendId, mapped)
  }

  const mergedFriends = Array.from(mergedByFriendId.values()).sort((a, b) => {
    const aTime = Date.parse(a?.createdAt ?? '') || 0
    const bTime = Date.parse(b?.createdAt ?? '') || 0
    return bTime - aTime
  })

  const avatarPathByUserId = await listProfileAvatarPathsByUserIds(
    mergedFriends
      .map((entry) => entry?.friend?.id || entry?.friendId)
      .filter((value) => typeof value === 'string' && value.trim()),
  )

  const friendsWithResolvedAvatars = mergedFriends.map((entry) =>
    withResolvedFriendAvatar(entry, avatarPathByUserId),
  )
  const missingAvatarIds = friendsWithResolvedAvatars
    .filter((entry) => !entry?.friend?.avatarUrl)
    .map((entry) => entry?.friend?.id || entry?.friendId)
    .filter((value) => typeof value === 'string' && value.trim())
    .slice(0, 30)

  if (missingAvatarIds.length === 0) {
    return friendsWithResolvedAvatars
  }

  const fallbackAvatarByUserId = await fetchPublicProfileAvatarUrlsByUserIds(missingAvatarIds)
  if (fallbackAvatarByUserId.size === 0) {
    return friendsWithResolvedAvatars
  }

  return friendsWithResolvedAvatars.map((entry) => {
    const friendUserId = entry?.friend?.id || entry?.friendId
    const fallbackAvatar = friendUserId ? fallbackAvatarByUserId.get(friendUserId) ?? '' : ''
    if (!fallbackAvatar) return entry
    return {
      ...entry,
      friend: {
        ...(entry?.friend ?? {}),
        avatarUrl: fallbackAvatar,
      },
    }
  })
}

export async function fetchIncomingFriendRequests() {
  const userId = await requireAuthUserId()

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id,sender_id,receiver_id,status,created_at,updated_at,sender:sender_id(id,username,bio,avatar_url)')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load incoming friend requests.')
  }

  return (data ?? []).map(mapFriendRequestRow)
}

export async function fetchRelationshipWithUser(targetUserId) {
  const userId = await requireAuthUserId()

  if (!targetUserId) {
    return { status: 'none', request: null }
  }
  if (targetUserId === userId) {
    return { status: 'self', request: null }
  }

  const { data: friendRow, error: friendError } = await supabase
    .from('friends')
    .select('id,user_id,friend_id,created_at')
    .eq('user_id', userId)
    .eq('friend_id', targetUserId)
    .maybeSingle()

  if (friendError) {
    throw new Error(friendError.message || 'Failed to check friendship state.')
  }
  if (friendRow?.id) {
    return { status: 'friends', request: null }
  }

  const requestRow = await findRelationshipRequest(userId, targetUserId)
  if (!requestRow?.id) {
    return { status: 'none', request: null }
  }

  if (requestRow.status === 'pending') {
    if (requestRow.sender_id === userId) {
      return { status: 'outgoing_pending', request: mapFriendRequestRow(requestRow) }
    }
    return { status: 'incoming_pending', request: mapFriendRequestRow(requestRow) }
  }

  if (requestRow.status === 'accepted') {
    return { status: 'friends', request: mapFriendRequestRow(requestRow) }
  }

  return { status: 'none', request: mapFriendRequestRow(requestRow) }
}

export async function fetchFollowStateWithUser(targetUserId) {
  const userId = await requireAuthUserId()

  if (!targetUserId) {
    return { status: 'not_following', followedAt: null }
  }
  if (targetUserId === userId) {
    return { status: 'self', followedAt: null }
  }

  const { data: followRow, error } = await supabase
    .from('friends')
    .select('id,created_at')
    .eq('user_id', userId)
    .eq('friend_id', targetUserId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to check follow state.')
  }

  if (followRow?.id) {
    return { status: 'following', followedAt: followRow.created_at ?? null }
  }

  return { status: 'not_following', followedAt: null }
}

export async function followUser(targetUserId) {
  const userId = await requireAuthUserId()
  if (!targetUserId) {
    throw new Error('Missing target user.')
  }
  if (targetUserId === userId) {
    throw new Error('You cannot follow yourself.')
  }

  const { error } = await supabase
    .from('friends')
    .upsert([{ user_id: userId, friend_id: targetUserId }], {
      onConflict: 'user_id,friend_id',
      ignoreDuplicates: true,
    })

  if (error) {
    throw new Error(error.message || 'Failed to follow user.')
  }

  emitFriendsUpdated()
  return { status: 'following' }
}

export async function unfollowUser(targetUserId) {
  const userId = await requireAuthUserId()
  if (!targetUserId) {
    throw new Error('Missing target user.')
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', targetUserId)

  if (error) {
    throw new Error(error.message || 'Failed to unfollow user.')
  }

  emitFriendsUpdated()
  return { status: 'not_following' }
}

export async function sendFriendRequest(targetUserId) {
  const userId = await requireAuthUserId()
  if (!targetUserId) {
    throw new Error('Missing target user.')
  }
  if (targetUserId === userId) {
    throw new Error('You cannot send a friend request to yourself.')
  }

  const { data: existingFriend, error: friendError } = await supabase
    .from('friends')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', targetUserId)
    .maybeSingle()

  if (friendError) {
    throw new Error(friendError.message || 'Failed to check friendship state.')
  }
  if (existingFriend?.id) {
    throw new Error('You are already friends with this user.')
  }

  const existingRequest = await findRelationshipRequest(userId, targetUserId)
  if (existingRequest?.id) {
    if (existingRequest.status === 'pending') {
      if (existingRequest.sender_id === userId) {
        throw new Error('Friend request already sent.')
      }
      throw new Error('This user already sent you a friend request.')
    }
    if (existingRequest.status === 'accepted') {
      throw new Error('You are already friends with this user.')
    }
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      sender_id: userId,
      receiver_id: targetUserId,
      status: 'pending',
    })
    .select('id,sender_id,receiver_id,status,created_at,updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Friend request already exists.')
    }
    throw new Error(error.message || 'Failed to send friend request.')
  }

  emitFriendsUpdated()
  return mapFriendRequestRow(data)
}

export async function acceptFriendRequest(requestId) {
  const userId = await requireAuthUserId()
  if (!requestId) {
    throw new Error('Missing friend request id.')
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('friend_requests')
    .select('id,sender_id,receiver_id,status')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    throw new Error(requestError.message || 'Failed to load friend request.')
  }
  if (!requestRow?.id) {
    throw new Error('Friend request not found.')
  }
  if (requestRow.receiver_id !== userId) {
    throw new Error('You are not allowed to accept this request.')
  }
  if (requestRow.status === 'accepted') {
    throw new Error('This request is already accepted.')
  }
  if (requestRow.status !== 'pending') {
    throw new Error('Only pending requests can be accepted.')
  }

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .eq('status', 'pending')

  if (updateError) {
    throw new Error(updateError.message || 'Failed to accept friend request.')
  }

  const pairRows = [
    { user_id: requestRow.receiver_id, friend_id: requestRow.sender_id },
    { user_id: requestRow.sender_id, friend_id: requestRow.receiver_id },
  ]

  const { error: pairInsertError } = await supabase
    .from('friends')
    .upsert(pairRows, { onConflict: 'user_id,friend_id', ignoreDuplicates: true })

  if (pairInsertError && !isRlsError(pairInsertError)) {
    throw new Error(pairInsertError.message || 'Failed to create friendship.')
  }

  if (pairInsertError && isRlsError(pairInsertError)) {
    const { error: ownInsertError } = await supabase
      .from('friends')
      .upsert(
        [{ user_id: requestRow.receiver_id, friend_id: requestRow.sender_id }],
        { onConflict: 'user_id,friend_id', ignoreDuplicates: true },
      )

    if (ownInsertError) {
      throw new Error(ownInsertError.message || 'Failed to create friendship.')
    }
  }

  emitFriendsUpdated()
}

export async function rejectFriendRequest(requestId) {
  const userId = await requireAuthUserId()
  if (!requestId) {
    throw new Error('Missing friend request id.')
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('friend_requests')
    .select('id,receiver_id,status')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    throw new Error(requestError.message || 'Failed to load friend request.')
  }
  if (!requestRow?.id) {
    throw new Error('Friend request not found.')
  }
  if (requestRow.receiver_id !== userId) {
    throw new Error('You are not allowed to reject this request.')
  }
  if (requestRow.status === 'accepted') {
    throw new Error('Accepted requests cannot be rejected.')
  }
  if (requestRow.status !== 'pending') {
    throw new Error('Only pending requests can be rejected.')
  }

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .eq('status', 'pending')

  if (updateError) {
    throw new Error(updateError.message || 'Failed to reject friend request.')
  }

  emitFriendsUpdated()
}

export async function deleteFriendship(friendUserId) {
  const userId = await requireAuthUserId()
  if (!friendUserId) {
    throw new Error('Missing friend user id.')
  }

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendUserId)

  if (error) {
    throw new Error(error.message || 'Failed to delete friendship.')
  }

  const nowIso = new Date().toISOString()
  const { error: requestError } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: nowIso })
    .eq('status', 'accepted')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${userId})`,
    )

  if (requestError) {
    throw new Error(requestError.message || 'Failed to update friendship state.')
  }

  emitFriendsUpdated()
}

export async function fetchFriendActivityFeed({ limit = 20 } = {}) {
  const userId = await requireAuthUserId()

  const { data: friendRows, error: friendError } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId)

  if (friendError) {
    throw new Error(friendError.message || 'Failed to load friends.')
  }

  const acceptedRows = await fetchAcceptedRequestRowsForUser(userId)
  const acceptedFriendIds = acceptedRows
    .map((row) => getFriendFromAcceptedRequest(row, userId)?.friendId)
    .filter(Boolean)

  const friendIds = Array.from(
    new Set([...(friendRows ?? []).map((row) => row?.friend_id), ...acceptedFriendIds].filter(Boolean)),
  )

  if (friendIds.length === 0) {
    return { hasFriends: false, activities: [] }
  }

  const { data, error } = await supabase
    .from('backlog')
    .select(
      'id,user_id,status,rating,is_favorite,review_text,reviewed_at,added_at,updated_at,artist_name_raw,album_title_raw,user:user_id(id,username,avatar_url),album:album_id(title,cover_art_url,artist:artist_id(name))',
    )
    .in('user_id', friendIds)
    .order('added_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error) {
    throw new Error(error.message || 'Failed to load friend activity.')
  }

  const activities = (data ?? []).map(mapFriendActivityRow)
  const activityUserIds = [...new Set(
    activities
      .map((entry) => entry?.user?.id || entry?.userId)
      .filter((value) => typeof value === 'string' && value.trim()),
  )]
  const avatarPathByUserId = await listProfileAvatarPathsByUserIds(activityUserIds)
  const activitiesWithResolvedAvatars = activities.map((entry) => {
    const activityUserId = entry?.user?.id || entry?.userId
    const profileAvatarPath = activityUserId ? avatarPathByUserId.get(activityUserId) ?? '' : ''
    return {
      ...entry,
      user: {
        ...(entry?.user ?? {}),
        avatarUrl: resolvePublicAvatarUrl(entry?.user?.avatarUrl, profileAvatarPath),
      },
    }
  })
  const missingAvatarIds = activitiesWithResolvedAvatars
    .filter((entry) => !entry?.user?.avatarUrl)
    .map((entry) => entry?.user?.id || entry?.userId)
    .filter((value) => typeof value === 'string' && value.trim())
    .slice(0, 30)

  if (missingAvatarIds.length === 0) {
    return {
      hasFriends: true,
      activities: activitiesWithResolvedAvatars,
    }
  }

  const fallbackAvatarByUserId = await fetchPublicProfileAvatarUrlsByUserIds(missingAvatarIds)
  if (fallbackAvatarByUserId.size === 0) {
    return {
      hasFriends: true,
      activities: activitiesWithResolvedAvatars,
    }
  }

  const activitiesWithFallbackAvatars = activitiesWithResolvedAvatars.map((entry) => {
    const activityUserId = entry?.user?.id || entry?.userId
    const fallbackAvatar = activityUserId ? fallbackAvatarByUserId.get(activityUserId) ?? '' : ''
    if (!fallbackAvatar) return entry
    return {
      ...entry,
      user: {
        ...(entry?.user ?? {}),
        avatarUrl: fallbackAvatar,
      },
    }
  })

  return {
    hasFriends: true,
    activities: activitiesWithFallbackAvatars,
  }
}
