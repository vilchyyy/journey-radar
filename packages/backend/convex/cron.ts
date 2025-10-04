import { internal } from './_generated/api'
import { action } from './_generated/server'

// Daily GTFS schedule loading (runs at 2 AM)
export const dailyGTFSLoad = action({
  args: {},
  handler: async (ctx) => {
    console.log('Starting daily GTFS schedule loading...')
    const result = await ctx.runAction(internal.gtfs.loadGTFSSchedule)
    console.log('Daily GTFS schedule loading result:', result)
    return result
  },
})

// Real-time vehicle position loading (runs every 15 seconds)
export const vehiclePositionRefresh = action({
  args: {},
  handler: async (ctx) => {
    console.log('Refreshing vehicle positions...')
    const result = await ctx.runAction(internal.gtfs.loadVehiclePositions)
    console.log('Vehicle position refresh result:', result)
    return result
  },
})

// Real-time trip updates loading (runs every 15 seconds)
export const tripUpdateRefresh = action({
  args: {},
  handler: async (ctx) => {
    console.log('Refreshing trip updates...')
    const result = await ctx.runAction(internal.gtfs.loadTripUpdates)
    console.log('Trip update refresh result:', result)
    return result
  },
})

// Combined refresh for real-time data
export const realTimeDataRefresh = action({
  args: {},
  handler: async (ctx) => {
    console.log('Starting real-time data refresh...')
    const results = await Promise.allSettled([
      ctx.runAction(internal.gtfs.loadVehiclePositions),
      ctx.runAction(internal.gtfs.loadTripUpdates),
    ])

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length
    const failures = results.length - successes

    console.log(
      `Real-time data refresh completed: ${successes} successes, ${failures} failures`,
    )

    return {
      total: results.length,
      successes,
      failures,
      results: results.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : { success: false, error: String(r.reason) },
      ),
    }
  },
})
