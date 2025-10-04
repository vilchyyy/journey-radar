import { decode } from '@here/flexpolyline'

export interface RouteCoordinate {
  lat: number
  lng: number
}

export interface RouteRequest {
  origin: RouteCoordinate
  destination: RouteCoordinate
  return?: string[]
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

class RouteService {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl =
      process.env.HERE_API_BASE_URL || 'https://transit.router.hereapi.com/v8'
    this.apiKey = process.env.HERE_API_TOKEN || ''
  }

  async calculateRoute(request: RouteRequest): Promise<RouteResponse> {
    const { origin, destination, return: returnParams = ['polyline'] } = request

    const url = new URL(`${this.baseUrl}/routes`)
    url.searchParams.append('origin', `${origin.lat},${origin.lng}`)
    url.searchParams.append(
      'destination',
      `${destination.lat},${destination.lng}`,
    )
    url.searchParams.append('return', returnParams.join(','))

    try {
      console.log('Making request to:', url.toString())
      console.log(
        'Using API token:',
        this.apiKey ? 'Token present' : 'Token missing',
      )

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('HERE API error response:', errorText)
        throw new Error(
          `HERE API error: ${response.status} ${response.statusText}`,
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
                    ([lat, lng]: [number, number]) => ({ lat, lng }),
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

  async getRouteGeometry(
    origin: RouteCoordinate,
    destination: RouteCoordinate,
  ): Promise<RouteCoordinate[]> {
    try {
      const routeResponse = await this.calculateRoute({
        origin,
        destination,
        return: ['polyline'],
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
}

export const routeService = new RouteService()
