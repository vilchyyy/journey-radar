import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Load vehicle positions every 30 seconds
crons.interval(
  'load vehicle positions',
  { seconds: 30 },
  internal.gtfs.loadVehiclePositions,
)

// Load trip updates every 2 minutes
crons.interval(
  'load trip updates',
  { minutes: 2 },
  internal.gtfs.loadTripUpdates,
)

export default crons
