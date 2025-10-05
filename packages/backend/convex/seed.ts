import type { Id } from './_generated/dataModel'
import { internalMutation, mutation } from './_generated/server'
import { geospatial } from './index'
import { mockReports, mockRoutes, mockUsers } from './mock_data'

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

  
    // Note: geospatial index clearing may not be available in current API version

    // Insert routes first
    const routeMap = new Map<string, Id<'routes'>>()
    for (const route of mockRoutes) {
      const { _id, _creationTime, ...routeData } = route
      const routeId = await ctx.db.insert('routes', routeData)
      routeMap.set(route.routeNumber, routeId)
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

// Helper functions to extract identifiers
function getRouteKey(routeId: unknown): string {
  if (typeof routeId === 'string') {
    // Return the route as-is since mock reports now use actual route numbers
    return routeId
  }
  return '52' // fallback to a common route
}

