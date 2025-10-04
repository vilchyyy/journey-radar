import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type TripUpdateFeedObject = {
  header?: { timestamp?: number }
  entity?: Array<{
    id?: string
    tripUpdate?: {
      trip?: {
        tripId?: string
        trip_id?: string
        routeId?: string
        route_id?: string
      }
      vehicle?: { id?: string }
      stopTimeUpdate?: Array<{
        stopId?: string
        stop_id?: string
      }>
    }
  }>
}

async function getTripUpdatesFromFeed(url: string, mode: 'bus' | 'tram') {
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
  }) as TripUpdateFeedObject

  const tripUpdates = (feed.entity ?? [])
    .filter((e) => e.tripUpdate?.trip)
    .map((e) => {
      const tu = e.tripUpdate ?? {}
      const trip = tu.trip ?? {}
      const veh = tu.vehicle ?? {}

      return {
        id: e.id,
        tripId: (trip.tripId ?? trip.trip_id ?? '') as string,
        routeId: (trip.routeId ?? trip.route_id ?? '') as string,
        vehicleId: (veh.id ?? undefined) as string | undefined,
        mode,
      }
    })

  return tripUpdates
}

export async function GET() {
  try {
    const base = 'https://gtfs.ztp.krakow.pl'
    const urls = [
      { url: `${base}/TripUpdates_A.pb`, mode: 'bus' as const },
      { url: `${base}/TripUpdates_T.pb`, mode: 'tram' as const },
    ]

    const results = await Promise.allSettled(
      urls.map(({ url, mode }) => getTripUpdatesFromFeed(url, mode)),
    )

    const tripUpdates = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value)

    // Log first few entries to see the structure
    console.log('TripUpdates sample:', JSON.stringify(tripUpdates.slice(0, 5), null, 2))

    return NextResponse.json(tripUpdates, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching GTFS trip updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trip updates' },
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