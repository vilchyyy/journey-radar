'use client'

import {
  AlertTriangle,
  Bus,
  Crosshair,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { RouteCoordinate } from '@/lib/route-service'
import { useLocationSearch } from '@/hooks/use-location-search'

interface RoutePoint {
  coordinate: RouteCoordinate
  type: 'origin' | 'destination'
}

export default function RouteNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [routeData, setRouteData] = useState<any>(null)
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false)
  const [isSelectingDestination, setIsSelectingDestination] = useState(false)
  const [showOriginSearch, setShowOriginSearch] = useState(false)
  const [showDestinationSearch, setShowDestinationSearch] = useState(false)

  // Location search hooks
  const originSearch = useLocationSearch({ limit: 8 })
  const destinationSearch = useLocationSearch({ limit: 8 })

  const origin = routePoints.find((p) => p.type === 'origin')?.coordinate
  const destination = routePoints.find(
    (p) => p.type === 'destination',
  )?.coordinate

  // Custom event handlers for map interaction
  const startOriginSelection = useCallback(() => {
    setIsSelectingOrigin(true)
    setIsSelectingDestination(false)
    setShowOriginSearch(false)
    setShowDestinationSearch(false)
    setError(null)
    // Dispatch custom event to parent map
    window.dispatchEvent(
      new CustomEvent('startRouteSelection', { detail: { type: 'origin' } }),
    )
  }, [])

  const startDestinationSelection = useCallback(() => {
    setIsSelectingOrigin(false)
    setIsSelectingDestination(true)
    setShowOriginSearch(false)
    setShowDestinationSearch(false)
    setError(null)
    // Dispatch custom event to parent map
    window.dispatchEvent(
      new CustomEvent('startRouteSelection', {
        detail: { type: 'destination' },
      }),
    )
  }, [])

  const selectLocationFromSearch = useCallback((location: any, type: 'origin' | 'destination') => {
    const coords: RouteCoordinate = {
      lat: location.position.lat,
      lng: location.position.lng,
    }

    setRoutePoints((prev) =>
      prev
        .filter((p) => p.type !== type)
        .concat({ coordinate: coords, type }),
    )

    // Close search UI and reset all selection states
    setShowOriginSearch(false)
    setShowDestinationSearch(false)
    setIsSelectingOrigin(false)
    setIsSelectingDestination(false)

    setError(null)

    // Notify map to center on this location
    window.dispatchEvent(new CustomEvent('centerMap', { detail: coords }))
  }, [])

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: RouteCoordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setRoutePoints((prev) =>
          prev
            .filter((p) => p.type !== 'origin')
            .concat({ coordinate: coords, type: 'origin' }),
        )
        setIsSelectingOrigin(false)
        setIsSelectingDestination(false)
        setShowDestinationSearch(true)
        setError(null)

        // Notify map to center on this location
        window.dispatchEvent(new CustomEvent('centerMap', { detail: coords }))
      },
      (error) => {
        setError('Unable to get your location: ' + error.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    )
  }, [])

  const calculateRoute = async () => {
    if (!origin || !destination) {
      setError('Please select both origin and destination')
      return
    }

    setIsLoading(true)
    setError(null)
    setRouteData(null)

    try {
      const response = await fetch('/api/routes/vehicle-matched', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          maxRadiusMeters: 500,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate route')
      }

      const data = await response.json()
      setRouteData(data)

      // Notify map to show route
      window.dispatchEvent(
        new CustomEvent('showRoute', {
          detail: { routeData: data, origin, destination },
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const clearRoute = () => {
    setRoutePoints([])
    setRouteData(null)
    setError(null)
    setIsSelectingOrigin(false)
    setIsSelectingDestination(false)
    setShowOriginSearch(false)
    setShowDestinationSearch(false)
    originSearch.clearResults()
    destinationSearch.clearResults()
    window.dispatchEvent(new CustomEvent('clearRoute', {}))
  }

  // Listen for map click events
  useEffect(() => {
    const handleMapClick = (event: CustomEvent) => {
      const coords: RouteCoordinate = event.detail

      if (isSelectingOrigin) {
        setRoutePoints((prev) =>
          prev
            .filter((p) => p.type !== 'origin')
            .concat({ coordinate: coords, type: 'origin' }),
        )
        setIsSelectingOrigin(false)
        setIsSelectingDestination(true)
      } else if (isSelectingDestination) {
        setRoutePoints((prev) =>
          prev
            .filter((p) => p.type !== 'destination')
            .concat({ coordinate: coords, type: 'destination' }),
        )
        setIsSelectingDestination(false)
      }
    }

    window.addEventListener('mapClick', handleMapClick as EventListener)
    return () =>
      window.removeEventListener('mapClick', handleMapClick as EventListener)
  }, [isSelectingOrigin, isSelectingDestination])

  if (!isOpen) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-white"
        >
          <RouteIcon className="w-5 h-5 mr-2" />
          Plan Route
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Floating Route Planning Panel */}
      <div className="absolute top-4 left-4 z-20 w-96 max-h-[80vh] overflow-y-auto">
        <Card className="shadow-2xl border-2 border-white bg-white/95 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RouteIcon className="w-5 h-5 text-blue-600" />
                Route Planning
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Instructions */}
            <div
              className={`p-4 rounded-lg ${isSelectingOrigin || isSelectingDestination ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'}`}
            >
              <h3 className="font-medium mb-2 text-sm">
                {isSelectingOrigin
                  ? '📍 Click on the map to set origin'
                  : isSelectingDestination
                    ? '🎯 Click on the map to set destination'
                    : 'Plan Your Journey'}
              </h3>

              {!origin &&
                !destination &&
                !isSelectingOrigin &&
                !isSelectingDestination && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Choose how you'd like to set your starting point:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        onClick={() => setShowOriginSearch(true)}
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search for Location
                      </Button>
                      <Button
                        onClick={startOriginSelection}
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Click map for Origin
                      </Button>
                      <Button
                        onClick={getCurrentLocation}
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Crosshair className="w-4 h-4 mr-2" />
                        Use Current Location
                      </Button>
                    </div>

                    {/* Origin Search Interface */}
                    {showOriginSearch && (
                      <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="w-4 h-4 text-blue-600" />
                          <Input
                            placeholder="Search for a location..."
                            value={originSearch.query}
                            onChange={(e) => originSearch.handleQueryChange(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowOriginSearch(false)
                              originSearch.clearResults()
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {originSearch.isLoading && (
                          <p className="text-xs text-gray-500">Searching...</p>
                        )}

                        {originSearch.error && (
                          <p className="text-xs text-red-600">{originSearch.error}</p>
                        )}

                        {originSearch.results && originSearch.results.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {originSearch.results.map((location) => (
                              <button
                                key={location.id}
                                onClick={() => selectLocationFromSearch(location, 'origin')}
                                className="w-full text-left p-2 hover:bg-blue-50 rounded border border-gray-200 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {location.title}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {location.address?.label}
                                    </p>
                                    {location.categories && location.categories.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {location.categories
                                          .filter(cat => cat.primary)
                                          .slice(0, 2)
                                          .map((category, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-block px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                                            >
                                              {category.name}
                                            </span>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  {location.distance && (
                                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                                      {Math.round(location.distance)}m
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {origin && !destination && !isSelectingDestination && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-green-100 rounded">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Origin set
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Now select your destination:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      onClick={() => setShowDestinationSearch(true)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search for Destination
                    </Button>
                    <Button
                      onClick={startDestinationSelection}
                      className="w-full"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Click map for Destination
                    </Button>
                  </div>

                  {/* Destination Search Interface */}
                  {showDestinationSearch && (
                    <div className="mt-3 p-3 bg-white rounded border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-red-600" />
                        <Input
                          placeholder="Search for destination..."
                          value={destinationSearch.query}
                          onChange={(e) => destinationSearch.handleQueryChange(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowDestinationSearch(false)
                            destinationSearch.clearResults()
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {destinationSearch.isLoading && (
                        <p className="text-xs text-gray-500">Searching...</p>
                      )}

                      {destinationSearch.error && (
                        <p className="text-xs text-red-600">{destinationSearch.error}</p>
                      )}

                      {destinationSearch.results && destinationSearch.results.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {destinationSearch.results.map((location) => (
                            <button
                              key={location.id}
                              onClick={() => selectLocationFromSearch(location, 'destination')}
                              className="w-full text-left p-2 hover:bg-red-50 rounded border border-gray-200 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {location.title}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {location.address?.label}
                                  </p>
                                  {location.categories && location.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {location.categories
                                        .filter(cat => cat.primary)
                                        .slice(0, 2)
                                        .map((category, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-block px-1 py-0.5 text-xs bg-red-100 text-red-700 rounded"
                                          >
                                            {category.name}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </div>
                                {location.distance && (
                                  <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                                    {Math.round(location.distance)}m
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isSelectingDestination && (
                <p className="text-sm text-blue-600">
                  Click anywhere on the map to set your destination
                </p>
              )}
            </div>

            {/* Selected Points Display */}
            {(origin || destination) && (
              <div className="space-y-2">
                {origin && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      <span className="font-medium text-green-700">Origin</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                    </span>
                  </div>
                )}

                {destination && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                      <span className="font-medium text-red-700">
                        Destination
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {origin && destination && (
              <div className="space-y-2">
                <Button
                  onClick={calculateRoute}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {isLoading ? 'Calculating...' : 'Calculate Route'}
                </Button>
                <Button
                  onClick={clearRoute}
                  variant="outline"
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear & Start Over
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Route Results */}
            {routeData && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RouteIcon className={`w-4 h-4 ${routeData.summary?.hasPublicTransport ? 'text-green-600' : 'text-blue-600'}`} />
                    {routeData.summary?.hasPublicTransport ? '🚌 Public Transport Route!' : '🚶 Route Found'}
                    <div className="ml-auto flex items-center gap-2 text-sm">
                      {!routeData.summary?.hasPublicTransport && (
                        <span className="text-yellow-600 text-xs italic">
                          No direct public transport available
                        </span>
                      )}
                      {routeData.summary?.vehicleMatches > 0 && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Bus className="w-4 h-4" />
                          {routeData.summary.vehicleMatches} matches
                        </span>
                      )}
                      {routeData.summary?.totalReports > 0 && (
                        <span className="text-orange-600 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {routeData.summary.totalReports} reports
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {routeData.routes?.map((route: any, index: number) => (
                    <div key={route.id || index} className="text-sm">
                      <p className="font-medium mb-2">Route {index + 1}</p>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          {route.sections?.length || 0} transport sections
                        </p>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {route.sections?.map((section: any, sectionIndex: number) => (
                            <div
                              key={section.id || sectionIndex}
                              className="p-2 bg-white rounded border"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium">
                                  {section.type === 'transit' ?
                                    `🚌 ${section.transport?.mode || 'Unknown'}` :
                                    '🚶 Pedestrian'
                                  } -{' '}
                                  {section.transport?.shortName ||
                                    section.transport?.name ||
                                    (section.type === 'transit' ? 'Unknown Route' : 'Walking')}
                                </p>
                                {section.travelSummary?.duration && (
                                  <span className="text-xs text-gray-600">
                                    {section.travelSummary.duration}
                                  </span>
                                )}
                              </div>

                              {/* Vehicle Match - only for transit sections */}
                              {section.type === 'transit' && section.transport?.ourVehicleMatch && (
                                <div className="mt-1 p-1 bg-blue-50 rounded text-xs">
                                  <p className="text-blue-700 font-medium">
                                    🚌 Vehicle Match:{' '}
                                    {
                                      section.transport.ourVehicleMatch.vehicle
                                        .routeShortName
                                    }
                                  </p>
                                  <p className="text-blue-600">
                                    Confidence:{' '}
                                    {
                                      section.transport.ourVehicleMatch
                                        .confidence
                                    }
                                    % -{' '}
                                    {section.transport.ourVehicleMatch.reason}
                                  </p>
                                  {section.transport.ourVehicleMatch.vehicle
                                    .reports?.length > 0 && (
                                    <p className="text-orange-600 mt-1">
                                      ⚠️ Vehicle has{' '}
                                      {
                                        section.transport.ourVehicleMatch
                                          .vehicle.reports.length
                                      }{' '}
                                      recent reports
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Nearby Vehicles - only for transit sections */}
                              {section.type === 'transit' && section.nearbyVehicles?.length > 0 && (
                                <div className="mt-1 p-1 bg-blue-50 rounded text-xs">
                                  <p className="text-blue-700 font-medium">
                                    🚌 {section.nearbyVehicles.length} nearby
                                    vehicles
                                  </p>
                                  {section.nearbyVehicles
                                    .slice(0, 2)
                                    .map((nv: any, i: number) => (
                                      // biome-ignore lint/suspicious/noArrayIndexKey: <s>
                                      <p key={i} className="text-blue-600">
                                        • {nv.vehicle.routeShortName} (
                                        {nv.confidence}% match, {nv.distance}m)
                                        {nv.reports?.length > 0 && (
                                          <span className="text-orange-600">
                                            {' '}
                                            🚨 {nv.reports.length} reports
                                          </span>
                                        )}
                                      </p>
                                    ))}
                                  {section.nearbyVehicles.length > 2 && (
                                    <p className="text-blue-600 italic">
                                      ... and{' '}
                                      {section.nearbyVehicles.length - 2} more
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Reports */}
                              {section.reports?.length > 0 && (
                                <p className="text-xs text-orange-600 mt-1">
                                  🚨 {section.reports.length} nearby reports
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selection Mode Indicator */}
      {(isSelectingOrigin || isSelectingDestination) && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <p className="font-medium flex items-center gap-2">
              {isSelectingOrigin
                ? '📍 Selecting Origin...'
                : '🎯 Selecting Destination...'}
            </p>
            <p className="text-xs mt-1 opacity-90">Click anywhere on the map</p>
          </div>
        </div>
      )}
    </>
  )
}
