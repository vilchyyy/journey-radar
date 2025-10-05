import { ConvexHttpClient } from 'convex/browser'
import { type NextRequest, NextResponse } from 'next/server'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest) {
  try {
    const { email, password, callbackURL } = await request.json()

    // Use Convex function to sign in the user
    const result = await convex.mutation(api.authActions.signIn, {
      email,
      password,
    })

    // Handle redirect if sign-in is successful
    if (result.user && callbackURL) {
      return NextResponse.redirect(new URL(callbackURL, request.url))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sign-in error:', error)
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 })
  }
}
