import { ConvexHttpClient } from 'convex/browser'
import { type NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Use Convex function to sign up the user
    const result = await convex.mutation(api.authActions.signUp, {
      email,
      password,
      name,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sign-up error:', error)
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 })
  }
}
