import { NextResponse } from 'next/server'
import { convex, api } from '@/lib/convex-client'

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
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching GTFS trip updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trip updates' },
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