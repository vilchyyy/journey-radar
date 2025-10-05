import { NextRequest, NextResponse } from 'next/server'
import { api } from '@journey-radar/backend/convex/_generated/api'
import { fetchMutation } from 'convex/nextjs'
import { Id } from '@journey-radar/backend/convex/_generated/dataModel'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/dispatcher/incidents/[id]/link-reports - Link user reports to incident
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.reportIds || !Array.isArray(body.reportIds)) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: reportIds (array)' },
        { status: 400 }
      )
    }

    // Convert string IDs to Convex IDs
    const reportIds = body.reportIds.map((reportId: string) =>
      Id('reports', reportId)
    )

    const result = await fetchMutation(api.incidents.linkReportsToIncident, {
      incidentId: Id('incidents', id),
      reportIds,
      dispatcherId: body.dispatcherId,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully linked ${result.linkedReports} reports to incident`,
    })
  } catch (error) {
    console.error('Error linking reports to incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to link reports to incident' },
      { status: 500 }
    )
  }
}