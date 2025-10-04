export interface VehiclePosition {
  id: string
  latitude: number
  longitude: number
  bearing: number
  tripId: string
  routeId: string
  vehicleId?: string
  routeLongName?: string
  routeShortName?: string
  timestamp?: number
  mode?: 'bus' | 'tram'
}
export async function fetchGTFSVehiclePositions(): Promise<VehiclePosition[]> {
  try {
    const response = await fetch('/api/gtfs/vehicle-positions')

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const vehicles = (await response.json()) as VehiclePosition[]
    return vehicles
  } catch (error) {
    console.error('Error fetching GTFS vehicle positions:', error)
    return []
  }
}
