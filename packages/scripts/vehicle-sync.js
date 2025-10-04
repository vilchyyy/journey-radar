#!/usr/bin/env node

/**
 * Vehicle Data Synchronization Utility
 *
 * This script helps sync vehicle positions from external sources into your Convex database
 * and provides tools for managing vehicle data updates.
 */

const { ConvexHttpClient } = require('convex/browser');
require('dotenv').config({ path: '../apps/web/.env.local' });

// Initialize Convex client
const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || 'http://console:3217'
);

async function syncVehiclePositions(vehicleData) {
  try {
    console.log('Syncing vehicle positions...');

    // Update or insert vehicle positions in database
    const updatedVehicles = [];

    for (const vehicle of vehicleData) {
      updatedVehicles.push(
        await convex.mutation(api.gtfs.updateVehiclePosition(vehicle))
      );
    }

    console.log(`Synced ${updatedVehicles.length} vehicle positions`);
    return updatedVehicles;
  } catch (error) {
    console.error('Error syncing vehicle positions:', error);
    throw error;
  }
}

async function getCurrentVehiclePositions() {
  try {
    return await convex.query(api.gtfs.getVehiclePositions);
  } catch (error) {
    console.error('Error fetching current vehicle positions:', error);
    return [];
  }
}

async function updateVehiclePosition(vehicleId, latitude, longitude, bearing) {
  try {
    const result = await convex.mutation(api.gtfs.updateVehiclePosition({
      vehicleId,
      latitude,
      longitude,
      bearing,
      timestamp: Date.now()
    }));
    console.log(`Updated vehicle ${vehicleId} position: ${latitude}, ${longitude}, bearing: ${bearing}`);
    return result;
  } catch (error) {
    console.error(`Error updating vehicle ${vehicleId}:`, error);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'sync':
      // Example: node vehicle-sync.js sync '{"vehicles": [...]}'
      if (process.argv[3]) {
        try {
          const vehicleData = JSON.parse(process.argv[3]);
          await syncVehiclePositions(vehicleData);
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      } else {
        console.log('Usage: node vehicle-sync.js sync \'{"vehicles": [...]}\'}');
      }
      break;

    case 'list':
      getCurrentVehiclePositions().then(vehicles => {
        console.log('Current vehicle positions:');
        vehicles.forEach(v => {
          console.log(`  Vehicle ${v.id}: ${v.latitude}, ${v.longitude}, ${v.bearing}°`);
        });
      }).catch(error => {
        console.error('Error fetching vehicles:', error.message);
        process.exit(1);
      });
      break;

    case 'update':
      if (process.argv.length < 4) {
        console.log('Usage: node vehicle-sync.js update <vehicleId> <latitude> <longitude> [bearing]');
        process.exit(1);
      }
      const [vehicleId, latitude, longitude, bearing] = process.argv.slice(2);
      try {
        await updateVehiclePosition(vehicleId, parseFloat(latitude), parseFloat(longitude), parseFloat(bearing));
        console.log(`Updated vehicle ${vehicleId}`);
      } catch (error) {
        console.error('Error updating vehicle:', error.message);
        process.exit(1);
      }
      break;

    default:
      console.log('Usage: vehicle-sync.js <command>');
      console.log('  sync     - Sync vehicle data from JSON');
      console.log('  list     - List current vehicle positions');
      console.log('  update   - Update single vehicle position');
      break;
  }
}