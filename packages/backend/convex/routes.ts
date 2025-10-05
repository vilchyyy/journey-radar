import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

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

export const searchRoutes = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, { searchTerm }) => {
    const routes = await ctx.db
      .query('routes')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const filteredRoutes = routes.filter((route) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        route.routeNumber.toLowerCase().includes(searchLower) ||
        route.source.toLowerCase().includes(searchLower) ||
        route.destination.toLowerCase().includes(searchLower) ||
        `${route.source} to ${route.destination}`
          .toLowerCase()
          .includes(searchLower)
      )
    })

    return filteredRoutes.map((route) => ({
      _id: route._id,
      routeNumber: route.routeNumber,
      transportMode: route.transportMode,
      source: route.source,
      destination: route.destination,
    }))
  },
})

export const getRouteById = query({
  args: {
    routeId: v.id('routes'),
  },
  handler: async (ctx, { routeId }) => {
    const route = await ctx.db.get(routeId)
    if (!route) {
      throw new Error('Route not found')
    }

    return {
      _id: route._id,
      routeNumber: route.routeNumber,
      transportMode: route.transportMode,
      source: route.source,
      destination: route.destination,
      isActive: route.isActive,
    }
  },
})

export const createRoute = mutation({
  args: {
    routeNumber: v.string(),
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    source: v.string(),
    destination: v.string(),
    isActive: v.boolean(),
  },
  handler: async (
    ctx,
    { routeNumber, transportMode, source, destination, isActive },
  ) => {
    // Check if route already exists
    const existingRoute = await ctx.db
      .query('routes')
      .filter((q) => q.eq(q.field('routeNumber'), routeNumber))
      .first()

    if (existingRoute) {
      throw new Error(`Route ${routeNumber} already exists`)
    }

    const routeId = await ctx.db.insert('routes', {
      routeNumber,
      transportMode,
      source,
      destination,
      isActive,
    })

    return routeId
  },
})

export const updateRouteStatus = mutation({
  args: {
    routeId: v.id('routes'),
    isActive: v.boolean(),
  },
  handler: async (ctx, { routeId, isActive }) => {
    const route = await ctx.db.get(routeId)
    if (!route) {
      throw new Error('Route not found')
    }

    await ctx.db.patch(routeId, { isActive })
    return routeId
  },
})

// Mutation to seed initial routes for development/testing
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
