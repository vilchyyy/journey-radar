'use client'

import { Bus, Navigation } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import MapGL, { Layer, Source } from 'react-map-gl/maplibre'
import { fetchGTFSVehiclePositions, type VehiclePosition } from '@/lib/gtfs'
import type { RouteCoordinate } from '@/lib/route-service'

interface RouteMapProps {
  routeData?: {
    routes?: Array<{
      id: string
      sections: Array<{
        id: string
        transport?: { mode: string }
        geometry: RouteCoordinate[]
        departure?: { place: { location: RouteCoordinate } }
        arrival?: { place: { location: RouteCoordinate } }
        intermediateStops?: Array<{
          place: { name?: string; location: RouteCoordinate }
        }>
      }>
    }>
  }
  origin?: RouteCoordinate
  destination?: RouteCoordinate
}

export default function RouteMap({ routeData, origin, destination }: RouteMapProps) {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewState, setViewState] = useState({
    longitude: origin?.lng || destination?.lng || 19.9383, // Default to Kraków center
    latitude: origin?.lat || destination?.lat || 50.0614,
    zoom: 12,
  })

  // MapLibre style URL - using a CORS-compliant style
  const mapStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

  const rid = useId()
  const sourceId = useMemo(() => `vehicles-${rid.replace(/[:]/g, '')}`, [rid])
  const layerId = useMemo(() => `vehicle-points-${rid.replace(/[:]/g, '')}`, [rid])
  const labelsLayerId = useMemo(() => `vehicle-labels-${rid.replace(/[:]/g, '')}`, [rid])
  const routesSourceId = useMemo(() => `routes-${rid.replace(/[:]/g, '')}`, [rid])
  const routeLayerId = useMemo(() => `route-lines-${rid.replace(/[:]/g, '')}`, [rid])
  const pointsSourceId = useMemo(() => `points-${rid.replace(/[:]/g, '')}`, [rid])
  const pointsLayerId = useMemo(() => `point-markers-${rid.replace(/[:]/g, '')}`, [rid])

  // Fit map to show route bounds
  useEffect(() => {
    if (routeData?.routes?.[0]?.sections) {
      const allPoints: RouteCoordinate[] = []

      routeData.routes[0].sections.forEach(section => {
        if (section.geometry) {
          allPoints.push(...section.geometry)
        }
        if (section.departure?.place?.location) {
          allPoints.push(section.departure.place.location)
        }
        if (section.arrival?.place?.location) {
          allPoints.push(section.arrival.place.location)
        }
        if (section.intermediateStops) {
          section.intermediateStops.forEach(stop => {
            if (stop.place?.location) {
              allPoints.push(stop.place.location)
            }
          })
        }
      })

      if (allPoints.length > 0) {
        const lats = allPoints.map(p => p.lat)
        const lngs = allPoints.map(p => p.lng)

        const bounds = {
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          west: Math.min(...lngs)
        }

        // Add some padding
        const latPadding = (bounds.north - bounds.south) * 0.1
        const lngPadding = (bounds.east - bounds.west) * 0.1

        setViewState({
          longitude: (bounds.west + bounds.east) / 2,
          latitude: (bounds.north + bounds.south) / 2,
          zoom: Math.min(14, Math.max(8, Math.log2(360 / Math.max(bounds.east - bounds.west + lngPadding * 2, bounds.north - bounds.south + latPadding * 2))))
        })
      }
    }
  }, [routeData])

  // Load vehicle data
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const vehicleData = await fetchGTFSVehiclePositions()
        setVehicles(vehicleData)
        setError(null)
      } catch (err) {
        console.error('Error loading vehicle positions:', err)
        setError('Failed to load vehicle positions')
      } finally {
        setLoading(false)
      }
    }

    loadVehicles()
    const interval = setInterval(loadVehicles, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Convert route geometry to GeoJSON
  const routeGeoJSON = useMemo(() => {
    if (!routeData?.routes) return null

    const features = routeData.routes.flatMap(route =>
      route.sections
        .filter(section => section.geometry && section.geometry.length > 0)
        .map((section, index) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: section.geometry.map(coord => [coord.lng, coord.lat])
          },
          properties: {
            id: section.id,
            mode: section.transport?.mode || 'unknown',
            index
          }
        }))
    )

    return {
      type: 'FeatureCollection' as const,
      features
    }
  }, [routeData])

  // Create markers for origin, destination, and stops
  const pointsGeoJSON = useMemo(() => {
    const features = []

    if (origin) {
      features.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [origin.lng, origin.lat]
        },
        properties: {
          type: 'origin',
          name: 'Origin'
        }
      })
    }

    if (destination) {
      features.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [destination.lng, destination.lat]
        },
        properties: {
          type: 'destination',
          name: 'Destination'
        }
      })
    }

    // Add intermediate stops
    if (routeData?.routes?.[0]?.sections) {
      routeData.routes[0].sections.forEach(section => {
        if (section.intermediateStops) {
          section.intermediateStops.forEach(stop => {
            if (stop.place?.location) {
              features.push({
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: [stop.place.location.lng, stop.place.location.lat]
                },
                properties: {
                  type: 'stop',
                  name: stop.place.name || 'Stop'
                }
              })
            }
          })
        }
      })
    }

    return {
      type: 'FeatureCollection' as const,
      features
    }
  }, [origin, destination, routeData])

  // Vehicle GeoJSON
  const vehicleGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: vehicles.map(vehicle => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [vehicle.position.longitude, vehicle.position.latitude]
      },
      properties: {
        id: vehicle.vehicle.id,
        route: vehicle.vehicle.route_id,
        label: vehicle.vehicle.route_id,
        mode: vehicle.vehicle.route_id?.includes('TRAM') ? 'tram' : 'bus'
      }
    }))
  }), [vehicles])

  if (error) {
    return (
      <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-96 relative">
      <MapGL
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
      >
        {/* Route lines */}
        {routeGeoJSON && (
          <Source id={routesSourceId} type="geojson" data={routeGeoJSON}>
            <Layer
              id={routeLayerId}
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 4,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Points (origin, destination, stops) */}
        {pointsGeoJSON && (
          <Source id={pointsSourceId} type="geojson" data={pointsGeoJSON}>
            <Layer
              id={pointsLayerId}
              type="circle"
              paint={{
                'circle-radius': [
                  'match',
                  ['get', 'type'],
                  'origin', 8,
                  'destination', 8,
                  'stop', 5,
                  4
                ],
                'circle-color': [
                  'match',
                  ['get', 'type'],
                  'origin', '#22c55e',
                  'destination', '#ef4444',
                  'stop', '#f59e0b',
                  '#3b82f6'
                ],
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
              }}
            />
          </Source>
        )}

        {/* Vehicles */}
        <Source id={sourceId} type="geojson" data={vehicleGeoJSON}>
          <Layer
            id={layerId}
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': ['match', ['get', 'mode'], 'tram', '#dc2626', '#059669'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }}
          />
          <Layer
            id={labelsLayerId}
            type="symbol"
            layout={{
              'text-field': ['get', 'label'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'text-offset': [0, 1.5],
              'text-anchor': 'top'
            }}
            paint={{
              'text-color': '#000000',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2
            }}
          />
        </Source>
      </MapGL>

      {/* Map legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
          <span>Origin</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
          <span>Destination</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-amber-500 rounded-full border border-white"></div>
          <span>Stops</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
          <span>Route</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-green-600 rounded-full border border-white"></div>
          <span>Bus</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full border border-white"></div>
          <span>Tram</span>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Loading vehicles...</span>
          </div>
        </div>
      )}
    </div>
  )
}