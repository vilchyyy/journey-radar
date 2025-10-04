import { NextResponse } from 'next/server'
import { convex, api } from '@/lib/convex-client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Fetch vehicle positions and routes from Convex database
    const vehicles = await convex.query(api.gtfs.getVehiclePositions)
    const routes = await convex.query(api.gtfs.getRoutes)

    // Create route lookup map with composite key (routeId + transportMode)
    const routeMap = new Map<string, { routeLongName: string; routeShortName: string }>()
    routes.forEach((route) => {
      // Create composite key to distinguish between bus and tram routes with same routeId
      const compositeKey = `${route.routeId}_${route.transportMode}` // Keep uppercase for consistency with vehicle data
      routeMap.set(compositeKey, {
        routeLongName: route.routeLongName,
        routeShortName: route.routeShortName,
      })
    })

    // Transform the data to match the expected format
    const transformedVehicles = vehicles.map((vehicle) => {
      // Use composite key to lookup the correct route (bus vs tram)
      const compositeKey = `${vehicle.routeId}_${vehicle.mode}` // Use uppercase to match route map keys
      const routeInfo = routeMap.get(compositeKey)
      return {
        id: vehicle.vehicleId,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        bearing: vehicle.bearing,
        tripId: vehicle.tripId,
        routeId: vehicle.routeId,
        vehicleId: vehicle.routeNumber, // Use routeNumber as vehicleId for compatibility
        routeShortName: routeInfo?.routeShortName || vehicle.routeNumber, // Use route_short_name with fallback
        routeLongName: routeInfo?.routeLongName || vehicle.routeNumber, // Fallback to routeNumber
        timestamp: vehicle.timestamp,
        mode: vehicle.mode.toLowerCase() as 'bus' | 'tram',
      }
    })

    return NextResponse.json(transformedVehicles, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching GTFS vehicle positions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle positions' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'type',
    },
  })
}