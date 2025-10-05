import { decode } from '@here/flexpolyline'

export interface RouteCoordinate {
  lat: number
  lng: number
}

export interface RouteRequest {
  origin: RouteCoordinate
  destination: RouteCoordinate
  return?: string[]
  // Ask the API for alternative routes; can be boolean or a number of alternatives
  alternatives?: boolean | number
}

export interface RouteResponse {
  routes: Route[]
}

export interface Route {
  id: string
  sections: RouteSection[]
}

export interface RouteSection {
  id: string
  // HERE may include a section type like 'transit' or 'pedestrian'
  type?: string
  departure: RoutePoint
  arrival: RoutePoint
  polyline: string
  geometry: RouteCoordinate[]
  transport?: {
    mode: string
    name?: string
    category?: string
    color?: string
    textColor?: string
    headsign?: string
    shortName?: string
    longName?: string
  }
  // Optional extras frequently returned from HERE
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
}

export interface RoutePoint {
  place: {
    location: RouteCoordinate
  }
  time: string
}

export async function calculateRoute(
  request: RouteRequest,
): Promise<RouteResponse> {
  const {
    origin,
    destination,
    return: returnParams = [
      'polyline',
      'travelSummary',
      'actions',
      'intermediate',
    ],
    alternatives,
  } = request

  const baseUrl =
    process.env.HERE_API_BASE_URL || 'https://transit.router.hereapi.com/v8'
  const apiKey = process.env.HERE_API_TOKEN || ''

  const url = new URL(`${baseUrl}/routes`)
  url.searchParams.append('origin', `${origin.lat},${origin.lng}`)
  url.searchParams.append(
    'destination',
    `${destination.lat},${destination.lng}`,
  )
  url.searchParams.append('return', returnParams.join(','))
  url.searchParams.append('apikey', apiKey)
  if (typeof alternatives !== 'undefined') {
    // HERE APIs accept either a boolean or a count for alternatives (varies by product);
    // we set the parameter directly. Fallback to 'true' when boolean.
    url.searchParams.append(
      'alternatives',
      typeof alternatives === 'number' ? String(alternatives) : 'true',
    )
  }

  console.log('Return params:', returnParams)
  console.log('Full URL:', url.toString())

  try {
    console.log('Making request to:', url.toString())
    console.log(
      'HERE credentials:',
      apiKey ? 'Using API key as parameter' : 'No credentials provided',
    )

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HERE API error response:', errorText)
      throw new Error(
        `HERE API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const data = await response.json()

    // Decode polylines for each section
    if (data.routes) {
      data.routes.forEach((route: Route) => {
        if (route.sections) {
          route.sections.forEach((section: RouteSection) => {
            if (section.polyline) {
              try {
                section.geometry = decode(section.polyline).polyline.map(
                  ([lat, lng]) => ({ lat, lng }),
                )
              } catch (error) {
                console.error('Error decoding polyline:', error)
                section.geometry = []
              }
            }
          })
        }
      })
    }

    return data
  } catch (error) {
    console.error('Route calculation error:', error)
    throw error
  }
}

export async function getRouteGeometry(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
): Promise<RouteCoordinate[]> {
  try {
    const routeResponse = await calculateRoute({
      origin,
      destination,
      return: ['polyline', 'travelSummary', 'actions', 'intermediate'],
    })

    if (!routeResponse.routes || routeResponse.routes.length === 0) {
      return []
    }

    const firstRoute = routeResponse.routes[0]
    if (!firstRoute.sections || firstRoute.sections.length === 0) {
      return []
    }

    // Combine geometry from all sections
    const combinedGeometry: RouteCoordinate[] = []
    firstRoute.sections.forEach((section) => {
      if (section.geometry) {
        combinedGeometry.push(...section.geometry)
      }
    })

    return combinedGeometry
  } catch (error) {
    console.error('Error getting route geometry:', error)
    return []
  }
}
