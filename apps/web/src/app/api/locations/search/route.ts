import { type NextRequest, NextResponse } from 'next/server'

interface LocationSearchRequest {
  query: string
  limit?: number
  types?: string[]
  centerLat?: number
  centerLng?: number
}

interface Location {
  id: string
  title: string
  address?: {
    label: string
    country: string
    state?: string
    county?: string
    city: string
    district?: string
    street: string
    postalCode?: string
    houseNumber?: string
  }
  position: {
    lat: number
    lng: number
  }
  distance?: number
  categories?: Array<{
    id: string
    name: string
    primary?: boolean
  }>
  resultType: string
  contacts?: {
    phone?: Array<{ value: string }>
    www?: Array<{ value: string }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LocationSearchRequest = await request.json()
    const {
      query,
      limit = 10,
      types = ['place', 'address', 'poi', 'street', 'administrativeArea'],
      centerLat = 50.0614, // Default to Kraków center
      centerLng = 19.9383,
    } = body

    // Validate request
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 },
      )
    }

    // HERE API Configuration
    const HERE_API_KEY = process.env.HERE_API_KEY || process.env.HERE_API_TOKEN
    if (!HERE_API_KEY) {
      console.error('HERE_API_KEY/HERE_API_TOKEN not configured')
      return NextResponse.json(
        { error: 'Location search service not available' },
        { status: 500 },
      )
    }

    // Search for locations using HERE Discover API with center position
    const searchUrl = `https://discover.search.hereapi.com/v1/discover?at=${centerLat},${centerLng}&q=${encodeURIComponent(query)}&limit=${limit}&apiKey=${HERE_API_KEY}`

    const response = await fetch(searchUrl, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9,pl;q=0.8',
      },
    })
    if (!response.ok) {
      const status = response.status
      const errorBody = await response.text()

      console.error('HERE location search error', {
        status,
        body: errorBody,
        url: searchUrl,
      })

      if (status === 429) {
        return NextResponse.json(
          {
            error:
              'Location provider is rate limiting requests. Please wait a bit and try again.',
            providerStatus: status,
          },
          { status: 429 },
        )
      }

      return NextResponse.json(
        {
          error: 'Location provider returned an error. Please try again later.',
          providerStatus: status,
        },
        { status: 502 },
      )
    }

    const data = await response.json()

    // Transform HERE API response to our format
    const locations: Location[] =
      data.items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        address: {
          label: item.address.label,
          country: item.address.countryName,
          state: item.address.state,
          county: item.address.county,
          city: item.address.city,
          district: item.address.district,
          street: item.address.street,
          postalCode: item.address.postalCode,
          houseNumber: item.address.houseNumber,
        },
        position: {
          lat: item.position.lat,
          lng: item.position.lng,
        },
        distance: item.distance,
        categories: item.categories,
        resultType: item.resultType,
        contacts: item.contacts,
      })) || []

    return NextResponse.json({
      query,
      locations,
      count: locations.length,
      center: { lat: centerLat, lng: centerLng },
    })
  } catch (error) {
    console.error('Location search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 },
    )
  }

  // Forward to POST endpoint
  const req = new NextRequest('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  })

  return await POST(req)
}
