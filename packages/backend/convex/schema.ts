import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // =================================================================
  // USERS TABLE - Stores user information and gamification points
  // =================================================================
  users: defineTable({
    name: v.string(),
    // Connects to your auth provider (e.g., Clerk)
    tokenIdentifier: v.string(),
    points: v.number(),
    avatarUrl: v.optional(v.string()),
    // Essential gamification fields
    reportsSubmitted: v.number(), // Total number of reports submitted
    verifiedReports: v.number(), // Number of reports that were verified
    reputationScore: v.number(), // Overall reputation score for verification
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_reputation', ['reputationScore']),

  // =================================================================
  // REPORTS TABLE - Individual, raw reports from users
  // =================================================================
  reports: defineTable({
    userId: v.id('users'),
    status: v.union(
      v.literal('UNVERIFIED'), // Just submitted
      v.literal('COMMUNITY_VERIFIED'), // Part of a verified cluster
      v.literal('OFFICIAL_CONFIRMED'), // Confirmed by a dispatcher incident
      v.literal('REJECTED'), // Marked as invalid
    ),
    type: v.union(
      v.literal('DELAY'),
      v.literal('CANCELLED'),
      v.literal('CROWDED'),
      v.literal('ACCIDENT'),
      v.literal('OTHER'),
    ),
    // Transport reference - links to vehicle information
    transportId: v.optional(v.id('transports')), // Specific vehicle if known
    // Fallback transport info when specific vehicle not identified
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),

    route: v.id('routes'), // e.g., "52", "139", "SK1"
    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
    // Essential verification field
    verificationScore: v.number(), // Confidence score based on user reputation
    // Link to an official incident if one is created
    incidentId: v.optional(v.id('incidents')),
    // Link to the cluster this report belongs to
    clusterId: v.optional(v.id('reportClusters')),
  })
    // CRITICAL: Geospatial index for "find reports in map view" queries
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_incident', ['incidentId'])
    .index('by_cluster', ['clusterId'])
    .index('by_verification_score', ['verificationScore'])
    .index('by_transport', ['transportId'])
    .index('by_route', ['route']),

  // =================================================================
  // INCIDENTS TABLE - Source of truth from dispatchers or the system
  // =================================================================
  incidents: defineTable({
    source: v.union(v.literal('DISPATCHER'), v.literal('SYSTEM')),
    status: v.union(v.literal('ACTIVE'), v.literal('RESOLVED')),
    type: v.union(
      v.literal('DELAY'),
      v.literal('CANCELLED'),
      v.literal('ACCIDENT'),
      v.literal('INFO'),
    ),
    description: v.string(), // "route 52 is cancelled due to track maintenance."
    // Transport reference - links to vehicle information
    transportId: v.optional(v.id('transports')), // Specific vehicle if known
    // Fallback transport info when specific vehicle not identified
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    route: v.id('routes'), // The affected route
    // Timestamps for the incident's validity period
    validFrom: v.number(), // Unix timestamp (ms)
    validUntil: v.optional(v.number()), // Unix timestamp (ms)
    // Dispatcher integration fields
    dispatcherId: v.optional(v.string()), // ID of the dispatcher who created this
  })
    .index('by_status', ['status'])
    .index('by_transport', ['transportId'])
    .index('by_route', ['route']),

  // =================================================================
  // TRANSPORTS TABLE - Stores all vehicle information
  // =================================================================
  transports: defineTable({
    vehicleNumber: v.string(), // Unique vehicle identifier e.g., "BUS-1234", "TRAIN-567"
    type: v.union(v.literal('BUS'), v.literal('TRAIN'), v.literal('TRAM')),
    route: v.string(), // route number/route e.g., "52", "139", "SK1"
    capacity: v.optional(v.number()), // Vehicle capacity
    features: v.optional(v.array(v.string())), // e.g., ["ac", "low_floor", "wifi"]
  })
    .index('by_vehicle_number', ['vehicleNumber'])
    .index('by_route', ['route']),

  // =================================================================
  // TRIPS TABLE - Stores every running vehicle
  // =================================================================
  trips: defineTable({
    route: v.id('routes'),
    transport: v.id('transports'),
  }),
  // =================================================================
  // HISTORICAL DELAYS TABLE - Aggregated data for predictions
  // =================================================================
  historicalDelays: defineTable({
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    route: v.string(),
    hourOfDay: v.number(), // 0-23
    dayOfWeek: v.number(), // 0-6 (Sunday=0)
    averageDelay: v.number(), // Average delay in minutes
    sampleSize: v.number(), // Number of data points
    lastUpdated: v.number(), // Unix timestamp
  })
    .index('by_route_time', ['route', 'hourOfDay', 'dayOfWeek'])
    .index('by_route', ['route']),

  // =================================================================
  // GTFS ROUTES TABLE - GTFS static route data
  // =================================================================
  gtfsRoutes: defineTable({
    routeId: v.string(), // GTFS route_id
    routeShortName: v.string(), // e.g., "52", "139", "SK1"
    routeLongName: v.string(),
    routeType: v.number(), // GTFS route type (0=tram, 3=bus)
    transportMode: v.union(v.literal('BUS'), v.literal('TRAM')), // Derived from route_type
    lastUpdated: v.number(), // Unix timestamp
  })
    .index('by_route_id', ['routeId'])
    .index('by_route_short_name', ['routeShortName'])
    .index('by_transport_mode', ['transportMode']),

  // =================================================================
  // GTFS TRIPS TABLE - GTFS static trip data
  // =================================================================
  gtfsTrips: defineTable({
    tripId: v.string(), // GTFS trip_id
    routeId: v.string(), // GTFS route_id
    lastUpdated: v.number(), // Unix timestamp
  })
    .index('by_trip_id', ['tripId'])
    .index('by_route_id', ['routeId']),

  // =================================================================
  // GTFS VEHICLE POSITIONS TABLE - Real-time vehicle positions
  // =================================================================
  gtfsVehiclePositions: defineTable({
    vehicleId: v.string(), // Vehicle identifier
    tripId: v.string(), // GTFS trip_id
    routeId: v.string(), // GTFS route_id (extracted from trip mapping)
    routeNumber: v.string(), // Human readable route number
    latitude: v.number(),
    longitude: v.number(),
    bearing: v.optional(v.number()),
    timestamp: v.number(), // Position timestamp
    mode: v.union(v.literal('BUS'), v.literal('TRAM')), // Transport mode
    lastUpdated: v.number(), // When we received this data
  })
    .index('by_vehicle_id', ['vehicleId'])
    .index('by_trip_id', ['tripId'])
    .index('by_route_id', ['routeId'])
    .index('by_mode', ['mode'])
    .index('by_timestamp', ['timestamp']),

  // =================================================================
  // GTFS TRIP UPDATES TABLE - Real-time trip delay information
  // =================================================================
  gtfsTripUpdates: defineTable({
    id: v.string(), // Entity ID
    tripId: v.string(), // GTFS trip_id
    routeId: v.string(), // GTFS route_id
    vehicleId: v.optional(v.string()), // Vehicle ID if available
    mode: v.union(v.literal('BUS'), v.literal('TRAM')), // Transport mode
    stopUpdates: v.array(
      v.object({
        stopId: v.string(),
        arrivalDelay: v.optional(v.number()),
        departureDelay: v.optional(v.number()),
      }),
    ),
    lastUpdated: v.number(), // When we received this data
  })
    .index('by_trip_id', ['tripId'])
    .index('by_route_id', ['routeId'])
    .index('by_vehicle_id', ['vehicleId'])
    .index('by_mode', ['mode']),

  // =================================================================
  // ROUTES TABLE - Route information for navigation
  // =================================================================
  routes: defineTable({
    routeNumber: v.string(), // e.g., "52", "139", "SK1"
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),
    source: v.string(),
    destination: v.string(),
    isActive: v.boolean(),
  })
    .index('by_route_number', ['routeNumber'])
    .index('by_active', ['isActive']),
})
