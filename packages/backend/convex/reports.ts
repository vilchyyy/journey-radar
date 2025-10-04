import { v } from 'convex/values'
import { nanoid } from 'nanoid'
import { geospatial } from '.'
import { mutation, query } from './_generated/server'

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
    const uuid = nanoid()
    await geospatial.insert(
      ctx,
      uuid,
      {
        latitude: args.location.latitude,
        longitude: args.location.longitude,
      },
      { category: args.type },
    )
    const reportId = await ctx.db.insert('reports', {
      userId: args.userId,
      status: 'UNVERIFIED',
      type: args.type,
      location_key: uuid, // Convex automatically converts to geopoint
      transportInfo: args.transportInfo,
      comment: args.comment,
      delayMinutes: args.delayMinutes,
    })
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
    // Use the geospatial addon to find reports within radius
    const nearbyReports = await geospatial.queryNearest(
      ctx,
      center,
      limit ?? 100,
      radiusKm,
    )

    return nearbyReports
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
