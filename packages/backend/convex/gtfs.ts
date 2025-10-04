import { v } from 'convex/values'
import { transit_realtime as transitRealtime } from 'gtfs-realtime-bindings'
import JSZip from 'jszip'
import { internal } from './_generated/api'
import { action, mutation, query } from './_generated/server'

interface GTFSRoute {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_type: string
}

interface GTFSTrip {
  trip_id: string
  route_id: string
}

// Convert GTFS route_type to our transport mode
function getTransportModeFromRouteType(routeType: string): 'BUS' | 'TRAM' {
  // GTFS route types: 0=Tram, 3=Bus
  return routeType === '0' ? 'TRAM' : 'BUS'
}

// Action to fetch and parse GTFS ZIP files
export const loadGTFSSchedule = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Starting GTFS schedule loading...')

      const base = 'https://gtfs.ztp.krakow.pl'
      const urls = [
        { url: `${base}/GTFS_KRK_A.zip` },
        { url: `${base}/GTFS_KRK_T.zip` },
      ]

      const allRoutes: GTFSRoute[] = []
      const allTrips: GTFSTrip[] = []

      for (const { url } of urls) {
        try {
          console.log(`Fetching GTFS data from ${url}`)

          const response = await fetch(url, {
            headers: { 'User-Agent': 'journey-radar/1.0' },
          })

          if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.status}`)
            continue
          }

          const zipData = await response.arrayBuffer()
          const zip = await JSZip.loadAsync(zipData)

          // Parse routes.txt
          const routesFile = zip.file('routes.txt')
          if (routesFile) {
            const routesText = await routesFile.async('text')
            const routesLines = routesText
              .split('\n')
              .filter((line) => line.trim())
            const routesHeader = routesLines[0]
              .split(',')
              .map((h) => h.trim().replace(/"/g, ''))

            for (let i = 1; i < routesLines.length; i++) {
              const values = routesLines[i]
                .split(',')
                .map((v) => v.trim().replace(/"/g, ''))
              if (values.length >= routesHeader.length) {
                const route: GTFSRoute = {
                  route_id: '',
                  route_short_name: '',
                  route_long_name: '',
                  route_type: '',
                }
                routesHeader.forEach((header, index) => {
                  const key = header as keyof GTFSRoute
                  route[key] = (values[index] || '') as GTFSRoute[typeof key]
                })
                allRoutes.push(route)
              }
            }
          }

          // Parse trips.txt
          const tripsFile = zip.file('trips.txt')
          if (tripsFile) {
            const tripsText = await tripsFile.async('text')
            const tripsLines = tripsText
              .split('\n')
              .filter((line) => line.trim())
            const tripsHeader = tripsLines[0]
              .split(',')
              .map((h) => h.trim().replace(/"/g, ''))

            for (let i = 1; i < tripsLines.length; i++) {
              const values = tripsLines[i]
                .split(',')
                .map((v) => v.trim().replace(/"/g, ''))
              if (values.length >= tripsHeader.length) {
                const trip: GTFSTrip = {
                  trip_id: '',
                  route_id: '',
                }
                tripsHeader.forEach((header, index) => {
                  const key = header as keyof GTFSTrip
                  trip[key] = (values[index] || '') as GTFSTrip[typeof key]
                })
                allTrips.push(trip)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing ${url}:`, error)
        }
      }

      console.log(
        `Loaded ${allRoutes.length} routes and ${allTrips.length} trips`,
      )

      // Use small repeated pages to avoid timeouts
      console.log('Clearing existing GTFS data via paginated batches...')
      let tripsCursor: string | undefined
      while (true) {
        const res = await ctx.runMutation(internal.gtfs.deleteGTFSTripsPage, {
          limit: 500,
          cursor: tripsCursor,
        })
        if (res.isDone || res.deleted === 0) break
        tripsCursor = res.cursor ?? undefined
      }
      let routesCursor: string | undefined
      while (true) {
        const res = await ctx.runMutation(internal.gtfs.deleteGTFSRoutesPage, {
          limit: 500,
          cursor: routesCursor,
        })
        if (res.isDone || res.deleted === 0) break
        routesCursor = res.cursor ?? undefined
      }

      console.log(`Inserting ${allRoutes.length} routes...`)
      await ctx.runMutation(
        internal.gtfs.insertGTFSRoutesBulk,
        {
          routes: allRoutes.map((route) => ({
            routeId: route.route_id,
            routeShortName: route.route_short_name,
            routeLongName: route.route_long_name,
            routeType: parseInt(route.route_type),
            transportMode: getTransportModeFromRouteType(route.route_type),
            lastUpdated: Date.now(),
          })),
        },
        { timeout: 300000 },
      ) // 5 minutes timeout

      console.log(`Inserting ${allTrips.length} trips...`)
      // Split trips into multiple chunks to avoid payload size limits
      const TRIP_CHUNK_SIZE = 1000
      for (let i = 0; i < allTrips.length; i += TRIP_CHUNK_SIZE) {
        const chunk = allTrips.slice(i, i + TRIP_CHUNK_SIZE)
        console.log(
          `Inserting trips chunk ${Math.floor(i / TRIP_CHUNK_SIZE) + 1}/${Math.ceil(allTrips.length / TRIP_CHUNK_SIZE)}`,
        )

        await ctx.runMutation(
          internal.gtfs.insertGTFSTripsBulk,
          {
            trips: chunk.map((trip) => ({
              tripId: trip.trip_id,
              routeId: trip.route_id,
              lastUpdated: Date.now(),
            })),
          },
          { timeout: 300000 },
        ) // 5 minutes timeout
      }

      console.log('GTFS schedule loading completed successfully')
      return { success: true, routes: allRoutes.length, trips: allTrips.length }
    } catch (error) {
      console.error('Error loading GTFS schedule:', error)
      return { success: false, error: String(error) }
    }
  },
})

// Action to load real-time vehicle positions
export const loadVehiclePositions = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Loading vehicle positions...')

      const base = 'https://gtfs.ztp.krakow.pl'
      const urls = [
        { url: `${base}/VehiclePositions_A.pb`, mode: 'bus' as const },
        { url: `${base}/VehiclePositions_T.pb`, mode: 'tram' as const },
      ]

      const allVehicles: Array<{
        vehicleId: string
        tripId: string
        routeId: string
        routeNumber: string
        latitude: number
        longitude: number
        bearing: number
        timestamp: number
        mode: 'BUS' | 'TRAM'
        lastUpdated: number
      }> = []

      for (const { url, mode } of urls) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'journey-radar/1.0' },
          })

          if (!response.ok) {
            console.error(`HTTP error for ${url}! status: ${response.status}`)
            continue
          }

          const arrayBuffer = await response.arrayBuffer()
          const message = transitRealtime.FeedMessage.decode(
            new Uint8Array(arrayBuffer),
          )
          const feed = transitRealtime.FeedMessage.toObject(message, {
            longs: Number,
          }) as transitRealtime.IFeedMessage

          const vehicles = (feed.entity ?? [])
            .filter((e) => e.vehicle?.position)
            .map((e) => {
              const v = e.vehicle ?? {}
              const pos = v.position ?? {}
              const trip = v.trip ?? {}
              const veh = v.vehicle ?? {}
              const latitude = Number(pos.latitude ?? 0)
              const longitude = Number(pos.longitude ?? 0)

              const tripId = (trip.tripId ?? trip.trip_id ?? '') as string
              // We'll resolve routeId later via indexed lookups only for seen tripIds
              const routeId = ''
              let routeNumber = ''

              // Fallback: extract number from tripId if no route found
              if (!routeNumber) {
                const routeMatch = tripId.match(/block_(\d+)_/)
                routeNumber = routeMatch ? routeMatch[1] : (veh.id ?? '')
              }

              return {
                vehicleId: (e.id ??
                  veh.id ??
                  `vehicle_${Math.random()}`) as string,
                tripId,
                routeId,
                routeNumber,
                latitude,
                longitude,
                bearing: Number(pos.bearing ?? 0),
                timestamp:
                  Number(v.timestamp ?? feed.header?.timestamp ?? 0) ||
                  Date.now() / 1000,
                mode: mode.toUpperCase() as 'BUS' | 'TRAM',
                lastUpdated: Date.now(),
              }
            })
            .filter((v) => v.latitude !== 0 && v.longitude !== 0)

          allVehicles.push(...vehicles)
        } catch (error) {
          console.error(`Error loading vehicle positions from ${url}:`, error)
        }
      }

      // Resolve routeIds only for unique tripIds seen in feed via indexed queries
      const uniqueTripIds = Array.from(
        new Set(allVehicles.map((v) => v.tripId).filter((id) => !!id)),
      )
      const tripToRouteMap: Record<string, string> = {}
      const routeShortNameMap: Record<string, string> = {}
      for (const id of uniqueTripIds) {
        const rid = await ctx.runQuery(internal.gtfs.getRouteIdForTripId, {
          tripId: id,
        })
        if (rid) {
          tripToRouteMap[id] = rid
          if (!routeShortNameMap[rid]) {
            routeShortNameMap[rid] = await ctx.runQuery(
              internal.gtfs.getRouteShortNameById,
              { routeId: rid },
            )
          }
        }
      }
      // Update vehicles with resolved routeIds and prefer short names when available
      for (const v of allVehicles) {
        const rid = tripToRouteMap[v.tripId] || ''
        v.routeId = rid
        const shortName = routeShortNameMap[rid]
        if (shortName) {
          v.routeNumber = shortName
        } else if (rid) {
          v.routeNumber = rid
        }
      }

      // Clear existing vehicle positions using paginated batches
      let positionsCursor: string | undefined
      while (true) {
        const res = await ctx.runMutation(
          internal.gtfs.clearVehiclePositionsPage,
          { limit: 1000, cursor: positionsCursor },
        )
        if (res.isDone || res.deleted === 0) break
        positionsCursor = res.cursor ?? undefined
      }

      // Insert new positions in chunks to avoid timeouts
      const VEHICLE_CHUNK_SIZE = 500
      for (let i = 0; i < allVehicles.length; i += VEHICLE_CHUNK_SIZE) {
        const chunk = allVehicles.slice(i, i + VEHICLE_CHUNK_SIZE)
        await ctx.runMutation(
          internal.gtfs.insertVehiclePositionsBulk,
          { vehicles: chunk },
          { timeout: 120000 },
        )
      }

      console.log(`Loaded ${allVehicles.length} vehicle positions`)
      return { success: true, count: allVehicles.length }
    } catch (error) {
      console.error('Error loading vehicle positions:', error)
      return { success: false, error: String(error) }
    }
  },
})

// Action to load trip updates
export const loadTripUpdates = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('Loading trip updates...')

      const base = 'https://gtfs.ztp.krakow.pl'
      const urls = [
        { url: `${base}/TripUpdates_A.pb`, mode: 'bus' as const },
        { url: `${base}/TripUpdates_T.pb`, mode: 'tram' as const },
      ]

      const allTripUpdates: Array<{
        id: string
        tripId: string
        routeId: string
        vehicleId?: string
        mode: 'BUS' | 'TRAM'
        stopUpdates: Array<{
          stopId: string
          arrivalDelay?: number
          departureDelay?: number
        }>
        lastUpdated: number
      }> = []

      for (const { url, mode } of urls) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'journey-radar/1.0' },
          })

          if (!response.ok) {
            console.error(`HTTP error for ${url}! status: ${response.status}`)
            continue
          }

          const arrayBuffer = await response.arrayBuffer()
          const message = transitRealtime.FeedMessage.decode(
            new Uint8Array(arrayBuffer),
          )
          const feed = transitRealtime.FeedMessage.toObject(message, {
            longs: Number,
          }) as transitRealtime.IFeedMessage

          const tripUpdates = (feed.entity ?? [])
            .filter((e) => e.tripUpdate?.trip)
            .map((e) => {
              const tu = e.tripUpdate ?? {}
              const trip = tu.trip ?? {}
              const veh = tu.vehicle ?? {}

              const stopUpdates = (tu.stopTimeUpdate ?? []).map((stu) => ({
                stopId: (stu.stopId ?? stu.stop_id ?? '') as string,
                arrivalDelay: stu.arrival?.delay as number | undefined,
                departureDelay: stu.departure?.delay as number | undefined,
              }))

              return {
                id: (e.id ?? '') as string,
                tripId: (trip.tripId ?? trip.trip_id ?? '') as string,
                routeId: (trip.routeId ?? trip.route_id ?? '') as string,
                vehicleId: veh.id as string | undefined,
                mode: mode.toUpperCase() as 'BUS' | 'TRAM',
                stopUpdates,
                lastUpdated: Date.now(),
              }
            })

          allTripUpdates.push(...tripUpdates)
        } catch (error) {
          console.error(`Error loading trip updates from ${url}:`, error)
        }
      }

      // Clear existing trip updates and insert new ones
      await ctx.runMutation(internal.gtfs.clearTripUpdates)

      for (const tripUpdate of allTripUpdates) {
        await ctx.runMutation(internal.gtfs.insertTripUpdate, tripUpdate)
      }

      console.log(`Loaded ${allTripUpdates.length} trip updates`)
      return { success: true, count: allTripUpdates.length }
    } catch (error) {
      console.error('Error loading trip updates:', error)
      return { success: false, error: String(error) }
    }
  },
})

// Mutations for database operations
export const insertGTFSRoute = mutation({
  args: {
    routeId: v.string(),
    routeShortName: v.string(),
    routeLongName: v.string(),
    routeType: v.number(),
    transportMode: v.union(v.literal('BUS'), v.literal('TRAM')),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('gtfsRoutes', args)
  },
})

export const insertGTFSTrip = mutation({
  args: {
    tripId: v.string(),
    routeId: v.string(),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('gtfsTrips', args)
  },
})

export const insertVehiclePosition = mutation({
  args: {
    vehicleId: v.string(),
    tripId: v.string(),
    routeId: v.string(),
    routeNumber: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    bearing: v.optional(v.number()),
    timestamp: v.number(),
    mode: v.union(v.literal('BUS'), v.literal('TRAM')),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('gtfsVehiclePositions', args)
  },
})

export const insertTripUpdate = mutation({
  args: {
    id: v.string(),
    tripId: v.string(),
    routeId: v.string(),
    vehicleId: v.optional(v.string()),
    mode: v.union(v.literal('BUS'), v.literal('TRAM')),
    stopUpdates: v.array(
      v.object({
        stopId: v.string(),
        arrivalDelay: v.optional(v.number()),
        departureDelay: v.optional(v.number()),
      }),
    ),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('gtfsTripUpdates', args)
  },
})

export const clearGTFSData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('Clearing existing GTFS data...')

    // Delete routes in batches
    const routes = await ctx.db.query('gtfsRoutes').collect()
    console.log(`Deleting ${routes.length} routes...`)

    const ROUTE_BATCH_SIZE = 100
    for (let i = 0; i < routes.length; i += ROUTE_BATCH_SIZE) {
      const batch = routes.slice(i, i + ROUTE_BATCH_SIZE)
      await Promise.all(batch.map((route) => ctx.db.delete(route._id)))
      console.log(
        `Deleted routes batch ${Math.floor(i / ROUTE_BATCH_SIZE) + 1}/${Math.ceil(routes.length / ROUTE_BATCH_SIZE)}`,
      )
    }

    // Delete trips in batches
    const trips = await ctx.db.query('gtfsTrips').collect()
    console.log(`Deleting ${trips.length} trips...`)

    const TRIP_BATCH_SIZE = 100
    for (let i = 0; i < trips.length; i += TRIP_BATCH_SIZE) {
      const batch = trips.slice(i, i + TRIP_BATCH_SIZE)
      await Promise.all(batch.map((trip) => ctx.db.delete(trip._id)))
      console.log(
        `Deleted trips batch ${Math.floor(i / TRIP_BATCH_SIZE) + 1}/${Math.ceil(trips.length / TRIP_BATCH_SIZE)}`,
      )
    }

    console.log('GTFS data clearing completed')
  },
})

// Optimized bulk mutations
export const clearGTFSDataOptimized = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data more efficiently - just do simple deletion without logging
    const routes = await ctx.db.query('gtfsRoutes').collect()
    await Promise.all(routes.map((route) => ctx.db.delete(route._id)))

    const trips = await ctx.db.query('gtfsTrips').collect()
    await Promise.all(trips.map((trip) => ctx.db.delete(trip._id)))
  },
})

// Further optimized: batched deletion with yields between batches to prevent timeouts
export const clearGTFSDataBatched = mutation({
  args: {},
  handler: async (ctx) => {
    const ROUTE_BATCH_SIZE = 500
    const TRIP_BATCH_SIZE = 2000

    // Delete routes in batches
    const routes = await ctx.db.query('gtfsRoutes').collect()
    for (let i = 0; i < routes.length; i += ROUTE_BATCH_SIZE) {
      const batch = routes.slice(i, i + ROUTE_BATCH_SIZE)
      await Promise.all(batch.map((route) => ctx.db.delete(route._id)))
    }

    // Delete trips in batches
    const trips = await ctx.db.query('gtfsTrips').collect()
    for (let i = 0; i < trips.length; i += TRIP_BATCH_SIZE) {
      const batch = trips.slice(i, i + TRIP_BATCH_SIZE)
      await Promise.all(batch.map((trip) => ctx.db.delete(trip._id)))
    }
  },
})

// Single-batch delete mutations to be called repeatedly from actions
export const deleteGTFSTripsBatch = mutation({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const trips = await ctx.db.query('gtfsTrips').collect()
    const batchSize = Math.max(0, Math.min(limit, trips.length))
    const batch = trips.slice(0, batchSize)
    await Promise.all(batch.map((trip) => ctx.db.delete(trip._id)))
    return { deleted: batch.length, remaining: trips.length - batch.length }
  },
})

export const deleteGTFSRoutesBatch = mutation({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const routes = await ctx.db.query('gtfsRoutes').collect()
    const batchSize = Math.max(0, Math.min(limit, routes.length))
    const batch = routes.slice(0, batchSize)
    await Promise.all(batch.map((route) => ctx.db.delete(route._id)))
    return { deleted: batch.length, remaining: routes.length - batch.length }
  },
})

// Paginated single-page deletions using Convex pagination API
export const deleteGTFSTripsPage = mutation({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, { limit = 500, cursor }) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query('gtfsTrips')
      .paginate({ numItems: limit, cursor: cursor ?? null })
    await Promise.all(page.map((trip) => ctx.db.delete(trip._id)))
    return { deleted: page.length, isDone, cursor: continueCursor ?? undefined }
  },
})

export const deleteGTFSRoutesPage = mutation({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, { limit = 500, cursor }) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query('gtfsRoutes')
      .paginate({ numItems: limit, cursor: cursor ?? null })
    await Promise.all(page.map((route) => ctx.db.delete(route._id)))
    return { deleted: page.length, isDone, cursor: continueCursor ?? undefined }
  },
})

export const insertGTFSRoutesBulk = mutation({
  args: {
    routes: v.array(
      v.object({
        routeId: v.string(),
        routeShortName: v.string(),
        routeLongName: v.string(),
        routeType: v.number(),
        transportMode: v.union(v.literal('BUS'), v.literal('TRAM')),
        lastUpdated: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Insert all routes in parallel
    await Promise.all(
      args.routes.map((route) => ctx.db.insert('gtfsRoutes', route)),
    )
  },
})

export const insertGTFSTripsBulk = mutation({
  args: {
    trips: v.array(
      v.object({
        tripId: v.string(),
        routeId: v.string(),
        lastUpdated: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Insert all trips in parallel
    await Promise.all(
      args.trips.map((trip) => ctx.db.insert('gtfsTrips', trip)),
    )
  },
})

export const clearVehiclePositions = mutation({
  args: {},
  handler: async (ctx) => {
    const positions = await ctx.db.query('gtfsVehiclePositions').collect()
    for (const position of positions) {
      await ctx.db.delete(position._id)
    }
  },
})

export const clearTripUpdates = mutation({
  args: {},
  handler: async (ctx) => {
    const updates = await ctx.db.query('gtfsTripUpdates').collect()
    for (const update of updates) {
      await ctx.db.delete(update._id)
    }
  },
})

// Paginated clearing and bulk insert for vehicle positions
export const clearVehiclePositionsPage = mutation({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, { limit = 1000, cursor }) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query('gtfsVehiclePositions')
      .paginate({ numItems: limit, cursor: cursor ?? null })
    await Promise.all(page.map((p) => ctx.db.delete(p._id)))
    return { deleted: page.length, isDone, cursor: continueCursor ?? undefined }
  },
})

export const insertVehiclePositionsBulk = mutation({
  args: {
    vehicles: v.array(
      v.object({
        vehicleId: v.string(),
        tripId: v.string(),
        routeId: v.string(),
        routeNumber: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        bearing: v.optional(v.number()),
        timestamp: v.number(),
        mode: v.union(v.literal('BUS'), v.literal('TRAM')),
        lastUpdated: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.vehicles.map((v) => ctx.db.insert('gtfsVehiclePositions', v)),
    )
  },
})

// Queries for API endpoints
export const getTripToRouteMap = query({
  args: {},
  handler: async (ctx) => {
    const trips = await ctx.db.query('gtfsTrips').collect()
    const map: Record<string, string> = {}
    trips.forEach((trip) => {
      map[trip.tripId] = trip.routeId
    })
    return map
  },
})

export const getVehiclePositions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('gtfsVehiclePositions').collect()
  },
})

export const getRoutes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('gtfsRoutes').collect()
  },
})

export const getTrips = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('gtfsTrips').collect()
  },
})

// Indexed lookup for a single tripId -> routeId, to minimize data volume
export const getRouteIdForTripId = query({
  args: { tripId: v.string() },
  handler: async (ctx, { tripId }) => {
    const rows = await ctx.db
      .query('gtfsTrips')
      .withIndex('by_trip_id', (q) => q.eq('tripId', tripId))
      .collect()
    return rows[0]?.routeId ?? ''
  },
})

export const getRouteShortNames = query({
  args: { routeIds: v.array(v.string()) },
  handler: async (ctx, { routeIds }) => {
    if (routeIds.length === 0) return []
    const uniqueIds = Array.from(new Set(routeIds))
    const results = await Promise.all(
      uniqueIds.map(async (routeId) => {
        const row = await ctx.db
          .query('gtfsRoutes')
          .withIndex('by_route_id', (q) => q.eq('routeId', routeId))
          .unique()
        return row
          ? { routeId: row.routeId, routeShortName: row.routeShortName }
          : undefined
      }),
    )
    return results.filter(
      (r): r is { routeId: string; routeShortName: string } => Boolean(r),
    )
  },
})

export const getRouteShortNameById = query({
  args: { routeId: v.string() },
  handler: async (ctx, { routeId }) => {
    const rows = await ctx.db
      .query('gtfsRoutes')
      .withIndex('by_route_id', (q) => q.eq('routeId', routeId))
      .collect()
    return rows[0]?.routeShortName ?? ''
  },
})

export const getTripUpdates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('gtfsTripUpdates').collect()
  },
})

// Export for use in cron job
export const refreshAllGTFSData = action({
  args: {},
  handler: async (ctx) => {
    const results = await Promise.allSettled([
      ctx.runAction(internal.gtfs.loadGTFSSchedule),
      ctx.runAction(internal.gtfs.loadVehiclePositions),
      ctx.runAction(internal.gtfs.loadTripUpdates),
    ])

    const successes = results.filter(
      (r): r is PromiseFulfilledResult<{ success: boolean }> =>
        r.status === 'fulfilled' && r.value.success,
    ).length
    const failures = results.length - successes

    console.log(
      `GTFS refresh completed: ${successes} successes, ${failures} failures`,
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
