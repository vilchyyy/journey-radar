'use client'

import { api } from '@journey-radar/backend/convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { ChevronUp, Database, Loader2, Menu } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ReportItem } from './components/ReportItem'

type FilterItem =
  | { type: 'Route'; value: string }
  | { type: 'Distance'; value: number }
  | { type: 'Status'; value: string }

export default function ReportsPage() {
  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([])
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const searchRadius = 50

  const handleReportDelete = (reportId: string) => {
    // Handle report deletion (could refresh the data or update local state)
    console.log('Report deleted:', reportId)
  }

  // Default location (Warsaw) - will be replaced with user's actual location
  const currentLocation = userLocation || {
    latitude: 52.2297,
    longitude: 21.0122,
  }

  // Derive filter parameters from active filters
  const routeFilter = activeFilters.find((f) => f.type === 'Route')?.value as
    | string
    | undefined
  const statusFilter = activeFilters.find((f) => f.type === 'Status')?.value as
    | string
    | undefined
  const maxDistanceKm = activeFilters.find((f) => f.type === 'Distance')
    ?.value as number | undefined

  // Queries and mutations
  const reports = useQuery(api.reports.findNearbyReportsFiltered, {
    center: currentLocation, // Default to Warsaw center
    radiusKm: maxDistanceKm || searchRadius,
    limit: 50,
    routeFilter,
    statusFilter,
    maxDistanceKm,
  })

  const addFilter = (filter: FilterItem) => {
    setActiveFilters((prev) => {
      // Remove existing filter of same type if exists
      const filtered = prev.filter((f) => f.type !== filter.type)
      return [...filtered, filter]
    })
  }

  const removeFilter = (filterType: FilterItem['type']) => {
    setActiveFilters((prev) => prev.filter((f) => f.type !== filterType))
  }

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting user location:', error)
          // Keep default location if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-foreground">
              Reports/Incidents
            </h1>
            <div className="w-10" />
          </div>

          {/* Filter Tags */}
          <div className="flex gap-2 flex-wrap justify-end items-center">
            <div className="flex gap-2 justify-end">
              {activeFilters.map((filter) => (
                <div
                  key={filter.type}
                  className="flex justify-center items-center h-10 px-3 bg-card rounded-full border border-primary text-primary hover:bg-muted"
                >
                  {filter.type}: {filter.value}
                  <button
                    onClick={() => removeFilter(filter.type)}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
              <FiltersDrawer onAddFilter={addFilter} />
            </div>
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
            <ReportItem
              key={report._id}
              report={report}
              onDelete={() => handleReportDelete(report._id)}
            />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Link href="/reports/register">
        <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors">
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

function FiltersDrawer({
  onAddFilter,
}: {
  onAddFilter: (filter: FilterItem) => void
}) {
  const [routeValue, setRouteValue] = useState('')
  const [distanceValue, setDistanceValue] = useState(15)
  const [statusValue, setStatusValue] = useState('')

  const handleAddRouteFilter = () => {
    if (routeValue.trim()) {
      onAddFilter({ type: 'Route', value: routeValue.trim() })
      setRouteValue('')
    }
  }

  const handleAddDistanceFilter = () => {
    onAddFilter({ type: 'Distance', value: distanceValue })
  }

  const handleAddStatusFilter = () => {
    if (statusValue) {
      onAddFilter({ type: 'Status', value: statusValue })
      setStatusValue('')
    }
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4"
        >
          Filters <ChevronUp size={'0.25em'} />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>
            Set filters for reports/incidents.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="bg-card rounded-2xl border border-primary p-4 shadow-lg">
            <label className="block text-sm font-medium mb-2">Route</label>
            <div className="flex gap-2">
              <Input
                value={routeValue}
                onChange={(e) => setRouteValue(e.target.value)}
                placeholder="Enter route number"
                onKeyDown={(e) => e.key === 'Enter' && handleAddRouteFilter()}
              />
              <Button onClick={handleAddRouteFilter} size="sm">
                Add
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-card rounded-2xl border border-primary p-4 shadow-lg">
            <label className="block text-sm font-medium mb-2">
              Distance (km)
            </label>
            <div className="flex justify-between">
              <div>0km</div>
              <div>100km</div>
            </div>
            <Slider
              value={[distanceValue]}
              onValueChange={(value) => setDistanceValue(value[0])}
              max={100}
              step={5}
            />
            <div className="text-sm text-muted-foreground">
              Current: {distanceValue}km
            </div>
            <Button onClick={handleAddDistanceFilter} size="sm">
              Add Distance Filter
            </Button>
          </div>

          <div className="flex flex-col gap-2 bg-card rounded-2xl border border-primary p-4 shadow-lg">
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={statusValue} onValueChange={setStatusValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                  <SelectItem value="COMMUNITY_VERIFIED">
                    Community Verified
                  </SelectItem>
                  <SelectItem value="OFFICIAL_CONFIRMED">
                    Official Confirmed
                  </SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {statusValue && (
              <Button onClick={handleAddStatusFilter} size="sm">
                Add Status Filter
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
