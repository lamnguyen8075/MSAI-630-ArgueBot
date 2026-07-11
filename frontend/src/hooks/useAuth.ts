import { useCallback, useEffect, useState } from 'react'
import type { AuthUser } from '../api/auth'
import { clearStoredToken, fetchMe, getStoredToken, logout as apiLogout } from '../api/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetchMe()
      .then(setUser)
      .catch(() => {
        clearStoredToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const loginSuccess = useCallback((authUser: AuthUser) => {
    setUser(authUser)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  return { user, loading, loginSuccess, logout, refreshUser }
}
