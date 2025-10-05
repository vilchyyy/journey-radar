import { type NextRequest, NextResponse } from 'next/server'
import { api, convex } from '@/lib/convex-client'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, limit = 10 } = await request.json()

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields: latitude and longitude' },
        { status: 400 }
      )
    }

    // Get current vehicle positions
    const vehiclePositions = await convex.query(api.gtfs.getVehiclePositions)

    // Get all routes to map routeId to routeShortName
    const routes = await convex.query(api.gtfs.getRoutes)
    const routeMap = new Map()
    routes.forEach(route => {
      routeMap.set(route.routeId, route.routeShortName)
    })

    // Calculate distance from user location to each vehicle
    const vehiclesWithDistance = vehiclePositions
      .filter(vehicle => vehicle.latitude && vehicle.longitude)
      .map(vehicle => {
        // Calculate distance using Haversine formula
        const R = 6371 // Earth's radius in kilometers
        const dLat = (vehicle.latitude - latitude) * Math.PI / 180
        const dLon = (vehicle.longitude - longitude) * Math.PI / 180
        const a =
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(vehicle.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = R * c

        return {
          ...vehicle,
          distance,
          routeShortName: routeMap.get(vehicle.routeId) || vehicle.routeNumber
        }
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)

    // Transform to trip format with route information
    const closestTrips = vehiclesWithDistance.map(vehicle => ({
      tripId: vehicle.tripId,
      routeId: vehicle.routeId,
      routeShortName: vehicle.routeShortName || vehicle.routeNumber,
      mode: vehicle.mode.toLowerCase(),
      vehicleId: vehicle.vehicleId,
      currentLocation: {
        latitude: vehicle.latitude,
        longitude: vehicle.longitude
      },
      distance: Math.round(vehicle.distance * 100) / 100, // Round to 2 decimal places
      bearing: vehicle.bearing,
      lastUpdate: vehicle.timestamp
    }))

    return NextResponse.json({
      trips: closestTrips,
      total: vehiclePositions.length
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching closest trips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch closest trips' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}