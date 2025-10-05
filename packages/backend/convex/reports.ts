import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import { geospatial } from './index'

// Helper function for report creation - used by both public mutation and seeding
export const createReportHelper = internalMutation({
  args: {
    userId: v.optional(v.id('users')),
    isAnonymous: v.optional(v.boolean()),
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
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    route: v.optional(v.id('routes')),
    gtfsRouteId: v.optional(v.string()),
    gtfsTripId: v.optional(v.string()),
    gtfsVehicleId: v.optional(v.string()),
    routeShortName: v.optional(v.string()),
    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Determine if this is an anonymous report
    const isAnonymous = args.isAnonymous ?? !args.userId

    // Calculate verification score based on user reputation or default for anonymous
    let verificationScore = 0.5 // Default for anonymous users

    if (args.userId) {
      const user = await ctx.db.get(args.userId)
      if (user) {
        // Higher reputation users get higher verification scores
        verificationScore = Math.min(1, user.reputationScore / 100)
      }
    }

    // Convert GTFS string IDs to Convex ID references when available
    let gtfsRouteIdConvex: Id<'gtfsRoutes'> | undefined
    let gtfsTripIdConvex: Id<'gtfsTrips'> | undefined
    let gtfsVehicleIdConvex: Id<'gtfsVehiclePositions'> | undefined

    // Convert GTFS route ID
    if (args.gtfsRouteId) {
      const gtfsRoute = await ctx.db
        .query('gtfsRoutes')
        .withIndex('by_route_id', (q) => q.eq('routeId', args.gtfsRouteId))
        .first()
      if (gtfsRoute) {
        gtfsRouteIdConvex = gtfsRoute._id
        console.log(
          `✅ Converted GTFS route ID: ${args.gtfsRouteId} -> ${gtfsRouteIdConvex}`,
        )
      } else {
        console.log(`⚠️ GTFS route not found: ${args.gtfsRouteId}`)
      }
    }

    // Convert GTFS trip ID
    if (args.gtfsTripId) {
      const gtfsTrip = await ctx.db
        .query('gtfsTrips')
        .withIndex('by_trip_id', (q) => q.eq('tripId', args.gtfsTripId))
        .first()
      if (gtfsTrip) {
        gtfsTripIdConvex = gtfsTrip._id
        console.log(
          `✅ Converted GTFS trip ID: ${args.gtfsTripId} -> ${gtfsTripIdConvex}`,
        )
      } else {
        console.log(`⚠️ GTFS trip not found: ${args.gtfsTripId}`)
      }
    }

    // Convert GTFS vehicle ID
    if (args.gtfsVehicleId) {
      const gtfsVehicle = await ctx.db
        .query('gtfsVehiclePositions')
        .withIndex('by_vehicle_id', (q) =>
          q.eq('vehicleId', args.gtfsVehicleId),
        )
        .first()
      if (gtfsVehicle) {
        gtfsVehicleIdConvex = gtfsVehicle._id
        console.log(
          `✅ Converted GTFS vehicle ID: ${args.gtfsVehicleId} -> ${gtfsVehicleIdConvex}`,
        )
      } else {
        console.log(`⚠️ GTFS vehicle not found: ${args.gtfsVehicleId}`)
      }
    }

    const reportId = await ctx.db.insert('reports', {
      userId: args.userId,
      isAnonymous,
      status: 'UNVERIFIED',
      type: args.type,
      transportMode: args.transportMode,
      route: args.route,
      gtfsRouteId: args.gtfsRouteId,
      gtfsTripId: args.gtfsTripId,
      gtfsVehicleId: args.gtfsVehicleId,
      routeShortName: args.routeShortName,
      comment: args.comment,
      delayMinutes: args.delayMinutes,
      verificationScore,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
    })

    // Add to geospatial index for location-based queries
    await geospatial.insert(
      ctx,
      reportId,
      {
        latitude: args.location.latitude,
        longitude: args.location.longitude,
      },
      { category: args.type },
    )

    // Update user stats if not anonymous
    if (args.userId) {
      const user = await ctx.db.get(args.userId)
      if (user) {
        await ctx.db.patch(user._id, {
          points: user.points + 10,
          reportsSubmitted: user.reportsSubmitted + 1,
        })
      }
    }

    return reportId
  },
})

export const getReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const query = ctx.db.query('reports')
    if (limit) {
      const reports = await query.take(limit)
      return reports
    }
    const reports = await query.collect()
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
    const krakowCenter = { latitude: 50.0614, longitude: 19.9365 } // Kraków Main Market Square
    const hugeRadius = 50000 // 50km in meters

    const allNearbyReports = await geospatial.queryNearest(
      ctx,
      krakowCenter,
      100,
      hugeRadius,
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

// Create a new report with location data (supports anonymous reporting)
export const createReport = mutation({
  args: {
    userId: v.optional(v.id('users')),
    isAnonymous: v.optional(v.boolean()),
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
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    route: v.optional(v.id('routes')),
    // GTFS route information (for reports on GTFS-only routes)
    gtfsRouteId: v.optional(v.string()), // GTFS route_id string
    gtfsTripId: v.optional(v.string()), // GTFS trip_id string
    gtfsVehicleId: v.optional(v.string()), // Vehicle ID string
    routeShortName: v.optional(v.string()),
    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await createReportHelper(ctx, args)
  },
})

// Vote on a report (upvote or downvote)
export const voteOnReport = mutation({
  args: {
    reportId: v.id('reports'),
    userId: v.id('users'),
    voteType: v.union(v.literal('UPVOTE'), v.literal('DOWNVOTE')),
  },
  handler: async (ctx, args) => {
    const { reportId, userId, voteType } = args

    // Check if the report exists
    const report = await ctx.db.get(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    // Check if user has already voted on this report
    const existingVote = await ctx.db
      .query('reportVotes')
      .withIndex('by_report_user', (q) =>
        q.eq('reportId', reportId).eq('userId', userId),
      )
      .first()

    if (existingVote) {
      // User is changing their vote
      if (existingVote.voteType === voteType) {
        // User is trying to vote the same way, remove their vote
        await ctx.db.delete(existingVote._id)

        // Update report vote counts
        const voteDiff = voteType === 'UPVOTE' ? -1 : 1
        await ctx.db.patch(reportId, {
          upvotes: report.upvotes - (voteType === 'UPVOTE' ? 1 : 0),
          downvotes: report.downvotes - (voteType === 'DOWNVOTE' ? 1 : 0),
          voteScore: report.voteScore - voteDiff,
        })

        return { action: 'removed', voteScore: report.voteScore - voteDiff }
      } else {
        // User is changing their vote direction
        await ctx.db.patch(existingVote._id, { voteType })

        // Update report vote counts (remove old vote, add new vote)
        const oldVoteDiff = existingVote.voteType === 'UPVOTE' ? -2 : 2 // Old vote removed + new vote added
        const newVoteScore = report.voteScore + oldVoteDiff

        await ctx.db.patch(reportId, {
          upvotes:
            existingVote.voteType === 'UPVOTE'
              ? report.upvotes - 1
              : report.upvotes + 1,
          downvotes:
            existingVote.voteType === 'DOWNVOTE'
              ? report.downvotes - 1
              : report.downvotes + 1,
          voteScore: newVoteScore,
        })

        return { action: 'changed', voteScore: newVoteScore }
      }
    } else {
      // New vote
      await ctx.db.insert('reportVotes', {
        reportId,
        userId,
        voteType,
        createdAt: Date.now(),
      })

      // Update report vote counts
      const voteDiff = voteType === 'UPVOTE' ? 1 : -1
      const newVoteScore = report.voteScore + voteDiff

      await ctx.db.patch(reportId, {
        upvotes: report.upvotes + (voteType === 'UPVOTE' ? 1 : 0),
        downvotes: report.downvotes + (voteType === 'DOWNVOTE' ? 1 : 0),
        voteScore: newVoteScore,
      })

      // If this is an upvote and report has a user, give them a point
      if (voteType === 'UPVOTE' && report.userId && !report.isAnonymous) {
        const reportAuthor = await ctx.db.get(report.userId)
        if (reportAuthor) {
          await ctx.db.patch(report.userId, {
            points: reportAuthor.points + 1,
            receivedUpvotes: (reportAuthor.receivedUpvotes || 0) + 1,
          })
        }
      }

      // Check if report should be deleted due to low score
      if (newVoteScore <= -3) {
        await ctx.db.delete(reportId)
        // Also delete all votes for this report
        const votes = await ctx.db
          .query('reportVotes')
          .withIndex('by_report', (q) => q.eq('reportId', reportId))
          .collect()
        for (const vote of votes) {
          await ctx.db.delete(vote._id)
        }
        return { action: 'deleted', voteScore: newVoteScore }
      }

      return { action: 'added', voteScore: newVoteScore }
    }
  },
})

// Get user's vote on a specific report
export const getUserVote = query({
  args: {
    reportId: v.id('reports'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query('reportVotes')
      .withIndex('by_report_user', (q) =>
        q.eq('reportId', args.reportId).eq('userId', args.userId),
      )
      .first()

    return vote ? vote.voteType : null
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

      // Get route info if available
      let route = null
      if (row.route) {
        route = await ctx.db.get(row.route as Id<'routes'>)
      }

      results.push({
        ...row,
        location: {
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
        },
        transportInfo: route ? { ...route } : undefined,
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

      // Get route info if available (from routes table or GTFS)
      let route = null
      if (row.route) {
        route = await ctx.db.get(row.route as Id<'routes'>)
      }

      // If route filter is set, check both route table and GTFS route
      if (routeFilter) {
        const routeMatches = route?.routeNumber === routeFilter
        const gtfsRouteMatches = row.routeShortName === routeFilter

        if (!routeMatches && !gtfsRouteMatches) {
          continue
        }
      }

      results.push({
        ...row,
        location: {
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
        },
        transportInfo: route ? { ...route } : undefined,
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

// Get reports for a specific transport
export const getTransportReports = query({
  args: {
    routeNumber: v.string(),
    mode: v.union(v.literal('BUS'), v.literal('TRAM')),
    routeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { routeNumber, mode, routeId } = args

    // Get all reports for this transport mode
    const reports = await ctx.db
      .query('reports')
      .withIndex('by_transport_mode', (q) => q.eq('transportMode', mode))
      .collect()

    const results = []
    for (const report of reports) {
      // Get the route information
      const route = await ctx.db.get(report.route as Id<'routes'>)
      if (!route) continue

      // Filter by route number if specified
      if (route.routeNumber !== routeNumber) continue

      // If routeId is specified, filter by that too
      if (routeId && route._id !== routeId) continue

      results.push({
        ...report,
        route,
      })
    }

    // Sort by creation time (newest first)
    return results.sort((a, b) => {
      const timeA = a._creationTime || 0
      const timeB = b._creationTime || 0
      return timeB - timeA
    })
  },
})

// Get reports for a specific trip with location tracking
export const getTripReports = query({
  args: {
    tripId: v.optional(v.string()),
    routeNumber: v.optional(v.string()),
    mode: v.optional(
      v.union(v.literal('BUS'), v.literal('TRAM'), v.literal('TRAIN')),
    ),
    routeId: v.optional(v.string()),
    vehicleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tripId, routeNumber, mode, routeId, vehicleId } = args
    console.log(tripId, routeNumber, mode, routeId, vehicleId)
    // Build a more efficient query with the most selective filters first
    let reportsQuery = ctx.db.query('reports')

    // Filter by transport mode if specified (most selective filter)
    if (mode) {
      reportsQuery = reportsQuery.filter((q) =>
        q.eq(q.field('transportMode'), mode),
      )
    }

    const reports = await reportsQuery.collect()

    const results = []
    for (const report of reports) {
      try {
        // Apply GTFS filters first if they exist
        if (tripId && report.gtfsTripId !== tripId) continue
        if (vehicleId && report.gtfsVehicleId !== vehicleId) continue

        // Check route match via multiple sources
        let routeMatches = false

        // 1. Check if report references route table
        if (report.route) {
          const route = await ctx.db.get(report.route as Id<'routes'>)
          if (route) {
            if (routeNumber && route.routeNumber !== routeNumber) continue
            if (routeId && route._id.toString() !== routeId) continue
            routeMatches = true
          }
        }

        // 2. Check GTFS route short name if no route table match
        if (!routeMatches && report.routeShortName) {
          if (routeNumber && report.routeShortName !== routeNumber) continue
          routeMatches = true
        }

        // 3. If neither matches, skip this report
        if (!routeMatches && (routeNumber || routeId)) continue

        // Get current vehicle position to check if issue is still active
        let currentVehiclePosition = null
        let hasProgressed = false
        let reportLocation = null

        // Try to get report location from geospatial index
        if (report._id) {
          const geospatialResults = await geospatial.queryNearest(
            ctx,
            { latitude: 50.0614, longitude: 19.9383 }, // Default center, will get overridden
            100000, // Large radius to ensure we find it
            1, // We only need the closest point which should be the report itself
          )

          const reportPoint = geospatialResults.find(
            (result) => result.key === report._id,
          )

          if (reportPoint) {
            reportLocation = {
              latitude: reportPoint.coordinates.latitude,
              longitude: reportPoint.coordinates.longitude,
            }
          }
        }

        if (vehicleId && reportLocation) {
          // Get current vehicle position
          const vehiclePositions = await ctx.db
            .query('gtfsVehiclePositions')
            .filter((q) => q.eq(q.field('vehicleId'), vehicleId))
            .collect()

          if (vehiclePositions.length > 0) {
            currentVehiclePosition = vehiclePositions[0]

            // Calculate distance between report location and current vehicle position
            const reportLat = reportLocation.latitude
            const reportLng = reportLocation.longitude
            const vehicleLat = currentVehiclePosition.latitude
            const vehicleLng = currentVehiclePosition.longitude

            const R = 6371 // Earth's radius in kilometers
            const dLat = ((vehicleLat - reportLat) * Math.PI) / 180
            const dLon = ((vehicleLng - reportLng) * Math.PI) / 180
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((reportLat * Math.PI) / 180) *
                Math.cos((vehicleLat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            const distance = R * c

            // Consider the vehicle has progressed if it's more than 1km away
            hasProgressed = distance > 1
          }
        }

        // Get route information for display
        let route = null
        if (report.route) {
          route = await ctx.db.get(report.route as Id<'routes'>)
        }

        results.push({
          ...report,
          route,
          currentVehiclePosition,
          hasProgressed,
          issueStatus: hasProgressed
            ? 'Vehicle has moved from issue location'
            : 'Issue may still be active',
        })
      } catch (error) {
        console.error('Error processing report:', error)
      }
    }

    // Sort by creation time (newest first)
    return results.sort((a, b) => {
      const timeA = a._creationTime || 0
      const timeB = b._creationTime || 0
      return timeB - timeA
    })
  },
})
