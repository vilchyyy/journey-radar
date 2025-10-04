import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type CSVRow = Record<string, unknown>

async function fetchZip(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'journey-radar/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  const JSZip = (await import('jszip')).default
  return await JSZip.loadAsync(arrayBuffer)
}

async function readTextFromZip(
  zip: {
    file: (name: string) => { async: (t: 'string') => Promise<string> } | null
  },
  filename: string,
): Promise<string> {
  const file = zip.file(filename)
  if (!file) throw new Error(`Missing ${filename} in GTFS zip`)
  return await file.async('string')
}

async function parseCSV<T extends CSVRow>(text: string): Promise<T[]> {
  const Papa = (await import('papaparse')).default
  return new Promise((resolve, reject) => {
    Papa.parse<T>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => resolve(result.data as T[]),
      error: (err: unknown) => reject(err),
    })
  })
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export async function GET() {
  try {
    // Known Kraków GTFS static archives for bus (A) and tram (T)
    const base = 'https://gtfs.ztp.krakow.pl'
    const urls = [
      { url: `${base}/GTFS_KRK_A.zip`, mode: 'bus' as const },
      { url: `${base}/GTFS_KRK_T.zip`, mode: 'tram' as const },
    ]

    const features: Array<{
      type: 'Feature'
      geometry: { type: 'LineString'; coordinates: [number, number][] }
      properties: { mode: 'bus' | 'tram'; shape_id: string }
    }> = []

    for (const { url, mode } of urls) {
      const zip = await fetchZip(url)
      const [tripsTxt, shapesTxt] = await Promise.all([
        readTextFromZip(zip, 'trips.txt'),
        readTextFromZip(zip, 'shapes.txt'),
      ])

      type Trip = { route_id: string; shape_id?: string }
      type Shape = {
        shape_id: string
        shape_pt_lat: number | string
        shape_pt_lon: number | string
        shape_pt_sequence: number | string
      }

      const [trips, shapes] = await Promise.all([
        parseCSV<Trip>(tripsTxt),
        parseCSV<Shape>(shapesTxt),
      ])

      // Trust archive separation: all trips in this zip belong to this mode.
      const targetShapeIds = new Set(
        trips.filter((t) => t.shape_id).map((t) => t.shape_id as string),
      )

      // Group shape points by shape_id
      const shapeIdToPoints = new Map<
        string,
        { seq: number; lon: number; lat: number }[]
      >()
      for (const s of shapes) {
        const shapeId = s.shape_id
        if (!shapeId || !targetShapeIds.has(shapeId)) continue
        const arr = shapeIdToPoints.get(shapeId) ?? []
        arr.push({
          seq: toNumber(s.shape_pt_sequence),
          lon: toNumber(s.shape_pt_lon),
          lat: toNumber(s.shape_pt_lat),
        })
        shapeIdToPoints.set(shapeId, arr)
      }

      for (const [shapeId, points] of shapeIdToPoints) {
        points.sort((a, b) => a.seq - b.seq)
        const coords: [number, number][] = points.map((p) => [p.lon, p.lat])
        if (coords.length < 2) continue
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: { mode, shape_id: shapeId },
        })
      }
    }

    const collection = { type: 'FeatureCollection' as const, features }
    return NextResponse.json(collection, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error building GTFS shapes:', error)
    return NextResponse.json(
      { error: 'Failed to build GTFS shapes' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
