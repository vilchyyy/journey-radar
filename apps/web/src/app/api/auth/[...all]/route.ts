import { nextJsHandler } from '@convex-dev/better-auth/nextjs'

// For local development, Convex serves HTTP actions on a different port (3211 by default)
// than the main deployment URL (3210). We must use the HTTP Actions URL here.
const convexSiteUrl = 'http://127.0.0.1:3211'

if (!convexSiteUrl) {
  throw new Error('Convex site URL is not configured in environment variables!')
}

export const { GET, POST } = nextJsHandler({
  convexSiteUrl,
})
