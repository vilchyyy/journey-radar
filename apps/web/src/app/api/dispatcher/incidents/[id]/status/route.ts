import { api } from '@journey-radar/backend/convex/_generated/api'
import type { Id } from '@journey-radar/backend/convex/_generated/dataModel'
import { fetchMutation } from 'convex/nextjs'
import { type NextRequest, NextResponse } from 'next/server'

interface Params {
  params: Promise<{ id: string }>
}

// PUT /api/dispatcher/incidents/[id]/status - Update incident status
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: status' },
        { status: 400 },
      )
    }

    if (!['ACTIVE', 'RESOLVED'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be ACTIVE or RESOLVED' },
        { status: 400 },
      )
    }

    const incidentId = await fetchMutation(api.incidents.updateIncidentStatus, {
      incidentId: { table: 'incidents', id },
      status: body.status,
      dispatcherId: body.dispatcherId,
    })

    return NextResponse.json({
      success: true,
      data: { incidentId },
      message: `Incident status updated to ${body.status}`,
    })
  } catch (error) {
    console.error('Error updating incident status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update incident status' },
      { status: 500 },
    )
  }
}
