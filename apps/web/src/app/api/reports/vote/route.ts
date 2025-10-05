import { type NextRequest, NextResponse } from 'next/server'
import { api, convex } from '@/lib/convex-client'
import { authClient } from '@/lib/auth-client'

export async function POST(request: NextRequest) {
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
        { status: 401 }
      )
    }

    const { reportId, voteType } = await request.json()

    if (!reportId || !voteType) {
      return NextResponse.json(
        { error: 'Missing required fields: reportId, voteType' },
        { status: 400 }
      )
    }

    if (!['UPVOTE', 'DOWNVOTE'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid voteType. Must be UPVOTE or DOWNVOTE' },
        { status: 400 }
      )
    }

    // Get the user from Convex using the auth session
    const user = await convex.query(api.users.getUserByToken, {
      tokenIdentifier: session.data.user.email || session.data.user.id
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Cast the vote
    const result = await convex.mutation(api.reports.voteOnReport, {
      reportId: reportId as any,
      userId: user._id,
      voteType: voteType as any,
    })

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error voting on report:', error)
    return NextResponse.json(
      { error: 'Failed to vote on report' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}