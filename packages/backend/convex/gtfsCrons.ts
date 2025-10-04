import { cronJobs } from '@convex-dev/crons'

export default cronJobs([
  {
    job: 'internal.cron.realTimeDataRefresh',
    crontab: '*/15 * * * * *', // Every 15 seconds
  },
  {
    job: 'internal.cron.dailyGTFSLoad',
    crontab: '0 0 2 * * *', // Every day at 2:00 AM
  },
])

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