/** biome-ignore-all lint/correctness/noChildrenProp: <temp> */
'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import type { Id } from '@journey-radar/backend/convex/_generated/dataModel'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertCircle,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const REPORT_TYPES = [
  { value: 'DELAY', label: 'Delay' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CROWDED', label: 'Crowded' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'OTHER', label: 'Other' },
] as const

const TRANSPORT_MODES = [
  { value: 'BUS', label: 'Bus' },
  { value: 'TRAIN', label: 'Train' },
  { value: 'TRAM', label: 'Tram' },
] as const

export default function ReportsPage() {
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [searchRadius, setSearchRadius] = useState(5)
  const [searchTerm, setSearchTerm] = useState('')

  // Queries and mutations
  const reports = useQuery(api.reports.findNearbyReports, {
    center: { latitude: 52.2297, longitude: 21.0122 }, // Default to Warsaw center
    radiusKm: searchRadius,
    limit: 50,
  })

  const createReportMutation = useMutation(api.reports.createReport)
  const routes = useQuery(api.routes.getActiveRoutes)
  const searchResults = useQuery(
    api.routes.searchRoutes,
    searchTerm ? { searchTerm } : 'skip',
  )

  // Prepare route options for combobox
  const displayRoutes = searchTerm ? searchResults || [] : routes || []
  const routeOptions =
    displayRoutes?.map((route) => ({
      value: route.routeNumber,
      label: `${route.routeNumber} - ${route.source} to ${route.destination}`,
    })) || []

  // TanStack Form
  const form = useForm({
    defaultValues: {
      type: '',
      transportMode: '',
      route: '',
      comment: '',
      delayMinutes: '',
      latitude: '',
      longitude: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.type || !value.transportMode || !value.route) {
        toast.error('Please fill in all required fields')
        return
      }

      if (!value.latitude || !value.longitude) {
        toast.error('Please provide location coordinates')
        return
      }

      try {
        // Mock user ID - in real app this would come from auth
        const userId = 'j97cg73v7qd09gfyj2e412h49s7rtqf0' as Id<'users'>

        // Find route ID from route number
        const selectedRoute = routes?.find((r) => r.routeNumber === value.route)
        if (!selectedRoute) {
          toast.error('Please select a valid route')
          return
        }

        await createReportMutation({
          userId,
          type: value.type as
            | 'DELAY'
            | 'CANCELLED'
            | 'CROWDED'
            | 'ACCIDENT'
            | 'OTHER',
          location: {
            latitude: parseFloat(value.latitude),
            longitude: parseFloat(value.longitude),
          },
          transportMode: value.transportMode as 'BUS' | 'TRAIN' | 'TRAM',
          route: selectedRoute._id,
          comment: value.comment || undefined,
          delayMinutes: value.delayMinutes
            ? parseInt(value.delayMinutes, 10)
            : undefined,
        })

        // Reset form
        form.reset()
        toast.success('Report submitted successfully!')
      } catch (error) {
        console.error('Error creating report:', error)
        toast.error('Failed to submit report. Please try again.')
      }
    },
  })

  // Get user's current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setFieldValue('latitude', position.coords.latitude.toString())
        form.setFieldValue('longitude', position.coords.longitude.toString())
        setIsGettingLocation(false)
        toast.success('Location retrieved successfully!')
      },
      (error) => {
        console.error('Error getting location:', error)
        setIsGettingLocation(false)
        toast.error('Failed to get location. Please enter manually.')
      },
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNVERIFIED':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMMUNITY_VERIFIED':
        return 'bg-blue-100 text-blue-800'
      case 'OFFICIAL_CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DELAY':
        return <Clock className="h-4 w-4" />
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4" />
      case 'CROWDED':
        return <Users className="h-4 w-4" />
      case 'ACCIDENT':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Report Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Submit a Report
            </CardTitle>
            <CardDescription>
              Report transport issues at your current location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
              className="space-y-4"
            >
              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="flex gap-2">
                  <form.Field
                    name="latitude"
                    children={(field) => (
                      <div className="flex-1">
                        <Input
                          placeholder="Latitude"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          step="any"
                          required
                        />
                      </div>
                    )}
                  />
                  <form.Field
                    name="longitude"
                    children={(field) => (
                      <div className="flex-1">
                        <Input
                          placeholder="Longitude"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          step="any"
                          required
                        />
                      </div>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                  >
                    {isGettingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <Label>Report Type</Label>
                <form.Field
                  name="type"
                  children={(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Transport Mode */}
              <div className="space-y-2">
                <Label>Transport Mode</Label>
                <form.Field
                  name="transportMode"
                  children={(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSPORT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Route */}
              <div className="space-y-2">
                <Label>Route</Label>
                <form.Field
                  name="route"
                  children={(field) => (
                    <Combobox
                      options={routeOptions}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                      placeholder="Search and select route..."
                      className="w-full"
                      onSearch={setSearchTerm}
                      searchTerm={searchTerm}
                    />
                  )}
                />
              </div>

              {/* Delay Minutes */}
              <form.Subscribe
                selector={(state) => state.values.type === 'DELAY'}
                children={(showDelay) =>
                  showDelay ? (
                    <div className="space-y-2">
                      <Label>Delay Minutes</Label>
                      <form.Field
                        name="delayMinutes"
                        children={(field) => (
                          <Input
                            type="number"
                            placeholder="e.g., 15"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            min="1"
                          />
                        )}
                      />
                    </div>
                  ) : null
                }
              />

              {/* Comment */}
              <div className="space-y-2">
                <Label>Comment (Optional)</Label>
                <form.Field
                  name="comment"
                  children={(field) => (
                    <Textarea
                      placeholder="Provide additional details..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      rows={3}
                    />
                  )}
                />
              </div>

              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Submit Report
                  </Button>
                )}
              />
            </form>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Reports
            </CardTitle>
            <CardDescription>
              Reports within {searchRadius}km of Warsaw center
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Radius control */}
              <div className="flex items-center gap-4">
                <Label htmlFor="radius">Search radius:</Label>
                <Select
                  value={searchRadius.toString()}
                  onValueChange={(value) =>
                    setSearchRadius(parseInt(value, 10))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 km</SelectItem>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="25">25 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reports list */}
              {reports === undefined ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No reports found in this area. Be the first to report!
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reports.map((report) => (
                    <div
                      key={report._id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(report.type)}
                          <span className="font-medium capitalize">
                            {report.type.toLowerCase()}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}
                        >
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>
                          {report.transportMode}{' '}
                          {report.route
                            ? `Route ${report.route.routeNumber}`
                            : 'Unknown route'}
                        </p>
                        {report.route && (
                          <p>
                            {report.route.source} to {report.route.destination}
                          </p>
                        )}
                        {report.delayMinutes && (
                          <p>Delay: {report.delayMinutes} minutes</p>
                        )}
                      </div>

                      {report.comment && (
                        <p className="text-sm">{report.comment}</p>
                      )}

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {report.location.latitude.toFixed(4)},{' '}
                          {report.location.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
