import { type NextRequest, NextResponse } from 'next/server'
import { api, convex } from '@/lib/convex-client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Fetch trip updates from Convex database
    const tripUpdates = await convex.query(api.gtfs.getTripUpdates)

    // Transform the data to match the expected format
    const transformedTripUpdates = tripUpdates.map((update) => ({
      id: update.id,
      tripId: update.tripId,
      routeId: update.routeId,
      stopId: update.stopId,
      stopSequence: update.stopSequence,
      scheduleRelationship: update.scheduleRelationship,
      arrivalDelay: update.arrivalDelay,
      departureDelay: update.departureDelay,
      timestamp: update.timestamp,
      vehicleId: update.vehicleId,
    }))

    return NextResponse.json(transformedTripUpdates, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching GTFS trip updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trip updates' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, routeId, routeNumber, tripId } = await request.json()

    if (!vehicleId && !routeId && !routeNumber) {
      return NextResponse.json(
        {
          error: 'Missing required fields: vehicleId, routeId, or routeNumber',
        },
        { status: 400 },
      )
    }

    // Get all trip updates
    const allTripUpdates = await convex.query(api.gtfs.getTripUpdates)

    // Filter for the specific vehicle/route
    const filteredUpdates = allTripUpdates.filter((update) => {
      if (vehicleId && update.vehicleId === vehicleId) return true
      if (tripId && update.tripId === tripId) return true
      if (routeId && update.routeId === routeId) return true
      return false
    })

    // Also get current vehicle position
    let vehiclePosition = null
    if (vehicleId) {
      const positions = await convex.query(api.gtfs.getVehiclePositions)
      vehiclePosition = positions.find((vp) => vp.vehicleId === vehicleId)
    }

    // Calculate expected delay based on trip updates
    let expectedDelay = 0
    let delayStatus = 'On Schedule'

    if (filteredUpdates.length > 0) {
      const delays = filteredUpdates
        .flatMap((update) =>
          update.stopUpdates.map(
            (stopUpdate) =>
              stopUpdate.arrivalDelay || stopUpdate.departureDelay || 0,
          ),
        )
        .filter((delay) => delay !== undefined)

      if (delays.length > 0) {
        const avgDelay =
          delays.reduce((sum, delay) => sum + delay, 0) / delays.length
        expectedDelay = Math.round(avgDelay / 60) // Convert seconds to minutes

        if (expectedDelay > 5) {
          delayStatus = 'Significant Delay'
        } else if (expectedDelay > 2) {
          delayStatus = 'Minor Delay'
        } else if (expectedDelay < -2) {
          delayStatus = 'Early'
        }
      }
    }

    return NextResponse.json(
      {
        expectedDelay,
        delayStatus,
        tripUpdates: filteredUpdates,
        vehiclePosition,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Error fetching GTFS trip updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GTFS trip updates' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
