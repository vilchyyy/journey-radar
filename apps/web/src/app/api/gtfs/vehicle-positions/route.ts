import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface RouteData {
  routes: Array<{
    route_id: string
    route_short_name: string
  }>
  tripToRouteMap: Record<string, string>
}

let routeCache: RouteData | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 3600000 // 1 hour in milliseconds

async function getRouteMapping(): Promise<RouteData> {
  const now = Date.now()

  // Return cached data if still valid
  if (routeCache && now - cacheTimestamp < CACHE_DURATION) {
    return routeCache
  }

  try {
    const response = await fetch('/api/gtfs/routes', {
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch route mapping')
    }

    const data = (await response.json()) as RouteData
    routeCache = data
    cacheTimestamp = now
    return data
  } catch (error) {
    console.error('Error fetching route mapping:', error)
    // Return empty mapping if fetch fails
    return { routes: [], tripToRouteMap: {} }
  }
}

type FeedObject = {
  header?: { timestamp?: number }
  entity?: Array<{
    id?: string
    vehicle?: {
      position?: { latitude?: number; longitude?: number; bearing?: number }
      trip?: {
        tripId?: string
        trip_id?: string
        routeId?: string
        route_id?: string
      }
      vehicle?: { id?: string }
      timestamp?: number
    }
  }>
}

async function getVehiclesFromFeed(
  url: string,
  mode: 'bus' | 'tram',
  routeData: RouteData,
) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'journey-radar/1.0' },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    console.error(`HTTP error for ${url}! status: ${response.status}`)
    return []
  }

  const arrayBuffer = await response.arrayBuffer()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mod = await import('gtfs-realtime-bindings')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const transit = mod.default?.transit_realtime ?? mod.transit_realtime

  const message = transit.FeedMessage.decode(new Uint8Array(arrayBuffer))
  const feed = transit.FeedMessage.toObject(message, {
    longs: Number,
  }) as FeedObject

  const vehicles = (feed.entity ?? [])
    .filter((e) => e.vehicle?.position)
    .map((e) => {
      const v = e.vehicle ?? {}
      const pos = v.position ?? {}
      const trip = v.trip ?? {}
      const veh = v.vehicle ?? {}
      const latitude = Number(pos.latitude ?? 0)
      const longitude = Number(pos.longitude ?? 0)

      const tripId = (trip.tripId ?? trip.trip_id ?? '') as string

      // Try to get route information from GTFS data
      let routeNumber: string | undefined

      // First try to find route using tripId in tripToRouteMap
      const routeId = routeData.tripToRouteMap[tripId]
      if (routeId) {
        // Find route short name from routes data
        const route = routeData.routes.find((r) => r.route_id === routeId)
        if (route) {
          routeNumber = route.route_short_name
        }
      }

      // Fallback: extract number from tripId if no route found
      if (!routeNumber) {
        const routeMatch = tripId.match(/block_(\d+)_/)
        routeNumber = routeMatch ? routeMatch[1] : (veh.id ?? undefined)
      }

      return {
        id: e.id ?? veh.id ?? `vehicle_${Math.random()}`,
        latitude,
        longitude,
        bearing: Number(pos.bearing ?? 0),
        tripId,
        routeId: (trip.routeId ?? trip.route_id ?? '') as string,
        vehicleId: routeNumber,
        timestamp:
          Number(v.timestamp ?? feed.header?.timestamp ?? 0) || undefined,
        mode,
      }
    })
    .filter((v) => v.latitude !== 0 && v.longitude !== 0)
  return vehicles
}

export async function GET() {
  try {
    // Get route mapping first
    const routeData = await getRouteMapping()

    const base = 'https://gtfs.ztp.krakow.pl'
    const urls = [
      { url: `${base}/VehiclePositions_A.pb`, mode: 'bus' as const },
      { url: `${base}/VehiclePositions_T.pb`, mode: 'tram' as const },
    ]

    const results = await Promise.allSettled(
      urls.map(({ url, mode }) => getVehiclesFromFeed(url, mode, routeData)),
    )

    const vehicles = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value)

    return NextResponse.json(vehicles, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching GTFS vehicle positions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle positions' },
      { status: 500 },
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
