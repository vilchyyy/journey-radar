import { type NextRequest, NextResponse } from 'next/server'
import {
  calculateRoute,
  type RouteCoordinate,
} from '@/lib/route-service-server'

interface EnrichedRouteRequest {
  origin: RouteCoordinate
  destination: RouteCoordinate
  maxRadiusMeters?: number
}

interface EnrichedRouteResponse {
  routes: Array<{
    id: string
    sections: Array<{
      id: string
      transport?: {
        mode: string
        routeId?: string
        routeName?: string
        agencyId?: string
        agencyName?: string
      }
      departure: any
      arrival: any
      geometry: RouteCoordinate[]
      travelSummary?: any
      actions?: any[]
      intermediateStops?: Array<{
        id?: string
        place: {
          id?: string
          name?: string
          location: RouteCoordinate
        }
        reports?: Array<{
          id: string
          type: string
          status: string
          description: string
          createdAt: string
          userPoints: number
        }>
      }>
      nearbyReports: Array<{
        id: string
        type: string
        status: string
        description: string
        createdAt: string
        userPoints: number
        distance: number
        location: RouteCoordinate
      }>
    }>
  }>
  summary: {
    totalReports: number
    reportsByType: Record<string, number>
    reportsByStatus: Record<string, number>
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrichedRouteRequest = await request.json()
    const { origin, destination, maxRadiusMeters = 500 } = body

    // Validate request
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination' },
        { status: 400 }
      )
    }

    // Get route from HERE API
    const routeResponse = await calculateRoute({
      origin,
      destination,
      return: ['polyline', 'travelSummary', 'actions', 'intermediate'],
      transportModes: ['bus', 'tram', 'pedestrian'],
      alternatives: 5,
    })

    if (!routeResponse.routes || routeResponse.routes.length === 0) {
      return NextResponse.json({
        routes: [],
        summary: { totalReports: 0, reportsByType: {}, reportsByStatus: {} }
      })
    }

    // For now, we'll just return the route without database enrichment
    // This allows the route planning to work without Convex setup
    const enrichedRoutes = routeResponse.routes.map(route => ({
      ...route,
      sections: route.sections.map(section => ({
        ...section,
        nearbyReports: [], // TODO: Add real reports when database is connected
        intermediateStops: section.intermediateStops?.map(stop => ({
          ...stop,
          reports: [] // TODO: Add real reports when database is connected
        }))
      }))
    }))

    const response: EnrichedRouteResponse = {
      routes: enrichedRoutes,
      summary: {
        totalReports: 0,
        reportsByType: {},
        reportsByStatus: {}
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Enriched route API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}