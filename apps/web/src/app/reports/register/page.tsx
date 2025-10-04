/** biome-ignore-all lint/correctness/noChildrenProp: <no time> */
/** biome-ignore-all lint/correctness/useUniqueElementIds: <no time> */
'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import type { Id } from '@journey-radar/backend/convex/_generated/dataModel'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from 'convex/react'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

// Constants
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

export default function RegisterPage() {
  const router = useRouter()

  // Convex mutations and queries
  const createReport = useMutation(api.reports.createReport)
  const routes = useQuery(api.routes.getActiveRoutes)

  // Form with TanStack Form
  const form = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD for input
      time: new Date().toTimeString().slice(0, 8),
      location: '',
      transportMode: '',
      route: '',
      direction: '',
      delayReason: '',
      delayDuration: '',
    },
    onSubmit: async ({ value }) => {
      try {
        // Convert date format for storage
        const inputDate = value.date // YYYY-MM-DD from input
        const [year, month, day] = inputDate.split('-')
        const displayDate = `${day}-${month}-${year}` // DD-MM-YYYY for display

        // Mock user ID - in real app this would come from auth
        const userId = 'j97cg73v7qd09gfyj2e412h49s7rtqf0' as Id<'users'>

        // Find route ID from route number
        const selectedRoute = routes?.find((r) => r.routeNumber === value.route)
        if (!selectedRoute) {
          toast.error('Please select a valid route')
          return
        }

        await createReport({
          userId,
          type: value.delayReason as
            | 'DELAY'
            | 'CANCELLED'
            | 'CROWDED'
            | 'ACCIDENT'
            | 'OTHER',
          location: {
            latitude: 52.2297, // Default Warsaw coordinates - should get from geolocation
            longitude: 21.0122,
          },
          transportMode: value.transportMode as 'BUS' | 'TRAIN' | 'TRAM',
          route: selectedRoute._id,
          comment: value.direction || undefined,
          delayMinutes: value.delayDuration
            ? parseInt(value.delayDuration, 10)
            : undefined,
        })

        form.reset()
        toast.success('Report submitted successfully!')
        router.push('/reports/verify')
      } catch (error) {
        console.error('Error creating report:', error)
        toast.error('Failed to submit report. Please try again.')
      }
    },
  })

  // Prepare route options for combobox
  const routeOptions =
    routes?.map((route) => ({
      value: route.routeNumber,
      label: `${route.routeNumber} - ${route.source} to ${route.destination}`,
    })) || []

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

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24"
      >
        {/* Timing Section */}
        <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Timing</h2>
          <div className="space-y-3">
            <form.Field
              name="date"
              children={(field) => (
                <div className="relative">
                  <Label htmlFor="date" className="block text-sm font-medium mb-2">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    placeholder="Choose Date (DD-MM-YYYY)"
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
                  <Label htmlFor="time" className="block text-sm font-medium mb-2">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    placeholder="Choose Time"
                    className="w-full h-12 rounded-xl border-border text-primary placeholder:text-muted-foreground"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />
          </div>
        </div>

        {/* Location & Route Details */}
        <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Location & Route Details
          </h2>
          <div className="space-y-3">
            <form.Field
              name="location"
              children={(field) => (
                <div>
                  <Label htmlFor="location" className="block text-sm font-medium mb-2">Location</Label>
                  <Input
                    id="location"
                    placeholder="Use Current Location"
                    className="w-full h-12 rounded-xl border-border text-primary placeholder:text-muted-foreground"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />

            <form.Field
              name="transportMode"
              children={(field) => (
                <div>
                  <Label htmlFor="transportMode" className="block text-sm font-medium mb-2">Transport Mode</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl border-border text-primary">
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
                </div>
              )}
            />

            <form.Field
              name="route"
              children={(field) => (
                <div>
                  <Label htmlFor="route" className="block text-sm font-medium mb-2">Route</Label>
                  <Combobox
                    options={routeOptions}
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                    placeholder="Search and select route..."
                    className="w-full"
                  />
                </div>
              )}
            />

            <form.Field
              name="direction"
              children={(field) => (
                <div>
                  <Label htmlFor="direction" className="block text-sm font-medium mb-2">Direction</Label>
                  <Input
                    id="direction"
                    placeholder="Direction or additional details"
                    className="w-full h-12 rounded-xl border-border text-primary placeholder:text-muted-foreground"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />
          </div>
        </div>

        {/* Delay Information */}
        <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Report Information
          </h2>
          <div className="space-y-3">
            <form.Field
              name="delayReason"
              children={(field) => (
                <div>
                  <Label htmlFor="delayReason" className="block text-sm font-medium mb-2">Report Type</Label>
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
                        <Label htmlFor="delayDuration" className="block text-sm font-medium mb-2">
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
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold rounded-2xl"
              disabled={!canSubmit || isSubmitting}
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
