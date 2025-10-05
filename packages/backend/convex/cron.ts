import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'

// GTFS schedule loading (runs every hour)
export const dailyGTFSLoad = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('Starting GTFS schedule loading...')
    const result = await ctx.runAction(internal.gtfs.loadGTFSSchedule)
    console.log('GTFS schedule loading result:', result)
    return result
  },
})

// Real-time vehicle position loading (runs every 15 seconds)
export const vehiclePositionRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('Refreshing vehicle positions...')
    const result = await ctx.runAction(internal.gtfs.loadVehiclePositions)
    console.log('Vehicle position refresh result:', result)
    return result
  },
})

// Real-time trip updates loading (runs every 15 seconds)
export const tripUpdateRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('Refreshing trip updates...')
    const result = await ctx.runAction(internal.gtfs.loadTripUpdates)
    console.log('Trip update refresh result:', result)
    return result
  },
})

// Combined refresh for real-time data
export const realTimeDataRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('Starting real-time data refresh...')
    const results = await Promise.allSettled([
      ctx.runAction(internal.gtfs.loadVehiclePositions),
      ctx.runAction(internal.gtfs.loadTripUpdates),
    ])
  },
})
