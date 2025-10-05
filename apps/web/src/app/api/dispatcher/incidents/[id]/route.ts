import { api } from '@journey-radar/backend/convex/_generated/api'
import { Id } from '@journey-radar/backend/convex/_generated/dataModel'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { type NextRequest, NextResponse } from 'next/server'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/dispatcher/incidents/[id] - Get specific incident
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const incident = await fetchQuery(api.incidents.getIncidentById, {
      incidentId: Id('incidents', id),
    })

    return NextResponse.json({
      success: true,
      data: incident,
    })
  } catch (error) {
    console.error('Error fetching incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch incident' },
      { status: 500 },
    )
  }
}

// PUT /api/dispatcher/incidents/[id] - Update incident
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData = {
      incidentId: Id('incidents', id),
      type: body.type,
      description: body.description,
      validUntil: body.validUntil,
      dispatcherId: body.dispatcherId,
    }

    const incidentId = await fetchMutation(
      api.incidents.updateIncident,
      updateData,
    )

    return NextResponse.json({
      success: true,
      data: { incidentId: id },
      message: 'Incident updated successfully',
    })
  } catch (error) {
    console.error('Error updating incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update incident' },
      { status: 500 },
    )
  }
}

// DELETE /api/dispatcher/incidents/[id] - Delete incident
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dispatcherId = searchParams.get('dispatcherId')

    const incidentId = await fetchMutation(api.incidents.deleteIncident, {
      incidentId: Id('incidents', id),
      dispatcherId: dispatcherId || undefined,
    })

    return NextResponse.json({
      success: true,
      data: { incidentId: id },
      message: 'Incident deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting incident:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete incident' },
      { status: 500 },
    )
  }
}
