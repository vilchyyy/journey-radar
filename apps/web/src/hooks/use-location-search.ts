'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

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
}

export function useLocationSearch(options: UseLocationSearchOptions = {}) {
  const { debounceMs = 300, minQueryLength = 2, limit = 10 } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout>()

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < minQueryLength) {
      setResults([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/locations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          limit,
          types: ['place', 'address', 'poi', 'street', 'administrativeArea']
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data: SearchResponse = await response.json()
      setResults(data.locations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [minQueryLength, limit])

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      searchLocations(searchQuery)
    }, debounceMs)
  }, [searchLocations, debounceMs])

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    debouncedSearch(newQuery)
  }, [debouncedSearch])

  const clearResults = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return {
    query,
    results,
    isLoading,
    error,
    handleQueryChange,
    clearResults,
    searchLocations, // Immediate search (non-debounced)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])
}