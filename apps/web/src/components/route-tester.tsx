'use client'

import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RouteCoordinate } from '@/lib/route-service'
import RouteMap from '@/components/route-map'

interface RouteData {
  routes?: any[]
}

export function RouteTester() {
  const [isLoading, setIsLoading] = useState(false)
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentOrigin, setCurrentOrigin] = useState<RouteCoordinate | null>(null)
  const [currentDestination, setCurrentDestination] = useState<RouteCoordinate | null>(null)

  const form = useForm({
    defaultValues: {
      originLat: '41.79457',
      originLng: '12.25473',
      destinationLat: '41.90096',
      destinationLng: '12.50243',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setError(null)
      setRouteData(null)

      try {
        const origin: RouteCoordinate = {
          lat: parseFloat(value.originLat),
          lng: parseFloat(value.originLng),
        }
        const destination: RouteCoordinate = {
          lat: parseFloat(value.destinationLat),
          lng: parseFloat(value.destinationLng),
        }

        setCurrentOrigin(origin)
        setCurrentDestination(destination)

        const response = await fetch('/api/routes/enriched', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin,
            destination,
            maxRadiusMeters: 500,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to calculate route')
        }

        const data = await response.json()
        setRouteData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HERE API Route Tester</CardTitle>
          <CardDescription>
            Test the HERE WeGo API route calculation functionality
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originLat">Origin Latitude</Label>
                <form.Field
                  name="originLat"
                  // biome-ignore lint/correctness/noChildrenProp: <explwefwefanation>
                  children={(field) => (
                    // biome-ignore lint/correctness/useUniqueElementIds: <exwefplanation>
                    <Input
                      id="originLat"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="41.79457"
                      type="number"
                      step="any"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originLng">Origin Longitude</Label>
                <form.Field
                  name="originLng"
                  // biome-ignore lint/correctness/noChildrenProp: <expweflanation>
                  children={(field) => (
                    // biome-ignore lint/correctness/useUniqueElementIds: <ewefxplanation>
                    <Input
                      id="originLng"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="12.25473"
                      type="number"
                      step="any"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationLat">Destination Latitude</Label>
                <form.Field
                  name="destinationLat"
                  // biome-ignore lint/correctness/noChildrenProp: <wf>
                  children={(field) => (
                    // biome-ignore lint/correctness/useUniqueElementIds: <wef>
                    <Input
                      id="destinationLat"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="41.90096"
                      type="number"
                      step="any"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationLng">Destination Longitude</Label>
                <form.Field
                  name="destinationLng"
                  // biome-ignore lint/correctness/noChildrenProp: <explwefanation>
                  children={(field) => (
                    // biome-ignore lint/correctness/useUniqueElementIds: <explwefanation>
                    <Input
                      id="destinationLng"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="12.50243"
                      type="number"
                      step="any"
                    />
                  )}
                />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Calculating Route...' : 'Calculate Route'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {(currentOrigin && currentDestination) && (
        <Card>
          <CardHeader>
            <CardTitle>Route Map</CardTitle>
            <CardDescription>
              Visual representation of the calculated route with live vehicle positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RouteMap
              routeData={routeData}
              origin={currentOrigin}
              destination={currentDestination}
            />
          </CardContent>
        </Card>
      )}

      {routeData && (
        <Card>
          <CardHeader>
            <CardTitle>Route Results</CardTitle>
            <CardDescription>
              Successfully calculated route with {routeData.routes?.length || 0}{' '}
              route options
              {routeData.summary?.totalReports > 0 && (
                <span className="text-orange-600">
                  {' '}• {routeData.summary.totalReports} nearby reports found
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {routeData.routes?.map((route, routeIndex) => (
              <div
                key={route.id || routeIndex}
                className="border rounded-lg p-4"
              >
                <h4 className="font-semibold mb-2">Route {routeIndex + 1}</h4>

                {/* Route Sections */}
                {route.sections?.map((section, sectionIndex) => (
                  <div
                    key={section.id || sectionIndex}
                    className="mb-4 pl-4 border-l-2 border-blue-300"
                  >
                    <div className="bg-gray-100 p-3 rounded">
                      <h5 className="font-medium mb-2">
                        Section {sectionIndex + 1}:{' '}
                        {section.transport?.mode || 'Unknown'}
                      </h5>

                      {/* Departure Info */}
                      {section.departure && (
                        <div className="mb-2">
                          <strong>Departure:</strong>{' '}
                          {new Date(section.departure.time).toLocaleString()}
                          <br />
                          <small>
                            From:{' '}
                            {section.departure.place?.location?.lat?.toFixed(6)}
                            ,{' '}
                            {section.departure.place?.location?.lng?.toFixed(6)}
                          </small>
                        </div>
                      )}

                      {/* Arrival Info */}
                      {section.arrival && (
                        <div className="mb-2">
                          <strong>Arrival:</strong>{' '}
                          {new Date(section.arrival.time).toLocaleString()}
                          <br />
                          <small>
                            To:{' '}
                            {section.arrival.place?.location?.lat?.toFixed(6)},{' '}
                            {section.arrival.place?.location?.lng?.toFixed(6)}
                          </small>
                        </div>
                      )}

                      {/* Travel Summary */}
                      {section.travelSummary && (
                        <div className="mb-2">
                          <strong>Duration:</strong>{' '}
                          {section.travelSummary.duration}
                          {section.travelSummary.length && (
                            <span>
                              <br />
                              <strong>Distance:</strong>{' '}
                              {section.travelSummary.length}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions (step-by-step instructions) */}
                      {section.actions && section.actions.length > 0 && (
                        <div className="mb-2">
                          <strong>Instructions:</strong>
                          <ul className="list-disc list-inside text-sm">
                            {section.actions.map((action) => (
                              <li key={action.id || `${action.type}-${action.instruction}`}>
                                {action.instruction ||
                                  action.action ||
                                  `${action.type} ${action.duration || ''}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Intermediate Stops */}
                      {section.intermediateStops &&
                        section.intermediateStops.length > 0 && (
                          <div className="mb-2">
                            <strong>
                              Stops ({section.intermediateStops.length}):
                            </strong>
                            <ul className="list-disc list-inside text-sm max-h-20 overflow-y-auto">
                              {section.intermediateStops.map(
                                (stop) => (
                                  <li key={stop.id || stop.place?.name || `${stop.place?.location?.lat}-${stop.place?.location?.lng}`}>
                                    {stop.place?.name ||
                                      `Stop`}
                                    {stop.reports && stop.reports.length > 0 && (
                                      <span className="text-orange-600 ml-1">
                                        🚨 {stop.reports.length} reports
                                      </span>
                                    )}
                                    {stop.departure && (
                                      <span>
                                        {' '}
                                        -{' '}
                                        {new Date(
                                          stop.departure.time,
                                        ).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Nearby Reports */}
                      {section.nearbyReports && section.nearbyReports.length > 0 && (
                        <div className="mb-2 bg-orange-50 p-2 rounded">
                          <strong className="text-orange-800">
                            Nearby Reports ({section.nearbyReports.length}):
                          </strong>
                          <ul className="list-disc list-inside text-sm mt-1">
                            {section.nearbyReports.slice(0, 3).map((report) => (
                              <li key={report.id} className="text-orange-700">
                                {report.type} ({report.status}) - {report.distance}m
                                <br />
                                <span className="text-xs">{report.description}</span>
                              </li>
                            ))}
                            {section.nearbyReports.length > 3 && (
                              <li className="text-xs italic">
                                ... and {section.nearbyReports.length - 3} more reports
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Polyline info */}
                      {section.polyline && (
                        <div className="mb-2">
                          <strong>Polyline:</strong>{' '}
                          {section.polyline.substring(0, 50)}...
                          {section.geometry && (
                            <span> ({section.geometry.length} points)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )) || <p>No routes found</p>}

            {/* Reports Summary */}
            {routeData.summary && routeData.summary.totalReports > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-orange-800">Reports Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>By Type:</strong>
                    <ul className="ml-4">
                      {Object.entries(routeData.summary.reportsByType).map(([type, count]) => (
                        <li key={type}>{type}: {count}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>By Status:</strong>
                    <ul className="ml-4">
                      {Object.entries(routeData.summary.reportsByStatus).map(([status, count]) => (
                        <li key={status}>{status}: {count}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Full API Response:</h3>
              <div className="bg-gray-800 text-white p-3 rounded-md max-h-60 overflow-y-auto">
                <pre className="text-xs text-green-400">
                  {JSON.stringify(routeData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (routeData.routes && routeData.routes.length > 0) {
                    const firstRoute = routeData.routes[0]
                    alert(
                      `Found ${routeData.routes.length} route(s) with ${firstRoute.sections?.length || 0} sections`,
                    )
                  }
                }}
              >
                Show Route Summary
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRouteData(null)
                  setError(null)
                }}
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
