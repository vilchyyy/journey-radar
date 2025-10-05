'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authClient } from '@/lib/auth-client'

export type AuthSessionStatus = 'loading' | 'authenticated' | 'guest' | 'error'

export type AuthenticatedUser = {
  id?: string
  name?: string | null
  image?: string | null
  email?: string | null
  [key: string]: unknown
}

type UseAuthSessionOptions = {
  autoRefresh?: boolean
}

type UseAuthSessionResult = {
  user: AuthenticatedUser | null
  status: AuthSessionStatus
  isClient: boolean
  refresh: () => Promise<AuthenticatedUser | null>
  isLoading: boolean
}

export function useAuthSession(
  options: UseAuthSessionOptions = {},
): UseAuthSessionResult {
  const { autoRefresh = true } = options

  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [status, setStatus] = useState<AuthSessionStatus>('loading')
  const [isClient, setIsClient] = useState(false)

  const isActiveRef = useRef(true)

  useEffect(() => {
    isActiveRef.current = true
    setIsClient(true)

    return () => {
      isActiveRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!isActiveRef.current) {
      return null
    }

    try {
      setStatus('loading')

      const session = await authClient.getSession()
      const nextUser =
        (session?.data as { user?: AuthenticatedUser } | undefined)?.user ??
        null

      if (!isActiveRef.current) {
        return nextUser
      }

      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'guest')

      return nextUser
    } catch (error) {
      if (!isActiveRef.current) {
        return null
      }

      console.error('Failed to refresh auth session:', error)
      setUser(null)
      setStatus('error')

      return null
    }
  }, [])

  useEffect(() => {
    if (!isClient || !autoRefresh) {
      return
    }

    void refresh()
  }, [autoRefresh, isClient, refresh])

  const isLoading = useMemo(() => status === 'loading', [status])

  return {
    user,
    status,
    isClient,
    refresh,
    isLoading,
  }
}
