import { useCallback, useEffect, useState } from 'react'
import {
  FRIENDS_UPDATED_EVENT_NAME,
  acceptFriendRequest,
  deleteFriendship,
  fetchFriends,
  fetchIncomingFriendRequests,
  rejectFriendRequest,
} from '../lib/friendsClient.js'

export default function useFriendsData({ isSignedIn }) {
  const [friends, setFriends] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionKey, setActionKey] = useState('')

  const reload = useCallback(async () => {
    if (!isSignedIn) {
      setFriends([])
      setIncomingRequests([])
      setError('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [friendsRows, requestRows] = await Promise.all([
        fetchFriends(),
        fetchIncomingFriendRequests(),
      ])
      setFriends(Array.isArray(friendsRows) ? friendsRows : [])
      setIncomingRequests(Array.isArray(requestRows) ? requestRows : [])
    } catch (loadError) {
      setFriends([])
      setIncomingRequests([])
      setError(loadError?.message ?? 'Failed to load friends data.')
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    const onFriendsUpdated = () => {
      reload()
    }
    window.addEventListener(FRIENDS_UPDATED_EVENT_NAME, onFriendsUpdated)
    return () => {
      window.removeEventListener(FRIENDS_UPDATED_EVENT_NAME, onFriendsUpdated)
    }
  }, [reload])

  const runAction = useCallback(async (nextActionKey, task) => {
    setActionError('')
    setActionKey(nextActionKey)
    try {
      await task()
      await reload()
    } catch (actionTaskError) {
      setActionError(actionTaskError?.message ?? 'Action failed.')
      throw actionTaskError
    } finally {
      setActionKey('')
    }
  }, [reload])

  const acceptRequest = useCallback(
    (requestId) => runAction(`accept:${requestId}`, () => acceptFriendRequest(requestId)),
    [runAction],
  )
  const rejectRequest = useCallback(
    (requestId) => runAction(`reject:${requestId}`, () => rejectFriendRequest(requestId)),
    [runAction],
  )
  const removeFriend = useCallback(
    (friendUserId) => runAction(`remove:${friendUserId}`, () => deleteFriendship(friendUserId)),
    [runAction],
  )

  return {
    friends,
    incomingRequests,
    isLoading,
    error,
    actionError,
    actionKey,
    reload,
    acceptRequest,
    rejectRequest,
    removeFriend,
  }
}

