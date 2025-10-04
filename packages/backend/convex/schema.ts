import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    // Connects to your auth provider (e.g., Clerk)
    tokenIdentifier: v.string(),
    points: v.number(),
    avatarUrl: v.optional(v.string()),
  }).index('by_token', ['tokenIdentifier']),
})
