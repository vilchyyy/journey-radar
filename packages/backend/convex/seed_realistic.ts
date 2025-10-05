import type { Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import { createReportHelper } from './reports'
import { v } from 'convex/values'
import { geospatial } from './index'


// Helper function to generate random user inputs for reports
function generateRandomReportData() {
  const reportTypes = ['DELAY', 'CANCELLED', 'CROWDED', 'ACCIDENT', 'OTHER'] as const
  const transportModes = ['BUS', 'TRAM', 'TRAIN'] as const // Support all transport modes - will filter based on GTFS availability

  // Common Kraków locations (latitude, longitude) - big city needs more locations
  const krakowLocations = [
    // City Center & Tourist Areas
    { lat: 50.061465, lng: 19.936560 }, // Main Market Square
    { lat: 50.064653, lng: 19.944979 }, // Wawel Castle
    { lat: 50.068008, lng: 19.912889 }, // Kazimierz
    { lat: 50.057781, lng: 19.923727 }, // Old Town
    { lat: 50.070593, lng: 19.945559 }, // Planty Park
    { lat: 50.069564, lng: 19.921326 }, // Kleparz

    // Major Transportation Hubs
    { lat: 50.067013, lng: 19.944844 }, // Główny Dworzec (Main Station)
    { lat: 50.074622, lng: 19.932847 }, // Dworzec Płaszów
    { lat: 50.082822, lng: 19.967077 }, // Plac Centralny (Nowa Huta)
    { lat: 50.066542, lng: 19.912304 }, // Rondo Grzegórzeckie

    // Residential Districts
    { lat: 50.077543, lng: 19.975754 }, // Nowa Huta Center
    { lat: 50.054947, lng: 19.938807 }, // Podgórze
    { lat: 50.062336, lng: 19.954102 }, // Krowodrza
    { lat: 50.049742, lng: 19.949070 }, // Grzegórzki
    { lat: 50.084658, lng: 19.963348 }, // Prądnik Biały
    { lat: 50.054659, lng: 19.913895 }, // Zabłocie
    { lat: 50.076312, lng: 19.933324 }, // Dębniki
    { lat: 50.051842, lng: 19.970825 }, // Czyżyny
    { lat: 50.087543, lng: 19.950287 }, // Prądnik Czerwony
    { lat: 50.045234, lng: 19.956745 }, // Bieńczyce
    { lat: 50.089234, lng: 19.983456 }, // Mistrzejowice
    { lat: 50.023456, lng: 19.945678 }, // Swoszowice
    { lat: 50.093456, lng: 19.923456 }, // Azory
    { lat: 50.012345, lng: 19.967890 }, // Kurdwanów
    { lat: 50.078901, lng: 19.912345 }, // Wola Duchacka
    { lat: 50.067890, lng: 19.987654 }, // Ruczaj
    { lat: 50.045678, lng: 19.901234 }, // Łagiewniki

    // Major Intersections & Squares
    { lat: 50.064567, lng: 19.923456 }, // Rondo Mogilskie
    { lat: 50.071234, lng: 19.934567 }, // Rondo Grzegórzeckie
    { lat: 50.056789, lng: 19.945678 }, // Rondo Matecznego
    { lat: 50.083456, lng: 19.956789 }, // Plac Centralny
    { lat: 50.023456, lng: 19.934567 }, // Rondo Czyżyńskie
    { lat: 50.093456, lng: 19.945678 }, // Os. Piastów

    // University & Business Areas
    { lat: 50.060743, lng: 19.923947 }, // AGH University
    { lat: 50.066234, lng: 19.912567 }, // Jagiellonian University
    { lat: 50.054567, lng: 19.934678 }, // Business Park
    { lat: 50.078901, lng: 19.945789 }, // Galicia Kraków Expo

    // Shopping & Entertainment Centers
    { lat: 50.089012, lng: 19.945678 }, // Galeria Krakowska
    { lat: 50.012345, lng: 19.956789 }, // Bonarka City Center
    { lat: 50.045678, lng: 19.967890 }, // Zakopianka Shopping
    { lat: 50.078901, lng: 19.878901 }, // M1 Gallery
  ]

  // Realistic comments based on report type - big city has more variety
  const comments = {
    DELAY: [
      'Running about 15 minutes late, typical rush hour traffic',
      'Significant delay due to accident on al. Jana Pawła II',
      'Vehicle delayed due to technical issues at the depot',
      'About 20 minutes behind schedule, traffic jam on ul. Dietla',
      'Major delay causing overcrowding, everyone has to stand',
      'Delayed but still moving slowly through the city center',
      'Stuck in traffic near Rondo Mogilskie for 25 minutes',
      'Delay due to road works on Zakopiańska street',
      'Running late because of special event in the city center',
      'Weather-related delays, heavy rain causing traffic issues',
      'Delay near Main Market Square due to tourist traffic',
      'Vehicle change causing 15 minute delay',
      'Police activity causing detour and delays',
      'Delayed due to another vehicle breakdown ahead',
      'Traffic congestion near Galeria Krakowska',
    ],
    CANCELLED: [
      'Service cancelled, no explanation provided at the stop',
      'Trip cancelled - next one is completely full',
      'Vehicle cancelled due to technical problems, no replacement',
      'No show for scheduled service, been waiting 30 minutes',
      'Service terminated early at Bieńczyce, had to walk',
      'Cancelled due to staff shortage, common on weekends',
      'Last trip cancelled, had to take expensive taxi',
      'Service cancelled due to emergency situation in city center',
      'Technical failure at depot, multiple services cancelled',
      'Weather conditions too severe for service to continue',
      'Police closed the street, all services diverted',
      'Vehicle breakdown, no spare vehicle available',
      'Service cancelled for scheduled maintenance',
    ],
    CROWDED: [
      'Extremely crowded, can\'t get on at this stop',
      'Vehicle is dangerously full, over capacity limit',
      'No space available, waiting for next one but it\'s also full',
      'Overcrowded to the point of being unsafe, people falling',
      'Standing room only, very uncomfortable during rush hour',
      'Too many people with luggage near main station',
      'Crowded due to previous service being cancelled',
      'Students returning to university, vehicle completely packed',
      'Weekend crowds heading to city center, unbearable',
      'Tourist season making all services overcrowded',
      'Emergency crowding after event at Tauron Arena',
      'Vehicle packed after football match at Wisła stadium',
      'Morning rush hour to business districts is impossible',
    ],
    ACCIDENT: [
      'Minor accident, traffic blocked ahead on ul. Wielopole',
      'Vehicle involved in collision near Rondo Grzegórzeckie',
      'Accident causing major delays on Zakopianka street',
      'Emergency services on scene, all traffic diverted',
      'Vehicle out of service due to accident at Nowa Huta',
      'Tram hit by car at railway crossing',
      'Bus skidded on wet road near river',
      'Multiple vehicle pile-up causing public transport chaos',
      'Pedestrian accident near main station, all services delayed',
      'Vehicle fire on highway affecting city connections',
      'Construction vehicle accident blocking tram lines',
    ],
    OTHER: [
      'Announcement system not working, don\'t know where we are',
      'Vehicle is very dirty inside, hasn\'t been cleaned in days',
      'Air conditioning not functioning during heat wave',
      'Ticket machine not working, driver can\'t sell tickets either',
      'Driver very helpful despite delays, provided updates',
      'Vehicle in poor condition, broken seats everywhere',
      'No heating in vehicle during winter, freezing',
      'Music playing too loud, can\'t hear announcements',
      'Driver using phone while driving, very unsafe',
      'Emergency door not working properly, safety concern',
      'Wheelchair accessibility features broken',
      'Wi-Fi not working as advertised',
      'USB charging ports not functional',
      'Interior lights broken, very dark at night',
      'Driver skipped my stop despite being requested',
      'Vehicle speeding, felt very dangerous',
      'Extreme temperature inside vehicle, no climate control',
    ],
  }

  const type = reportTypes[Math.floor(Math.random() * reportTypes.length)]
  const transportMode = transportModes[Math.floor(Math.random() * transportModes.length)]
  const location = krakowLocations[Math.floor(Math.random() * krakowLocations.length)]
  const possibleComments = comments[type]
  const comment = possibleComments[Math.floor(Math.random() * possibleComments.length)]

  return {
    type,
    transportMode,
    location: {
      latitude: location.lat + (Math.random() - 0.5) * 0.001, // Add small random variation
      longitude: location.lng + (Math.random() - 0.5) * 0.001,
    },
    comment,
    delayMinutes: type === 'DELAY' ? Math.floor(Math.random() * 60) + 3 : undefined, // 3-63 minutes (big city delays can be long)
    isAnonymous: Math.random() > 0.7, // 30% chance of being non-anonymous
  }
}

// Get available transport modes from GTFS data
async function getAvailableTransportModes(ctx: any): Promise<string[]> {
  try {
    const gtfsRoutes = await ctx.db.query('gtfsRoutes').collect()
    const availableModes = [...new Set(gtfsRoutes.map(route => route.transportMode))]
    console.log(`📊 Available GTFS transport modes: ${availableModes.join(', ')}`)
    return availableModes
  } catch (error) {
    console.log('Error getting available transport modes:', error)
    return ['BUS'] // Fallback to BUS only
  }
}

// Get random GTFS data from existing database - ALWAYS returns required fields
async function getRandomGTFSData(ctx: any, requestedTransportMode: string, availableModes: string[]) {
  try {
    // Use the requested mode if available, otherwise pick from available modes
    let selectedMode = requestedTransportMode
    if (!availableModes.includes(requestedTransportMode)) {
      selectedMode = availableModes[Math.floor(Math.random() * availableModes.length)]
      console.log(`⚠️ Requested ${requestedTransportMode} not available, using ${selectedMode} instead`)
    }

    // Strategy 1: Find currently active vehicles with trip data (REALISTIC - matches what users see on map)
    const activeVehicles = await ctx.db
      .query('gtfsVehiclePositions')
      .filter(q => q.eq(q.field('mode'), selectedMode)) // Keep uppercase to match DB
      .collect()

    // Filter vehicles that have trip data (these are the ones users can click on)
    const vehiclesWithTrips = activeVehicles.filter(v => v.tripId)

    if (vehiclesWithTrips.length > 0) {
      // Pick a random active vehicle that has trip data
      const selectedVehicle = vehiclesWithTrips[Math.floor(Math.random() * vehiclesWithTrips.length)]

      console.log(`✅ Using active vehicle: ${selectedVehicle.vehicleId} with trip: ${selectedVehicle.tripId} on route: ${selectedVehicle.routeNumber}`)

      // Get the trip for this vehicle
      const trip = await ctx.db
        .query('gtfsTrips')
        .withIndex('by_trip_id', q => q.eq('tripId', selectedVehicle.tripId))
        .first()

      // Get the route for this trip (or fall back to vehicle route data)
      let routeShortName = selectedVehicle.routeNumber
      let gtfsRouteId = selectedVehicle.routeId
      let transportMode = selectedMode

      if (trip) {
        const route = await ctx.db
          .query('gtfsRoutes')
          .withIndex('by_route_id', q => q.eq('routeId', trip.routeId))
          .first()

        if (route) {
          routeShortName = route.routeShortName
          gtfsRouteId = route.routeId
          transportMode = route.transportMode
        }
      }

      return {
        gtfsRouteId: gtfsRouteId,
        routeShortName: routeShortName, // REQUIRED routeNumber
        transportMode: transportMode, // REQUIRED mode (may differ from requested)
        gtfsTripId: selectedVehicle.tripId, // CRITICAL: matches exactly what user clicks on
        gtfsVehicleId: selectedVehicle.vehicleId, // Vehicle ID - matches what user clicks on
      }
    }

    // Strategy 2: Fallback - pick random route and find trips/vehicles
    console.log(`⚠️ No active vehicles with trips found for ${selectedMode}, using random route approach`)

    // Get random route - REQUIRED
    const gtfsRoutes = await ctx.db
      .query('gtfsRoutes')
      .filter(q => q.eq(q.field('transportMode'), selectedMode))
      .collect()

    if (gtfsRoutes.length === 0) {
      throw new Error(`No GTFS routes found for transport mode: ${selectedMode}`)
    }

    const randomRoute = gtfsRoutes[Math.floor(Math.random() * gtfsRoutes.length)]

    // Get random trip for this route - PREFERRED
    const trips = await ctx.db
      .query('gtfsTrips')
      .withIndex('by_route_id', q => q.eq('routeId', randomRoute.routeId))
      .take(50) // Limit to avoid too many results

    // Get random vehicle for this route - OPTIONAL
    const routeVehicles = await ctx.db
      .query('gtfsVehiclePositions')
      .filter(q => q.eq(q.field('routeId'), randomRoute.routeId))
      .take(20) // Limit to avoid too many results

    return {
      gtfsRouteId: randomRoute.routeId,
      routeShortName: randomRoute.routeShortName, // REQUIRED routeNumber
      transportMode: randomRoute.transportMode, // REQUIRED mode (may differ from requested)
      gtfsTripId: trips.length > 0 ? trips[Math.floor(Math.random() * trips.length)].tripId : undefined, // PREFERRED tripId
      gtfsVehicleId: routeVehicles.length > 0 ? routeVehicles[Math.floor(Math.random() * routeVehicles.length)].vehicleId : undefined,
    }
  } catch (error) {
    console.log('Error getting GTFS data:', error)
    throw error // Re-throw to fail the report creation if GTFS data is not available
  }
}

// Create realistic reports using the normal createReport mutation
export const seedRealisticReports = internalMutation({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, { count = 150 }) => {
    console.log(`🎯 Creating ${count} realistic reports using normal report creation process...`)

    // First, clear existing reports AND their geospatial entries
    console.log('🧹 Clearing existing reports and geospatial entries...')
    const existingReports = await ctx.db.query('reports').collect()

    // Delete all reports from database AND their geospatial entries
    for (const report of existingReports) {
      await ctx.db.delete(report._id)
      // Note: geospatial entries are automatically cleaned up when the document is deleted
    }
    console.log(`🗑️ Cleared ${existingReports.length} existing reports`)

    // Get existing users to randomly assign some reports
    const users = await ctx.db.query('users').collect()
    console.log(`📊 Found ${users.length} users in database`)

    // Check what transport modes are available in GTFS data
    const availableModes = await getAvailableTransportModes(ctx)
    console.log(`🎯 Will generate reports using available modes: ${availableModes.join(', ')}`)

    let createdCount = 0
    let skippedCount = 0

    for (let i = 0; i < count; i++) {
      const reportData = generateRandomReportData()

      // Get GTFS data - REQUIRED for all reports (flexible based on availability)
      let gtfsData
      try {
        gtfsData = await getRandomGTFSData(ctx, reportData.transportMode, availableModes)
      } catch (error) {
        console.log(`⚠️ Skipping report due to GTFS data error: ${error.message}`)
        skippedCount++
        continue
      }

      // Prepare report arguments exactly as a user would submit them
      const reportArgs: any = {
        type: reportData.type,
        transportMode: gtfsData.transportMode, // Use actual GTFS transport mode (may differ from requested)
        location: reportData.location,
        comment: reportData.comment,
        isAnonymous: reportData.isAnonymous,
        // REQUIRED fields for transport reports
        gtfsRouteId: gtfsData.gtfsRouteId,
        routeShortName: gtfsData.routeShortName, // This is the required routeNumber
      }

      // Log if we had to substitute transport mode
      if (gtfsData.transportMode !== reportData.transportMode) {
        console.log(`🔄 Substituted ${reportData.transportMode} with available ${gtfsData.transportMode} for route ${gtfsData.routeShortName}`)
      }

      // Add trip ID - PREFERRED (high priority for realistic data)
      if (gtfsData.gtfsTripId) {
        reportArgs.gtfsTripId = gtfsData.gtfsTripId
        console.log(`✅ Assigned trip ID: ${gtfsData.gtfsTripId} to route ${gtfsData.routeShortName}`)
      } else {
        console.log(`⚠️ No trip ID available for route ${gtfsData.routeShortName}`)
      }

      // Add vehicle ID when available (optional)
      if (gtfsData.gtfsVehicleId && Math.random() > 0.3) { // 70% chance
        reportArgs.gtfsVehicleId = gtfsData.gtfsVehicleId
      }

      // Add delay minutes for delay reports
      if (reportData.delayMinutes) {
        reportArgs.delayMinutes = reportData.delayMinutes
      }

      // Randomly assign to existing user (30% chance if not anonymous)
      if (!reportData.isAnonymous && users.length > 0 && Math.random() > 0.7) {
        const randomUser = users[Math.floor(Math.random() * users.length)]
        reportArgs.userId = randomUser._id
      }

      try {
        // Use the helper function to avoid Convex function call warnings
        const reportId = await createReportHelper(ctx, reportArgs)

        // Verify the report was created and geospatially indexed
        const createdReport = await ctx.db.get(reportId)
        if (!createdReport) {
          console.log(`❌ Report not found in database after creation: ${reportId}`)
          throw new Error('Report creation failed')
        }

        console.log(`✅ Report created and indexed: ${reportId} (${createdReport.type} - ${createdReport.transportMode})`)

        // Simulate some voting on older reports (simulate community interaction)
        if (Math.random() > 0.7 && createdCount > 5) {
          // Get a random older report
          const olderReports = await ctx.db
            .query('reports')
            .filter(q => q.lt(q.field('_creationTime'), Date.now() - 300000)) // 5 minutes ago
            .collect()

          if (olderReports.length > 0) {
            const randomOlderReport = olderReports[Math.floor(Math.random() * olderReports.length)]

            // Simulate community voting
            if (Math.random() > 0.5) {
              const upvotes = Math.floor(Math.random() * 3) + 1
              await ctx.db.patch(randomOlderReport._id, {
                upvotes: randomOlderReport.upvotes + upvotes,
                voteScore: randomOlderReport.voteScore + upvotes,
              })
            } else {
              const downvotes = Math.floor(Math.random() * 2) + 1
              await ctx.db.patch(randomOlderReport._id, {
                downvotes: randomOlderReport.downvotes + downvotes,
                voteScore: randomOlderReport.voteScore - downvotes,
              })
            }
          }
        }

        createdCount++
        console.log(`✅ Created report ${createdCount}: ${reportData.type} - ${reportData.transportMode} - ${reportData.comment.substring(0, 30)}...`)

      } catch (error) {
        console.log(`❌ Failed to create report:`, error)
        skippedCount++
      }
    }

    console.log(`🎉 Seeding complete! Created ${createdCount} reports, skipped ${skippedCount}`)

    // Log some statistics
    const totalReports = await ctx.db.query('reports').collect()
    const reportsByType = totalReports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // GTFS data coverage statistics
    const reportsWithRouteShortName = totalReports.filter(r => r.routeShortName).length
    const reportsWithTripId = totalReports.filter(r => r.gtfsTripId).length
    const reportsWithVehicleId = totalReports.filter(r => r.gtfsVehicleId).length
    const reportsByTransportMode = totalReports.reduce((acc, report) => {
      acc[report.transportMode] = (acc[report.transportMode] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`📊 Total reports in database: ${totalReports.length}`)
    console.log(`📈 Reports by type:`, reportsByType)
    console.log(`🚌 Reports by transport mode:`, reportsByTransportMode)
    console.log(`✅ GTFS Route coverage: ${reportsWithRouteShortName}/${totalReports.length} (${((reportsWithRouteShortName/totalReports.length)*100).toFixed(1)}%)`)
    console.log(`🎫 GTFS Trip coverage: ${reportsWithTripId}/${totalReports.length} (${((reportsWithTripId/totalReports.length)*100).toFixed(1)}%)`)
    console.log(`🚗 GTFS Vehicle coverage: ${reportsWithVehicleId}/${totalReports.length} (${((reportsWithVehicleId/totalReports.length)*100).toFixed(1)}%)`)

    return { created: createdCount, skipped: skippedCount, total: totalReports.length }
  },
})