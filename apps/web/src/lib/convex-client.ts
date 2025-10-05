import { api } from '@journey-radar/backend/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

// Initialize Convex client for web app
export const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || 'http://localhost:3217',
)

export { api }
