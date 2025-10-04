# Vehicle Data Synchronization

This directory contains utilities for managing vehicle data in your Convex database.

## Vehicle Sync Utility

### Usage

```bash
node vehicle-sync.js <command>
```

### Commands

#### 1. List Current Vehicle Positions
```bash
node vehicle-sync.js list
```
Shows all current vehicle positions stored in your database.

#### 2. Update Single Vehicle Position
```bash
node vehicle-sync.js update <vehicleId> <latitude> <longitude> [bearing]
```
Updates the position of a specific vehicle in the database.

Example:
```bash
node vehicle-sync.js update TRAM_001 50.0614 19.9383 45
```

#### 3. Sync Multiple Vehicles
```bash
node vehicle-sync.js sync '{"vehicles": [...]}'
```
Updates multiple vehicle positions from a JSON file.

Example JSON format:
```json
{
  "vehicles": [
    {
      "vehicleId": "TRAM_001",
      "latitude": 50.0614,
      "longitude": 19.9383,
      "bearing": 45,
      "routeId": "1",
      "tripId": "trip_1",
      "mode": "tram"
    }
  ]
}
```

## API Endpoints

The web application provides these endpoints for vehicle data:

- `GET /api/gtfs/vehicle-positions` - Get current vehicle positions
- `GET /api/gtfs/routes` - Get route information
- `GET /api/gtfs/trip-updates` - Get trip delay information
- `GET /api/reports/list` - Get user reports

## Database Schema

Your Convex database stores vehicle information in these tables:

- `gtfs_vehicle_positions` - Real-time vehicle positions
- `gtfs_routes` - Route information (short name, long name, etc.)
- `gtfs_trips` - Trip data for route planning
- `gtfs_trip_updates` - Delay and schedule information
- `reports` - User-reported incidents

## Updating Vehicle Data

### Method 1: Using the sync utility
```bash
node vehicle-sync.js update VEHICLE_001 50.0614 19.9383 90
```

### Method 2: Direct database updates
You can also update vehicle positions directly through your Convex dashboard or by writing custom mutations.

### Method 3: Real-time data feed
Set up a real-time data feed (GTFS-RT) to automatically update vehicle positions as they move.