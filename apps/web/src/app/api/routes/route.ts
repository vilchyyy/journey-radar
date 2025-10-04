import { type NextRequest, NextResponse } from 'next/server'
import {
  calculateRoute,
  getRouteGeometry,
  type RouteCoordinate,
} from '@/lib/route-service-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const originLat = searchParams.get('originLat')
    const originLng = searchParams.get('originLng')
    const destinationLat = searchParams.get('destinationLat')
    const destinationLng = searchParams.get('destinationLng')
    const returnGeometry = searchParams.get('returnGeometry') === 'true'

    // Validate required parameters
    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters: originLat, originLng, destinationLat, destinationLng',
        },
        { status: 400 },
      )
    }

    const origin: RouteCoordinate = {
      lat: parseFloat(originLat),
      lng: parseFloat(originLng),
    }

    const destination: RouteCoordinate = {
      lat: parseFloat(destinationLat),
      lng: parseFloat(destinationLng),
    }

    // Validate coordinate ranges
    if (
      Number.isNaN(origin.lat) ||
      Number.isNaN(origin.lng) ||
      Number.isNaN(destination.lat) ||
      Number.isNaN(destination.lng)
    ) {
      return NextResponse.json(
        { error: 'Invalid coordinate values' },
        { status: 400 },
      )
    }

    if (returnGeometry) {
      // Return only the geometry coordinates
      const geometry = await getRouteGeometry(origin, destination)
      return NextResponse.json({ geometry })
    } else {
      // Return full route response
      const routeResponse = await calculateRoute({
        origin,
        destination,
        return: ['polyline', 'travelSummary', 'actions', 'intermediate'],
      })
      return NextResponse.json(routeResponse)
    }
  } catch (error) {
    console.error('Route API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, destination, returnGeometry = false } = body

    // Validate request body
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination' },
        { status: 400 },
      )
    }

    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return NextResponse.json(
        {
          error:
            'Invalid coordinate format. Expected {lat, lng} for both origin and destination',
        },
        { status: 400 },
      )
    }

    if (returnGeometry) {
      // Return only the geometry coordinates
      const geometry = await getRouteGeometry(origin, destination)
      return NextResponse.json({ geometry })
    } else {
      // Return full route response
      const routeResponse = await calculateRoute({
        origin,
        destination,
        return: ['polyline', 'travelSummary', 'actions', 'intermediate'],
      })
      return NextResponse.json(routeResponse)
    }
  } catch (error) {
    console.error('Route API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
