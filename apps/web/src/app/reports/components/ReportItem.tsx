'use client'

import type { Doc } from '@journey-radar/backend/convex/_generated/dataModel'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface ReportItemProps {
  report: Doc<'reports'> & {
    location: {
      latitude: number
      longitude: number
    }
    transportInfo: Partial<Doc<'routes'>>
    distance: number
  }
}

export function ReportItem({ report }: ReportItemProps) {
  const isVerified =
    report.status === 'COMMUNITY_VERIFIED' ||
    report.status === 'OFFICIAL_CONFIRMED'
  const formattedDistance = formatDistance(report.distance)
  const formattedDate = formatDate(report._creationTime)

  return (
    <div className="bg-white rounded-2xl border border-[#48c9b0] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="capitalize">{report.type.toLowerCase()}</span>
          {report.delayMinutes && (
            <span className="ml-2">{report.delayMinutes} min</span>
          )}
        </div>
        <span className="text-sm text-[#48c9b0] font-medium">
          {formattedDistance}
        </span>
      </div>
      <div className="w-full flex flex-col justify-center items-center my-2 p-2">
        <h3 className="font-semibold text-gray-900 mb-1">
          {report.transportInfo.source && report.transportInfo.destination
            ? `${report.transportInfo.source} - ${report.transportInfo.destination}`
            : `Route ${report.transportInfo.routeNumber || 'Unknown'}`}
        </h3>
        <Separator className="my-2 bg-[#48c9b0]" />
        <p className="text-sm text-gray-500">{formattedDate}</p>
      </div>

      {/* {report.comment && (
        <p className="text-sm text-gray-700 mt-2">{report.comment}</p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
          {report.transportMode}
        </span>
        {report.transportInfo.routeNumber && (
          <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
            Line {report.transportInfo.routeNumber}
          </span>
        )}
      </div> */}
      <div className="w-full flex justify-end">
        {isVerified ? (
          <CheckCircle2 className="w-5 h-5 text-[#48c9b0] flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </div>
    </div>
  )
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
