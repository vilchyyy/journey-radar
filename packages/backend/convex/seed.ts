import type { Id } from './_generated/dataModel'
import { internalMutation, mutation } from './_generated/server'
import { geospatial } from './index'
import { mockReports, mockRoutes, mockUsers } from './mock_data'

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
      let validGtfsRouteId: string | undefined = undefined
      let validGtfsTripId: string | undefined = undefined
      let validGtfsVehicleId: string | undefined = undefined

      // Validate GTFS route ID - use existing one if provided, otherwise map from route short name
      if (report.gtfsRouteId) {
        const gtfsRoute = gtfsRoutes.find(r => r.routeId === report.gtfsRouteId)
        if (gtfsRoute) {
          validGtfsRouteId = gtfsRoute.routeId
        }
      } else if (report.routeShortName && gtfsRouteMap.has(report.routeShortName)) {
        validGtfsRouteId = gtfsRouteMap.get(report.routeShortName)
      }

      // Validate GTFS trip ID - check if it exists and matches the route
      if (report.gtfsTripId) {
        const gtfsTrip = gtfsTrips.find(t => t.tripId === report.gtfsTripId)
        if (gtfsTrip && (!validGtfsRouteId || gtfsTrip.routeId === validGtfsRouteId)) {
          validGtfsTripId = gtfsTrip.tripId
          // If we didn't have a GTFS route ID before, get it from the trip
          if (!validGtfsRouteId) {
            validGtfsRouteId = gtfsTrip.routeId
          }
        }
      }

      // Validate GTFS vehicle ID - check if it exists
      if (report.gtfsVehicleId) {
        const gtfsVehicle = gtfsVehicles.find(v => v.vehicleId === report.gtfsVehicleId)
        if (gtfsVehicle) {
          validGtfsVehicleId = gtfsVehicle.vehicleId
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
      let validGtfsRouteId: string | undefined = undefined
      let validGtfsTripId: string | undefined = undefined
      let validGtfsVehicleId: string | undefined = undefined

      // Validate GTFS route ID - use existing one if provided, otherwise map from route short name
      if (report.gtfsRouteId) {
        const gtfsRoute = gtfsRoutes.find(r => r.routeId === report.gtfsRouteId)
        if (gtfsRoute) {
          validGtfsRouteId = gtfsRoute.routeId
        }
      } else if (report.routeShortName && gtfsRouteMap.has(report.routeShortName)) {
        validGtfsRouteId = gtfsRouteMap.get(report.routeShortName)
      }

      // Validate GTFS trip ID - check if it exists and matches the route
      if (report.gtfsTripId) {
        const gtfsTrip = gtfsTrips.find(t => t.tripId === report.gtfsTripId)
        if (gtfsTrip && (!validGtfsRouteId || gtfsTrip.routeId === validGtfsRouteId)) {
          validGtfsTripId = gtfsTrip.tripId
          // If we didn't have a GTFS route ID before, get it from the trip
          if (!validGtfsRouteId) {
            validGtfsRouteId = gtfsTrip.routeId
          }
        }
      }

      // Validate GTFS vehicle ID - check if it exists
      if (report.gtfsVehicleId) {
        const gtfsVehicle = gtfsVehicles.find(v => v.vehicleId === report.gtfsVehicleId)
        if (gtfsVehicle) {
          validGtfsVehicleId = gtfsVehicle.vehicleId
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
