import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
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
    receivedUpvotes: v.number(), // Number of upvotes received on reports
  })
    .index('by_token', ['tokenIdentifier'])
    .index('by_reputation', ['reputationScore']),

  // =================================================================
  // REPORTS TABLE - Individual, raw reports from users
  // =================================================================
  reports: defineTable({
    userId: v.optional(v.id('users')), // Optional for anonymous reports
    isAnonymous: v.boolean(), // Flag to indicate anonymous reports
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
    // Transport reference - replaced by GTFS data
    // Note: Real-time vehicle info now comes from gtfsVehiclePositions
    transportMode: v.union(
      v.literal('BUS'),
      v.literal('TRAIN'),
      v.literal('TRAM'),
    ),

    route: v.optional(v.id('routes')), // Optional to support GTFS-only routes
    // GTFS route information (used when route is not in routes table)
    gtfsRouteId: v.optional(v.string()),
    gtfsTripId: v.optional(v.string()),
    gtfsVehicleId: v.optional(v.string()),
    routeShortName: v.optional(v.string()), // e.g., "52", "139"

    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
    // Essential verification field
    verificationScore: v.number(), // Confidence score based on user reputation
    // Link to an official incident if one is created
    incidentId: v.optional(v.id('incidents')),
    // Link to the cluster this report belongs to
    clusterId: v.optional(v.id('reportClusters')),
    // Voting fields
    upvotes: v.optional(v.number()), // Number of upvotes (optional for backwards compatibility)
    downvotes: v.optional(v.number()), // Number of downvotes (optional for backwards compatibility)
    voteScore: v.optional(v.number()), // Net score (upvotes - downvotes) (optional for backwards compatibility)
  })
    // CRITICAL: Geospatial index for "find reports in map view" queries
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_incident', ['incidentId'])
    .index('by_cluster', ['clusterId'])
    .index('by_verification_score', ['verificationScore'])
    .index('by_transport_mode', ['transportMode'])
    .index('by_route', ['route'])
    .index('by_gtfs_route', ['gtfsRouteId'])
    .index('by_gtfs_trip', ['gtfsTripId'])
    .index('by_anonymous', ['isAnonymous']),

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
    // Transport reference - replaced by GTFS data
    // Note: Real-time vehicle info now comes from gtfsVehiclePositions
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
    .index('by_route', ['route']),

  // Removed redundant tables - replaced by GTFS data:
  // - transports: replaced by gtfsVehiclePositions
  // - trips: replaced by gtfsTrips
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

  // =================================================================
  // REPORT VOTES TABLE - Tracks individual votes on reports
  // =================================================================
  reportVotes: defineTable({
    reportId: v.id('reports'), // The report being voted on
    userId: v.id('users'), // The user who voted
    voteType: v.union(v.literal('UPVOTE'), v.literal('DOWNVOTE')), // Vote direction
    createdAt: v.number(), // Unix timestamp when vote was cast
  })
    .index('by_report', ['reportId'])
    .index('by_user', ['userId'])
    .index('by_report_user', ['reportId', 'userId']), // Prevent duplicate votes

  // =================================================================
  // POINT TRANSACTIONS TABLE - Tracks all point transactions for users
  // =================================================================
  pointTransactions: defineTable({
    userId: v.id('users'), // The user who earned/spent points
    points: v.number(), // Positive for earning, negative for spending
    type: v.union(
      v.literal('REPORT_SUBMITTED'),
      v.literal('REPORT_VERIFIED'),
      v.literal('REPORT_CONFIRMED'),
      v.literal('WEEKLY_STREAK'),
      v.literal('REPUTATION_BONUS'),
      v.literal('ADMIN_ADJUSTMENT'),
      v.literal('VOUCHER_REDEEMED'),
    ),
    description: v.string(), // Human-readable description
    relatedReportId: v.optional(v.id('reports')), // Related report if applicable
    relatedIncidentId: v.optional(v.id('incidents')), // Related incident if applicable
    timestamp: v.number(), // Unix timestamp when transaction occurred
  })
    .index('by_user', ['userId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_user_timestamp', ['userId', 'timestamp']),

  // =================================================================
  // REWARDS TABLE - Available rewards for redemption
  // =================================================================
  rewards: defineTable({
    name: v.string(), // Reward name
    description: v.string(), // Detailed description
    pointsCost: v.number(), // Points required to redeem
    category: v.union(
      v.literal('DISCOUNT'),
      v.literal('VOUCHER'),
      v.literal('EXPERIENCE'),
      v.literal('MERCHANDISE'),
      v.literal('DIGITAL'),
    ),
    imageUrl: v.optional(v.string()), // Image URL for the reward
    termsAndConditions: v.optional(v.string()), // Terms and conditions
    maxRedemptions: v.optional(v.number()), // Maximum times this reward can be redeemed
    currentRedemptions: v.number(), // Current number of redemptions
    validUntil: v.optional(v.number()), // Expiration timestamp (optional)
    isActive: v.boolean(), // Whether this reward is currently available
    createdAt: v.number(), // When this reward was created
  })
    .index('by_active', ['isActive'])
    .index('by_category', ['category'])
    .index('by_points_cost', ['pointsCost'])
    .index('by_created', ['createdAt']),

  // =================================================================
  // REWARD REDEMPTIONS TABLE - Tracks user reward redemptions
  // =================================================================
  rewardRedemptions: defineTable({
    userId: v.id('users'), // User who redeemed the reward
    rewardId: v.id('rewards'), // The reward that was redeemed
    pointsUsed: v.number(), // Points spent on this redemption
    status: v.union(
      v.literal('PENDING'), // Redemption created, waiting for completion
      v.literal('COMPLETED'), // Reward has been delivered/used
      v.literal('CANCELLED'), // Redemption was cancelled
      v.literal('EXPIRED'), // Redemption expired
    ),
    redemptionCode: v.string(), // Unique code for this redemption
    timestamp: v.number(), // When the redemption was created
    completedAt: v.optional(v.number()), // When the redemption was completed
    notes: v.optional(v.string()), // Additional notes about the redemption
  })
    .index('by_user', ['userId'])
    .index('by_reward', ['rewardId'])
    .index('by_status', ['status'])
    .index('by_timestamp', ['timestamp'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
})
