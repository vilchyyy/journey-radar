import { type NextRequest, NextResponse } from 'next/server'
import { api, convex } from '@/lib/convex-client'

export async function POST(request: NextRequest) {
  try {
    const { tripId, routeId, routeNumber, mode, vehicleId } = await request.json()

    if (!tripId && !routeNumber && !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId, routeNumber, or mode' },
        { status: 400 },
      )
    }

    // Get reports for this specific transport
    const reports = await convex.query(api.reports.getTripReports, {
      tripId: tripId || undefined,
      routeNumber,
      mode: mode?.toUpperCase(),
      routeId: routeId || undefined,
      vehicleId: vehicleId || undefined,
    })

    return NextResponse.json({ reports }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching transport reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transport reports' },
      { status: 500 },
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
