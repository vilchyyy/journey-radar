import { type NextRequest, NextResponse } from 'next/server'
import { authClient } from '@/lib/auth-client'
import { api, convex } from '@/lib/convex-client'

export async function GET(request: NextRequest) {
  try {
    const session = await authClient.getSession({
      fetchOptions: {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      },
    })

    if (!session?.data?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing required parameter: reportId' },
        { status: 400 },
      )
    }

    // Get the user from Convex using the auth session
    const user = await convex.query(api.users.getUserByToken, {
      tokenIdentifier: session.data.user.email || session.data.user.id,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the user's vote on this report
    const userVote = await convex.query(api.reports.getUserVote, {
      reportId: reportId as any,
      userId: user._id,
    })

    return NextResponse.json(
      { vote: userVote },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Error getting user vote:', error)
    return NextResponse.json(
      { error: 'Failed to get user vote' },
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
