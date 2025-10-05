import { v } from 'convex/values'
import { mutation } from '../_generated/server'

// Sample rewards data
const sampleRewards = [
  {
    name: 'Free Travel Voucher',
    description:
      'Get a free one-day travel pass for all public transport in the city',
    pointsCost: 100,
    category: 'TRAVEL' as const,
    isActive: true,
    termsAndConditions:
      'Valid for 24 hours from activation. Cannot be combined with other offers.',
    maxRedemptions: 50,
    currentRedemptions: 0,
    validUntil: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days from now
  },
  {
    name: 'Coffee Shop Discount',
    description:
      '20% off at participating coffee shops near major transport hubs',
    pointsCost: 50,
    category: 'FOOD' as const,
    isActive: true,
    termsAndConditions:
      'Valid Monday-Friday before 10am. One use per customer.',
    maxRedemptions: 200,
    currentRedemptions: 0,
    validUntil: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days from now
  },
  {
    name: 'Monthly Travel Pass 50% Off',
    description: 'Get 50% discount on your monthly public transport pass',
    pointsCost: 500,
    category: 'TRAVEL' as const,
    isActive: true,
    termsAndConditions:
      'Valid for one month only. Must be redeemed within 7 days of claim.',
    maxRedemptions: 20,
    currentRedemptions: 0,
    validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
  },
  {
    name: 'City Transport Merchandise',
    description:
      'Exclusive city transport themed merchandise (t-shirt, water bottle, or tote bag)',
    pointsCost: 150,
    category: 'MERCHANDISE' as const,
    isActive: true,
    termsAndConditions: 'Choose from available designs. Shipping included.',
    maxRedemptions: 100,
    currentRedemptions: 0,
    validUntil: Date.now() + 120 * 24 * 60 * 60 * 1000, // 120 days from now
  },
  {
    name: 'Premium App Features',
    description:
      'Unlock premium features in the Journey Radar app for 3 months',
    pointsCost: 200,
    category: 'DIGITAL' as const,
    isActive: true,
    termsAndConditions:
      'Features include advanced analytics, custom alerts, and priority support.',
    maxRedemptions: null, // unlimited
    currentRedemptions: 0,
    validUntil: Date.now() + 180 * 24 * 60 * 60 * 1000, // 180 days from now
  },
]

// Migration to add sample rewards
export const addSampleRewards = mutation({
  handler: async (ctx) => {
    console.log('🎁 Adding sample rewards...')

    for (const reward of sampleRewards) {
      const existingRewards = await ctx.db
        .query('rewards')
        .filter((q) => q.eq(q.field('name'), reward.name))
        .collect()

      if (existingRewards.length === 0) {
        await ctx.db.insert('rewards', reward)
        console.log(`✅ Added reward: ${reward.name}`)
      } else {
        console.log(`⚠️ Reward already exists: ${reward.name}`)
      }
    }

    console.log('🏁 Sample rewards migration completed')
  },
})

// Helper function to seed a user with some sample points and transactions
export const seedUserPoints = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    console.log(`🌱 Seeding points for user: ${args.userId}`)

    // Add some sample point transactions
    const sampleTransactions = [
      {
        type: 'REPORT_SUBMITTED' as const,
        description: 'Reported delay on Bus 52',
        points: 10,
      },
      {
        type: 'REPORT_VERIFIED' as const,
        description: 'Your report was verified by the community',
        points: 5,
      },
      {
        type: 'REPORT_CONFIRMED' as const,
        description: 'Your report was confirmed as an official incident',
        points: 15,
      },
      {
        type: 'WEEKLY_STREAK' as const,
        description: 'Weekly reporting streak bonus',
        points: 25,
      },
      {
        type: 'REPUTATION_BONUS' as const,
        description: 'Bonus for high reputation score',
        points: 20,
      },
    ]

    for (const transaction of sampleTransactions) {
      await ctx.db.insert('pointTransactions', {
        userId: args.userId,
        points: transaction.points,
        type: transaction.type,
        description: transaction.description,
        timestamp: Date.now() - Math.random() * (7 * 24 * 60 * 60 * 1000), // Random time in last week
      })
    }

    console.log('✅ User points seeding completed')
  },
})
