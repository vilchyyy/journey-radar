'use client'

import { useQuery } from 'convex/react'
import { api } from '@journey-radar/backend/convex/_generated/api'

export function useVehiclePositions() {
  const vehicles = useQuery(api.gtfs.getVehiclePositions)
  const loading = vehicles === undefined

  return { vehicles: vehicles || [], loading }
}