import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // =================================================================
  // 1. USERS TABLE - Stores user information and gamification points
  // =================================================================
  users: defineTable({
    name: v.string(),
    // Connects to your auth provider (e.g., Clerk)
    tokenIdentifier: v.string(),
    points: v.number(),
    avatarUrl: v.optional(v.string()),
  }).index('by_token', ['tokenIdentifier']),

  // =================================================================
  // 2. REPORTS TABLE - Individual, raw reports from users
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
    // CORE GEOSPATIAL DATA
    transportInfo: v.object({
      mode: v.union(v.literal('BUS'), v.literal('TRAIN'), v.literal('TRAM')),
      line: v.string(), // e.g., "52", "139", "SK1"
      destination: v.optional(v.string()),
    }),
    comment: v.optional(v.string()),
    delayMinutes: v.optional(v.number()),
    // Link to an official incident if one is created
    incidentId: v.optional(v.id('incidents')),
    // Link to the cluster this report belongs to
    clusterId: v.optional(v.id('reportClusters')),
  })
    // CRITICAL: Geospatial index for "find reports in map view" queries
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_incident', ['incidentId'])
    .index('by_cluster', ['clusterId']),

  // =================================================================
  // 3. INCIDENTS TABLE - Source of truth from dispatchers or the system
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
    description: v.string(), // "Line 52 is cancelled due to track maintenance."
    transportInfo: v.object({
      mode: v.union(v.literal('BUS'), v.literal('TRAIN'), v.literal('TRAM')),
      line: v.string(), // The affected line
    }),
    // Timestamps for the incident's validity period
    validFrom: v.number(), // Unix timestamp (ms)
    validUntil: v.optional(v.number()), // Unix timestamp (ms)
  }),
})
