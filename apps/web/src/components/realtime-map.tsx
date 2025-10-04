'use client'

import { Bus } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import MapGL, { Layer, Source } from 'react-map-gl/maplibre'
import { fetchGTFSVehiclePositions, type VehiclePosition } from '@/lib/gtfs'

export default function RealtimeMap() {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shapes, setShapes] = useState<{
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: { type: 'LineString'; coordinates: [number, number][] }
      properties: { mode: 'bus' | 'tram'; shape_id: string }
    }>
  } | null>(null)
  const [showBus, setShowBus] = useState(true)
  const [showTram, setShowTram] = useState(true)
  const [viewState, setViewState] = useState({
    longitude: 19.9383, // Kraków center
    latitude: 50.0614,
    zoom: 12,
  })

  // MapLibre style URL - using a CORS-compliant style
  const mapStyle =
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

  const rid = useId()
  const sourceId = useMemo(() => `vehicles-${rid.replace(/[:]/g, '')}`, [rid])
  const layerId = useMemo(
    () => `vehicle-points-${rid.replace(/[:]/g, '')}`,
    [rid],
  )
  const labelsLayerId = useMemo(
    () => `vehicle-labels-${rid.replace(/[:]/g, '')}`,
    [rid],
  )
  const shapesSourceId = useMemo(
    () => `shapes-${rid.replace(/[:]/g, '')}`,
    [rid],
  )
  const routesLayerId = useMemo(
    () => `routes-lines-${rid.replace(/[:]/g, '')}`,
    [rid],
  )

  const vehicleGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: vehicles.map((v) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [v.longitude, v.latitude],
        },
        properties: {
          id: v.id,
          bearing: v.bearing,
          routeId: v.routeId,
          vehicleId: v.vehicleId || v.id,
          mode: v.mode,
        },
      })),
    }),
    [vehicles],
  )

  useEffect(() => {
    let isMounted = true

    // Fetch GTFS vehicle positions
    const fetchVehiclePositions = async () => {
      if (!isMounted) return

      try {
        setError(null)
        const vehicles = await fetchGTFSVehiclePositions()
        if (isMounted) {
          setVehicles(vehicles)
        }
      } catch (error) {
        console.error('Error fetching vehicle positions:', error)
        if (isMounted) {
          setError('Failed to fetch vehicle positions')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Initial fetch
    fetchVehiclePositions()

    // Fetch static shapes (bus + tram lines)
    const fetchShapes = async () => {
      try {
        const res = await fetch('/api/gtfs/shapes')
        if (res.ok) {
          const data = (await res.json()) as typeof shapes
          if (isMounted) setShapes(data)
        }
      } catch (err) {
        console.error('Error fetching GTFS shapes:', err)
      }
    }
    fetchShapes()

    // Set up interval for real-time updates (every 30 seconds)
    const interval = setInterval(fetchVehiclePositions, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="w-full h-screen relative">
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-white text-lg">Loading vehicle positions...</div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 bg-red-500 text-white p-3 rounded-md z-10">
          <div>{error}</div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-md z-10 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <Bus className="w-4 h-4 text-blue-500" />
          <div>
            <div className="font-medium">Vehicles: {vehicles.length}</div>
            <div className="text-xs text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showBus}
              onChange={(e) => setShowBus(e.target.checked)}
            />
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-1 bg-blue-600" />
              Bus
            </span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showTram}
              onChange={(e) => setShowTram(e.target.checked)}
            />
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-1 bg-emerald-600" />
              Tram
            </span>
          </label>
        </div>
      </div>

      <MapGL
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
      >
        {vehicleGeoJSON.features.length > 0 && (
          <Source id={sourceId} type="geojson" data={vehicleGeoJSON}>
            <Layer
              id={layerId}
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  4,
                  14,
                  8,
                ],
                'circle-color': [
                  'match',
                  ['get', 'mode'],
                  'tram',
                  '#059669',
                  'bus',
                  '#2563eb',
                  /* other */ '#999999',
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              }}
            />
            <Layer
              id={labelsLayerId}
              type="symbol"
              layout={{
                'text-field': ['get', 'vehicleId'],
                'text-font': ['Open Sans Regular'],
                'text-size': 12,
                'text-anchor': 'bottom',
                'text-offset': [0, -1.5],
                'text-allow-overlap': false,
                'text-optional': true,
              }}
              paint={{
                'text-color': '#1f2937',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
                'text-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  0,
                  11,
                  0.7,
                  14,
                  1,
                ],
              }}
            />
          </Source>
        )}

        {shapes && (
          <Source id={shapesSourceId} type="geojson" data={shapes}>
            <Layer
              id={routesLayerId}
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'mode'],
                  'tram',
                  '#059669',
                  'bus',
                  '#2563eb',
                  '#999999',
                ],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  1,
                  13,
                  2.25,
                  16,
                  3.5,
                ],
                'line-opacity': [
                  'case',
                  ['==', ['get', 'mode'], 'bus'],
                  showBus ? 0.7 : 0,
                  ['==', ['get', 'mode'], 'tram'],
                  showTram ? 0.75 : 0,
                  0,
                ],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}
      </MapGL>
    </div>
  )
}
