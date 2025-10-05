import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import { geospatial } from './index'
import { v } from 'convex/values'
import { mockReports, mockRoutes, mockUsers } from './mock_data'
import { seedRealisticReports } from './seed_realistic'

// Migration function to add voting fields to existing reports
export const migrateVotingFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingReports = await ctx.db.query('reports').collect()
    let migratedCount = 0

    for (const report of existingReports) {
      // Only update if the voting fields don't exist
      if (
        !('upvotes' in report) ||
        !('downvotes' in report) ||
        !('voteScore' in report)
      ) {
        await ctx.db.patch(report._id, {
          upvotes: 0,
          downvotes: 0,
          voteScore: 0,
        })
        migratedCount++
      }
    }

    // Add receivedUpvotes field to users if missing
    const existingUsers = await ctx.db.query('users').collect()
    let userMigratedCount = 0

    for (const user of existingUsers) {
      if (!('receivedUpvotes' in user)) {
        await ctx.db.patch(user._id, {
          receivedUpvotes: 0,
        })
        userMigratedCount++
      }
    }

    console.log(
      `Migrated ${migratedCount} reports and ${userMigratedCount} users with voting fields`,
    )
    return { reportsMigrated: migratedCount, usersMigrated: userMigratedCount }
  },
})

// NEW PROPER seeding script that searches GTFS tables first
export const seedDatabaseWithProperGTFS = internalMutation({
  args: {},
  handler: async (ctx) => {
    // First, clear existing data (but preserve GTFS data)
    console.log('🧹 Clearing existing application data...')

    // Clear in proper order to avoid foreign key constraints
    const reports = await ctx.db.query('reports').collect()
    for (const report of reports) {
      await ctx.db.delete(report._id)
    }

    const routes = await ctx.db.query('routes').collect()
    for (const route of routes) {
      await ctx.db.delete(route._id)
    }

    const users = await ctx.db.query('users').collect()
    for (const user of users) {
      await ctx.db.delete(user._id)
    }

    console.log('🔍 Searching GTFS tables for route IDs...')

    // Find specific IDs for our mock routes - search efficiently
    const targetRoutes = ['4', '8', '13', '18', '502', '139', '184', '605', 'SK1', 'SK2']
    const foundGtfsRoutes = {}

    console.log(`🔍 Searching for GTFS data for ${targetRoutes.length} target routes...`)

    for (const routeShortName of targetRoutes) {
      // Search for this specific route in GTFS
      const gtfsRoute = await ctx.db.query('gtfsRoutes')
        .withIndex('by_route_short_name', q => q.eq('routeShortName', routeShortName))
        .first()

      if (gtfsRoute) {
        // Find trips for this specific route (limit to 20)
        const trips = await ctx.db.query('gtfsTrips')
          .withIndex('by_route_id', q => q.eq('routeId', gtfsRoute.routeId))
          .take(20)

        // Find vehicles for this specific route (limit to 10)
        const vehicles = await ctx.db.query('gtfsVehiclePositions')
          .filter(q => q.eq(q.field('routeId'), gtfsRoute.routeId))
          .take(10)

        foundGtfsRoutes[routeShortName] = {
          gtfsRouteId: gtfsRoute._id,
          routeId: gtfsRoute.routeId,
          availableTrips: trips,
          availableVehicles: vehicles,
        }

        console.log(`✅ Found GTFS data for route ${routeShortName}:`)
        console.log(`   GTFS Route ID: ${gtfsRoute._id}`)
        console.log(`   Route ID: ${gtfsRoute.routeId}`)
        console.log(`   Available trips: ${trips.length}`)
        console.log(`   Available vehicles: ${vehicles.length}`)
      } else {
        console.log(`❌ No GTFS route found for: ${routeShortName}`)
        foundGtfsRoutes[routeShortName] = {
          gtfsRouteId: null,
          routeId: null,
          availableTrips: [],
          availableVehicles: [],
        }
      }
    }

    console.log('👥 Seeding users...')
    // Insert users
    for (const user of mockUsers) {
      await ctx.db.insert('users', user)
    }

    console.log('🚌 Seeding routes...')
    // Insert routes
    for (const route of mockRoutes) {
      await ctx.db.insert('routes', route)
    }

    console.log('📝 Seeding reports with PROPER GTFS linking...')

    // Insert reports with proper GTFS linking
    let reportCount = 0
    for (const report of mockReports) {
      reportCount++
      console.log(`Processing report ${reportCount}/${mockReports.length}: ${report.routeShortName}`)

      // Get user for this report (if any)
      let userId = undefined
      if (!report.isAnonymous) {
        // Find a user from our seeded users
        const users = await ctx.db.query('users').collect()
        const randomUser = users[Math.floor(Math.random() * users.length)]
        userId = randomUser._id
      }

      // Get route for this report (if any)
      let routeId = undefined
      if (report.routeShortName) {
        const route = await ctx.db.query('routes')
          .withIndex('by_route_number', q => q.eq('routeNumber', report.routeShortName))
          .first()
        routeId = route?._id
      }

      // Find GTFS data using our pre-built lookup
      let gtfsRouteId = undefined
      let gtfsTripId = undefined
      let gtfsVehicleId = undefined

      if (report.routeShortName && foundGtfsRoutes[report.routeShortName]) {
        const gtfsData = foundGtfsRoutes[report.routeShortName]

        if (gtfsData.gtfsRouteId) {
          gtfsRouteId = gtfsData.gtfsRouteId

          // Pick a random trip if available
          if (gtfsData.availableTrips.length > 0) {
            const randomTrip = gtfsData.availableTrips[Math.floor(Math.random() * gtfsData.availableTrips.length)]
            gtfsTripId = randomTrip._id
            console.log(`   ✅ Assigned trip ID: ${gtfsTripId}`)
          }

          // Pick a random vehicle if available
          if (gtfsData.availableVehicles.length > 0) {
            const randomVehicle = gtfsData.availableVehicles[Math.floor(Math.random() * gtfsData.availableVehicles.length)]
            gtfsVehicleId = randomVehicle._id
            console.log(`   ✅ Assigned vehicle ID: ${gtfsVehicleId}`)
          }

          console.log(`   ✅ GTFS Route ID: ${gtfsRouteId} for route ${report.routeShortName}`)
        }
      }

      // Map report data to database schema
      const { location, ...reportData } = report

      const mappedReport = {
        ...reportData,
        userId,
        route: routeId,
        gtfsRouteId,
        gtfsTripId,
        gtfsVehicleId,
      }

      // Insert the report
      const reportId = await ctx.db.insert('reports', mappedReport)

      // Add to geospatial index if location is provided
      if (location?.coordinates) {
        await geospatial.insert(
          ctx,
          reportId,
          {
            latitude: location.coordinates[1], // GeoJSON is [longitude, latitude]
            longitude: location.coordinates[0],
          },
          { category: report.type },
        )
      }

      console.log(`   ✅ Created report: ${reportId}`)
    }

    return {
      usersInserted: mockUsers.length,
      routesInserted: mockRoutes.length,
      reportsInserted: mockReports.length,
      gtfsRoutesFound: Object.values(foundGtfsRoutes).filter(r => r.gtfsRouteId).length,
    }
  },
})

export const seedDatabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing reports, users, routes, and votes to prevent duplicates
    // DO NOT clear GTFS tables - they contain real data
    const existingReports = await ctx.db.query('reports').collect()
    for (const report of existingReports) {
      await ctx.db.delete(report._id)
    }

    const existingUsers = await ctx.db.query('users').collect()
    for (const user of existingUsers) {
      await ctx.db.delete(user._id)
    }

    const existingRoutes = await ctx.db.query('routes').collect()
    for (const route of existingRoutes) {
      await ctx.db.delete(route._id)
    }

    const existingVotes = await ctx.db.query('reportVotes').collect()
    for (const vote of existingVotes) {
      await ctx.db.delete(vote._id)
    }

    // Insert routes first
    const routeMap = new Map<string, Id<'routes'>>()
    for (const route of mockRoutes) {
      const { _id, _creationTime, ...routeData } = route
      const routeId = await ctx.db.insert('routes', routeData)
      routeMap.set(route.routeNumber, routeId)
    }

    // Insert users
    const userIds: Id<'users'>[] = []
    for (const user of mockUsers) {
      const { _id, _creationTime, ...userData } = user
      const userId = await ctx.db.insert('users', userData)
      userIds.push(userId)
    }

    // Get existing GTFS data for proper linking (limit queries to avoid timeouts)
    const gtfsRoutes = await ctx.db.query('gtfsRoutes').take(100)
    const gtfsTrips = await ctx.db.query('gtfsTrips').take(100)
    const gtfsVehicles = await ctx.db.query('gtfsVehiclePositions').take(100)

    console.log(`Found ${gtfsRoutes.length} GTFS routes, ${gtfsTrips.length} trips, ${gtfsVehicles.length} vehicles`)

    // Create maps for GTFS data lookup
    const gtfsRouteMap = new Map(gtfsRoutes.map(r => [r.routeShortName, r.routeId]))
    const gtfsTripMap = new Map(gtfsTrips.map(t => [t.tripId, t.routeId]))
    const gtfsVehicleMap = new Map(gtfsVehicles.map(v => [v.vehicleId, v.routeId]))

    // Create enhanced maps for better trip matching
    const tripsByRouteId = new Map<Id<'gtfsRoutes'>, typeof gtfsTrips>()
    gtfsTrips.forEach(trip => {
      if (!tripsByRouteId.has(trip.routeId)) {
        tripsByRouteId.set(trip.routeId, [])
      }
      tripsByRouteId.get(trip.routeId)!.push(trip)
    })

    console.log(`Created trip mapping for ${tripsByRouteId.size} routes`)

    // Insert reports with proper references and geospatial data
    for (const report of mockReports) {
      const { _id, _creationTime, location, userId, ...reportData } = report

      // Handle user assignment - randomly assign to a user or keep anonymous
      let assignedUserId: Id<'users'> | undefined = undefined
      if (!report.isAnonymous && userIds.length > 0) {
        // Randomly assign to a user for non-anonymous reports
        assignedUserId = userIds[Math.floor(Math.random() * userIds.length)]
      }

      // Map route references from routes table
      let routeId: Id<'routes'> | undefined = undefined
      if (report.routeShortName && routeMap.has(report.routeShortName)) {
        routeId = routeMap.get(report.routeShortName)
      }

      // Validate and link GTFS data if present in report
      let validGtfsRouteId: Id<'gtfsRoutes'> | undefined = undefined
      let validGtfsTripId: Id<'gtfsTrips'> | undefined = undefined
      let validGtfsVehicleId: Id<'gtfsVehiclePositions'> | undefined = undefined

      // Validate GTFS route ID - use existing one if provided, otherwise map from route short name
      if (report.gtfsRouteId) {
        const gtfsRoute = gtfsRoutes.find(r => r.routeId === report.gtfsRouteId)
        if (gtfsRoute) {
          validGtfsRouteId = gtfsRoute._id
          console.log(`Found GTFS route by placeholder: ${report.routeShortName} -> ${gtfsRoute.routeId}`)
        }
      } else if (report.routeShortName && gtfsRouteMap.has(report.routeShortName)) {
        const routeId = gtfsRouteMap.get(report.routeShortName)
        const gtfsRoute = gtfsRoutes.find(r => r.routeId === routeId)
        if (gtfsRoute) {
          validGtfsRouteId = gtfsRoute._id
          console.log(`Found GTFS route by short name: ${report.routeShortName} -> ${routeId} -> ${gtfsRoute.routeId}`)
        }
      } else {
        console.log(`No GTFS route found for: ${report.routeShortName} (gtfsRouteId: ${report.gtfsRouteId})`)
      }

      // Validate GTFS trip ID - check if it exists and matches the route, or find a suitable trip
      if (report.gtfsTripId) {
        const gtfsTrip = gtfsTrips.find(t => t.tripId === report.gtfsTripId)
        if (gtfsTrip && (!validGtfsRouteId || gtfsTrip.routeId === validGtfsRouteId)) {
          validGtfsTripId = gtfsTrip._id
        } else {
          // If placeholder trip ID not found, try to find a suitable trip for this route
          if (validGtfsRouteId && tripsByRouteId.has(validGtfsRouteId)) {
            const availableTrips = tripsByRouteId.get(validGtfsRouteId)!
            if (availableTrips.length > 0) {
              // Pick a random trip from available trips for this route
              const randomTrip = availableTrips[Math.floor(Math.random() * availableTrips.length)]
              validGtfsTripId = randomTrip._id
              console.log(`Assigned trip ${randomTrip.tripId} to route ${report.routeShortName}`)
            }
          }
        }
      } else {
        // If no trip ID in report but we have route info, try to assign a trip
        if (validGtfsRouteId && (report.type === 'DELAY' || report.type === 'CANCELLED' || report.type === 'ACCIDENT')) {
          if (tripsByRouteId.has(validGtfsRouteId)) {
            const availableTrips = tripsByRouteId.get(validGtfsRouteId)!
            if (availableTrips.length > 0) {
              const randomTrip = availableTrips[Math.floor(Math.random() * availableTrips.length)]
              validGtfsTripId = randomTrip._id
              console.log(`Auto-assigned trip ${randomTrip.tripId} to ${report.type} report for route ${report.routeShortName}`)
            }
          }
        }
      }

      // Validate GTFS vehicle ID - check if it exists
      if (report.gtfsVehicleId) {
        const gtfsVehicle = gtfsVehicles.find(v => v.vehicleId === report.gtfsVehicleId)
        if (gtfsVehicle) {
          validGtfsVehicleId = gtfsVehicle._id
        }
      }

      const mappedReport = {
        ...reportData,
        userId: assignedUserId,
        route: routeId,
        isAnonymous: report.isAnonymous,
        // Only include valid GTFS references
        gtfsRouteId: validGtfsRouteId,
        gtfsTripId: validGtfsTripId,
        gtfsVehicleId: validGtfsVehicleId,
      }

      // Insert the report
      const reportId = await ctx.db.insert('reports', mappedReport)

      // Add to geospatial index if location is provided
      if (location?.coordinates) {
        await geospatial.insert(
          ctx,
          reportId,
          {
            latitude: location.coordinates[1], // GeoJSON is [longitude, latitude]
            longitude: location.coordinates[0],
          },
          { category: report.type },
        )
      }
    }

    return {
      usersInserted: mockUsers.length,
      routesInserted: mockRoutes.length,
      reportsInserted: mockReports.length,
    }
  },
})

// Public mutation to seed routes that can be called from frontend
export const seedRoutes = mutation({
  handler: async (ctx) => {
    const sampleRoutes = [
      // Bus routes
      {
        routeNumber: '52',
        transportMode: 'BUS' as const,
        source: 'Czerwone Maki',
        destination: 'Borek Fałęcki',
        isActive: true,
      },
      {
        routeNumber: '139',
        transportMode: 'BUS' as const,
        source: 'Mistrzejowice',
        destination: 'Salwator',
        isActive: true,
      },
      {
        routeNumber: '184',
        transportMode: 'BUS' as const,
        source: 'Kombinat',
        destination: 'Os. Piastów',
        isActive: true,
      },
      {
        routeNumber: '502',
        transportMode: 'BUS' as const,
        source: 'Krowodrza Górka',
        destination: 'Witkowice',
        isActive: true,
      },
      {
        routeNumber: '605',
        transportMode: 'BUS' as const,
        source: 'Rondo Kocmyrzowskie',
        destination: 'Nowy Kleparz',
        isActive: true,
      },
      {
        routeNumber: '608',
        transportMode: 'BUS' as const,
        source: 'Kombinat',
        destination: 'Teatr Bagatela',
        isActive: true,
      },

      // Tram routes
      {
        routeNumber: '4',
        transportMode: 'TRAM' as const,
        source: 'Wzgórza Krzesławickie',
        destination: 'Bronowice Małe',
        isActive: true,
      },
      {
        routeNumber: '8',
        transportMode: 'TRAM' as const,
        source: 'Borek Fałęcki',
        destination: 'Bronowice Małe',
        isActive: true,
      },
      {
        routeNumber: '13',
        transportMode: 'TRAM' as const,
        source: 'Nowy Bieżanów',
        destination: 'Kopiec Wandy',
        isActive: true,
      },
      {
        routeNumber: '18',
        transportMode: 'TRAM' as const,
        source: 'Mistrzejowice',
        destination: 'Płaszów',
        isActive: true,
      },
      {
        routeNumber: '24',
        transportMode: 'TRAM' as const,
        source: 'Krowodrza Górka',
        destination: 'Dworzec Główny Tunel',
        isActive: true,
      },
      {
        routeNumber: '44',
        transportMode: 'TRAM' as const,
        source: 'Bieńczyce',
        destination: 'Bronowice Małe',
        isActive: true,
      },
      {
        routeNumber: '50',
        transportMode: 'TRAM' as const,
        source: 'Kliny Borkowskie',
        destination: 'Salwator',
        isActive: true,
      },
      {
        routeNumber: '52',
        transportMode: 'TRAM' as const,
        source: 'Czerwone Maki',
        destination: 'Os. Piastów',
        isActive: true,
      },
      {
        routeNumber: '62',
        transportMode: 'TRAM' as const,
        source: 'Krowodrza Górka',
        destination: 'Czyżyny',
        isActive: true,
      },
      {
        routeNumber: '69',
        transportMode: 'TRAM' as const,
        source: 'Nowa Huta',
        destination: 'Borek Fałęcki',
        isActive: true,
      },
      {
        routeNumber: '73',
        transportMode: 'TRAM' as const,
        source: 'Kombinat',
        destination: 'Tyńiec',
        isActive: true,
      },

      // Train routes (suburban/urban lines)
      {
        routeNumber: 'SK1',
        transportMode: 'TRAIN' as const,
        source: 'Kraków Główny',
        destination: 'Kraków Lotnisko',
        isActive: true,
      },
      {
        routeNumber: 'SK2',
        transportMode: 'TRAIN' as const,
        source: 'Kraków Główny',
        destination: 'Wieliczka Rynek-Kopalnia',
        isActive: true,
      },
      {
        routeNumber: 'SK3',
        transportMode: 'TRAIN' as const,
        source: 'Kraków Główny',
        destination: 'Skawina',
        isActive: true,
      },
      {
        routeNumber: 'SK4',
        transportMode: 'TRAIN' as const,
        source: 'Kraków Główny',
        destination: 'Sędziszów',
        isActive: true,
      },
    ]

    const insertedIds = []
    for (const routeData of sampleRoutes) {
      // Check if route already exists
      const existingRoute = await ctx.db
        .query('routes')
        .filter((q) => q.eq(q.field('routeNumber'), routeData.routeNumber))
        .first()

      if (!existingRoute) {
        const routeId = await ctx.db.insert('routes', routeData)
        insertedIds.push(routeId)
      }
    }

    return {
      insertedRoutes: insertedIds.length,
      message: 'Routes seeded successfully',
    }
  },
})

// Public mutation to seed only reports (can be called from frontend)
// Debug function to check GTFS data linking
export const debugGTFSLinking = query({
  args: {},
  handler: async (ctx) => {
    const gtfsRoutes = await ctx.db.query('gtfsRoutes').take(10)
    const gtfsTrips = await ctx.db.query('gtfsTrips').take(50)

    const route4 = gtfsRoutes.find(r => r.routeShortName === '4')
    const route139 = gtfsRoutes.find(r => r.routeShortName === '139')

    const tripsForRoute4 = gtfsTrips.filter(t => t.routeId === route4?.routeId)
    const tripsForRoute139 = gtfsTrips.filter(t => t.routeId === route139?.routeId)

    return {
      route4: route4 ? { routeId: route4.routeId, routeShortName: route4.routeShortName } : null,
      route139: route139 ? { routeId: route139.routeId, routeShortName: route139.routeShortName } : null,
      tripsForRoute4Count: tripsForRoute4.length,
      tripsForRoute139Count: tripsForRoute139.length,
      sampleTripsForRoute4: tripsForRoute4.slice(0, 3).map(t => ({ tripId: t.tripId, routeId: t.routeId })),
      sampleTripsForRoute139: tripsForRoute139.slice(0, 3).map(t => ({ tripId: t.tripId, routeId: t.routeId })),
    }
  },
})

// Clear all tables for fresh import
export const clearAllTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting to clear all tables...')

    // Clear all user-related tables
    const reportVotes = await ctx.db.query('reportVotes').collect()
    for (const vote of reportVotes) {
      await ctx.db.delete(vote._id)
    }
    console.log(`Cleared ${reportVotes.length} report votes`)

    const reports = await ctx.db.query('reports').collect()
    for (const report of reports) {
      await ctx.db.delete(report._id)
    }
    console.log(`Cleared ${reports.length} reports`)

    const users = await ctx.db.query('users').collect()
    for (const user of users) {
      await ctx.db.delete(user._id)
    }
    console.log(`Cleared ${users.length} users`)

    // Clear all route-related tables
    const routes = await ctx.db.query('routes').collect()
    for (const route of routes) {
      await ctx.db.delete(route._id)
    }
    console.log(`Cleared ${routes.length} routes`)

    // Clear all GTFS tables (in correct order to avoid foreign key issues)
    const gtfsTripUpdates = await ctx.db.query('gtfsTripUpdates').collect()
    for (const update of gtfsTripUpdates) {
      await ctx.db.delete(update._id)
    }
    console.log(`Cleared ${gtfsTripUpdates.length} GTFS trip updates`)

    const gtfsVehiclePositions = await ctx.db.query('gtfsVehiclePositions').collect()
    for (const vehicle of gtfsVehiclePositions) {
      await ctx.db.delete(vehicle._id)
    }
    console.log(`Cleared ${gtfsVehiclePositions.length} GTFS vehicle positions`)

    const gtfsTrips = await ctx.db.query('gtfsTrips').collect()
    for (const trip of gtfsTrips) {
      await ctx.db.delete(trip._id)
    }
    console.log(`Cleared ${gtfsTrips.length} GTFS trips`)

    const gtfsRoutes = await ctx.db.query('gtfsRoutes').collect()
    for (const gtfsRoute of gtfsRoutes) {
      await ctx.db.delete(gtfsRoute._id)
    }
    console.log(`Cleared ${gtfsRoutes.length} GTFS routes`)

    // Clear other tables
    const incidents = await ctx.db.query('incidents').collect()
    for (const incident of incidents) {
      await ctx.db.delete(incident._id)
    }
    console.log(`Cleared ${incidents.length} incidents`)

    const historicalDelays = await ctx.db.query('historicalDelays').collect()
    for (const delay of historicalDelays) {
      await ctx.db.delete(delay._id)
    }
    console.log(`Cleared ${historicalDelays.length} historical delays`)

    console.log('All tables cleared successfully!')

    return {
      message: 'All tables cleared successfully',
      clearedCounts: {
        reportVotes: reportVotes.length,
        reports: reports.length,
        users: users.length,
        routes: routes.length,
        gtfsTripUpdates: gtfsTripUpdates.length,
        gtfsVehiclePositions: gtfsVehiclePositions.length,
        gtfsTrips: gtfsTrips.length,
        gtfsRoutes: gtfsRoutes.length,
        incidents: incidents.length,
        historicalDelays: historicalDelays.length,
      }
    }
  },
})

export const seedReports = mutation({
  args: {},
  handler: async (ctx) => {
    // Get existing users and routes (limit queries to avoid timeouts)
    const existingUsers = await ctx.db.query('users').collect()
    const existingRoutes = await ctx.db.query('routes').collect()
    const gtfsRoutes = await ctx.db.query('gtfsRoutes').take(100)
    const gtfsTrips = await ctx.db.query('gtfsTrips').take(100)
    const gtfsVehicles = await ctx.db.query('gtfsVehiclePositions').take(100)

    console.log(`Found ${gtfsRoutes.length} GTFS routes, ${gtfsTrips.length} trips, ${gtfsVehicles.length} vehicles`)

    if (existingUsers.length === 0) {
      throw new Error('No users found. Please seed users first.')
    }

    if (existingRoutes.length === 0) {
      throw new Error('No routes found. Please seed routes first.')
    }

    const routeMap = new Map<string, Id<'routes'>>()
    for (const route of existingRoutes) {
      routeMap.set(route.routeNumber, route._id)
    }

    // Create maps for GTFS data lookup
    const gtfsRouteMap = new Map(gtfsRoutes.map(r => [r.routeShortName, r.routeId]))

    // Create enhanced maps for better trip matching
    const tripsByRouteId = new Map<Id<'gtfsRoutes'>, typeof gtfsTrips>()
    gtfsTrips.forEach(trip => {
      if (!tripsByRouteId.has(trip.routeId)) {
        tripsByRouteId.set(trip.routeId, [])
      }
      tripsByRouteId.get(trip.routeId)!.push(trip)
    })

    console.log(`Created trip mapping for ${tripsByRouteId.size} routes`)

    let insertedCount = 0

    // Insert reports with proper references and geospatial data
    for (const report of mockReports) {
      const { _id, _creationTime, location, userId, ...reportData } = report

      // Handle user assignment - randomly assign to a user or keep anonymous
      let assignedUserId: Id<'users'> | undefined = undefined
      if (!report.isAnonymous && existingUsers.length > 0) {
        // Randomly assign to a user for non-anonymous reports
        assignedUserId = existingUsers[Math.floor(Math.random() * existingUsers.length)]._id
      }

      // Map route references
      let routeId: Id<'routes'> | undefined = undefined
      if (report.routeShortName && routeMap.has(report.routeShortName)) {
        routeId = routeMap.get(report.routeShortName)
      }

      // Validate and link GTFS data if present in report
      let validGtfsRouteId: Id<'gtfsRoutes'> | undefined = undefined
      let validGtfsTripId: Id<'gtfsTrips'> | undefined = undefined
      let validGtfsVehicleId: Id<'gtfsVehiclePositions'> | undefined = undefined

      // Validate GTFS route ID - use existing one if provided, otherwise map from route short name
      if (report.gtfsRouteId) {
        const gtfsRoute = gtfsRoutes.find(r => r.routeId === report.gtfsRouteId)
        if (gtfsRoute) {
          validGtfsRouteId = gtfsRoute._id
          console.log(`Found GTFS route by placeholder: ${report.routeShortName} -> ${gtfsRoute.routeId}`)
        }
      } else if (report.routeShortName && gtfsRouteMap.has(report.routeShortName)) {
        const routeId = gtfsRouteMap.get(report.routeShortName)
        const gtfsRoute = gtfsRoutes.find(r => r.routeId === routeId)
        if (gtfsRoute) {
          validGtfsRouteId = gtfsRoute._id
          console.log(`Found GTFS route by short name: ${report.routeShortName} -> ${routeId} -> ${gtfsRoute.routeId}`)
        }
      } else {
        console.log(`No GTFS route found for: ${report.routeShortName} (gtfsRouteId: ${report.gtfsRouteId})`)
      }

      // Validate GTFS trip ID - check if it exists and matches the route, or find a suitable trip
      if (report.gtfsTripId) {
        const gtfsTrip = gtfsTrips.find(t => t.tripId === report.gtfsTripId)
        if (gtfsTrip && (!validGtfsRouteId || gtfsTrip.routeId === validGtfsRouteId)) {
          validGtfsTripId = gtfsTrip._id
        } else {
          // If placeholder trip ID not found, try to find a suitable trip for this route
          if (validGtfsRouteId && tripsByRouteId.has(validGtfsRouteId)) {
            const availableTrips = tripsByRouteId.get(validGtfsRouteId)!
            if (availableTrips.length > 0) {
              // Pick a random trip from available trips for this route
              const randomTrip = availableTrips[Math.floor(Math.random() * availableTrips.length)]
              validGtfsTripId = randomTrip._id
              console.log(`Assigned trip ${randomTrip.tripId} to route ${report.routeShortName}`)
            }
          }
        }
      } else {
        // If no trip ID in report but we have route info, try to assign a trip
        if (validGtfsRouteId && (report.type === 'DELAY' || report.type === 'CANCELLED' || report.type === 'ACCIDENT')) {
          if (tripsByRouteId.has(validGtfsRouteId)) {
            const availableTrips = tripsByRouteId.get(validGtfsRouteId)!
            if (availableTrips.length > 0) {
              const randomTrip = availableTrips[Math.floor(Math.random() * availableTrips.length)]
              validGtfsTripId = randomTrip._id
              console.log(`Auto-assigned trip ${randomTrip.tripId} to ${report.type} report for route ${report.routeShortName}`)
            }
          }
        }
      }

      // Validate GTFS vehicle ID - check if it exists
      if (report.gtfsVehicleId) {
        const gtfsVehicle = gtfsVehicles.find(v => v.vehicleId === report.gtfsVehicleId)
        if (gtfsVehicle) {
          validGtfsVehicleId = gtfsVehicle._id
        }
      }

      const mappedReport = {
        ...reportData,
        userId: assignedUserId,
        route: routeId,
        isAnonymous: report.isAnonymous,
        // Only include valid GTFS references
        gtfsRouteId: validGtfsRouteId,
        gtfsTripId: validGtfsTripId,
        gtfsVehicleId: validGtfsVehicleId,
      }

      // Insert the report
      const reportId = await ctx.db.insert('reports', mappedReport)

      // Add to geospatial index if location is provided
      if (location?.coordinates) {
        await geospatial.insert(
          ctx,
          reportId,
          {
            latitude: location.coordinates[1], // GeoJSON is [longitude, latitude]
            longitude: location.coordinates[0],
          },
          { category: report.type },
        )
      }

      insertedCount++
    }

    return {
      reportsInserted: insertedCount,
      message: 'Reports seeded successfully with GTFS links',
    }
  },
})

// Convenient wrapper for realistic seeding
export const seedRealisticDatabase = internalMutation({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, { count = 150 }) => {
    console.log('🚀 Starting realistic database seeding for big city Kraków...')

    // Use the realistic seeding function (it handles clearing internally)
    return await seedRealisticReports(ctx, { count })
  },
})
