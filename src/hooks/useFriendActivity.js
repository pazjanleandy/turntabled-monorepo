import { useCallback, useEffect, useState } from 'react'
import { FRIENDS_UPDATED_EVENT_NAME, fetchFriendActivityFeed } from '../lib/friendsClient.js'

export default function useFriendActivity({ isSignedIn, limit = 20 }) {
  const [activities, setActivities] = useState([])
  const [hasFriends, setHasFriends] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!isSignedIn) {
      setActivities([])
      setHasFriends(false)
      setError('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const payload = await fetchFriendActivityFeed({ limit })
      setActivities(Array.isArray(payload?.activities) ? payload.activities : [])
      setHasFriends(Boolean(payload?.hasFriends))
    } catch (loadError) {
      setActivities([])
      setHasFriends(false)
      setError(loadError?.message ?? 'Failed to load friend activity.')
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, limit])

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

  return {
    activities,
    hasFriends,
    isLoading,
    error,
    reload,
  }
}

