import { nextJsHandler } from '@convex-dev/better-auth/nextjs'
import { createAuth } from '@journey-radar/backend/convex/auth'

export const { GET, POST } = nextJsHandler(createAuth)
