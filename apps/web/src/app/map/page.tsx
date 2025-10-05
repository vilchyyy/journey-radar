'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import RealtimeMap from '@/components/realtime-map'

function MapPageContent() {
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

function LoadingFallback() {
  return (
    <div className="relative flex h-screen w-full flex-col bg-background items-center justify-center">
      <div className="text-muted-foreground">Loading map...</div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MapPageContent />
    </Suspense>
  )
}
