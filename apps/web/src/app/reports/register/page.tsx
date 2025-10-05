/** biome-ignore-all lint/correctness/noChildrenProp: <no time> */
/** biome-ignore-all lint/correctness/useUniqueElementIds: <no time> */
'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import { useForm } from '@tanstack/react-form'
import { useMutation } from 'convex/react'
import { Loader2, MapPin, Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Constants
const REPORT_TYPES = [
  { value: 'DELAY', label: 'Delay' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CROWDED', label: 'Crowded' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'OTHER', label: 'Other' },
] as const

interface ClosestTrip {
  tripId: string
  routeId: string
  routeShortName: string
  mode: string
  vehicleId: string
  currentLocation: {
    latitude: number
    longitude: number
  }
  distance: number
  bearing: number
  lastUpdate: number
}

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State for closest trips and user location
  const [closestTrips, setClosestTrips] = useState<ClosestTrip[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string>('')

  // Convex mutations
  const createReport = useMutation(api.reports.createReport)

  // Get pre-filled values from URL parameters
  const prefillMode = searchParams.get('mode')
  const prefillRoute = searchParams.get('route')
  const prefillTripId = searchParams.get('tripId')
  const prefillVehicleId = searchParams.get('vehicleId')

  // Get current date and time for max values (can't select future)
  const now = new Date()
  const maxDate = now.toISOString().split('T')[0] // Today
  const maxTime = now.toTimeString().slice(0, 8) // Current time

  // Form with TanStack Form
  const form = useForm({
    defaultValues: {
      date: maxDate, // Default to today
      time: maxTime, // Default to current time
      location: 'Using current location',
      transportMode: prefillMode ? prefillMode.toUpperCase() : '',
      tripId: prefillTripId || '',
      routeShortName: prefillRoute || '',
      delayReason: '',
      delayDuration: '',
    },
    onSubmit: async ({ value }) => {
      try {
        // Validate that date/time is not in the future
        const selectedDateTime = new Date(`${value.date}T${value.time}`)
        const currentDateTime = new Date()

        if (selectedDateTime > currentDateTime) {
          toast.error('Report cannot be for a future date and time')
          return
        }

        // Find the selected trip to get route information
        const selectedTrip = closestTrips.find(
          (trip) => trip.tripId === value.tripId,
        )
        if (!selectedTrip && !prefillTripId) {
          toast.error('Please select a valid trip')
          return
        }

        // Ensure we have a location
        if (!userLocation) {
          toast.error('Location is required to submit a report')
          return
        }

        // Determine delay minutes
        const delayMinutes =
          value.delayReason === 'DELAY' && value.delayDuration
            ? parseInt(value.delayDuration, 10)
            : undefined

        // Create the report with anonymous user (no auth required)
        const reportId = await createReport({
          isAnonymous: true, // Anonymous reporting
          type: value.delayReason as
            | 'DELAY'
            | 'CANCELLED'
            | 'CROWDED'
            | 'ACCIDENT'
            | 'OTHER',
          location: {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
          },
          transportMode: (
            selectedTrip?.mode || value.transportMode
          ).toUpperCase() as 'BUS' | 'TRAIN' | 'TRAM',
          gtfsRouteId: selectedTrip?.routeId,
          gtfsTripId: value.tripId,
          gtfsVehicleId:
            selectedTrip?.vehicleId || prefillVehicleId || undefined,
          routeShortName: selectedTrip?.routeShortName || value.routeShortName,
          comment: undefined, // Could add a comment field in the future
          delayMinutes,
        })

        console.log('Report created successfully with ID:', reportId)

        form.reset()
        toast.success('Report submitted successfully!')
        router.push('/reports') // Redirect to reports page to see the new report
      } catch (error) {
        console.error('Error creating report:', error)
        toast.error('Failed to submit report. Please try again.')
      }
    },
  })

  // Get user location and fetch closest trips
  const getUserLocationAndFetchTrips = async () => {
    setLoadingTrips(true)

    try {
      let location = userLocation

      // Get user location if not already available
      if (!location) {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              })
            },
          )

          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(location)
        } else {
          // Fallback to Kraków center
          location = { lat: 50.0614, lng: 19.9383 }
          setUserLocation(location)
        }
      }

      // Fetch closest trips
      const response = await fetch('/api/gtfs/closest-trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          limit: 10,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setClosestTrips(data.trips || [])
      } else {
        console.error('Failed to fetch closest trips')
        toast.error('Failed to load nearby trips')
      }
    } catch (error) {
      console.error('Error getting location or fetching trips:', error)
      toast.error('Failed to get location or load trips')
    } finally {
      setLoadingTrips(false)
    }
  }

  // Load closest trips on component mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run on mount
  useEffect(() => {
    getUserLocationAndFetchTrips()
  }, [])

  // Effect to pre-fill form when URL parameters change and handle transport mode inference
  useEffect(() => {
    if (prefillRoute) {
      form.setFieldValue('routeShortName', prefillRoute)
    }
    if (prefillTripId) {
      setSelectedTripId(prefillTripId)
      form.setFieldValue('tripId', prefillTripId)
      // Find the trip to infer transport mode
      const trip = closestTrips.find((t) => t.tripId === prefillTripId)
      if (trip) {
        form.setFieldValue('transportMode', trip.mode.toUpperCase())
      } else if (prefillMode) {
        form.setFieldValue('transportMode', prefillMode.toUpperCase())
      }
    }
  }, [prefillMode, prefillRoute, prefillTripId, form, closestTrips])

  // Prepare trip options for selection
  const tripOptions = closestTrips.map((trip) => ({
    value: trip.tripId,
    label: `${trip.routeShortName} (${trip.mode}) - ${trip.distance}km away`,
    trip: trip,
  }))

  // Get selected trip for display
  const selectedTrip = closestTrips.find(
    (trip) => trip.tripId === selectedTripId,
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Menu className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-xl font-semibold text-foreground">
              Reports Registration
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Pre-selected Trip Notice */}
      {prefillTripId && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mx-4 max-w-md">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                prefillMode === 'tram' ? 'bg-green-500' : 'bg-blue-500'
              }`}
            >
              {prefillRoute}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Reporting issue for Route {prefillRoute}
              </p>
              <p className="text-xs text-blue-700">
                Trip ID: {prefillTripId.slice(0, 12)}...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="max-w-md mx-auto px-4 py-4 space-y-4 "
      >
        {/* Timing Section */}
        <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Timing</h2>
          <div className="space-y-3">
            <form.Field
              name="date"
              children={(field) => (
                <div className="relative">
                  <Label
                    htmlFor="date"
                    className="block text-sm font-medium mb-2"
                  >
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    placeholder="Choose Date (DD-MM-YYYY)"
                    max={maxDate}
                    className="w-full h-12 rounded-xl border-border text-primary placeholder:text-muted-foreground"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />
            <form.Field
              name="time"
              children={(field) => (
                <div className="relative">
                  <Label
                    htmlFor="time"
                    className="block text-sm font-medium mb-2"
                  >
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    placeholder="Choose Time"
                    className="w-full h-12 rounded-xl border-border text-primary placeholder:text-muted-foreground"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Report must be for a past or current time
                  </p>
                </div>
              )}
            />
          </div>
        </div>

        {/* Location & Trip Details */}
        <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Location & Trip Details
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="block text-sm font-medium mb-2">
                Report Location
              </Label>
              <div className="p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Using your current location
                    </p>
                    {userLocation ? (
                      <p className="text-xs text-muted-foreground">
                        {userLocation.lat.toFixed(4)},{' '}
                        {userLocation.lng.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Getting location...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Select Trip
              </Label>
              {loadingTrips ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Finding nearby trips...
                  </span>
                </div>
              ) : tripOptions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tripOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedTripId === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                      }`}
                      onClick={() => {
                        console.log('Trip selected:', option.value)
                        setSelectedTripId(option.value)
                        form.setFieldValue('tripId', option.value)
                        form.setFieldValue(
                          'routeShortName',
                          option.trip.routeShortName,
                        )
                        form.setFieldValue(
                          'transportMode',
                          option.trip.mode.toUpperCase(),
                        )
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              option.trip.mode === 'tram'
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                          >
                            {option.trip.routeShortName}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Route {option.trip.routeShortName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {option.trip.mode.charAt(0).toUpperCase() +
                                option.trip.mode.slice(1)}{' '}
                              • {option.trip.distance}km away
                            </p>
                          </div>
                        </div>
                        {selectedTripId === option.value && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No nearby trips found
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getUserLocationAndFetchTrips}
                    className="mt-2"
                  >
                    Refresh Location
                  </Button>
                </div>
              )}

              {/* Selected Trip Display */}
              {selectedTrip && (
                <div className="mt-3 p-3 rounded-xl border border-primary bg-primary/5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        selectedTrip.mode === 'tram'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                    >
                      {selectedTrip.routeShortName}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Route {selectedTrip.routeShortName} (
                        {selectedTrip.mode.toUpperCase()})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Selected trip • {selectedTrip.distance}km away from you
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Information */}
        <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Report Information
          </h2>
          <div className="space-y-3">
            <form.Field
              name="delayReason"
              children={(field) => (
                <div>
                  <Label
                    htmlFor="delayReason"
                    className="block text-sm font-medium mb-2"
                  >
                    Report Type
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl border-border text-primary">
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
                </div>
              )}
            />

            <form.Subscribe
              selector={(state) => state.values.delayReason === 'DELAY'}
              children={(showDelay) =>
                showDelay ? (
                  <form.Field
                    name="delayDuration"
                    children={(field) => (
                      <div>
                        <Label
                          htmlFor="delayDuration"
                          className="block text-sm font-medium mb-2"
                        >
                          Delay Duration (minutes)
                        </Label>
                        <Input
                          id="delayDuration"
                          type="number"
                          placeholder="e.g., 15"
                          className="w-full h-12 rounded-xl border-border text-primary placeholder:text-muted-foreground"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          min="1"
                        />
                      </div>
                    )}
                  />
                ) : null
              }
            />
          </div>
        </div>

        {/* Submit Button */}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold  rounded-2xl"
              disabled={
                !canSubmit || isSubmitting || !form.getFieldValue('tripId')
              }
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : (
                'Submit Report'
              )}
            </Button>
          )}
        />
      </form>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterPageContent />
    </Suspense>
  )
}
