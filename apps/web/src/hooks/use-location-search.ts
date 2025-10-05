'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Location {
  id: string
  title: string
  address?: {
    label: string
    country: string
    state?: string
    county?: string
    city: string
    district?: string
    street: string
    postalCode?: string
    houseNumber?: string
  }
  position: {
    lat: number
    lng: number
  }
  distance?: number
  categories?: Array<{
    id: string
    name: string
    primary?: boolean
  }>
  resultType: string
  contacts?: {
    phone?: Array<{ value: string }>
    www?: Array<{ value: string }>
  }
}

interface SearchResponse {
  query: string
  locations: Location[]
  count: number
}

interface UseLocationSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  limit?: number
  types?: string[]
}

const DEFAULT_TYPES = [
  'place',
  'address',
  'poi',
  'street',
  'administrativeArea',
] as const

export function useLocationSearch(options: UseLocationSearchOptions = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    limit = 10,
    types = DEFAULT_TYPES,
  } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheRef = useRef<Map<string, Location[]>>(new Map())
  const controllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const requestIdRef = useRef(0)
  const latestRequestRef = useRef(0)
  const lastFetchedRef = useRef<string | null>(null)

  const normalizeQuery = useCallback(
    (value: string) => value.trim().toLowerCase(),
    [],
  )

  const clearPendingFetch = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
  }, [])

  const performFetch = useCallback(
    async (rawQuery: string, requestId: number) => {
      const normalized = normalizeQuery(rawQuery)
      if (!normalized || normalized.length < minQueryLength) {
        if (latestRequestRef.current === requestId) {
          setIsLoading(false)
        }
        return
      }

      clearPendingFetch()

      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const response = await fetch('/api/locations/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: rawQuery.trim(),
            limit,
            types,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          let message = 'Search failed'
          try {
            const errorData = await response.json()
            if (errorData?.error) {
              message = errorData.error
            }
          } catch {
            // ignore - response may not be JSON when failing hard
          }
          throw new Error(message)
        }

        const data: SearchResponse = await response.json()
        const locations = data.locations ?? []
        cacheRef.current.set(normalized, locations)
        lastFetchedRef.current = normalized

        if (latestRequestRef.current === requestId) {
          setResults(locations)
          setError(null)
        }
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return
        }

        if (latestRequestRef.current === requestId) {
          setResults([])
          setError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        if (latestRequestRef.current === requestId) {
          setIsLoading(false)
        }
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    [clearPendingFetch, limit, minQueryLength, normalizeQuery, types],
  )

  const scheduleSearch = useCallback(
    (rawQuery: string, immediate = false) => {
      const normalized = normalizeQuery(rawQuery)

      if (!normalized || normalized.length < minQueryLength) {
        clearPendingFetch()
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = undefined
        }
        lastFetchedRef.current = null
        setResults([])
        setIsLoading(false)
        setError(null)
        return
      }

      if (
        normalized === lastFetchedRef.current &&
        cacheRef.current.has(normalized) &&
        !immediate
      ) {
        setResults(cacheRef.current.get(normalized)!)
        setIsLoading(false)
        setError(null)
        return
      }

      const cached = cacheRef.current.get(normalized)
      if (cached) {
        setResults(cached)
        setError(null)
        setIsLoading(true)
      } else {
        if (immediate) {
          setResults([])
        }
        setIsLoading(true)
      }

      const requestId = ++requestIdRef.current

      const triggerFetch = () => {
        latestRequestRef.current = requestId
        void performFetch(rawQuery, requestId)
      }

      if (immediate || debounceMs === 0) {
        triggerFetch()
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(triggerFetch, debounceMs)
      }
    },
    [
      clearPendingFetch,
      debounceMs,
      minQueryLength,
      normalizeQuery,
      performFetch,
    ],
  )

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)
      scheduleSearch(newQuery)
    },
    [scheduleSearch],
  )

  const searchLocations = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery)
      scheduleSearch(searchQuery, true)
      const normalized = normalizeQuery(searchQuery)
      return cacheRef.current.get(normalized) ?? []
    },
    [normalizeQuery, scheduleSearch],
  )

  const clearResults = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setIsLoading(false)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = undefined
    }
    clearPendingFetch()
  }, [clearPendingFetch])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      clearPendingFetch()
    }
  }, [clearPendingFetch])

  return {
    query,
    results,
    isLoading,
    error,
    handleQueryChange,
    clearResults,
    searchLocations,
  }
}
