import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// =================================================================
// INCIDENT MANAGEMENT FOR DISPATCHERS
// =================================================================

// Create a new incident (dispatcher only)
export const createIncident = mutation({
  args: {
    source: v.union(v.literal('DISPATCHER'), v.literal('SYSTEM')),
    type: v.union(
      v.literal('DELAY'),
      v.literal('CANCELLED'),
      v.literal('ACCIDENT'),
      v.literal('INFO'),
    ),
    description: v.string(),
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    routeId: v.id('routes'),
    validFrom: v.number(), // Unix timestamp (ms)
    validUntil: v.optional(v.number()), // Unix timestamp (ms)
    dispatcherId: v.optional(v.string()), // ID of the dispatcher
  },
  handler: async (ctx, args) => {
    const incidentId = await ctx.db.insert('incidents', {
      source: args.source,
      status: 'ACTIVE',
      type: args.type,
      description: args.description,
      transportMode: args.transportMode,
      route: args.routeId,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      dispatcherId: args.dispatcherId,
    })

    return incidentId
  },
})

// Update incident status (dispatcher only)
export const updateIncidentStatus = mutation({
  args: {
    incidentId: v.id('incidents'),
    status: v.union(v.literal('ACTIVE'), v.literal('RESOLVED')),
    dispatcherId: v.optional(v.string()), // ID of the dispatcher making the change
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    await ctx.db.patch(args.incidentId, {
      status: args.status,
      validUntil: args.status === 'RESOLVED' ? Date.now() : incident.validUntil,
    })

    return args.incidentId
  },
})

// Update incident details (dispatcher only)
export const updateIncident = mutation({
  args: {
    incidentId: v.id('incidents'),
    type: v.optional(
      v.union(
        v.literal('DELAY'),
        v.literal('CANCELLED'),
        v.literal('ACCIDENT'),
        v.literal('INFO'),
      ),
    ),
    description: v.optional(v.string()),
    validUntil: v.optional(v.number()), // Unix timestamp (ms)
    dispatcherId: v.optional(v.string()), // ID of the dispatcher making the change
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    const updates: any = {}
    if (args.type !== undefined) updates.type = args.type
    if (args.description !== undefined) updates.description = args.description
    if (args.validUntil !== undefined) updates.validUntil = args.validUntil

    await ctx.db.patch(args.incidentId, updates)

    return args.incidentId
  },
})

// Delete incident (dispatcher only)
export const deleteIncident = mutation({
  args: {
    incidentId: v.id('incidents'),
    dispatcherId: v.optional(v.string()), // ID of the dispatcher
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    await ctx.db.delete(args.incidentId)

    return args.incidentId
  },
})

// Get all incidents (for dispatchers)
export const getAllIncidents = query({
  args: {
    status: v.optional(v.union(v.literal('ACTIVE'), v.literal('RESOLVED'))),
    transportMode: v.optional(
      v.union(v.literal('BUS'), v.literal('TRAIN'), v.literal('TRAM')),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let incidents = await ctx.db.query('incidents').collect()

    // Filter by status if provided
    if (args.status) {
      incidents = incidents.filter(
        (incident) => incident.status === args.status,
      )
    }

    // Filter by transport mode if provided
    if (args.transportMode) {
      incidents = incidents.filter(
        (incident) => incident.transportMode === args.transportMode,
      )
    }

    // Sort by creation time (newest first)
    incidents.sort((a, b) => b._creationTime - a._creationTime)

    // Apply limit if provided
    if (args.limit && args.limit > 0) {
      incidents = incidents.slice(0, args.limit)
    }

    // Fetch route details for each incident
    const incidentsWithRoutes = await Promise.all(
      incidents.map(async (incident) => {
        const route = await ctx.db.get(incident.route)
        return {
          ...incident,
          routeDetails: route
            ? {
                routeNumber: route.routeNumber,
                source: route.source,
                destination: route.destination,
              }
            : null,
        }
      }),
    )

    return incidentsWithRoutes
  },
})

// Get incident by ID
export const getIncidentById = query({
  args: {
    incidentId: v.id('incidents'),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    // Fetch route details
    const route = await ctx.db.get(incident.route)

    return {
      ...incident,
      routeDetails: route
        ? {
            routeNumber: route.routeNumber,
            source: route.source,
            destination: route.destination,
          }
        : null,
    }
  },
})

// Get active incidents for a specific route
export const getActiveIncidentsForRoute = query({
  args: {
    routeId: v.id('routes'),
  },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query('incidents')
      .filter((q) =>
        q.and(
          q.eq(q.field('status'), 'ACTIVE'),
          q.eq(q.field('route'), args.routeId),
        ),
      )
      .collect()

    // Filter out expired incidents
    const now = Date.now()
    const activeIncidents = incidents.filter((incident) => {
      if (!incident.validUntil) return true
      return incident.validUntil > now
    })

    return activeIncidents.sort((a, b) => b._creationTime - a._creationTime)
  },
})

// Link incident to user reports (for verification)
export const linkReportsToIncident = mutation({
  args: {
    incidentId: v.id('incidents'),
    reportIds: v.array(v.id('reports')),
    dispatcherId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId)
    if (!incident) {
      throw new Error('Incident not found')
    }

    // Update all specified reports to link them to this incident
    // and mark them as officially confirmed
    for (const reportId of args.reportIds) {
      const report = await ctx.db.get(reportId)
      if (report && report.status !== 'REJECTED') {
        await ctx.db.patch(reportId, {
          incidentId: args.incidentId,
          status: 'OFFICIAL_CONFIRMED',
        })
      }
    }

    return {
      incidentId: args.incidentId,
      linkedReports: args.reportIds.length,
    }
  },
})

// Get statistics for dashboard
export const getIncidentStats = query({
  args: {},
  handler: async (ctx) => {
    const allIncidents = await ctx.db.query('incidents').collect()
    const now = Date.now()

    const activeIncidents = allIncidents.filter((incident) => {
      if (incident.status !== 'ACTIVE') return false
      if (!incident.validUntil) return true
      return incident.validUntil > now
    })

    const resolvedToday = allIncidents.filter((incident) => {
      if (incident.status !== 'RESOLVED') return false
      const resolvedTime = incident.validUntil || incident._creationTime
      return resolvedTime > now - 24 * 60 * 60 * 1000 // Last 24 hours
    })

    const byTransportMode = {
      BUS: activeIncidents.filter((i) => i.transportMode === 'BUS').length,
      TRAIN: activeIncidents.filter((i) => i.transportMode === 'TRAIN').length,
      TRAM: activeIncidents.filter((i) => i.transportMode === 'TRAM').length,
    }

    const byType = {
      DELAY: activeIncidents.filter((i) => i.type === 'DELAY').length,
      CANCELLED: activeIncidents.filter((i) => i.type === 'CANCELLED').length,
      ACCIDENT: activeIncidents.filter((i) => i.type === 'ACCIDENT').length,
      INFO: activeIncidents.filter((i) => i.type === 'INFO').length,
    }

    return {
      totalActive: activeIncidents.length,
      resolvedToday: resolvedToday.length,
      byTransportMode,
      byType,
      totalIncidents: allIncidents.length,
    }
  },
})
