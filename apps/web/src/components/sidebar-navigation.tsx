'use client'

import { Edit, Heart, LogOut, Shield, User, Wallet, Calendar, Settings, Menu } from 'lucide-react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function SidebarNavigation() {
  const navigationItems = [
    { icon: Wallet, label: 'Rewards', href: '/rewards' },
    { icon: Calendar, label: 'Date', href: '/date' },
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Heart, label: 'Personalisation', href: '/personalisation' },
    { icon: Shield, label: 'Security', href: '/security' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

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
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

        {/* Header Section */}
        <div className="bg-teal-400 py-8 px-6">
          <div className="flex flex-col items-center">
            {/* Profile Image */}
            <Avatar className="w-16 h-16 border-3 border-white">
              <AvatarImage
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Profile"
              />
              <AvatarFallback>RM</AvatarFallback>
            </Avatar>

            {/* User Name */}
            <div className="text-center mt-4">
              <h2 className="text-xl font-bold text-white">Ronald</h2>
              <p className="text-sm text-white/90">Müller</p>
            </div>

            {/* Edit Button */}
            <Button
              variant="outline"
              size="sm"
              className="mt-4 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full"
            >
              <span className="text-sm mr-1">Edit</span>
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-6 px-6 flex flex-col h-full">
          <nav className="flex-1">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 px-3 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      )}
                    >
                      <Icon className="w-5 h-5 text-gray-700" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Logout Link */}
          <div className="pt-8 border-t">
            <Link
              href="/logout"
              className="flex items-center text-teal-500 font-medium underline hover:text-teal-600 transition-colors"
            >
              Logout
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}