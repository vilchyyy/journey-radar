'use client'

import {
  AlertTriangle,
  ArrowRightLeft,
  Briefcase,
  Check,
  Clock,
  Home,
  Loader2,
  MapPin,
  Menu,
  Navigation2,
  Plus,
  Search,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import MapGL, { Layer, Source } from 'react-map-gl/maplibre'
import { ReportVoting } from '@/components/report-voting'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useLocationSearch } from '@/hooks/use-location-search'
import { useVehiclePositions } from '@/hooks/use-vehicle-positions'
import type { RouteCoordinate } from '@/lib/route-service'
import { cn } from '@/lib/utils'
import { api } from '@/lib/convex-client'

type ModeFilter = 'bus' | 'tram'

type PlannerLocation = {
  label: string
  subtitle?: string
  coordinate: RouteCoordinate
}

interface ShapesCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'LineString'; coordinates: [number, number][] }
    properties: { mode: ModeFilter; shape_id: string }
  }>
}

const favorites = [
  { label: 'Home', description: 'Add your home', icon: Home },
  { label: 'Work', description: 'Add your work', icon: Briefcase },
  { label: 'Add', description: 'Save a favorite', icon: Plus },
]

const suggestions = [
  {
    label: 'Nearby transit updates',
    description: 'See reports for close departures',
    icon: Navigation2,
  },
  {
    label: 'Report congestion',
    description: 'Share delays or accessibility issues',
    icon: AlertTriangle,
  },
]

const recents = [
  {
    label: 'Kraków Główny Station',
    description: 'Last viewed · City center',
  },
  {
    label: 'Plac Wolnica',
    description: 'Last viewed · Kazimierz district',
  },
]

interface RealtimeMapProps {
  autoSelectVehicle?: string
  autoSelectTripId?: string
  autoSelectRouteId?: string
  autoSelectRoute?: string
  autoSelectMode?: 'bus' | 'tram'
  initialCenter?: {
    latitude: number
    longitude: number
  }
}

export default function RealtimeMap({
  autoSelectVehicle,
  autoSelectTripId,
  autoSelectRouteId,
  autoSelectRoute,
  autoSelectMode,
  initialCenter,
}: RealtimeMapProps = {}) {
  const { vehicles, loading } = useVehiclePositions()
  const [error, setError] = useState<string | null>(null)
  const [viewState, setViewState] = useState({
    longitude: initialCenter?.longitude ?? 19.9383,
    latitude: initialCenter?.latitude ?? 50.0614,
    zoom: initialCenter ? 15 : 12,
  })
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [searchedLocation, setSearchedLocation] = useState<any>(null)

  // Planner state
  const [fromLocation, setFromLocation] = useState<PlannerLocation | null>(null)
  const [toLocation, setToLocation] = useState<PlannerLocation | null>(null)
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null)
  const [isSelectingPoint, setIsSelectingPoint] = useState<
    'from' | 'to' | null
  >(null)
  const [isPlanningJourney, setIsPlanningJourney] = useState(false)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const [routeData, setRouteData] = useState<any | null>(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(
    null,
  )
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false)

  // Reports drawer state
  const [showReportsDrawer, setShowReportsDrawer] = useState(false)
  const [nearbyReports, setNearbyReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [nearbyReportsScores, setNearbyReportsScores] = useState<
    Record<string, number>
  >({})

  // Transport details drawer state
  const [showTransportDrawer, setShowTransportDrawer] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState<any>(null)
  const [transportReportsScores, setTransportReportsScores] = useState<
    Record<string, number>
  >({})

  const fromSearch = useLocationSearch({ limit: 6 })
  const toSearch = useLocationSearch({ limit: 6 })
  const searchResults = useLocationSearch({ limit: 8, debounceMs: 200 })

  // Get transport reports using useQuery when a vehicle is selected
  const transportReportsQuery = useQuery(
    api.reports.getTripReports,
    selectedTransport ? {
      tripId: selectedTransport.tripId || undefined,
      routeNumber: selectedTransport.routeNumber || undefined,
      mode: selectedTransport.mode?.toUpperCase() || undefined,
      routeId: selectedTransport.routeId || undefined,
      vehicleId: selectedTransport.vehicleId || undefined,
    } : 'skip'
  )

  // Get all GTFS trip updates and filter for the selected vehicle
  const allTripUpdates = useQuery(api.gtfs.getTripUpdates)
  const selectedVehicleTripUpdate = useMemo(() => {
    if (!selectedTransport || !allTripUpdates) return null
    return allTripUpdates.find(update =>
      update.vehicleId === selectedTransport.vehicleId ||
      update.tripId === selectedTransport.tripId ||
      update.routeId === selectedTransport.routeId
    )
  }, [selectedTransport, allTripUpdates])

  const vehiclesSourceId = 'vehicles-layer'

  const handleVehicleClick = (vehicle: any) => {
    setSelectedTransport(vehicle)
    setShowTransportDrawer(true)
  }

  
  const vehicleGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: vehicles.map((vehicle) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [vehicle.longitude, vehicle.latitude] as const,
        },
        properties: {
          id: vehicle.vehicleId,
          routeShortName: vehicle.routeNumber,
          mode: vehicle.mode.toLowerCase(),
        },
      })),
    }),
    [vehicles],
  )

  const journeyMarkersGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: [
        fromLocation?.coordinate
          ? {
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [
                  fromLocation.coordinate.lng,
                  fromLocation.coordinate.lat,
                ] as const,
              },
              properties: { id: 'origin', type: 'origin' },
            }
          : null,
        toLocation?.coordinate
          ? {
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [
                  toLocation.coordinate.lng,
                  toLocation.coordinate.lat,
                ] as const,
              },
              properties: { id: 'destination', type: 'destination' },
            }
          : null,
      ].filter(Boolean),
    }),
    [fromLocation, toLocation],
  )

  const routeSections = useMemo(() => {
    if (!routeData?.routes) return []
    return routeData.routes.flatMap((route: any, routeIndex: number) =>
      (route.sections ?? [])
        .filter(
          (section: any) => section.geometry && section.geometry.length > 0,
        )
        .map((section: any, sectionIndex: number) => ({
          id: `${routeIndex}-${sectionIndex}-${section.type}`,
          type: section.type,
          routeIndex,
          isSelected: selectedRouteIndex === routeIndex,
          coordinates: section.geometry.map(
            (coord: any) => [coord.lng, coord.lat] as [number, number],
          ),
        })),
    )
  }, [routeData, selectedRouteIndex])

  const clearError = useCallback(() => setError(null), [])

  const centerOn = useCallback((coords: RouteCoordinate) => {
    setViewState((prev) => ({
      longitude: coords.lng,
      latitude: coords.lat,
      zoom: Math.max(prev.zoom, 13),
    }))
  }, [])

  const selectRoute = useCallback(
    (routeIndex: number) => {
      setSelectedRouteIndex(routeIndex)
      const route = routeData?.routes?.[routeIndex]
      if (route?.sections?.length > 0) {
        // Center map on the selected route
        const firstSection = route.sections.find(
          (section: any) => section.geometry && section.geometry.length > 0,
        )
        if (firstSection && firstSection.geometry?.length > 0) {
          const midPoint =
            firstSection.geometry[Math.floor(firstSection.geometry.length / 2)]
          centerOn({ lat: midPoint.lat, lng: midPoint.lng })
        }
      }
    },
    [routeData, centerOn],
  )

  const clearRouteSelection = useCallback(() => {
    setSelectedRouteIndex(null)
  }, [])

  // Auto-select vehicle when coming from a report
  useEffect(() => {
    if (loading || vehicles.length === 0) return

    // Only run once when vehicles are loaded and we have auto-select params
    if (!autoSelectVehicle && !autoSelectTripId && !autoSelectRouteId) return

    // Find the vehicle to select
    let vehicleToSelect: any = null

    if (autoSelectVehicle) {
      // First priority: exact vehicle ID match
      vehicleToSelect = vehicles.find(
        (v: any) => v.vehicleId === autoSelectVehicle,
      )
    }

    if (!vehicleToSelect && autoSelectTripId) {
      // Second priority: trip ID match
      vehicleToSelect = vehicles.find((v: any) => v.tripId === autoSelectTripId)
    }

    if (!vehicleToSelect && autoSelectRouteId) {
      // Third priority: route ID match (may match multiple, take first)
      vehicleToSelect = vehicles.find(
        (v: any) => v.routeId === autoSelectRouteId,
      )
    }

    if (!vehicleToSelect && autoSelectRoute && autoSelectMode) {
      // Fourth priority: route number + mode match
      vehicleToSelect = vehicles.find(
        (v: any) =>
          v.routeNumber === autoSelectRoute &&
          v.mode.toLowerCase() === autoSelectMode.toLowerCase(),
      )
    }

    if (vehicleToSelect) {
      // Close the drawer and select the vehicle
      setDrawerOpen(false)
      handleVehicleClick(vehicleToSelect)

      // Center on the vehicle
      setViewState((prev: any) => ({
        ...prev,
        longitude: vehicleToSelect.longitude,
        latitude: vehicleToSelect.latitude,
        zoom: 16,
      }))
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: Only run once on vehicle load
  }, [
    loading,
    vehicles,
    autoSelectVehicle,
    autoSelectTripId,
    autoSelectRouteId,
    autoSelectRoute,
    autoSelectMode,
  ])

  const handleSelectLocation = useCallback(
    (location: any, type: 'from' | 'to') => {
      const coords: RouteCoordinate = {
        lat: location.position.lat,
        lng: location.position.lng,
      }
      const selection: PlannerLocation = {
        label: location.title,
        subtitle: location.address?.label,
        coordinate: coords,
      }

      setDrawerOpen(true)

      if (type === 'from') {
        setFromLocation(selection)
        fromSearch.clearResults()
        fromSearch.handleQueryChange('')
        setActiveInput(toLocation ? null : 'to')
      } else {
        setToLocation(selection)
        toSearch.clearResults()
        toSearch.handleQueryChange('')
        setActiveInput(fromLocation ? null : 'from')
      }

      setPlannerError(null)
      setRouteData(null)
      centerOn(coords)
    },
    [centerOn, fromLocation, fromSearch, toLocation, toSearch],
  )

  const handleSearchLocationSelect = useCallback(
    (location: any) => {
      const coords: RouteCoordinate = {
        lat: location.position.lat,
        lng: location.position.lng,
      }
      const selection: PlannerLocation = {
        label: location.title,
        subtitle: location.address?.label,
        coordinate: coords,
      }

      setSearchedLocation(selection)
      setToLocation(selection)
      centerOn(coords)

      searchResults.clearResults()
      searchResults.handleQueryChange('')
      setDrawerOpen(true)
    },
    [centerOn, searchResults],
  )

  const handleMapClick = useCallback(
    (event: any) => {
      // Check if a vehicle was clicked
      const features = event.features || []
      const vehicleFeature = features.find(
        (f: any) =>
          f.layer.id === 'vehicle-points' || f.layer.id === 'vehicle-labels',
      )

      if (vehicleFeature && vehicleFeature.properties) {
        const vehicle = vehicles.find(
          (v) => v.vehicleId === vehicleFeature.properties.id,
        )
        if (vehicle) {
          handleVehicleClick(vehicle)
          return
        }
      }

      // Original point selection logic
      if (!isSelectingPoint) return
      const coords: RouteCoordinate = {
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      }
      const selection: PlannerLocation = {
        label:
          isSelectingPoint === 'from'
            ? 'Dropped start pin'
            : 'Dropped destination',
        subtitle: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
        coordinate: coords,
      }

      setDrawerOpen(true)

      if (isSelectingPoint === 'from') {
        setFromLocation(selection)
        setActiveInput(toLocation ? null : 'to')
      } else {
        setToLocation(selection)
        setActiveInput(fromLocation ? null : 'from')
      }

      setIsSelectingPoint(null)
      setPlannerError(null)
      setRouteData(null)
      centerOn(coords)
    },
    [
      centerOn,
      fromLocation,
      isSelectingPoint,
      toLocation,
      vehicles,
      handleVehicleClick,
    ],
  )

  const startSelecting = useCallback((type: 'from' | 'to') => {
    setIsSelectingPoint(type)
    setActiveInput(null)
    setDrawerOpen(false)
  }, [])

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setCurrentLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: RouteCoordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setFromLocation({
          label: 'Current location',
          subtitle: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
          coordinate: coords,
        })
        fromSearch.clearResults()
        fromSearch.handleQueryChange('')
        centerOn(coords)
        setCurrentLocationLoading(false)
      },
      (locationError) => {
        console.error('Error getting location:', locationError)
        setCurrentLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    )
  }, [centerOn, fromSearch])

  const swapLocations = useCallback(() => {
    setFromLocation((prevFrom) => {
      setToLocation((prevTo) => prevFrom)
      return toLocation
    })
    setPlannerError(null)
    setRouteData(null)
  }, [toLocation])

  const clearPlanner = useCallback(() => {
    setFromLocation(null)
    setToLocation(null)
    setSearchedLocation(null)
    setPlannerError(null)
    setRouteData(null)
    setSelectedRouteIndex(null)
    fromSearch.clearResults()
    toSearch.clearResults()
    searchResults.clearResults()
    fromSearch.handleQueryChange('')
    toSearch.handleQueryChange('')
    searchResults.handleQueryChange('')
  }, [fromSearch, toSearch, searchResults])

  const planJourney = useCallback(async () => {
    if (!fromLocation?.coordinate || !toLocation?.coordinate) {
      setPlannerError('Select both start and destination to continue')
      return
    }

    setIsPlanningJourney(true)
    setPlannerError(null)

    try {
      const response = await fetch('/api/routes/vehicle-matched', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: fromLocation.coordinate,
          destination: toLocation.coordinate,
          maxRadiusMeters: 500,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Unable to plan journey right now')
      }

      const data = await response.json()
      setRouteData(data)

      const firstSection = data.routes?.[0]?.sections?.find(
        (section: any) => section.geometry && section.geometry.length > 0,
      )
      if (firstSection) {
        const midPoint =
          firstSection.geometry[Math.floor(firstSection.geometry.length / 2)]
        centerOn({ lat: midPoint.lat, lng: midPoint.lng })
      }
    } catch (err) {
      console.error(err)
      setPlannerError(
        err instanceof Error
          ? err.message
          : 'We hit a snag while planning your route',
      )
    } finally {
      setIsPlanningJourney(false)
    }
  }, [centerOn, fromLocation, toLocation])

  const fetchNearbyReports = useCallback(async () => {
    setReportsLoading(true)
    setShowReportsDrawer(true)

    try {
      // Get current map center
      const centerLat = viewState.latitude
      const centerLng = viewState.longitude
      const radius = 2000 // 2km radius

      const response = await fetch('/api/reports/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: centerLat,
          longitude: centerLng,
          radiusKm: radius / 1000, // Convert meters to km
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch nearby reports')
      }

      const data = await response.json()
      setNearbyReports(data.reports || [])
    } catch (err) {
      console.error('Error fetching nearby reports:', err)
      setNearbyReports([])
    } finally {
      setReportsLoading(false)
    }
  }, [viewState])

  const formattedTimestamp = useMemo(
    () =>
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [vehicles.length],
  )

  return (
    <div className="relative h-full w-full overflow-hidden rounded-t-3xl bg-muted">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}

      <MapGL
        {...viewState}
        onMove={(event) => {
          // Only update viewState if the change is significant (performance optimization)
          const { zoom, longitude, latitude } = event.viewState
          if (
            Math.abs(zoom - viewState.zoom) > 0.1 ||
            Math.abs(longitude - viewState.longitude) > 0.001 ||
            Math.abs(latitude - viewState.latitude) > 0.001
          ) {
            setViewState(event.viewState)
          }
        }}
        onClick={handleMapClick}
        interactiveLayerIds={['vehicle-points', 'vehicle-labels']}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        cursor={isSelectingPoint ? 'crosshair' : 'grab'}
        reuseMaps
        preserveDrawingBuffer={false}
      >
        {vehicleGeoJSON.features.length > 0 && (
          <Source id={vehiclesSourceId} type="geojson" data={vehicleGeoJSON}>
            <Layer
              id="vehicle-points"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': [
                  'match',
                  ['get', 'mode'],
                  'tram',
                  '#22c55e',
                  'bus',
                  '#38bdf8',
                  '#94a3b8',
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              }}
            />
            <Layer
              id="vehicle-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'routeShortName'],
                'text-font': ['Open Sans Regular'],
                'text-size': 11,
                'text-offset': [0, 1.2],
              }}
              paint={{
                'text-color': '#1f2937',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
              }}
            />
          </Source>
        )}

        {journeyMarkersGeoJSON.features.length > 0 && (
          <Source
            id="planner-markers"
            type="geojson"
            data={journeyMarkersGeoJSON}
          >
            <Layer
              id="planner-markers-circles"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': [
                  'match',
                  ['get', 'type'],
                  'origin',
                  '#10b981',
                  'destination',
                  '#ef4444',
                  '#6b7280',
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
              }}
            />
            <Layer
              id="planner-markers-labels"
              type="symbol"
              layout={{
                'text-field': [
                  'match',
                  ['get', 'type'],
                  'origin',
                  'Origin',
                  'destination',
                  'Destination',
                  'Point',
                ],
                'text-font': ['Open Sans Regular'],
                'text-size': 12,
                'text-offset': [0, 1.4],
              }}
              paint={{
                'text-color': '#1f2937',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
              }}
            />
          </Source>
        )}

        {routeSections.map((section) => (
          <Source
            key={section.id}
            id={`route-section-${section.id}`}
            type="geojson"
            data={{
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates: section.coordinates,
              },
            }}
          >
            <Layer
              id={`route-line-${section.id}`}
              type="line"
              paint={{
                'line-color': section.isSelected
                  ? '#ef4444' // Red for selected route
                  : section.type === 'transit'
                    ? '#3b82f6' // Blue for unselected transit
                    : '#6b7280', // Gray for walking
                'line-width': section.isSelected
                  ? 7 // Thicker for selected
                  : section.type === 'transit'
                    ? 5
                    : 3,
                'line-opacity': section.isSelected
                  ? 1.0 // Fully opaque for selected
                  : section.type === 'transit'
                    ? 0.85
                    : 0.6,
                'line-dasharray':
                  section.type === 'transit' || section.isSelected
                    ? undefined
                    : [1, 1.5],
              }}
            />
          </Source>
        ))}
      </MapGL>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          className="pointer-events-auto rounded-full bg-primary/10 text-primary hover:bg-primary/15"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="pointer-events-auto rounded-full border border-border bg-card/95 px-4 py-2 text-xs shadow-lg">
          <span className="font-medium text-foreground">
            {vehicles.length} vehicles live
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto rounded-full border-border bg-card/90 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (fromLocation?.coordinate) {
              centerOn(fromLocation.coordinate)
            }
          }}
        >
          <MapPin className="h-5 w-5" />
        </Button>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} modal={false}>
        {!drawerOpen && (
          <DrawerTrigger asChild>
            <button className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex w-[90%] max-w-md -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-3 text-left shadow-xl">
              <Search className="h-5 w-5 text-muted-foreground" />
              <span className="text-smfont-medium text-muted-foreground">
                Search maps
              </span>
            </button>
          </DrawerTrigger>
        )}

        <DrawerContent className="border-none bg-transparent shadow-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:border-none">
          <DrawerTitle className="sr-only">Map Search</DrawerTitle>
          <div className="pointer-events-auto mx-auto w-full max-w-md px-4 pb-6">
            <div className="rounded-3xl border border-border bg-card/95 shadow-2xl">
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Collapse map drawer"
                  className="mx-auto mt-2 flex h-6 w-full items-center justify-center"
                >
                  <span className="inline-block h-1 w-12 rounded-full bg-muted" />
                </button>
              </DrawerClose>

              <div className="px-5 pb-5 max-h-[80vh] overflow-y-auto">
                {!searchedLocation && !toLocation && !fromLocation && (
                  <div className="mt-5 space-y-6 text-sm">
                    <div className="relative rounded-full border border-border bg-background">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchResults.query}
                        onChange={(event) => {
                          searchResults.handleQueryChange(event.target.value)
                        }}
                        placeholder="Search places, stops, or addresses"
                        className="h-12 rounded-full border-transparent bg-transparent pl-10 pr-4"
                      />
                    </div>

                    {/* Search Results */}
                    {searchResults.results.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.results.map((location) => (
                          <button
                            key={location.id}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              handleSearchLocationSelect(location)
                            }}
                            className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {location.title}
                              </p>
                              {location.address?.label && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {location.address.label}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {location.distance && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(location.distance)}m
                                </span>
                              )}
                              <Navigation2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <section>
                      <header className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                        Favorites
                      </header>
                      <div className="grid grid-cols-3 gap-3">
                        {favorites.map(({ label, description, icon: Icon }) => (
                          <button
                            key={label}
                            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-4 text-center hover:bg-muted/70"
                          >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              {label}
                            </span>
                            <span className="text-[0.65rem] text-muted-foreground">
                              {description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <header className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                        Suggestions
                      </header>
                      <div className="space-y-2">
                        {suggestions.map(
                          ({ label, description, icon: Icon }) => (
                            <button
                              key={label}
                              onClick={() => {
                                if (label === 'Report congestion') {
                                  window.location.href = '/reports/register'
                                } else if (label === 'Nearby transit updates') {
                                  fetchNearbyReports()
                                }
                              }}
                              className="flex w-full items-start gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
                            >
                              <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {description}
                                </p>
                              </div>
                            </button>
                          ),
                        )}
                      </div>
                    </section>

                    <section>
                      <header className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                        Recent
                      </header>
                      <div className="space-y-2">
                        {recents.map(({ label, description }) => (
                          <button
                            key={label}
                            className="flex w-full items-start gap-3 rounded-2xl border border-transparent bg-muted/20 px-4 py-3 text-left hover:border-border hover:bg-muted/40"
                          >
                            <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              <Clock className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-muted/30 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <AlertTriangle className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Notice something?
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Share disruptions or issues to help others navigate
                            safely.
                          </p>
                          <Button
                            asChild
                            className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm"
                          >
                            <Link href="/reports/register">
                              Report an issue
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* Journey Planner - only visible after destination is selected */}
                {(searchedLocation || toLocation) && (
                  <div className="mt-5 space-y-4 text-sm">
                    {/* Prompt for starting point if we have a destination from search */}
                    {!fromLocation && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Navigation2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">
                              Ready to plan your journey to{' '}
                              {(searchedLocation || toLocation)?.label}?
                            </p>
                            <p className="text-xs text-blue-700">
                              Choose your starting point below or use your
                              current location
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="relative rounded-2xl border border-border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">
                              From
                            </p>
                            <Input
                              value={
                                activeInput === 'from'
                                  ? fromSearch.query
                                  : fromLocation?.label || fromSearch.query
                              }
                              onFocus={() => {
                                setActiveInput('from')
                                fromSearch.handleQueryChange(
                                  fromLocation?.label || fromSearch.query,
                                )
                              }}
                              onChange={(event) => {
                                setFromLocation(null)
                                fromSearch.handleQueryChange(event.target.value)
                                setPlannerError(null)
                                setRouteData(null)
                              }}
                              placeholder="Add starting point"
                              className="mt-1 h-10 rounded-xl border-transparent bg-transparent px-0"
                            />
                            {fromLocation?.subtitle && (
                              <p className="text-[0.65rem] text-muted-foreground">
                                {fromLocation.subtitle}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={getCurrentLocation}
                              disabled={currentLocationLoading}
                              className="rounded-full px-3 text-xs"
                            >
                              {currentLocationLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Current'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startSelecting('from')}
                              className="rounded-full px-3 text-xs"
                            >
                              Drop pin
                            </Button>
                          </div>
                        </div>

                        {activeInput === 'from' &&
                          fromSearch.results.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {fromSearch.results.map((location) => (
                                <button
                                  key={location.id}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    handleSelectLocation(location, 'from')
                                  }}
                                  className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {location.title}
                                    </p>
                                    {location.address?.label && (
                                      <p className="truncate text-xs text-muted-foreground">
                                        {location.address.label}
                                      </p>
                                    )}
                                  </div>
                                  {location.distance && (
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(location.distance)}m
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={swapLocations}
                          className="h-9 w-9 rounded-full"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="relative rounded-2xl border border-border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">
                              To
                            </p>
                            <Input
                              value={
                                activeInput === 'to'
                                  ? toSearch.query
                                  : toLocation?.label || toSearch.query
                              }
                              onFocus={() => {
                                setActiveInput('to')
                                toSearch.handleQueryChange(
                                  toLocation?.label || toSearch.query,
                                )
                              }}
                              onChange={(event) => {
                                setToLocation(null)
                                toSearch.handleQueryChange(event.target.value)
                                setPlannerError(null)
                                setRouteData(null)
                              }}
                              placeholder="Add destination"
                              className="mt-1 h-10 rounded-xl border-transparent bg-transparent px-0"
                            />
                            {toLocation?.subtitle && (
                              <p className="text-[0.65rem] text-muted-foreground">
                                {toLocation.subtitle}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startSelecting('to')}
                            className="rounded-full px-3 text-xs"
                          >
                            Drop pin
                          </Button>
                        </div>

                        {activeInput === 'to' &&
                          toSearch.results.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {toSearch.results.map((location) => (
                                <button
                                  key={location.id}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    handleSelectLocation(location, 'to')
                                  }}
                                  className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {location.title}
                                    </p>
                                    {location.address?.label && (
                                      <p className="truncate text-xs text-muted-foreground">
                                        {location.address.label}
                                      </p>
                                    )}
                                  </div>
                                  {location.distance && (
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(location.distance)}m
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    {plannerError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                        {plannerError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        className="h-12 w-full rounded-full bg-primary text-primary-foreground"
                        disabled={
                          !fromLocation?.coordinate ||
                          !toLocation?.coordinate ||
                          isPlanningJourney
                        }
                        onClick={planJourney}
                      >
                        {isPlanningJourney ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Planning…
                          </>
                        ) : (
                          'Plan journey'
                        )}
                      </Button>
                      {(fromLocation ||
                        toLocation ||
                        routeData ||
                        searchedLocation) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearPlanner}
                          className="w-full rounded-full text-xs"
                        >
                          <X className="mr-2 h-3 w-3" /> Clear planner
                        </Button>
                      )}
                    </div>

                    {routeData && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-foreground">
                              Journey Options ({routeData.routes?.length || 0}{' '}
                              routes)
                            </h3>
                            {selectedRouteIndex !== null && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={clearRouteSelection}
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Clear selection
                              </Button>
                            )}
                          </div>
                          {routeData.summary?.totalReports ? (
                            <span className="text-xs text-orange-600 font-medium">
                              🚨 {routeData.summary.totalReports} nearby reports
                            </span>
                          ) : null}
                        </div>

                        {/* Overall warnings if there are any reports */}
                        {routeData.summary?.totalReports > 0 && (
                          <div
                            className={`rounded-2xl border px-4 py-3 ${
                              routeData.summary.totalReports > 5
                                ? 'border-red-200 bg-red-50'
                                : routeData.summary.totalReports > 2
                                  ? 'border-orange-200 bg-orange-50'
                                  : 'border-yellow-200 bg-yellow-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle
                                className={`h-5 w-5 mt-0.5 ${
                                  routeData.summary.totalReports > 5
                                    ? 'text-red-500'
                                    : routeData.summary.totalReports > 2
                                      ? 'text-orange-500'
                                      : 'text-yellow-600'
                                }`}
                              />
                              <div className="flex-1">
                                <p
                                  className={`text-sm font-semibold ${
                                    routeData.summary.totalReports > 5
                                      ? 'text-red-900'
                                      : routeData.summary.totalReports > 2
                                        ? 'text-orange-900'
                                        : 'text-yellow-900'
                                  }`}
                                >
                                  {routeData.summary.totalReports > 5
                                    ? 'High disruption alert'
                                    : routeData.summary.totalReports > 2
                                      ? 'Moderate disruption warning'
                                      : 'Minor disruption notice'}
                                </p>
                                <p
                                  className={`text-xs ${
                                    routeData.summary.totalReports > 5
                                      ? 'text-red-700'
                                      : routeData.summary.totalReports > 2
                                        ? 'text-orange-700'
                                        : 'text-yellow-700'
                                  }`}
                                >
                                  {routeData.summary.totalReports} report
                                  {routeData.summary.totalReports > 1
                                    ? 's'
                                    : ''}{' '}
                                  detected in your journey area.
                                  {routeData.summary.totalReports > 5
                                    ? ' Consider alternative routes or allow extra time.'
                                    : ' Check individual routes for details.'}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {Object.entries(
                                    routeData.summary.reportsByType || {},
                                  ).map(([type, count]) => (
                                    <span
                                      key={type}
                                      className="text-[0.65rem] px-2 py-1 bg-white/60 rounded-full font-medium"
                                    >
                                      {count} {type.toLowerCase()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {routeData.routes?.map((route: any, index: number) => {
                          const hasIncidents = route.sections?.some(
                            (section: any) =>
                              (section.reports || []).some(
                                (r: any) => r.status === 'OFFICIAL_CONFIRMED',
                              ),
                          )
                          const totalReports =
                            route.sections?.reduce(
                              (sum: number, section: any) =>
                                sum + (section.reports?.length || 0),
                              0,
                            ) || 0
                          const hasWarnings = totalReports > 0

                          return (
                            <div
                              key={route.id || index}
                              onClick={() => selectRoute(index)}
                              className={`space-y-4 rounded-2xl border px-4 py-4 cursor-pointer transition-all hover:shadow-md ${
                                selectedRouteIndex === index
                                  ? 'border-red-300 bg-red-50/50 shadow-lg ring-2 ring-red-200'
                                  : hasIncidents
                                    ? 'border-red-200 bg-red-50'
                                    : hasWarnings
                                      ? 'border-orange-200 bg-orange-50/40'
                                      : index === 0
                                        ? 'border-blue-200 bg-blue-50/50'
                                        : 'border-border bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                      selectedRouteIndex === index
                                        ? 'bg-red-500 text-white'
                                        : index === 0
                                          ? 'bg-blue-500 text-white'
                                          : hasWarnings
                                            ? 'bg-orange-400 text-white'
                                            : 'bg-gray-400 text-white'
                                    }`}
                                  >
                                    {selectedRouteIndex === index ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      index + 1
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-base font-semibold text-foreground">
                                      {selectedRouteIndex === index
                                        ? 'Selected Route'
                                        : index === 0
                                          ? 'Recommended'
                                          : `Alternative ${index}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {route.summary?.durationText ||
                                        route.summary?.duration ||
                                        'Duration available after start'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right text-sm">
                                  {route.summary?.departure && (
                                    <p className="font-medium text-foreground">
                                      {route.summary.departure} →{' '}
                                      {route.summary.arrival}
                                    </p>
                                  )}
                                  {route.summary?.transportModes && (
                                    <p className="text-xs text-muted-foreground">
                                      {route.summary.transportModes.join(' • ')}
                                    </p>
                                  )}
                                  {totalReports > 0 && (
                                    <p className="text-xs text-orange-600 font-medium">
                                      ⚠️ {totalReports} reports
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                {route.sections?.map(
                                  (section: any, sectionIndex: number) => {
                                    const sectionReports =
                                      section.reports?.length || 0
                                    const hasLowConfidence =
                                      section.transport?.ourVehicleMatch &&
                                      section.transport.ourVehicleMatch
                                        .confidence < 80

                                    return (
                                      <div
                                        key={section.id || sectionIndex}
                                        className={`rounded-2xl border px-4 py-3 text-sm ${
                                          sectionReports > 0 || hasLowConfidence
                                            ? 'border-orange-200 bg-orange-50/50'
                                            : 'border-border bg-card/80'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-3">
                                            <span
                                              className={cn(
                                                'rounded-lg px-3 py-1.5 text-xs font-semibold uppercase',
                                                section.type === 'transit'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-slate-200 text-slate-700',
                                              )}
                                            >
                                              {section.type === 'transit'
                                                ? section.transport?.mode ||
                                                  'Transit'
                                                : 'Walk'}
                                            </span>
                                            <div>
                                              <p className="font-medium text-foreground">
                                                {section.transport?.shortName ||
                                                  section.transport?.name ||
                                                  section.summary ||
                                                  'Step'}
                                              </p>
                                              {section.transport?.headsign && (
                                                <p className="text-xs text-muted-foreground">
                                                  to{' '}
                                                  {section.transport.headsign}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          {section.travelSummary?.duration && (
                                            <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                              {section.travelSummary.duration}
                                            </span>
                                          )}
                                        </div>

                                        {/* Enhanced vehicle match display */}
                                        {section.transport?.ourVehicleMatch && (
                                          <div
                                            className={`mt-3 rounded-xl px-3 py-2 text-xs ${
                                              section.transport.ourVehicleMatch
                                                .confidence >= 90
                                                ? 'bg-green-50 text-green-700'
                                                : section.transport
                                                      .ourVehicleMatch
                                                      .confidence >= 80
                                                  ? 'bg-blue-50 text-blue-700'
                                                  : 'bg-orange-50 text-orange-700'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold">
                                                📍 Live tracking
                                              </span>
                                              {section.transport.ourVehicleMatch
                                                .confidence < 100 && (
                                                <span className="font-medium">
                                                  {
                                                    section.transport
                                                      .ourVehicleMatch
                                                      .confidence
                                                  }
                                                  %
                                                </span>
                                              )}
                                            </div>
                                            <div className="mt-1 text-[0.65rem] opacity-90">
                                              Route{' '}
                                              {
                                                section.transport
                                                  .ourVehicleMatch.vehicle
                                                  .routeShortName
                                              }{' '}
                                              • Vehicle{' '}
                                              {
                                                section.transport
                                                  .ourVehicleMatch.vehicle
                                                  .vehicleId
                                              }
                                              {section.transport.ourVehicleMatch
                                                .vehicle.delay !==
                                                undefined && (
                                                <>
                                                  {' '}
                                                  •{' '}
                                                  {section.transport
                                                    .ourVehicleMatch.vehicle
                                                    .delay > 0
                                                    ? '+'
                                                    : ''}
                                                  {
                                                    section.transport
                                                      .ourVehicleMatch.vehicle
                                                      .delay
                                                  }
                                                  min delay
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Enhanced reports display */}
                                        {sectionReports > 0 && (
                                          <div className="mt-3 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2">
                                            <div className="flex items-start gap-2">
                                              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                  <p className="text-xs font-semibold text-orange-800">
                                                    {sectionReports} disruption
                                                    {sectionReports > 1
                                                      ? 's'
                                                      : ''}{' '}
                                                    reported
                                                  </p>
                                                  <span className="text-[0.6rem] text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                                    Within 500m
                                                  </span>
                                                </div>
                                                <div className="space-y-2">
                                                  {section.reports
                                                    ?.slice(0, 3)
                                                    .map((report: any) => (
                                                      <div
                                                        key={report.id}
                                                        className="bg-white/60 rounded-lg p-2"
                                                      >
                                                        <div className="flex items-start justify-between">
                                                          <div className="flex-1">
                                                            <div className="flex items-center gap-1 mb-1">
                                                              <span
                                                                className={`text-[0.6rem] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                                                  report.type ===
                                                                  'DELAY'
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : report.type ===
                                                                        'CANCELLED'
                                                                      ? 'bg-red-100 text-red-700'
                                                                      : report.type ===
                                                                          'CROWDED'
                                                                        ? 'bg-orange-100 text-orange-700'
                                                                        : report.type ===
                                                                            'ACCIDENT'
                                                                          ? 'bg-red-100 text-red-800'
                                                                          : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                              >
                                                                {report.type?.toLowerCase()}
                                                              </span>
                                                              {report.delayMinutes && (
                                                                <span className="text-[0.6rem] font-medium text-orange-700">
                                                                  +
                                                                  {
                                                                    report.delayMinutes
                                                                  }
                                                                  min
                                                                </span>
                                                              )}
                                                              <span className="text-[0.55rem] text-muted-foreground">
                                                                {
                                                                  report.distance
                                                                }
                                                                m away
                                                              </span>
                                                            </div>
                                                            {report.comment && (
                                                              <p className="text-[0.65rem] text-orange-700 line-clamp-2">
                                                                {report.comment}
                                                              </p>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  {sectionReports > 3 && (
                                                    <p className="text-[0.6rem] text-orange-600 italic text-center">
                                                      +{sectionReports - 3} more
                                                      report
                                                      {sectionReports - 3 > 1
                                                        ? 's'
                                                        : ''}{' '}
                                                      in this area
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Low confidence warning */}
                                        {hasLowConfidence &&
                                          !sectionReports && (
                                            <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2">
                                              <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                <p className="text-xs text-yellow-800">
                                                  Low confidence vehicle match (
                                                  {
                                                    section.transport
                                                      .ourVehicleMatch
                                                      .confidence
                                                  }
                                                  %)
                                                </p>
                                              </div>
                                            </div>
                                          )}

                                        {/* Departure/arrival times */}
                                        {(section.departure?.time ||
                                          section.arrival?.time) && (
                                          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                                            {section.departure?.time && (
                                              <span>
                                                Departs:{' '}
                                                {new Date(
                                                  section.departure.time,
                                                ).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </span>
                                            )}
                                            {section.arrival?.time && (
                                              <span
                                                className={`${(section.reports || []).some((r: any) => r.type === 'DELAY' || r.type === 'CANCELLED') ? 'bg-yellow-100 text-yellow-800 font-semibold px-1.5 py-0.5 rounded' : ''}`}
                                              >
                                                Arrives:{' '}
                                                {new Date(
                                                  section.arrival.time,
                                                ).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  },
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last updated moments ago</span>
                  <span>{formattedTimestamp}</span>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Floating Journey Results Panel */}
      {routeData && !drawerOpen && (
        <div className="pointer-events-auto absolute bottom-24 left-4 right-4 z-30 mx-auto max-w-lg">
          <div className="rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Journey options
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRouteData(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {routeData.routes?.map((route: any, index: number) => (
                  <div
                    key={route.id || index}
                    className="rounded-xl border border-border bg-muted/20 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      // Center map on this route
                      const firstSection = route.sections?.find(
                        (section: any) =>
                          section.geometry && section.geometry.length > 0,
                      )
                      if (firstSection) {
                        const midPoint =
                          firstSection.geometry[
                            Math.floor(firstSection.geometry.length / 2)
                          ]
                        centerOn({ lat: midPoint.lat, lng: midPoint.lng })
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Option {index + 1}
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground">
                          {route.summary?.durationText ||
                            route.summary?.duration ||
                            'Duration available after start'}
                        </p>
                      </div>
                      <div className="text-right text-[0.65rem] text-muted-foreground">
                        {route.summary?.departure && (
                          <p>
                            {route.summary.departure} → {route.summary.arrival}
                          </p>
                        )}
                        {route.summary?.transportModes && (
                          <p>{route.summary.transportModes.join(', ')}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      {route.sections
                        ?.slice(0, 2)
                        .map((section: any, sectionIndex: number) => (
                          <div
                            key={section.id || sectionIndex}
                            className="flex items-center gap-2 text-[0.6rem]"
                          >
                            <span
                              className={cn(
                                'rounded px-1 py-0.5 text-[0.55rem] font-semibold uppercase',
                                section.type === 'transit'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-200 text-slate-700',
                              )}
                            >
                              {section.type === 'transit'
                                ? section.transport?.mode || 'Transit'
                                : 'Walk'}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {section.transport?.shortName ||
                                section.transport?.name ||
                                section.summary ||
                                'Step'}
                            </span>
                            {section.travelSummary?.duration && (
                              <span className="text-muted-foreground">
                                {section.travelSummary.duration}
                              </span>
                            )}
                          </div>
                        ))}
                      {(route.sections?.length || 0) > 2 && (
                        <p className="text-[0.6rem] text-muted-foreground">
                          +{(route.sections?.length || 0) - 2} more steps
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="pointer-events-auto absolute inset-x-4 top-24 z-30 rounded-3xl border border-red-200 bg-red-50/95 p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div className="text-sm text-red-600">{error}</div>
            <Button
              variant="destructive"
              size="sm"
              className="ml-auto rounded-full px-4"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Reports Drawer */}
      <Drawer
        open={showReportsDrawer}
        onOpenChange={setShowReportsDrawer}
        modal={false}
      >
        <DrawerContent className="border-none bg-transparent shadow-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:border-none">
          <div className="pointer-events-auto mx-auto w-full max-w-md px-4 pb-6">
            <div className="rounded-3xl border border-border bg-card/95 shadow-2xl">
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Collapse reports drawer"
                  className="mx-auto mt-2 flex h-6 w-full items-center justify-center"
                >
                  <span className="inline-block h-1 w-12 rounded-full bg-muted" />
                </button>
              </DrawerClose>

              <div className="px-5 pb-5">
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Nearby transit updates
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      2km radius
                    </span>
                  </div>

                  {reportsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : nearbyReports.length > 0 ? (
                    <div className="space-y-3">
                      {nearbyReports.map((report: any) => (
                        <div
                          key={report._id}
                          className="rounded-2xl border border-border bg-muted/20 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
                                  report.type === 'DELAY'
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : report.type === 'CANCELLED'
                                      ? 'bg-red-100 text-red-600'
                                      : report.type === 'CROWDED'
                                        ? 'bg-orange-100 text-orange-600'
                                        : report.type === 'ACCIDENT'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground uppercase">
                                      {report.type.toLowerCase()}
                                    </span>
                                    {report.route && (
                                      <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                        {report.route.routeNumber}
                                      </span>
                                    )}
                                  </div>
                                  <ReportVoting
                                    reportId={report._id}
                                    upvotes={report.upvotes || 0}
                                    downvotes={report.downvotes || 0}
                                    voteScore={
                                      nearbyReportsScores[report._id] ||
                                      (report.upvotes || 0) -
                                        (report.downvotes || 0)
                                    }
                                    size="sm"
                                    onUpdate={(newScore, deleted) => {
                                      if (deleted) {
                                        // Remove the report from the list
                                        setNearbyReports((prev) =>
                                          prev.filter(
                                            (r) => r._id !== report._id,
                                          ),
                                        )
                                      } else {
                                        // Update the score in local state
                                        setNearbyReportsScores((prev) => ({
                                          ...prev,
                                          [report._id]: newScore,
                                        }))
                                      }
                                    }}
                                  />
                                </div>
                                {report.comment && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {report.comment}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    Reported{' '}
                                    {report._creationTime
                                      ? new Date(
                                          report._creationTime,
                                        ).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : 'Recently'}
                                  </span>
                                  {report.delayMinutes && (
                                    <span className="text-orange-600">
                                      {report.delayMinutes} min delay
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No recent reports in your area
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Be the first to report transit issues
                      </p>
                    </div>
                  )}

                  <Button
                    asChild
                    className="mt-4 h-12 w-full rounded-full bg-primary text-primary-foreground"
                  >
                    <Link href="/reports/register">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Report an issue
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Transport Details Drawer */}
      <Drawer
        open={showTransportDrawer}
        onOpenChange={setShowTransportDrawer}
        modal={false}
      >
        <DrawerContent className="border-none bg-transparent shadow-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:border-none">
          <div className="pointer-events-auto mx-auto w-full max-w-md px-4 pb-6">
            <div className="rounded-3xl border border-border bg-card/95 shadow-2xl">
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Collapse transport drawer"
                  className="mx-auto mt-2 flex h-6 w-full items-center justify-center"
                >
                  <span className="inline-block h-1 w-12 rounded-full bg-muted" />
                </button>
              </DrawerClose>

              <div className="px-5 pb-5">
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Transport Details
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        selectedTransport?.mode === 'tram'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {selectedTransport?.mode?.toUpperCase() || 'TRANSPORT'}
                    </span>
                  </div>

                  {selectedTransport && (
                    <div className="space-y-4">
                      {/* Transport Info */}
                      <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                selectedTransport.mode === 'tram'
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              <span className="text-lg font-bold text-white">
                                {selectedTransport.routeNumber}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Route {selectedTransport.routeNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Vehicle ID: {selectedTransport.vehicleId}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Status:
                            </span>
                            <span className="ml-1 font-medium text-green-600">
                              Active
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Last Update:
                            </span>
                            <span className="ml-1 font-medium">
                              {selectedTransport.timestamp
                                ? new Date(
                                    selectedTransport.timestamp * 1000,
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* GTFS Real-time Delays */}
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">
                          Expected Delays (GTFS)
                        </h4>
                        {selectedVehicleTripUpdate ? (
                          <div className="text-xs text-blue-700">
                            <p className="flex items-center justify-between mb-1">
                              <span>Status:</span>
                              <span
                                className={`font-medium ${
                                  selectedVehicleTripUpdate
                                    .delayStatus === 'Significant Delay'
                                    ? 'text-red-600'
                                    : selectedVehicleTripUpdate
                                          .delayStatus === 'Minor Delay'
                                      ? 'text-orange-600'
                                      : selectedVehicleTripUpdate
                                            .delayStatus === 'Early'
                                        ? 'text-green-600'
                                        : 'text-blue-600'
                                }`}
                              >
                                {selectedVehicleTripUpdate.delayStatus}
                              </span>
                            </p>
                            {selectedVehicleTripUpdate.expectedDelay !==
                              0 && (
                              <p className="flex items-center justify-between mb-1">
                                <span>Expected Delay:</span>
                                <span
                                  className={`font-medium ${
                                    selectedVehicleTripUpdate
                                      .expectedDelay > 5
                                      ? 'text-red-600'
                                      : selectedVehicleTripUpdate
                                            .expectedDelay > 2
                                        ? 'text-orange-600'
                                        : 'text-green-600'
                                  }`}
                                >
                                  {selectedVehicleTripUpdate
                                    .expectedDelay > 0
                                    ? '+'
                                    : ''}
                                  {
                                    selectedVehicleTripUpdate
                                      .expectedDelay
                                  }{' '}
                                  min
                                </span>
                              </p>
                            )}
                            <p className="text-[0.6rem] text-blue-600 mt-2">
                              Last updated:{' '}
                              {new Date(
                                selectedVehicleTripUpdate.lastUpdated,
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs text-blue-700">
                            <p>Loading real-time delay information...</p>
                            <p className="mt-1">
                              Status:{' '}
                              <span className="font-medium">Checking</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* User Reports */}
                      <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          User Reports
                        </h4>
                        {transportReportsQuery === undefined ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : transportReportsQuery.length > 0 ? (
                          <div className="space-y-2">
                            {transportReportsQuery.map((report: any) => (
                              <div
                                key={report._id}
                                className="rounded-xl border border-border bg-card/60 px-3 py-2"
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                                      report.type === 'DELAY'
                                        ? 'bg-yellow-100 text-yellow-600'
                                        : report.type === 'CANCELLED'
                                          ? 'bg-red-100 text-red-600'
                                          : report.type === 'CROWDED'
                                            ? 'bg-orange-100 text-orange-600'
                                            : report.type === 'ACCIDENT'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </span>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium text-foreground uppercase">
                                          {report.type.toLowerCase()}
                                        </span>
                                        {report.delayMinutes && (
                                          <span className="text-xs text-orange-600">
                                            +{report.delayMinutes}min
                                          </span>
                                        )}
                                        {report.hasProgressed !== undefined && (
                                          <span
                                            className={`text-xs px-1 py-0.5 rounded ${
                                              report.hasProgressed
                                                ? 'bg-gray-100 text-gray-600'
                                                : 'bg-red-100 text-red-600'
                                            }`}
                                          >
                                            {report.hasProgressed
                                              ? 'Moved'
                                              : 'Active'}
                                          </span>
                                        )}
                                      </div>
                                      <ReportVoting
                                        reportId={report._id}
                                        upvotes={report.upvotes || 0}
                                        downvotes={report.downvotes || 0}
                                        voteScore={
                                          transportReportsScores[report._id] ||
                                          (report.upvotes || 0) -
                                            (report.downvotes || 0)
                                        }
                                        size="sm"
                                        onUpdate={(newScore) => {
                                          // Update the score in local state
                                          setTransportReportsScores(
                                            (prev) => ({
                                              ...prev,
                                              [report._id]: newScore,
                                            }),
                                          )
                                        }}
                                      />
                                    </div>
                                    {report.comment && (
                                      <p className="text-xs text-muted-foreground mb-1">
                                        {report.comment}
                                      </p>
                                    )}
                                    {report.issueStatus && (
                                      <p className="text-[0.6rem] text-muted-foreground mb-1">
                                        Status: {report.issueStatus}
                                      </p>
                                    )}
                                    <p className="text-[0.6rem] text-muted-foreground">
                                      Reported{' '}
                                      {report._creationTime
                                        ? new Date(
                                            report._creationTime,
                                          ).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Recently'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-xs text-muted-foreground">
                              No user reports for this transport
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Report Problem Button */}
                      <Button
                        asChild
                        className="h-12 w-full rounded-full bg-primary text-primary-foreground"
                      >
                        <Link
                          href={`/reports/register?tripId=${selectedTransport.tripId}&mode=${selectedTransport.mode}&route=${selectedTransport.routeNumber}&routeId=${selectedTransport.routeId}&vehicleId=${selectedTransport.vehicleId}`}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Report a problem with this transport
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {isSelectingPoint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between rounded-full bg-primary px-5 py-3 text-xs font-medium text-primary-foreground shadow-lg">
            <span>
              {isSelectingPoint === 'from'
                ? 'Tap the map to set your start'
                : 'Tap the map to set your destination'}
            </span>
            <button
              type="button"
              onClick={() => setIsSelectingPoint(null)}
              className="rounded-full border border-white/40 px-3 py-1 text-[0.65rem] text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
