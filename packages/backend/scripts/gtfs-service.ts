#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

// Initialize Convex client
const convex = new ConvexHttpClient(
  process.env.CONVEX_URL || 'http://localhost:3217',
)

// Configuration
const REAL_TIME_INTERVAL = 15 * 1000 // 15 seconds
const DAILY_CHECK_INTERVAL = 60 * 1000 // 1 minute (to check if it's 2 AM)

let lastDailyLoad = 0
const ONE_DAY = 24 * 60 * 60 * 1000

// Run real-time data refresh
async function runRealTimeRefresh() {
  try {
    console.log(
      `[${new Date().toISOString()}] Running real-time GTFS refresh...`,
    )
    const result = await convex.mutation(api.cron.realTimeDataRefresh)
    console.log(
      `[${new Date().toISOString()}] Real-time refresh completed:`,
      result,
    )
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in real-time refresh:`,
      error,
    )
  }
}

// Run daily GTFS load
async function runDailyLoad() {
  try {
    console.log(`[${new Date().toISOString()}] Running daily GTFS load...`)
    const result = await convex.mutation(api.cron.dailyGTFSLoad)
    console.log(`[${new Date().toISOString()}] Daily load completed:`, result)
    lastDailyLoad = Date.now()
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in daily load:`, error)
  }
}

// Check if it's time for daily load
function shouldRunDailyLoad(): boolean {
  const now = Date.now()
  const nowDate = new Date()
  const hour = nowDate.getHours()
  const minute = nowDate.getMinutes()

  // Run at 2:00 AM and haven't run in the last 24 hours
  return hour === 2 && minute === 0 && now - lastDailyLoad > ONE_DAY
}

// Main service loop
async function startService() {
  console.log(`[${new Date().toISOString()}] Starting GTFS service...`)
  console.log(
    `[${new Date().toISOString()}] Real-time refresh interval: ${REAL_TIME_INTERVAL / 1000}s`,
  )

  // Run initial load
  console.log(`[${new Date().toISOString()}] Running initial GTFS data load...`)
  await runDailyLoad()
  await runRealTimeRefresh()

  // Set up intervals
  setInterval(async () => {
    await runRealTimeRefresh()

    if (shouldRunDailyLoad()) {
      await runDailyLoad()
    }
  }, REAL_TIME_INTERVAL)

  console.log(`[${new Date().toISOString()}] GTFS service started successfully`)
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(
    `[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...`,
  )
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log(
    `[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...`,
  )
  process.exit(0)
})

// Start the service
if (require.main === module) {
  startService().catch((error) => {
    console.error(
      `[${new Date().toISOString()}] Failed to start GTFS service:`,
      error,
    )
    process.exit(1)
  })
}

export { startService }
