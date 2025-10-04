import { v } from 'convex/values'
import { query } from './_generated/server'

export const getActiveRoutes = query({
  handler: async (ctx) => {
    const routes = await ctx.db
      .query('routes')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    return routes.map((route) => ({
      _id: route._id,
      routeNumber: route.routeNumber,
      transportMode: route.transportMode,
      source: route.source,
      destination: route.destination,
    }))
  },
})

export const getRoutesByTransportMode = query({
  args: {
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
  },
  handler: async (ctx, { transportMode }) => {
    const routes = await ctx.db
      .query('routes')
      .filter((q) =>
        q.and(
          q.eq(q.field('isActive'), true),
          q.eq(q.field('transportMode'), transportMode),
        ),
      )
      .collect()

    return routes.map((route) => ({
      _id: route._id,
      routeNumber: route.routeNumber,
      transportMode: route.transportMode,
      source: route.source,
      destination: route.destination,
    }))
  },
})
