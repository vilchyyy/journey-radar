import { httpRouter } from 'convex/server'
import { authComponent, createAuthForMutation } from './auth'

const http = httpRouter()

// Note: Better Auth HTTP routes are handled via Next.js API routes instead
// This HTTP router can be used for other Convex HTTP endpoints if needed

export default http
