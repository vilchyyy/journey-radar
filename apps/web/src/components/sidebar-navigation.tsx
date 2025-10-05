'use client'

import { useQuery } from 'convex/react'
import {
  Edit,
  FileText,
  LogIn,
  LogOut,
  Map as MapIcon,
  Menu,
  Settings,
  User,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// Define navigation item type
type NavigationItem = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}

import {
  type AuthSessionStatus,
  useAuthSession,
} from '@/hooks/use-auth-session'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const AUTH_STATUS_COPY: Record<
  AuthSessionStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
  }
> = {
  loading: { label: 'Checking session…', variant: 'outline' },
  authenticated: { label: 'Signed in', variant: 'default' },
  guest: { label: 'Guest mode', variant: 'secondary' },
  error: { label: 'Auth unavailable', variant: 'destructive' },
}
export function SidebarNavigation() {
  const { user, status, isClient, refresh } = useAuthSession()

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      void refresh()
    }
  }

  const navigationItems: NavigationItem[] = useMemo(
    () =>
      user
        ? [
            { icon: MapIcon, label: 'Map', href: '/map' },
            { icon: Wallet, label: 'Rewards', href: '/rewards' },
            { icon: FileText, label: 'Reports', href: '/reports' },
            { icon: User, label: 'Profile', href: '/profile' },
            { icon: Settings, label: 'Settings', href: '/settings' },
          ]
        : [
            { icon: MapIcon, label: 'Map', href: '/map' },
            { icon: Wallet, label: 'Rewards', href: '/rewards' },
            { icon: FileText, label: 'Reports', href: '/reports' },
          ],
    [user],
  )

  // During SSR and initial mount, show a loading button to prevent hydration mismatch
  if (!isClient || (status === 'loading' && !user)) {
    return (
      <Button
        variant="default"
        size="icon"
        className="fixed top-4 left-4 z-40 rounded-full w-10 h-10"
        disabled
        suppressHydrationWarning
      >
        <Menu className="h-5 w-5" />
      </Button>
    )
  }

  const { label: statusLabel, variant: statusVariant } =
    AUTH_STATUS_COPY[status]
  const displayName = user?.name?.split(' ')[0] ?? 'Guest'
  const displaySurname = user?.name?.split(' ')[1] ?? ''
  const initials =
    user?.name
      ?.split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase() || 'U'

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed top-4 left-4 z-40 rounded-full w-10 h-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-80 p-0 rounded-r-2xl"
        suppressHydrationWarning
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

        {/* Header Section */}
        <div className="bg-teal-400 py-8 px-6">
          <div className="flex flex-col items-center gap-4">
            <Badge variant={statusVariant} suppressHydrationWarning>
              {statusLabel}
            </Badge>

            {user ? (
              <>
                {/* Profile Image */}
                <Avatar className="w-16 h-16 border-3 border-white">
                  <AvatarImage src={user.image ?? undefined} alt="Profile" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                {/* User Name */}
                <div className="text-center">
                  <h2
                    className="text-xl font-bold text-white"
                    suppressHydrationWarning
                  >
                    {displayName}
                  </h2>
                  {displaySurname ? (
                    <p
                      className="text-sm text-white/90"
                      suppressHydrationWarning
                    >
                      {displaySurname}
                    </p>
                  ) : null}
                </div>

                {/* Edit Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full"
                >
                  <span className="text-sm mr-1">Edit</span>
                  <Edit className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <>
                {/* Guest Avatar */}
                <Avatar className="w-16 h-16 border-3 border-white">
                  <AvatarFallback>
                    <User className="w-8 h-8 text-white" />
                  </AvatarFallback>
                </Avatar>

                {/* Guest Message */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">Welcome!</h2>
                  <p className="text-sm text-white/90">
                    Sign in to access all features
                  </p>
                </div>

                {/* Sign In Button */}
                <SheetClose asChild>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full"
                    >
                      <span className="text-sm mr-1">Sign In</span>
                      <LogIn className="w-3 h-3" />
                    </Button>
                  </Link>
                </SheetClose>
              </>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-6 px-6 flex flex-col h-full">
          <nav className="flex-1">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <Link
                        href={item.href as any}
                        className={cn(
                          'flex items-center gap-4 px-3 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors',
                        )}
                      >
                        <IconComponent className="w-5 h-5 text-gray-700" />
                        <span>{item.label}</span>
                      </Link>
                    </SheetClose>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Auth Links */}
          <div className="pt-8 border-t">
            {user ? (
              <SheetClose asChild>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-teal-500 font-medium underline hover:text-teal-600 transition-colors"
                  disabled={status === 'loading'}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </SheetClose>
            ) : (
              <div className="space-y-2">
                <SheetClose asChild>
                  <Link
                    href="/login"
                    className="flex items-center text-teal-500 font-medium underline hover:text-teal-600 transition-colors"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/register"
                    className="flex items-center text-teal-500 font-medium underline hover:text-teal-600 transition-colors"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Create Account
                  </Link>
                </SheetClose>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
