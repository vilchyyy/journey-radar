'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import { useQuery } from 'convex/react'
import { Loader2, Menu } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReportItem } from './components/ReportItem'

export default function ReportsPage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([
    'Time',
    'Recents',
  ])
  const searchRadius = 50
  const currentLocation = {
    latitude: 52.2297,
    longitude: 21.0122,
  }

  // Queries and mutations
  const reports = useQuery(api.reports.findNearbyReports, {
    center: currentLocation, // Default to Warsaw center
    radiusKm: searchRadius,
    limit: 50,
  })

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter((f) => f !== filter))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button className="w-10 h-10 rounded-full bg-[#48c9b0] flex items-center justify-center text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Reports/Incidents
            </h1>
            <div className="w-10" />
          </div>

          {/* Filter Tags */}
          <div className="flex gap-2 flex-wrap justify-end items-center">
            {activeFilters.map((filter) => (
              <div
                key={filter}
                className="flex justify-center items-center h-8 px-3 bg-white rounded-full border !border-[#48c9b0] text-[#48c9b0] hover:bg-gray-50"
              >
                {filter}
                <button
                  onClick={() => removeFilter(filter)}
                  className="ml-1 hover:text-gray-900"
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 bg-[#48c9b0] text-white hover:bg-[#3fb5a3] rounded-full px-3"
            >
              Filters +
            </Button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-24">
        {reports === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No reports found in this area. Be the first to report!
          </p>
        ) : (
          reports.map((report) => (
            <ReportItem key={report._id} report={report} />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Link href="/reports/register">
        <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#48c9b0] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-[#3fb5a3] transition-colors">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </Link>
    </div>
  )
}
