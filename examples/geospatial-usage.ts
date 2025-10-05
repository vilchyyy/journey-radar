// Example usage of geospatial features for journey-radar reports
// This shows how to interact with the location-based reports system

import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../packages/backend/convex/_generated/api'

// Example: Creating a new report at a specific location
export function ReportCreationExample() {
  const createReport = useMutation(api.reports.createReport)
  const routes = useQuery(api.routes.getActiveRoutes)

  const handleCreateReport = async () => {
    try {
      // Find a train route (e.g., SK1)
      const trainRoute = routes?.find(r => r.routeNumber === 'SK1' && r.transportMode === 'TRAIN')
      if (!trainRoute) {
        console.error('SK1 train route not found')
        return
      }

      // User reports a delay at Warsaw Central Station
      const reportId = await createReport({
        userId: 'user_123', // This would come from auth
        type: 'DELAY',
        location: {
          latitude: 52.2297,  // Warsaw Central Station coordinates
          longitude: 21.0122,
        },
        transportMode: 'TRAIN',
        route: trainRoute._id,
        comment: 'Train is 15 minutes late',
        delayMinutes: 15,
      })

      console.log('Report created with ID:', reportId)
    } catch (error) {
      console.error('Failed to create report:', error)
    }
  }

  return <button onClick={handleCreateReport}>Create Report</button>
}

// Example: Finding reports within 5km of user's location
export function NearbyReportsExample() {
  const [userLocation, setUserLocation] = useState({
    latitude: 52.2297,
    longitude: 21.0122
  })

  // Find reports within 5km radius
  const nearbyReports = useQuery(api.reports.findNearbyReports, {
    center: userLocation,
    radiusKm: 5,
    limit: 20,
  })

  // Get user's current location
  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => console.error('Error getting location:', error)
    )
  }

  return (
    <div>
      <button onClick={getCurrentLocation}>Get My Location</button>
      <h3>Reports within 5km:</h3>nearbyReports?.map((report) => (
        <div key={report._id}>
          <p>Type: {report.type}</p>
          <p>Route: {report.route?.routeNumber || 'Unknown'}</p>
          <p>Mode: {report.transportMode}</p>
          <p>Status: {report.status}</p>
          <p>Comment: {report.comment}</p>
        </div>
      ))
    </div>
  )
}

// Example: Finding reports in map viewport
export function MapViewportExample() {
  // Warsaw city center bounds
  const viewportBounds = {
    north: 52.2800,
    south: 52.1800,
    east: 21.1000,
    west: 20.9000,
  }

  const reportsInViewport = useQuery(api.reports.findReportsInBoundingBox, {
    bounds: viewportBounds,
    limit: 100,
  })

  return (
    <div>
      <h3>Reports in current map view:</h3>
      <p>Found reportsInViewport?.length || 0reports</p>
    </div>
  )
}

// Example: Calculating distance between two points
export function DistanceCalculationExample() {
  const calculateDistance = useQuery(api.reports.calculateDistance, {
    point1: {
      latitude: 52.2297,  // Warsaw Central Station
      longitude: 21.0122,
    },
    point2: {
      latitude: 52.2357,  // Warsaw Chopin Airport
      longitude: 20.9641,
    },
  })

  return (
    <div>
      <h3>Distance from Central Station to Airport:</h3>calculateDistance && (
        <p>
          {calculateDistance.kilometers.toFixed(2)}km
          ({calculateDistance.meters.toFixed(0)} meters)
        </p>
      )
    </div>
  )
}

// Example: Advanced location-based filtering
export function AdvancedFilteringExample() {
  // Find all crowd reports near user's current location
  const crowdReportsNearby = useQuery(api.reports.findNearbyReports, {
    center: { latitude: 52.2297, longitude: 21.0122 },
    radiusKm: 2,
    limit: 10,
  })

  // Filter for only crowd reports
  const filteredCrowdReports = crowdReportsNearby?.filter(
    report => report.type === 'CROWDED'
  )

  return (
    <div>
      <h3>Crowding reports near you:</h3>filteredCrowdReports?.map((report) => (
        <div key={report._id}>
          <p>Route: {report.route?.routeNumber || 'Unknown'}</p>
          <p>Mode: {report.transportMode}</p>
          <p>Comment: {report.comment || 'No comment'}</p>
        </div>
      ))
    </div>
  )
}