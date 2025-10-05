'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import { useQuery } from 'convex/react'

export function useVehiclePositions() {
  const vehicles = useQuery(api.gtfs.getVehiclePositions)
  const loading = vehicles === undefined

  return { vehicles: vehicles || [], loading }
}
