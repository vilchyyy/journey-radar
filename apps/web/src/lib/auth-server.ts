import { getToken as getTokenNextjs } from '@convex-dev/better-auth/nextjs'
import { createAuth } from '@journey-radar/backend/convex/auth'

export const getToken = () => {
  return getTokenNextjs(createAuth)
}

export const auth = async () => {
  const authInstance = createAuth({ optionsOnly: true })
  const session = await authInstance.api.getSession({
    headers: {
      // Get headers from request context if needed
    },
  })
  return session
}
