import { internal } from './_generated/api'
import { action } from './_generated/server'

// Note: Cron jobs are now defined in crons.ts and run automatically:
// - Real-time data refresh every 15 seconds
// - GTFS schedule load every hour

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
