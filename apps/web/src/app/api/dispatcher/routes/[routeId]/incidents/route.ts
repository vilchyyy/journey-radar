import { api } from '@journey-radar/backend/convex/_generated/api'
import { Id } from '@journey-radar/backend/convex/_generated/dataModel'
import { fetchQuery } from 'convex/nextjs'
import { type NextRequest, NextResponse } from 'next/server'

interface Params {
  params: Promise<{ routeId: string }>
}

// GET /api/dispatcher/routes/[routeId]/incidents - Get active incidents for specific route
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { routeId } = await params

    const incidents = await fetchQuery(
      api.incidents.getActiveIncidentsForRoute,
      {
        routeId: Id('routes', routeId),
      },
    )

    return NextResponse.json({
      success: true,
      data: incidents,
      count: incidents.length,
    })
  } catch (error) {
    console.error('Error fetching route incidents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch route incidents' },
      { status: 500 },
    )
  }
}
