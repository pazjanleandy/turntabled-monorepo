import { supabase } from '../supabase.js'

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
  if (Boolean(row?.is_favorite)) return 'favorite'
  return 'log'
}

function mapFriendActivityRow(row) {
  const type = getFriendActivityType(row)
  return {
    id: row?.id ?? '',
    type,
    userId: row?.user_id ?? '',
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

export async function fetchFriends() {
  const userId = await requireAuthUserId()

  const { data, error } = await supabase
    .from('friends')
    .select('id,friend_id,created_at,friend:friend_id(id,username,bio,avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load friends.')
  }

  return (data ?? []).map(mapFriendRow)
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

  const friendIds = Array.from(
    new Set((friendRows ?? []).map((row) => row?.friend_id).filter(Boolean)),
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

  return {
    hasFriends: true,
    activities: (data ?? []).map(mapFriendActivityRow),
  }
}

