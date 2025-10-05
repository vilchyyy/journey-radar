'use client'

import type { Doc } from '@journey-radar/backend/convex/_generated/dataModel'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ReportVoting } from '@/components/report-voting'
import { Separator } from '@/components/ui/separator'

interface ReportItemProps {
  report: Doc<'reports'> & {
    location: {
      latitude: number
      longitude: number
    }
    transportInfo?: Partial<Doc<'routes'>>
    distance: number
  }
  onDelete?: () => void
}

export function ReportItem({ report, onDelete }: ReportItemProps) {
  const [currentVoteScore, setCurrentVoteScore] = useState(
    (report.upvotes || 0) - (report.downvotes || 0),
  )
  const router = useRouter()
  const isVerified =
    report.status === 'COMMUNITY_VERIFIED' ||
    report.status === 'OFFICIAL_CONFIRMED'
  const formattedDistance = formatDistance(report.distance)
  const formattedDate = formatDate(report._creationTime)

  const handleClick = () => {
    // Build query params to identify the vehicle on the map
    const params = new URLSearchParams()

    if (report.gtfsVehicleId) {
      params.set('vehicleId', report.gtfsVehicleId)
    }
    if (report.gtfsTripId) {
      params.set('tripId', report.gtfsTripId)
    }
    if (report.gtfsRouteId) {
      params.set('routeId', report.gtfsRouteId)
    }
    if (report.routeShortName) {
      params.set('route', report.routeShortName)
    }
    if (report.transportMode) {
      params.set('mode', report.transportMode.toLowerCase())
    }

    // Add location for centering the map
    params.set('lat', report.location.latitude.toString())
    params.set('lng', report.location.longitude.toString())

    router.push(`/map?${params.toString()}`)
  }

  return (
    <div
      className="relative bg-card rounded-2xl border border-primary p-4 shadow-lg cursor-pointer hover:border-primary/80 hover:shadow-xl transition-all"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="capitalize">{report.type.toLowerCase()}</span>
          {report.delayMinutes && (
            <span className="ml-2">{report.delayMinutes} min</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ReportVoting
            reportId={report._id}
            upvotes={report.upvotes || 0}
            downvotes={report.downvotes || 0}
            voteScore={currentVoteScore}
            size="sm"
            onUpdate={(newScore, deleted) => {
              if (deleted) {
                onDelete?.()
              } else {
                setCurrentVoteScore(newScore)
              }
            }}
          />
          <span className="text-sm text-primary font-medium">
            {formattedDistance}
          </span>
        </div>
      </div>
      <div className="w-full flex flex-col justify-center mt-2 p-2">
        <h3 className="font-semibold text-foreground mb-1">
          {report.transportInfo?.source && report.transportInfo?.destination
            ? `${report.transportInfo.source} - ${report.transportInfo.destination}`
            : `Route ${report.routeShortName || report.transportInfo?.routeNumber || 'Unknown'}`}
        </h3>
        <div className="flex flex-col items-center">
          <Separator className="my-2 bg-primary" />
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
      </div>

      {/* {report.comment && (
        <p className="text-sm text-foreground mt-2">{report.comment}</p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs px-2 py-1 bg-secondary rounded text-secondary-foreground">
          {report.transportMode}
        </span>
        {report.transportInfo.routeNumber && (
          <span className="text-xs px-2 py-1 bg-secondary rounded text-secondary-foreground">
            Line {report.transportInfo.routeNumber}
          </span>
        )}
      </div> */}
      <div className="absolute bottom-2 right-2 flex justify-end">
        {isVerified ? (
          <CheckCircle2
            size={'1.5em'}
            className=" text-primary flex-shrink-0"
          />
        ) : (
          <AlertCircle
            size={'1.5em'}
            className=" text-muted-foreground flex-shrink-0"
          />
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
