# GTFS Data Loading Setup

This document describes how to set up and run the new GTFS data loading system that replaces real-time API calls with periodic database updates.

## Overview

The new system consists of:

1. **GTFS Static Data Loading** - Daily loading of GTFS ZIP files (routes, trips)
2. **Real-time Data Loading** - Every 15 seconds loading of vehicle positions and trip updates
3. **Convex Database Storage** - All data stored in Convex for fast queries
4. **Updated API Endpoints** - APIs now query Convex instead of external sources

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   External GTFS │───▶│  GTFS Service    │───▶│   Convex DB     │
│   Sources       │    │  (15s updates)   │    │   (Storage)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐           │
│   Frontend      │◀───│  API Endpoints   │◀──────────┘
│   App           │    │  (Convex queries)│
└─────────────────┘    └──────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd packages/backend
bun add convex-browser gtfs-realtime-bindings jszip
```

### 2. Deploy the Schema

```bash
cd packages/backend
bunx convex deploy
```

### 3. Run Initial Data Load

```bash
cd packages/backend

# Load GTFS static data (routes, trips)
bunx convex run internal.gtfs.loadGTFSSchedule

# Load real-time data (vehicle positions, trip updates)
bunx convex run internal.gtfs.loadVehiclePositions
bunx convex run internal.gtfs.loadTripUpdates
```

### 4. Start the Background Service

Option A: Run as a background process
```bash
cd packages/backend
bun run scripts/gtfs-service.ts
```

Option B: Run with a process manager (recommended for production)
```bash
# Using pm2
npm install -g pm2
cd packages/backend
pm2 start scripts/gtfs-service.ts --name gtfs-service

# Using forever
npm install -g forever
cd packages/backend
forever start scripts/gtfs-service.ts
```

## Service Management

### Manual Commands

```bash
# Load static GTFS data manually
bunx convex run internal.cron.dailyGTFSLoad

# Load real-time data manually
bunx convex run internal.cron.realTimeDataRefresh

# Check current vehicle positions
bunx convex run internal.gtfs.getVehiclePositions
```

### Monitoring

The service logs all activities to console. Key log messages:

- `[timestamp] Starting GTFS service...`
- `[timestamp] Running real-time GTFS refresh...`
- `[timestamp] Real-time refresh completed: {result}`
- `[timestamp] Running daily GTFS load...` (at 2:00 AM)
- `[timestamp] Daily load completed: {result}`

## API Changes

The following API endpoints now use Convex data instead of real-time fetching:

- `GET /api/gtfs/vehicle-positions` - Returns cached vehicle positions
- `GET /api/gtfs/trip-updates` - Returns cached trip updates
- `GET /api/gtfs/routes` - Returns cached routes and trips

## Data Freshness

- **Static Data** (routes, trips): Updated daily at 2:00 AM
- **Real-time Data** (vehicle positions, trip updates): Updated every 15 seconds

## Troubleshooting

### No Data Available

1. Check if the background service is running:
   ```bash
   bunx convex run internal.gtfs.getVehiclePositions
   ```

2. Manually trigger data loading:
   ```bash
   bunx convex run internal.gtfs.refreshAllGTFSData
   ```

3. Check Convex logs for errors:
   ```bash
   bunx convex dev
   ```

### Service Not Starting

1. Check environment variables:
   ```bash
   echo $CONVEX_URL
   ```

2. Verify Convex connection:
   ```bash
   bunx convex ping
   ```

### Performance Issues

1. Check database size:
   ```bash
   bunx convex dashboard
   ```

2. Monitor service logs for slow operations.

## Configuration

### Environment Variables

- `CONVEX_URL`: Your Convex deployment URL (default: http://localhost:3217)

### Service Configuration

Edit `scripts/gtfs-service.ts` to modify:

- `REAL_TIME_INTERVAL`: Update frequency (default: 15 seconds)
- Daily load time (default: 2:00 AM)

## Migration from Old System

The old system fetched data directly from GTFS sources on each API request. The new system:

1. **Pros**:
   - Faster API responses (cached data)
   - Reduced external API calls
   - Better reliability
   - Offline capability

2. **Cons**:
   - Requires background service
   - Data is up to 15 seconds old (acceptable for transit data)

### Rollback

To rollback to the old system, restore the original API route files from git:

```bash
git checkout HEAD~1 -- apps/web/src/app/api/gtfs/
```

## Production Deployment

For production deployment:

1. Deploy the Convex schema and functions
2. Set up environment variables
3. Run the GTFS service as a daemon process
4. Monitor service health
5. Set up alerts for service failures

Example systemd service file:

```ini
[Unit]
Description=GTFS Data Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/packages/backend
Environment=CONVEX_URL=https://your-convex-url.convex.cloud
ExecStart=/usr/bin/bun run scripts/gtfs-service.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```