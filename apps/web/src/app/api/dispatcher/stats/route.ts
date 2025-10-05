import { NextResponse } from 'next/server'
import { api } from '@journey-radar/backend/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'

// GET /api/dispatcher/stats - Get incident statistics for dashboard
export async function GET() {
  try {
    const stats = await fetchQuery(api.incidents.getIncidentStats, {})

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}