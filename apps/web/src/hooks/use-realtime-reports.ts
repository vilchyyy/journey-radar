'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import { useQuery } from 'convex/react'

export function useRealtimeReports(args?: any[]) {
  // For now, fetch all reports without filtering
  const reports = useQuery(api.reports.getReports)
  const loading = reports === undefined

  return { reports: reports || [], isLoading: loading }
}