import JSZip from 'jszip'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface Route {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_type: string
}

interface Trip {
  trip_id: string
  route_id: string
}

interface GTFSData {
  routes: Route[]
  trips: Trip[]
}

async function downloadAndParseGTFS(zipUrl: string): Promise<GTFSData> {
  const response = await fetch(zipUrl, {
    headers: { 'User-Agent': 'journey-radar/1.0' },
    next: { revalidate: 3600 }, // Cache for 1 hour
  })

  if (!response.ok) {
    throw new Error(`Failed to download GTFS data: ${response.status}`)
  }

  const zipData = await response.arrayBuffer()
  const zip = await JSZip.loadAsync(zipData)

  // Parse routes.txt
  const routesFile = zip.file('routes.txt')
  if (!routesFile) {
    throw new Error('routes.txt not found in GTFS zip')
  }

  const routesText = await routesFile.textAsync()
  const routesLines = routesText.split('\n').filter((line) => line.trim())
  const routesHeader = routesLines[0]
    .split(',')
    .map((h) => h.trim().replace(/"/g, ''))

  const routes: Route[] = []
  for (let i = 1; i < routesLines.length; i++) {
    const values = routesLines[i]
      .split(',')
      .map((v) => v.trim().replace(/"/g, ''))
    if (values.length >= routesHeader.length) {
      const route: any = {}
      routesHeader.forEach((header, index) => {
        route[header] = values[index] || ''
      })
      routes.push(route as Route)
    }
  }

  // Parse trips.txt
  const tripsFile = zip.file('trips.txt')
  if (!tripsFile) {
    throw new Error('trips.txt not found in GTFS zip')
  }

  const tripsText = await tripsFile.textAsync()
  const tripsLines = tripsText.split('\n').filter((line) => line.trim())
  const tripsHeader = tripsLines[0]
    .split(',')
    .map((h) => h.trim().replace(/"/g, ''))

  const trips: Trip[] = []
  for (let i = 1; i < tripsLines.length; i++) {
    const values = tripsLines[i]
      .split(',')
      .map((v) => v.trim().replace(/"/g, ''))
    if (values.length >= tripsHeader.length) {
      const trip: any = {}
      tripsHeader.forEach((header, index) => {
        trip[header] = values[index] || ''
      })
      trips.push(trip as Trip)
    }
  }

  return { routes, trips }
}

export async function GET() {
  try {
    const base = 'https://gtfs.ztp.krakow.pl'
    const urls = [
      { url: `${base}/GTFS_KRK_A.zip`, mode: 'bus' },
      { url: `${base}/GTFS_KRK_T.zip`, mode: 'tram' },
    ]

    const results = await Promise.allSettled(
      urls.map(async ({ url, mode }) => {
        const data = await downloadAndParseGTFS(url)
        return { ...data, mode }
      }),
    )

    const gtfsData = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value)

    // Combine all routes and trips
    const allRoutes: Route[] = []
    const allTrips: Trip[] = []

    gtfsData.forEach(({ routes, trips }) => {
      allRoutes.push(...routes)
      allTrips.push(...trips)
    })

    // Create route lookup map
    const routeMap = new Map<string, Route>()
    allRoutes.forEach((route) => {
      routeMap.set(route.route_id, route)
    })

    // Create trip to route mapping
    const tripToRouteMap = new Map<string, string>()
    allTrips.forEach((trip) => {
      tripToRouteMap.set(trip.trip_id, trip.route_id)
    })

    // Log some sample data for debugging
    console.log('Sample routes:', allRoutes.slice(0, 5))
    console.log('Sample trips:', allTrips.slice(0, 5))
    console.log(
      'Total routes:',
      allRoutes.length,
      'Total trips:',
      allTrips.length,
    )

    return NextResponse.json(
      {
        routes: allRoutes,
        trips: allTrips,
        routeMap: Object.fromEntries(routeMap),
        tripToRouteMap: Object.fromEntries(tripToRouteMap),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      },
    )
  } catch (error) {
    console.error('Error fetching GTFS routes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GTFS routes' },
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
