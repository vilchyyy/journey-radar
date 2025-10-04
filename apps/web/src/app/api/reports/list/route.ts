import { NextResponse } from 'next/server'
import { convex, api } from '@/lib/convex-client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Fetch reports from Convex database
    const reports = await convex.query(api.reports.getReports)

    // Transform reports to match expected format
    const transformedReports = reports.map((report) => ({
      _id: report._id,
      type: report.type,
      status: report.status,
      description: report.description,
      userPoints: report.userPoints,
      location: report.location,
      _creationTime: report._creationTime
    }))

    return NextResponse.json(transformedReports, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
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