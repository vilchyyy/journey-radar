#!/usr/bin/env node

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

// Initialize Convex client
const convex = new ConvexHttpClient(
  process.env.CONVEX_URL || 'http://localhost:3217',
)

async function testGTFSImplementation() {
  console.log('🧪 Testing GTFS Implementation...\n')

  try {
    // Test 1: Check if we can query GTFS routes
    console.log('1️⃣ Testing GTFS routes query...')
    const routes = await convex.query(api.gtfs.getRoutes)
    console.log(`   ✅ Found ${routes.length} routes`)
    if (routes.length > 0) {
      console.log(
        `   📋 Sample route: ${routes[0].routeShortName} (${routes[0].transportMode})`,
      )
    }

    // Test 2: Check if we can query GTFS trips
    console.log('\n2️⃣ Testing GTFS trips query...')
    const trips = await convex.query(api.gtfs.getTrips)
    console.log(`   ✅ Found ${trips.length} trips`)
    if (trips.length > 0) {
      console.log(`   📋 Sample trip: ${trips[0].tripId}`)
    }

    // Test 3: Check if we can query vehicle positions
    console.log('\n3️⃣ Testing vehicle positions query...')
    const vehiclePositions = await convex.query(api.gtfs.getVehiclePositions)
    console.log(`   ✅ Found ${vehiclePositions.length} vehicle positions`)
    if (vehiclePositions.length > 0) {
      console.log(
        `   📋 Sample vehicle: ${vehiclePositions[0].routeNumber} (${vehiclePositions[0].mode})`,
      )
    }

    // Test 4: Check if we can query trip updates
    console.log('\n4️⃣ Testing trip updates query...')
    const tripUpdates = await convex.query(api.gtfs.getTripUpdates)
    console.log(`   ✅ Found ${tripUpdates.length} trip updates`)
    if (tripUpdates.length > 0) {
      console.log(`   📋 Sample update: ${tripUpdates[0].tripId}`)
    }

    // Test 5: Test data loading functions
    console.log('\n5️⃣ Testing GTFS data loading...')

    console.log('   📥 Testing static GTFS load...')
    const staticResult = await convex.action(api.gtfs.loadGTFSSchedule)
    if (staticResult.success) {
      console.log(
        `   ✅ Static load successful: ${staticResult.routes} routes, ${staticResult.trips} trips`,
      )
    } else {
      console.log(`   ❌ Static load failed: ${staticResult.error}`)
    }

    console.log('   📥 Testing real-time data load...')
    const realTimeResult = await convex.action(api.gtfs.refreshAllGTFSData)
    console.log(
      `   ✅ Real-time load: ${realTimeResult.successes}/${realTimeResult.total} operations successful`,
    )

    // Test 6: Verify API endpoints (if running)
    console.log('\n6️⃣ Testing API endpoints...')
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'

    try {
      const routesResponse = await fetch(`${baseUrl}/api/gtfs/routes`)
      if (routesResponse.ok) {
        const routesData = await routesResponse.json()
        console.log(
          `   ✅ Routes API: ${routesData.routes?.length || 0} routes found`,
        )
      } else {
        console.log(`   ❌ Routes API failed: ${routesResponse.status}`)
      }
    } catch (error) {
      console.log(`   ⚠️ Routes API not accessible (server may not be running)`)
    }

    try {
      const vehiclesResponse = await fetch(
        `${baseUrl}/api/gtfs/vehicle-positions`,
      )
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json()
        console.log(
          `   ✅ Vehicle positions API: ${vehiclesData.length} vehicles found`,
        )
      } else {
        console.log(
          `   ❌ Vehicle positions API failed: ${vehiclesResponse.status}`,
        )
      }
    } catch (error) {
      console.log(
        `   ⚠️ Vehicle positions API not accessible (server may not be running)`,
      )
    }

    console.log('\n🎉 GTFS Implementation Test Complete!')

    // Summary
    console.log('\n📊 Summary:')
    console.log(`   • Routes: ${routes.length}`)
    console.log(`   • Trips: ${trips.length}`)
    console.log(`   • Vehicle positions: ${vehiclePositions.length}`)
    console.log(`   • Trip updates: ${tripUpdates.length}`)

    if (vehiclePositions.length > 0) {
      console.log('\n✅ Implementation appears to be working correctly!')
      console.log('   Real-time data is being loaded and stored in Convex.')
    } else {
      console.log(
        '\n⚠️ No vehicle positions found. The background service may need to be started.',
      )
      console.log('   Run: bun run scripts/gtfs-service.ts')
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testGTFSImplementation().catch(console.error)
}

export { testGTFSImplementation }
