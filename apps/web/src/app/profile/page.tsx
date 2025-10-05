'use client'

import {
  User,
  Shield,
  LogOut,
  HelpCircle,
  Heart,
  ChevronRight,
  Edit,
  UserPlus,
  Fingerprint
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="w-10 h-10">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Profile</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        {/* User Info Card */}
        <Card className="bg-teal-400 border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Avatar className="w-16 h-16 border-2 border-white">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="Profile"
                  />
                  <AvatarFallback className="bg-teal-300 text-teal-700 font-semibold text-lg">
                    IA
                  </AvatarFallback>
                </Avatar>

                {/* User Details */}
                <div>
                  <h2 className="text-xl font-bold text-white">Itunuoluwa Abidoye</h2>
                  <p className="text-sm text-white/90">@Itunuoluwa</p>
                </div>
              </div>

              {/* Edit Icon */}
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Edit className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Account Section */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">My Account</h3>

            {/* My Account Row */}
            <div className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-3 -mx-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">My Account</p>
                  <p className="text-sm text-muted-foreground">Make changes to your account</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <Separator />

            {/* Saved Beneficiary Row */}
            <div className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-3 -mx-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Saved Beneficiary</p>
                  <p className="text-sm text-muted-foreground">Manage your saved account</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <Separator />

            {/* Face ID / Touch ID Row */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-medium text-foreground">Face ID / Touch ID</p>
              </div>
              <Switch />
            </div>

            <Separator />

            {/* Two-Factor Authentication Row */}
            <div className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-3 -mx-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-medium text-foreground">Two-Factor Authentication</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <Separator />

            {/* Log out Row */}
            <div className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-3 -mx-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-medium text-foreground">Log out</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* More Section Title */}
        <div className="px-2">
          <p className="text-sm font-medium text-muted-foreground">More</p>
        </div>

        {/* More Section */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Help & Support Row */}
            <div className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-3 -mx-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-medium text-foreground">Help & Support</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <Separator />

            {/* About App Row */}
            <div className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-3 -mx-3 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-medium text-foreground">About App</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}