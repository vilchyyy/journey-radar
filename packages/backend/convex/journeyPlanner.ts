import { v } from 'convex/values'
import { query } from './_generated/server'

export const planJourney = query({
  args: {
    fromLat: v.number(),
    fromLng: v.number(),
    toLat: v.number(),
    toLng: v.number(),
    departureTime: v.optional(v.number()),
  },
  handler: async (ctx, { fromLat, fromLng, toLat, toLng, departureTime }) => {
    // For now, return a simple journey plan based on available routes
    // In a real implementation, this would involve more complex routing algorithms

    const routes = await ctx.db.query('gtfsRoutes').collect()
    const vehiclePositions = await ctx.db.query('gtfsVehiclePositions').collect()

    // Find nearby routes to the starting point (simplified)
    const nearbyRoutes = routes.filter(route => {
      // This is a simplified version - you'd want to use actual distance calculations
      // based on stops or route shapes
      return Math.random() > 0.7 // Mock filtering for demo
    }).slice(0, 3)

    // Create journey options
    const journeyOptions = nearbyRoutes.map((route, index) => {
      const now = departureTime || Date.now()
      const departureInMinutes = 15 + (index * 10)
      const departureTimeMs = now + (departureInMinutes * 60 * 1000)
      const durationMinutes = 20 + (index * 15)
      const arrivalTimeMs = departureTimeMs + (durationMinutes * 60 * 1000)

      return {
        id: `journey_${route.routeId}_${index}`,
        type: route.transportMode.toLowerCase(),
        route: route.routeShortName,
        departure: new Date(departureTimeMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        arrival: new Date(arrivalTimeMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        duration: `${durationMinutes} min`,
        walking: index === 0 ? '3 min to stop' : '5 min total',
        transfers: index > 1 ? 1 : 0,
        reliability: index === 0 ? 'On time' : index === 1 ? 'Usually on time' : 'Often delayed',
        fromLocation: { lat: fromLat, lng: fromLng },
        toLocation: { lat: toLat, lng: toLng },
      }
    })

    return journeyOptions
  },
})

// Query to get route information by route number/short name
export const getRouteByShortName = query({
  args: {
    shortName: v.string(),
  },
  handler: async (ctx, { shortName }) => {
    return await ctx.db
      .query('gtfsRoutes')
      .withIndex('by_route_short_name', (q) => q.eq('routeShortName', shortName))
      .first()
  },
})

// Query to search routes by name or number
export const searchRoutes = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, { query }) => {
    const routes = await ctx.db.query('gtfsRoutes').collect()

    return routes.filter(route =>
      route.routeShortName.toLowerCase().includes(query.toLowerCase()) ||
      route.routeLongName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10)
  },
})