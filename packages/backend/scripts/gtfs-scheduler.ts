#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

// Initialize Convex client
const convex = new ConvexHttpClient(
  process.env.CONVEX_URL || 'http://localhost:3217',
)

// Main scheduler function
async function runScheduler() {
  console.log('Starting GTFS scheduler...')

  try {
    // Run real-time data refresh (vehicle positions and trip updates)
    const realTimeResult = await convex.mutation(
      api.scheduler.triggerRealTimeRefresh,
    )
    console.log('Real-time refresh result:', realTimeResult)

    // Check if it's time for daily load (2 AM)
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()

    if (hour === 2 && minute === 0) {
      console.log('Running daily GTFS schedule load...')
      const dailyResult = await convex.mutation(api.scheduler.triggerDailyLoad)
      console.log('Daily load result:', dailyResult)
    }

    console.log('Scheduler run completed')
  } catch (error) {
    console.error('Error running scheduler:', error)
  }
}

// Run immediately when called
if (require.main === module) {
  runScheduler().catch(console.error)
}

// Export for use as module
export { runScheduler }
