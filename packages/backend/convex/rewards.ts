import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Get user's current points balance and stats
export const getUserPointsStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const user = await ctx.db.get(userId)
    if (!user) {
      return null
    }

    // Calculate total points from transactions
    const pointTransactions = await ctx.db
      .query('pointTransactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const totalPoints = pointTransactions.reduce(
      (sum, transaction) => sum + transaction.points,
      0,
    )

    // Get recent transactions
    const recentTransactions = await ctx.db
      .query('pointTransactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(10)

    // Calculate verification rate
    const verificationRate =
      user.reportsSubmitted > 0
        ? Math.round((user.verifiedReports / user.reportsSubmitted) * 100)
        : 0

    return {
      totalPoints,
      verificationRate,
      reportsSubmitted: user.reportsSubmitted,
      verifiedReports: user.verifiedReports,
      reputationScore: user.reputationScore,
      recentTransactions: recentTransactions.map((t) => ({
        id: t._id,
        type: t.type,
        description: t.description,
        points: t.points,
        timestamp: t.timestamp,
      })),
    }
  },
})

// Get available rewards for redemption
export const getAvailableRewards = query({
  args: {},
  handler: async (ctx) => {
    const rewards = await ctx.db
      .query('rewards')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect()

    // Filter out expired rewards
    const now = Date.now()
    const validRewards = rewards.filter(
      (reward) => !reward.validUntil || reward.validUntil > now,
    )

    return validRewards.map((reward) => ({
      id: reward._id,
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      category: reward.category,
      imageUrl: reward.imageUrl,
      termsAndConditions: reward.termsAndConditions,
      maxRedemptions: reward.maxRedemptions,
      currentRedemptions: reward.currentRedemptions,
      validUntil: reward.validUntil,
      isAvailable:
        !reward.maxRedemptions ||
        reward.currentRedemptions < reward.maxRedemptions,
    }))
  },
})

// Get user's reward redemptions
export const getUserRedemptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const redemptions = await ctx.db
      .query('rewardRedemptions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(20)

    // Get reward details for each redemption
    const redemptionsWithDetails = await Promise.all(
      redemptions.map(async (redemption) => {
        const reward = await ctx.db.get(redemption.rewardId)
        return {
          id: redemption._id,
          rewardName: reward?.name || 'Unknown Reward',
          rewardDescription: reward?.description || '',
          pointsUsed: redemption.pointsUsed,
          status: redemption.status,
          redemptionCode: redemption.redemptionCode,
          timestamp: redemption.timestamp,
          completedAt: redemption.completedAt,
          notes: redemption.notes,
        }
      }),
    )

    return redemptionsWithDetails
  },
})

// Award points to a user
export const awardPoints = mutation({
  args: {
    points: v.number(),
    type: v.union(
      v.literal('REPORT_SUBMITTED'),
      v.literal('REPORT_VERIFIED'),
      v.literal('REPORT_CONFIRMED'),
      v.literal('WEEKLY_STREAK'),
      v.literal('REPUTATION_BONUS'),
      v.literal('ADMIN_ADJUSTMENT'),
    ),
    description: v.string(),
    relatedReportId: v.optional(v.id('reports')),
    relatedIncidentId: v.optional(v.id('incidents')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Create point transaction
    const transactionId = await ctx.db.insert('pointTransactions', {
      userId,
      points: args.points,
      type: args.type,
      description: args.description,
      relatedReportId: args.relatedReportId,
      relatedIncidentId: args.relatedIncidentId,
      timestamp: Date.now(),
    })

    // Update user stats if this is a report transaction
    if (args.type === 'REPORT_SUBMITTED') {
      await ctx.db.patch(userId, {
        reportsSubmitted: (await ctx.db.get(userId))!.reportsSubmitted + 1,
      })
    }

    return transactionId
  },
})

// Redeem a reward
export const redeemReward = mutation({
  args: {
    rewardId: v.id('rewards'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Get the reward
    const reward = await ctx.db.get(args.rewardId)
    if (!reward || !reward.isActive) {
      throw new Error('Reward not available')
    }

    // Check if reward is expired
    if (reward.validUntil && reward.validUntil < Date.now()) {
      throw new Error('Reward has expired')
    }

    // Check max redemptions
    if (
      reward.maxRedemptions &&
      reward.currentRedemptions >= reward.maxRedemptions
    ) {
      throw new Error('Reward is no longer available')
    }

    // Get user's current points
    const pointTransactions = await ctx.db
      .query('pointTransactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const userPoints = pointTransactions.reduce(
      (sum, transaction) => sum + transaction.points,
      0,
    )

    // Check if user has enough points
    if (userPoints < reward.pointsCost) {
      throw new Error('Insufficient points')
    }

    // Create redemption record
    const redemptionCode = `RWD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const redemptionId = await ctx.db.insert('rewardRedemptions', {
      userId,
      rewardId: args.rewardId,
      pointsUsed: reward.pointsCost,
      status: 'PENDING',
      redemptionCode,
      timestamp: Date.now(),
    })

    // Create point transaction for spending points
    await ctx.db.insert('pointTransactions', {
      userId,
      points: -reward.pointsCost,
      type: 'VOUCHER_REDEEMED',
      description: `Redeemed: ${reward.name}`,
      timestamp: Date.now(),
    })

    // Update reward redemption count
    await ctx.db.patch(args.rewardId, {
      currentRedemptions: reward.currentRedemptions + 1,
    })

    return {
      redemptionId,
      redemptionCode,
      rewardName: reward.name,
    }
  },
})

// Get detailed transaction history
export const getTransactionHistory = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    let query = ctx.db
      .query('pointTransactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')

    if (args.limit) {
      query = query.take(args.limit)
    }

    const transactions = await query.collect()

    return transactions.map((t) => ({
      id: t._id,
      type: t.type,
      description: t.description,
      points: t.points,
      timestamp: t.timestamp,
      relatedReportId: t.relatedReportId,
      relatedIncidentId: t.relatedIncidentId,
    }))
  },
})
