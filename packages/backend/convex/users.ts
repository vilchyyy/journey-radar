import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getUserByToken = query({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', args.tokenIdentifier),
      )
      .first()

    return user
  },
})

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .first()

    return user
  },
})

export const ensureUser = mutation({
  args: {
    name: v.string(),
    tokenIdentifier: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    let user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', args.tokenIdentifier),
      )
      .first()

    if (user) {
      // Update user info if needed
      if (user.name !== args.name || user.avatarUrl !== args.avatarUrl) {
        await ctx.db.patch(user._id, {
          name: args.name,
          avatarUrl: args.avatarUrl,
        })
        user = { ...user, name: args.name, avatarUrl: args.avatarUrl }
      }
      return user
    }

    // Create new user
    const userId = await ctx.db.insert('users', {
      name: args.name,
      tokenIdentifier: args.tokenIdentifier,
      points: 0,
      avatarUrl: args.avatarUrl,
      reportsSubmitted: 0,
      verifiedReports: 0,
      reputationScore: 50, // Start with neutral reputation
      receivedUpvotes: 0,
    })

    return await ctx.db.get(userId)
  },
})
