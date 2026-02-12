import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const STORAGE_KEY = 'turntabled:signedIn'
const EVENT_NAME = 'turntabled-auth'

const readAuthFlag = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'true'
}

const broadcastAuthChange = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT_NAME))
}

export default function useAuthStatus() {
  const [isSignedIn, setIsSignedIn] = useState(() => readAuthFlag())

  useEffect(() => {
    const handleChange = () => setIsSignedIn(readAuthFlag())
    let authSubscription = null

    const syncWithSupabase = async () => {
      const { data } = await supabase.auth.getSession()
      const hasSession = Boolean(data?.session)
      if (typeof window !== 'undefined') {
        if (hasSession) {
          window.localStorage.setItem(STORAGE_KEY, 'true')
        } else {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      }
      setIsSignedIn(hasSession)
    }

    window.addEventListener('storage', handleChange)
    window.addEventListener(EVENT_NAME, handleChange)
    syncWithSupabase()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (typeof window !== 'undefined') {
        if (session) {
          window.localStorage.setItem(STORAGE_KEY, 'true')
        } else {
          window.localStorage.removeItem(STORAGE_KEY)
        }
      }
      setIsSignedIn(Boolean(session))
      broadcastAuthChange()
    })
    authSubscription = listener.subscription

    return () => {
      window.removeEventListener('storage', handleChange)
      window.removeEventListener(EVENT_NAME, handleChange)
      authSubscription?.unsubscribe()
    }
  }, [])

  const signIn = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, 'true')
    broadcastAuthChange()
  }

  const signOut = () => {
    if (typeof window === 'undefined') return
    supabase.auth.signOut()
    window.localStorage.removeItem(STORAGE_KEY)
    broadcastAuthChange()
  }

  return { isSignedIn, signIn, signOut }
}
