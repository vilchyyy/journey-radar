import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { geospatial } from './index'

export const getReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const reports = await ctx.db.query('reports').collect()
    return reports
  },
})

// Debug function to check geospatial index
export const debugGeospatialIndex = query({
  args: {},
  handler: async (ctx) => {
    const allReports = await ctx.db.query('reports').collect()
    console.log('Total reports in database:', allReports.length)

    // Try to find any geospatial points within a very large radius
    const warsawCenter = { latitude: 52.2297, longitude: 21.0122 }
    const hugeRadius = 50000 // 50km in meters

    const allNearbyReports = await geospatial.queryNearest(
      ctx,
      warsawCenter,
      hugeRadius,
      100,
    )

    console.log('Geospatial query results within 50km:', allNearbyReports)

    return {
      totalReports: allReports.length,
      geospatialResults: allNearbyReports.length,
      sampleReport: allReports[0],
      sampleGeospatialResult: allNearbyReports[0],
    }
  },
})

// Create a new report with location data
export const createReport = mutation({
  args: {
    userId: v.id('users'),
    type: v.union(
      v.literal('DELAY'),
      v.literal('CANCELLED'),
      v.literal('CROWDED'),
      v.literal('ACCIDENT'),
      v.literal('OTHER'),
    ),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    transportInfo: v.object({
      mode: v.union(v.literal('BUS'), v.literal('TRAIN'), v.literal('TRAM')),
      line: v.string(),
      destination: v.optional(v.string()),
    }),
    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert('reports', {
      userId: args.userId,
      status: 'UNVERIFIED',
      type: args.type,
      transportInfo: args.transportInfo,
      comment: args.comment,
      delayMinutes: args.delayMinutes,
    })
    await geospatial.insert(
      ctx,
      reportId,
      {
        latitude: args.location.latitude,
        longitude: args.location.longitude,
      },
      { category: args.type },
    )
    return reportId
  },
})

// Find reports within a radius using the geospatial addon
export const findNearbyReports = query({
  args: {
    center: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    radiusKm: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { center, limit = 100, radiusKm } = args

    console.log('Searching for reports near:', center, 'within', radiusKm, 'km')

    // Convert km to meters for the geospatial query
    const radiusMeters = radiusKm * 1000

    // Use the geospatial addon to find reports within radius
    // Correct parameter order: (ctx, center, radiusMeters, limit)
    const nearbyReports = await geospatial.queryNearest(
      ctx,
      center,
      limit ?? 100,
      radiusMeters,
    )

    console.log('Nearby reports found:', nearbyReports)

    if (nearbyReports.length === 0) {
      console.log("No reports found. Let's check what's in the index...")
      // Let's also add a basic query to see if there are any reports at all
      const allReports = await ctx.db.query('reports').collect()
      console.log('Total reports in database:', allReports.length)
      return []
    }

    const results = await Promise.all(
      nearbyReports.map(async (result) => {
        console.log('Looking up report with ID:', result.key)
        const row = await ctx.db.get(result.key as Id<'reports'>)
        if (!row) {
          console.log('No report found for ID:', result.key)
          throw new Error('Invalid locationId')
        }
        return {
          ...row,
          location: {
            latitude: result.coordinates.latitude,
            longitude: result.coordinates.longitude,
          },
        }
      }),
    )

    console.log('Final results:', results)
    return results
  },
})

// Find reports in a bounding box using the geospatial addon
export const findReportsInBoundingBox = query({
  args: {
    bounds: v.object({
      north: v.number(),
      south: v.number(),
      east: v.number(),
      west: v.number(),
    }),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { bounds, limit = 100 } = args

    // Use the geospatial addon to find reports within bounds
    const reportsInBounds = await geospatial.query(ctx, {
      shape: { type: 'rectangle', rectangle: bounds },
      limit,
    })

    return reportsInBounds
  },
})
