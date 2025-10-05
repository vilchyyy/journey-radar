import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  trustedOrigins: [process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  // For now using in-memory storage
  // TODO: Set up proper persistent storage (database adapter needed)
})