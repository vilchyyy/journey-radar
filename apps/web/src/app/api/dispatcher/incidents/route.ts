import { api } from '@journey-radar/backend/convex/_generated/api'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { type NextRequest, NextResponse } from 'next/server'
import {
  AUTH_ERRORS,
  requirePermission,
  withDispatcherAuth,
} from '@/lib/dispatcher-auth'

// GET /api/dispatcher/incidents - Get all incidents
export const GET = withDispatcherAuth(
  async (request: NextRequest, auth: any) => {
    try {
      if (!requirePermission(auth, 'view_incidents')) {
        return NextResponse.json(AUTH_ERRORS.FORBIDDEN, { status: 403 })
      }

      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') as 'ACTIVE' | 'RESOLVED' | null
      const transportMode = searchParams.get('transportMode') as
        | 'BUS'
        | 'TRAIN'
        | 'TRAM'
        | null
      const limit = searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : undefined

      const incidents = await fetchQuery(api.incidents.getAllIncidents, {
        status: status || undefined,
        transportMode: transportMode || undefined,
        limit,
      })

      return NextResponse.json({
        success: true,
        data: incidents,
        count: incidents.length,
      })
    } catch (error) {
      console.error('Error fetching incidents:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch incidents' },
        { status: 500 },
      )
    }
  },
)

// POST /api/dispatcher/incidents - Create new incident
export const POST = withDispatcherAuth(
  async (request: NextRequest, auth: any) => {
    try {
      if (!requirePermission(auth, 'create_incident')) {
        return NextResponse.json(AUTH_ERRORS.FORBIDDEN, { status: 403 })
      }

      const body = await request.json()

      // Validate required fields
      const requiredFields = ['type', 'description', 'transportMode', 'routeId']
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json(
            { success: false, error: `Missing required field: ${field}` },
            { status: 400 },
          )
        }
      }

      const incidentData = {
        source: body.source || 'DISPATCHER',
        type: body.type,
        description: body.description,
        transportMode: body.transportMode,
        routeId: body.routeId,
        validFrom: body.validFrom || Date.now(),
        validUntil: body.validUntil,
        dispatcherId: auth.dispatcherId, // Use authenticated dispatcher ID
      }

      const incidentId = await fetchMutation(
        api.incidents.createIncident,
        incidentData,
      )

      return NextResponse.json({
        success: true,
        data: { incidentId },
        message: 'Incident created successfully',
      })
    } catch (error) {
      console.error('Error creating incident:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create incident' },
        { status: 500 },
      )
    }
  },
)
