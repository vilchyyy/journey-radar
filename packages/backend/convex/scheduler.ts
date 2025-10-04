import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, mutation } from './_generated/server'

// Store the last run times to control scheduling
export const setLastRun = mutation({
  args: {
    jobType: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // In a production system, you might want to store this in a dedicated table
    // For now, we'll use the system scheduler or external cron
    console.log(
      `Set last run for ${args.jobType} to ${new Date(args.timestamp).toISOString()}`,
    )
  },
})

// Note: Manual scheduling has been replaced by Convex cron jobs in gtfs-crons.ts
// The cron jobs will run automatically:
// - Real-time data refresh every 15 seconds
// - Daily GTFS load at 2:00 AM

// Legacy manual trigger functions (kept for backward compatibility)
export const runScheduledJobs = action({
  args: {},
  handler: async (ctx) => {
    console.log('Manual trigger of scheduled jobs...')
    return await ctx.runAction(internal.cron.realTimeDataRefresh)
  },
})

// Manual trigger functions for testing and management
export const triggerDailyLoad = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(internal.cron.dailyGTFSLoad)
  },
})

export const triggerRealTimeRefresh = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(internal.cron.realTimeDataRefresh)
  },
})
