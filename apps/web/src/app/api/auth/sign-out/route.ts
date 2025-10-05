import { ConvexHttpClient } from 'convex/browser'
import { type NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    // Use Convex function to sign out the user
    const result = await convex.mutation(api.authActions.signOut, {})

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sign-out error:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
