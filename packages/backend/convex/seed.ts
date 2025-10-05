import type { Id } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import { geospatial } from './index'
import { mockReports, mockRoutes, mockTransports, mockUsers } from './mock_data'

// Migration function to add voting fields to existing reports
export const migrateVotingFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingReports = await ctx.db.query('reports').collect()
    let migratedCount = 0

    for (const report of existingReports) {
      // Only update if the voting fields don't exist
      if (!('upvotes' in report) || !('downvotes' in report) || !('voteScore' in report)) {
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

    console.log(`Migrated ${migratedCount} reports and ${userMigratedCount} users with voting fields`)
    return { reportsMigrated: migratedCount, usersMigrated: userMigratedCount }
  },
})

export const seedDatabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data to prevent duplicates
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

    const existingTransports = await ctx.db.query('transports').collect()
    for (const transport of existingTransports) {
      await ctx.db.delete(transport._id)
    }

    // Note: geospatial index clearing may not be available in current API version

    // Insert routes first
    const routeMap = new Map<string, Id<'routes'>>()
    for (const route of mockRoutes) {
      const { _id, _creationTime, ...routeData } = route
      const routeId = await ctx.db.insert('routes', routeData)
      routeMap.set(route.routeNumber, routeId)
    }

    // Insert transports
    const transportMap = new Map<string, Id<'transports'>>()
    for (const transport of mockTransports) {
      const { _id, _creationTime, ...transportData } = transport
      const transportId = await ctx.db.insert('transports', transportData)
      transportMap.set(transport.vehicleNumber, transportId)
    }

    // Insert users
    const userIdMap = new Map<string, Id<'users'>>()
    for (let i = 0; i < mockUsers.length; i++) {
      const user = mockUsers[i]
      const { _id, _creationTime, ...userData } = user
      const userId = await ctx.db.insert('users', userData)
      userIdMap.set(`user${i + 1}`, userId)
    }

    // Insert reports with proper references and geospatial data
    for (const report of mockReports) {
      const { _id, _creationTime, location, ...reportData } = report

      // Map placeholder IDs to actual database IDs
      const mappedReport = {
        ...reportData,
        userId: userIdMap.get(report.userId as string) || report.userId,
        route: routeMap.get(getRouteKey(report.route)) || report.route,
        transportId: report.transportId
          ? transportMap.get(getTransportKey(report.transportId))
          : undefined,
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
          {
            type: report.type,
            status: report.status,
            transportMode: report.transportMode,
          },
        )
      }
    }

    return {
      usersInserted: mockUsers.length,
      routesInserted: mockRoutes.length,
      transportsInserted: mockTransports.length,
      reportsInserted: mockReports.length,
    }
  },
})

// Helper functions to extract identifiers
function getRouteKey(routeId: unknown): string {
  if (typeof routeId === 'string') {
    // Return the route as-is since mock reports now use actual route numbers
    return routeId
  }
  return '52' // fallback to a common route
}

function getTransportKey(transportId: unknown): string {
  if (typeof transportId === 'string') {
    return transportId
  }
  return 'TRAIN-SKM1-001' // fallback to a common transport
}
