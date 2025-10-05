'use client'

import { useSearchParams } from 'next/navigation'
import RealtimeMap from '@/components/realtime-map'

export default function MapPage() {
  const searchParams = useSearchParams()

  // Extract vehicle identification params from URL
  const vehicleId = searchParams.get('vehicleId')
  const tripId = searchParams.get('tripId')
  const routeId = searchParams.get('routeId')
  const route = searchParams.get('route')
  const mode = searchParams.get('mode')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  return (
    <div className="relative flex h-screen w-full flex-col bg-background">
      <RealtimeMap
        autoSelectVehicle={vehicleId || undefined}
        autoSelectTripId={tripId || undefined}
        autoSelectRouteId={routeId || undefined}
        autoSelectRoute={route || undefined}
        autoSelectMode={mode as 'bus' | 'tram' | undefined}
        initialCenter={
          lat && lng
            ? {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
              }
            : undefined
        }
      />
    </div>
  )
}
