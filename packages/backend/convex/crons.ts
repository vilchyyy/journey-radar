import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Real-time data refresh - load .pb files every 15 seconds
crons.interval(
  'real-time-data-refresh',
  { seconds: 15 },
  internal.cron.realTimeDataRefresh,
  {}, // args
)

crons.interval(
  'seeding-refresh',
  { hours: 1 },
  internal.seed_realistic.seedRealisticReports,
  { count: 50 }, // args
)

// GTFS schedule loading - load ZIP files every hour
crons.hourly(
  'gtfs-schedule-load',
  { minuteUTC: 0 }, // Run at the top of every hour
  internal.cron.dailyGTFSLoad,
  {}, // args
)

export default crons
