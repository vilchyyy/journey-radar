import { type NextRequest, NextResponse } from 'next/server'
import { api, convex } from '@/lib/convex-client'
import {
  calculateRoute,
  type RouteCoordinate,
} from '@/lib/route-service-server'

interface VehicleMatchedRouteRequest {
  origin: RouteCoordinate
  destination: RouteCoordinate
  maxRadiusMeters?: number
  alternatives?: number
}

interface VehicleInfo {
  id: string
  latitude: number
  longitude: number
  bearing: number
  tripId: string
  routeId: string
  vehicleId: string
  routeShortName: string
  routeLongName: string
  timestamp: number
  mode: 'bus' | 'tram'
  reports?: any[]
}

interface VehicleMatchedRouteResponse {
  routes: Array<{
    id: string
    sections: Array<{
      id: string
      type?: string
      transport?: {
        mode?: string
        name?: string
        category?: string
        color?: string
        textColor?: string
        headsign?: string
        shortName?: string
        longName?: string
        wheelchairAccessible?: boolean
        agencyId?: string
        agencyName?: string
        ourVehicleId?: string
        ourVehicleMatch?: {
          vehicle: VehicleInfo
          confidence: number
          reason: string
        }
      }
      departure: any
      arrival: any
      polyline: string
      geometry?: RouteCoordinate[]
      travelSummary?: any
      actions?: any[]
      intermediateStops?: Array<{
        id?: string
        place: {
          id?: string
          name?: string
          location: RouteCoordinate
          wheelchairAccessible?: string
        }
        departure?: any
        arrival?: any
      }>
      nearbyVehicles: Array<{
        vehicle: VehicleInfo
        distance: number
        confidence: number
        reason: string
        reports?: any[]
      }>
      reports?: Array<{
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
    vehicleMatches: number
    vehiclesWithReports: number
    hasPublicTransport: boolean
    routeType: 'public_transport_only' | 'mixed_or_pedestrian'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: VehicleMatchedRouteRequest = await request.json()
    const {
      origin,
      destination,
      maxRadiusMeters = 500,
      alternatives = 6,
    } = body

    // Validate request
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination' },
        { status: 400 },
      )
    }

    // First, try to get public transport routes (all modes) - request more alternatives
    const publicTransportResponse = await calculateRoute({
      origin,
      destination,
      return: ['polyline', 'travelSummary', 'actions', 'intermediate'],
      alternatives, // Request N alternative routes
    })

    let routeResponse = publicTransportResponse
    let needsAlternativeRoutes = false

    // If no public transport routes found or less than desired routes, get all routes for fallback
    if (
      !publicTransportResponse.routes ||
      publicTransportResponse.routes.length < Math.min(5, alternatives)
    ) {
      console.log(
        `Found ${publicTransportResponse.routes?.length || 0} routes, getting more alternatives...`,
      )
      const allRoutesResponse = await calculateRoute({
        origin,
        destination,
        return: ['polyline', 'travelSummary', 'actions', 'intermediate'],
        alternatives, // Ensure we get alternatives
      })
      routeResponse = allRoutesResponse
      needsAlternativeRoutes = true
    }

    if (!routeResponse.routes || routeResponse.routes.length === 0) {
      return NextResponse.json({
        routes: [],
        summary: {
          totalReports: 0,
          reportsByType: {},
          reportsByStatus: {},
          vehicleMatches: 0,
          vehiclesWithReports: 0,
          hasPublicTransport: false,
          routeType: 'mixed_or_pedestrian',
        },
      })
    }

    // Fetch vehicles from Convex for real-time data
    let ourVehicles: VehicleInfo[] = []
    try {
      const convexVehicles = await convex.query(api.gtfs.getVehiclePositions)
      console.log(
        'Raw Convex vehicles:',
        convexVehicles.length,
        convexVehicles.slice(0, 2),
      )
      // Convert Convex vehicle format to expected format
      ourVehicles = convexVehicles.map((v: any) => ({
        id: v._id,
        latitude: v.latitude,
        longitude: v.longitude,
        bearing: v.bearing,
        tripId: v.tripId,
        routeId: v.routeId,
        vehicleId: v.vehicleId,
        routeShortName: v.routeNumber,
        routeLongName: v.routeNumber,
        timestamp: v.timestamp,
        mode: v.mode.toLowerCase(),
      }))
      console.log(
        'Converted vehicles:',
        ourVehicles.length,
        ourVehicles.slice(0, 2),
      )
      console.log('Available vehicle modes:', [
        ...new Set(convexVehicles.map((v: any) => v.mode)),
      ])
      console.log('Available route numbers:', [
        ...new Set(convexVehicles.map((v: any) => v.routeNumber)),
      ])
    } catch (error) {
      console.log(
        'Could not fetch vehicles from Convex, proceeding without vehicle matching:',
        error,
      )
    }

    // Fetch reports from our API
    let allReports: any[] = []
    try {
      const reportsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/reports/list`,
      )
      if (reportsResponse.ok) {
        allReports = await reportsResponse.json()
      }
    } catch (error) {
      console.log('Could not fetch reports, proceeding without reports:', error)
    }

    let totalReports = 0
    const reportsByType: Record<string, number> = {}
    const reportsByStatus: Record<string, number> = {}
    let vehicleMatches = 0
    let vehiclesWithReports = 0

    console.log('Processing routes:', routeResponse.routes.length)

    // Use all routes without filtering - include trains, buses, trams, etc.
    const filteredRoutes = routeResponse.routes

    console.log(
      `Processing ${filteredRoutes.length} routes (all transit modes)`,
    )

    // Process each route
    const processedRoutes = await Promise.all(
      filteredRoutes.map(async (route, routeIndex) => {
        console.log(`Route ${routeIndex}: ${route.sections.length} sections`)
        const processedSections = await Promise.all(
          route.sections.map(async (section, sectionIndex) => {
            console.log(`Section ${sectionIndex}:`, {
              type: (section as any).type,
              transportMode: section.transport?.mode,
              transportName:
                section.transport?.shortName || section.transport?.name,
              hasGeometry: !!(section.geometry && section.geometry.length > 0),
            })
            // Match vehicle with transport section (all transit modes)
            let matchedVehicle: VehicleInfo | null = null
            let matchConfidence = 0
            let matchReason = ''

            // Match vehicle with transport section
            if (section.transport?.mode && section.transport?.shortName) {
              const match = findVehicleForSection(section, ourVehicles)
              if (match) {
                matchedVehicle = match.vehicle
                matchConfidence = match.confidence
                matchReason = match.reason
                vehicleMatches++
              }
            }

            // Find nearby vehicles along the route (temporarily disabled filtering for debugging)
            const nearbyVehicles = findNearbyVehicles(
              section.geometry || [],
              ourVehicles,
              maxRadiusMeters * 2, // Larger radius for vehicles
            )

            // Find reports near the route
            const nearbyReports = findNearbyReports(
              section.geometry || [],
              allReports,
              maxRadiusMeters,
            )

            // Check for vehicles with reports
            const vehiclesWithIssues = nearbyVehicles.filter((vehicle) =>
              hasRecentReports(
                vehicle.vehicle,
                allReports,
                maxRadiusMeters * 3,
              ),
            )
            vehiclesWithReports += vehiclesWithIssues.length

            // Update statistics
            nearbyReports.forEach((report) => {
              totalReports++
              reportsByType[report.type] = (reportsByType[report.type] || 0) + 1
              reportsByStatus[report.status] =
                (reportsByStatus[report.status] || 0) + 1
            })

            const transport = section.transport
              ? {
                  ...section.transport,
                  ourVehicleId: matchedVehicle?.id,
                  ourVehicleMatch: matchedVehicle
                    ? {
                        vehicle: matchedVehicle,
                        confidence: matchConfidence,
                        reason: matchReason,
                      }
                    : undefined,
                }
              : undefined

            return {
              ...section,
              transport,
              nearbyVehicles: nearbyVehicles.map((v) => ({
                ...v,
                reports: hasRecentReports(
                  v.vehicle,
                  allReports,
                  maxRadiusMeters * 3,
                )
                  ? allReports.filter((r) =>
                      isNearVehicle(r, v.vehicle, maxRadiusMeters * 3),
                    )
                  : [],
              })),
              reports: nearbyReports,
            }
          }),
        )

        return {
          ...route,
          sections: processedSections,
        }
      }),
    )

    const response: VehicleMatchedRouteResponse = {
      routes: processedRoutes,
      summary: {
        totalReports,
        reportsByType,
        reportsByStatus,
        vehicleMatches,
        vehiclesWithReports,
        hasPublicTransport: !needsAlternativeRoutes,
        routeType: needsAlternativeRoutes
          ? 'mixed_or_pedestrian'
          : 'public_transport_only',
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Vehicle-matched route API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// Find vehicle that matches the transport section (all transit modes)
function findVehicleForSection(section: any, vehicles: VehicleInfo[]) {
  const transportMode = section.transport?.mode?.toLowerCase()
  const transportName = section.transport?.shortName || section.transport?.name
  const transportHeadsign = section.transport?.headsign

  console.log('Matching section:', {
    transportMode,
    transportName,
    transportHeadsign,
    totalVehicles: vehicles.length,
  })

  // Skip if missing essential data, but accept all transit modes (bus, tram, train, etc.)
  if (!transportMode || !transportName) {
    console.log('Skipping section - missing transport mode or name')
    return null
  }

  // Filter vehicles to match the transport mode
  const relevantVehicles = vehicles.filter((v) => v.mode === transportMode)
  console.log(`Relevant vehicles (${transportMode}):`, relevantVehicles.length)

  // Priority 1: Exact route name match
  const exactMatch = relevantVehicles.find(
    (v) =>
      v.routeShortName.toLowerCase() === transportName.toLowerCase() &&
      v.mode === transportMode,
  )
  if (exactMatch) {
    console.log(
      'Found exact match:',
      exactMatch.routeShortName,
      exactMatch.mode,
    )
    return {
      vehicle: exactMatch,
      confidence: 100,
      reason: 'Exact route name match',
    }
  }

  // Priority 2: Route name contains (for partial matches)
  const partialMatch = relevantVehicles.find(
    (v) =>
      v.routeShortName.toLowerCase().includes(transportName.toLowerCase()) ||
      (transportName.toLowerCase().includes(v.routeShortName.toLowerCase()) &&
        v.mode === transportMode),
  )
  if (partialMatch) {
    return {
      vehicle: partialMatch,
      confidence: 75,
      reason: 'Partial route name match',
    }
  }

  // Priority 3: Headsign match (for direction)
  if (transportHeadsign) {
    const headsignMatch = relevantVehicles.find(
      (v) =>
        v.routeLongName
          .toLowerCase()
          .includes(transportHeadsign.toLowerCase()) &&
        v.mode === transportMode,
    )
    if (headsignMatch) {
      return {
        vehicle: headsignMatch,
        confidence: 60,
        reason: 'Headsign match',
      }
    }
  }

  console.log(
    'No match found. Available vehicles:',
    relevantVehicles.map((v) => `${v.routeShortName} (${v.mode})`),
  )
  return null
}

// Find vehicles near route geometry (all transit modes)
function findNearbyVehicles(
  geometry: RouteCoordinate[],
  vehicles: VehicleInfo[],
  radiusMeters: number,
) {
  if (!geometry || geometry.length === 0 || vehicles.length === 0) return []

  const nearbyVehicles: Array<{
    vehicle: VehicleInfo
    distance: number
    confidence: number
    reason: string
  }> = []

  // Consider all vehicle types (buses, trams, trains, etc.)
  vehicles.forEach((vehicle) => {
    // Find closest point on route to vehicle
    let minDistance = Infinity
    let closestPoint: RouteCoordinate | null = null

    geometry.forEach((point) => {
      const distance = calculateDistance(point, {
        lat: vehicle.latitude,
        lng: vehicle.longitude,
      })
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = point
      }
    })

    if (minDistance <= radiusMeters) {
      const confidence = 90 - (minDistance / radiusMeters) * 40 // 50-90% based on distance
      const reason = 'Near route'

      nearbyVehicles.push({
        vehicle,
        distance: Math.round(minDistance),
        confidence: Math.min(100, Math.round(confidence)),
        reason,
      })
    }
  })

  return nearbyVehicles.sort((a, b) => b.confidence - a.confidence)
}

// Find reports near route geometry
function findNearbyReports(
  geometry: RouteCoordinate[],
  reports: any[],
  radiusMeters: number,
) {
  if (!geometry || geometry.length === 0 || reports.length === 0) return []

  const nearbyReports: any[] = []

  reports.forEach((report) => {
    if (!report.location?.coordinates) return

    const reportLocation = {
      lat: report.location.coordinates[1],
      lng: report.location.coordinates[0],
    }

    // Check distance to route geometry
    let minDistance = Infinity
    geometry.forEach((point) => {
      const distance = calculateDistance(point, reportLocation)
      if (distance < minDistance) minDistance = distance
    })

    if (minDistance <= radiusMeters) {
      nearbyReports.push({
        id: report._id,
        type: report.type,
        status: report.status,
        description: report.description,
        createdAt: report._creationTime,
        userPoints: report.userPoints,
        distance: Math.round(minDistance),
        location: reportLocation,
      })
    }
  })

  return nearbyReports.sort((a, b) => a.distance - b.distance)
}

// Check if vehicle has recent reports
function hasRecentReports(
  vehicle: VehicleInfo,
  reports: any[],
  radiusMeters: number,
) {
  return reports.some((report) => {
    if (!report.location?.coordinates) return false
    const reportLocation = {
      lat: report.location.coordinates[1],
      lng: report.location.coordinates[0],
    }
    const distance = calculateDistance(
      { lat: vehicle.latitude, lng: vehicle.longitude },
      reportLocation,
    )
    return distance <= radiusMeters
  })
}

// Check if report is near vehicle
function isNearVehicle(
  report: any,
  vehicle: VehicleInfo,
  radiusMeters: number,
) {
  if (!report.location?.coordinates) return false
  const reportLocation = {
    lat: report.location.coordinates[1],
    lng: report.location.coordinates[0],
  }
  const distance = calculateDistance(
    { lat: vehicle.latitude, lng: vehicle.longitude },
    reportLocation,
  )
  return distance <= radiusMeters
}

// Calculate distance between two points
function calculateDistance(
  point1: RouteCoordinate,
  point2: RouteCoordinate,
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
