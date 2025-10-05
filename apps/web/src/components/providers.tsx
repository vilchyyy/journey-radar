'use client'

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexReactClient } from 'convex/react'
import { authClient } from '@/lib/auth-client'
import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210',
)

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        {children}
      </ConvexBetterAuthProvider>
      <Toaster richColors />
    </ThemeProvider>
  )
}
