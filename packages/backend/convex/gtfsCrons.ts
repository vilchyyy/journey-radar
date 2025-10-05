import { Crons } from '@convex-dev/crons'
import { components, internal } from './_generated/api'
import { internalAction, internalMutation } from './_generated/server'

const crons = new Crons(components.crons)

// Initialize crons on deployment
export const init = internalMutation({
  handler: async (ctx) => {
    // Register real-time data refresh cron (every 15 seconds)
    if ((await crons.get(ctx, { name: 'real-time-refresh' })) === null) {
      await crons.register(
        ctx,
        { kind: 'interval', ms: 15000 }, // 15 seconds
        internal.cron.realTimeDataRefresh,
        {},
        'real-time-refresh',
      )
      console.log('Registered real-time data refresh cron')
    }

    // Register daily GTFS load cron (every day at 2:00 AM)
    if ((await crons.get(ctx, { name: 'daily-gtfs-load' })) === null) {
      await crons.register(
        ctx,
        { kind: 'cron', cronspec: '0 0 2 * * *' }, // Every day at 2:00 AM
        internal.cron.dailyGTFSLoad,
        {},
        'daily-gtfs-load',
      )
      console.log('Registered daily GTFS load cron')
    }
  },
})

// Manual trigger functions for testing
export const triggerRealTimeRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(internal.cron.realTimeDataRefresh)
  },
})

export const triggerDailyLoad = internalAction({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(internal.cron.dailyGTFSLoad)
  },
})

// Function to list all registered crons
export const listCrons = internalAction({
  args: {},
  handler: async (ctx) => {
    return await crons.list(ctx)
  },
})
