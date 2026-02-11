import { useEffect, useState } from 'react'

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

    window.addEventListener('storage', handleChange)
    window.addEventListener(EVENT_NAME, handleChange)

    return () => {
      window.removeEventListener('storage', handleChange)
      window.removeEventListener(EVENT_NAME, handleChange)
    }
  }, [])

  const signIn = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, 'true')
    broadcastAuthChange()
  }

  const signOut = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_KEY)
    broadcastAuthChange()
  }

  return { isSignedIn, signIn, signOut }
}
