import { NextResponse } from 'next/server'
import { convex, api } from '@/lib/convex-client'

export const runtime = 'nodejs'

interface Trip {
  trip_id: string
  route_id: string
}

interface Route {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_type: string
  agency_id: string
  transportMode: string
}

export async function GET() {
  try {
    // Fetch routes and trips from Convex database only
    const routes = await convex.query(api.gtfs.getRoutes)
    const trips = await convex.query(api.gtfs.getTrips)

    // Transform trips to match expected format
    const transformedTrips = trips.map((trip) => ({
      trip_id: trip.tripId,
      route_id: trip.routeId,
    }))

    // Create route lookup map
    const routeMap = new Map<string, Route>()
    routes.forEach((route) => {
      routeMap.set(route.routeId, {
        route_id: route.routeId,
        route_short_name: route.routeShortName,
        route_long_name: route.routeLongName,
        route_type: route.routeType,
        agency_id: route.agencyId,
        transportMode: route.transportMode
      })
    })

    // Create trip to route mapping
    const tripToRouteMap = new Map<string, string>()
    trips.forEach((trip) => {
      tripToRouteMap.set(trip.tripId, trip.routeId)
    })

    // Log some sample data for debugging
    console.log('Sample routes:', routes.slice(0, 5))
    console.log('Sample trips:', trips.slice(0, 5))
    console.log(
      'Total routes:',
      routes.length,
      'Total trips:',
      trips.length,
    )

    return NextResponse.json(
      {
        routes,
        trips: transformedTrips,
        routeMap: Object.fromEntries(routeMap),
        tripToRouteMap: Object.fromEntries(tripToRouteMap),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      },
    )
  } catch (error) {
    console.error('Error fetching GTFS routes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GTFS routes' },
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}