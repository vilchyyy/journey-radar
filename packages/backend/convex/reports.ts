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
    transportInfo: v.optional(v.id('transports')),
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    route: v.id('routes'),
    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert('reports', {
      userId: args.userId,
      status: 'UNVERIFIED',
      type: args.type,
      transportId: args.transportInfo,
      transportMode: args.transportMode,
      route: args.route,
      comment: args.comment,
      delayMinutes: args.delayMinutes,
      verificationScore: 1,
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

    if (nearbyReports.length === 0) {
      return []
    }

    const results = []
    for (const result of nearbyReports) {
      const row = await ctx.db.get(result.key as Id<'reports'>)
      if (!row) {
        continue // Skip this result instead of throwing error
      }
      const route = await ctx.db.get(row?.route as Id<'routes'>)
      results.push({
        ...row,
        location: {
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
        },
        transportInfo: { ...route },
        distance: result.distance, // Distance in meters from center point
      })
    }

    return results
  },
})

// Find reports within a radius using the geospatial addon with filters
export const findNearbyReportsFiltered = query({
  args: {
    center: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    radiusKm: v.number(),
    limit: v.optional(v.number()),
    routeFilter: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    maxDistanceKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const {
      center,
      limit = 100,
      radiusKm,
      routeFilter,
      statusFilter,
      maxDistanceKm,
    } = args
    // Convert km to meters for the geospatial query
    const radiusMeters = radiusKm * 1000

    // Use the geospatial addon to find reports within radius
    const nearbyReports = await geospatial.queryNearest(
      ctx,
      center,
      limit ?? 100,
      radiusMeters,
    )

    if (nearbyReports.length === 0) {
      return []
    }

    const results = []
    for (const result of nearbyReports) {
      // Skip if beyond max distance filter
      if (maxDistanceKm && result.distance > maxDistanceKm * 1000) {
        continue
      }

      const row = await ctx.db.get(result.key as Id<'reports'>)
      if (!row) {
        continue // Skip this result instead of throwing error
      }

      // Skip if status filter is set and doesn't match
      if (statusFilter && row.status !== statusFilter) {
        continue
      }

      const route = await ctx.db.get(row?.route as Id<'routes'>)
      if (!route) {
        continue
      }

      // Skip if route filter is set and doesn't match
      if (routeFilter && route.routeNumber !== routeFilter) {
        continue
      }

      results.push({
        ...row,
        location: {
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
        },
        transportInfo: { ...route },
        distance: result.distance, // Distance in meters from center point
      })
    }

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
