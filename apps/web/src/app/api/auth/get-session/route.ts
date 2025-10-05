import { ConvexHttpClient } from 'convex/browser'
import { type NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    // Use Convex function to get the session
    const result = await convex.query(api.authActions.getSession, {})

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Get session error:', error)
    // Return null instead of error for better UX
    return NextResponse.json({ data: null })
  }
}
