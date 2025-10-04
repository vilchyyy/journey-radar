import { decode } from '@here/flexpolyline'

export interface RouteCoordinate {
  lat: number
  lng: number
}

export interface RouteRequest {
  origin: RouteCoordinate
  destination: RouteCoordinate
  return?: string[]
  transportModes?: string[]
  alternatives?: number
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
  departure: RoutePoint
  arrival: RoutePoint
  polyline: string
  geometry: RouteCoordinate[]
  transport: {
    mode: string
  }
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
    transportModes,
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

  const alternativesParam = Math.max(alternatives ?? 5, 5)
  url.searchParams.append('alternatives', alternativesParam.toString())

  if (transportModes && transportModes.length > 0) {
    const modesParam = transportModes.join(',')
    url.searchParams.append('modes', modesParam)
    url.searchParams.append('transportModes', modesParam)
  }

  console.log('Return params:', returnParams)
  console.log('Full URL:', url.toString())
  if (transportModes && transportModes.length > 0) {
    console.log('Transport modes filter:', transportModes)
  }

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
