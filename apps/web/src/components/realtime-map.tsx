'use client'

import {
  AlertTriangle,
  ArrowRightLeft,
  Briefcase,
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
import MapGL, { Layer, Source } from 'react-map-gl/maplibre'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useLocationSearch } from '@/hooks/use-location-search'
import { useVehiclePositions } from '@/hooks/use-vehicle-positions'
import type { RouteCoordinate } from '@/lib/route-service'
import { cn } from '@/lib/utils'

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

export default function RealtimeMap() {
  const { vehicles, loading } = useVehiclePositions()
  const [error, setError] = useState<string | null>(null)
  const [shapes, setShapes] = useState<ShapesCollection | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 19.9383,
    latitude: 50.0614,
    zoom: 12,
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
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false)

  const fromSearch = useLocationSearch({ limit: 6 })
  const toSearch = useLocationSearch({ limit: 6 })
  const searchResults = useLocationSearch({ limit: 8, debounceMs: 200 })

  const vehiclesSourceId = 'vehicles-layer'
  const shapesSourceId = 'shapes-layer'

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
          coordinates: section.geometry.map(
            (coord: any) => [coord.lng, coord.lat] as [number, number],
          ),
        })),
    )
  }, [routeData])

  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const res = await fetch('/api/gtfs/shapes')
        if (!res.ok) {
          throw new Error('Unable to load network lines right now')
        }
        const data = (await res.json()) as ShapesCollection
        setShapes(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching GTFS shapes:', err)
        setError('Unable to load network lines right now')
      }
    }

    fetchShapes()
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const centerOn = useCallback((coords: RouteCoordinate) => {
    setViewState((prev) => ({
      longitude: coords.lng,
      latitude: coords.lat,
      zoom: Math.max(prev.zoom, 13),
    }))
  }, [])

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
      if (type === 'from') {
        setFromLocation(selection)
        fromSearch.clearResults()
        fromSearch.handleQueryChange('')
      } else {
        setToLocation(selection)
        toSearch.clearResults()
        toSearch.handleQueryChange('')
      }
      setActiveInput(null)
      setPlannerError(null)
      setRouteData(null)
      centerOn(coords)
    },
    [centerOn, fromSearch, toSearch],
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
      if (isSelectingPoint === 'from') {
        setFromLocation(selection)
      } else {
        setToLocation(selection)
      }
      setIsSelectingPoint(null)
      setPlannerError(null)
      setRouteData(null)
      centerOn(coords)
      setDrawerOpen(true)
    },
    [centerOn, isSelectingPoint],
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
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        cursor={isSelectingPoint ? 'crosshair' : 'grab'}
        reuseMaps
        preserveDrawingBuffer={false}
      >
        {shapes && (
          <Source id={shapesSourceId} type="geojson" data={shapes}>
            <Layer
              id="transit-shapes"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'mode'],
                  'tram',
                  '#15803d',
                  'bus',
                  '#1d4ed8',
                  '#64748b',
                ],
                'line-width': 2,
                'line-opacity': 0.6,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

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
                'line-color':
                  section.type === 'transit' ? '#3b82f6' : '#6b7280',
                'line-width': section.type === 'transit' ? 5 : 3,
                'line-opacity': section.type === 'transit' ? 0.85 : 0.6,
                'line-dasharray':
                  section.type === 'transit' ? undefined : [1, 1.5],
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

              <div className="px-5 pb-5">
                {true && (
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

                {/* Journey Planner - always visible now */}
                {(searchedLocation || fromLocation || toLocation) && (
                  <div className="mt-5 space-y-4 text-sm">
                    {/* Prompt for starting point if we have a destination from search */}
                    {searchedLocation && !fromLocation && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Navigation2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">
                              Ready to plan your journey to{' '}
                              {searchedLocation.label}?
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
                      {(fromLocation || toLocation || routeData) && (
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
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Journey options
                          </h3>
                          {routeData.summary?.totalReports ? (
                            <span className="text-xs text-orange-600">
                              {routeData.summary.totalReports} nearby reports
                            </span>
                          ) : null}
                        </div>

                        {routeData.routes?.map((route: any, index: number) => (
                          <div
                            key={route.id || index}
                            className="space-y-3 rounded-2xl border border-border bg-muted/20 px-4 py-4"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Option {index + 1}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {route.summary?.durationText ||
                                    route.summary?.duration ||
                                    'Duration available after start'}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                {route.summary?.departure && (
                                  <p>
                                    {route.summary.departure} →{' '}
                                    {route.summary.arrival}
                                  </p>
                                )}
                                {route.summary?.transportModes && (
                                  <p>
                                    {route.summary.transportModes.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {route.sections?.map(
                                (section: any, sectionIndex: number) => (
                                  <div
                                    key={section.id || sectionIndex}
                                    className="rounded-2xl border border-border bg-card/80 px-3 py-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={cn(
                                            'rounded px-2 py-1 text-[0.65rem] font-semibold uppercase',
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
                                        <span className="font-medium text-foreground">
                                          {section.transport?.shortName ||
                                            section.transport?.name ||
                                            section.summary ||
                                            'Step'}
                                        </span>
                                      </div>
                                      {section.travelSummary?.duration && (
                                        <span className="text-muted-foreground">
                                          {section.travelSummary.duration}
                                        </span>
                                      )}
                                    </div>

                                    {section.transport?.ourVehicleMatch && (
                                      <div className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-[0.65rem] text-blue-700">
                                        Vehicle match{' '}
                                        {
                                          section.transport.ourVehicleMatch
                                            .vehicle.routeShortName
                                        }{' '}
                                        (
                                        {
                                          section.transport.ourVehicleMatch
                                            .confidence
                                        }
                                        % confidence)
                                      </div>
                                    )}

                                    {section.reports?.length > 0 && (
                                      <p className="mt-2 text-[0.65rem] text-orange-600">
                                        ⚠️ {section.reports.length} nearby
                                        reports
                                      </p>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ))}
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
