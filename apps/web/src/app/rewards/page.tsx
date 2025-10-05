'use client'

// Removed Convex imports since we're using hardcoded data
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, Clock, Gift, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ComponentType, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  type AuthSessionStatus,
  useAuthSession,
} from '@/hooks/use-auth-session'
import { authClient } from '@/lib/auth-client'

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

export default function RewardsPage() {
  const router = useRouter()
  const { user, status, isLoading, isClient, refresh } = useAuthSession()

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      void refresh()
    }
  }

  console.log('🎯 Rewards Page - Checking auth state...')

  useEffect(() => {
    if (!isClient) {
      return
    }

    if (status === 'guest') {
      router.replace('/login')
    }
  }, [isClient, status, router])

  const isCheckingAuth = !isClient || isLoading

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Checking authentication...
          </p>
        </div>
      </div>
    )
  }

  if (!user || status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">
            Authentication Required
          </h2>
          <p className="text-gray-600 max-w-sm">
            Please sign in to access your rewards and points.
          </p>
          <Link href="/login">
            <Button className="bg-teal-400 hover:bg-teal-500 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Auth is ready here; render rewards content with Convex queries

  const { label: statusLabel, variant: statusVariant } =
    AUTH_STATUS_COPY[status]

  type RecentTransaction = {
    id: string
    type: string
    description: string
    points: number
    timestamp: number
  }

  type RecentActivity = {
    id: string
    type: 'earned' | 'redeemed'
    title: string
    timestamp: string
    points: number
    icon: ComponentType<{ className?: string }>
    iconBg: string
    iconColor: string
  }

  // Helper function to get icon for transaction type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'REPORT_SUBMITTED':
      case 'REPORT_VERIFIED':
      case 'REPORT_CONFIRMED':
        return Plus
      case 'WEEKLY_STREAK':
      case 'REPUTATION_BONUS':
        return TrendingUp
      case 'VOUCHER_REDEEMED':
        return Gift
      default:
        return Plus
    }
  }

  // Helper function to get icon styling based on point direction
  const getTransactionIconStyle = (points: number) => {
    if (points < 0) {
      return {
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      }
    }
    return {
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true })
  }

  // Combine recent transactions and redemptions for activity feed

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
            <h1 className="text-xl font-semibold text-foreground">Rewards</h1>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant} suppressHydrationWarning>
                {statusLabel}
              </Badge>
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-sm text-teal-600 hover:text-teal-700 underline"
                  aria-label="Logout"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        <RewardsContent />
      </div>
    </div>
  )
}

function RewardsContent() {
  // Hardcoded data instead of Convex queries
  const userStats = {
    totalPoints: 3,
    verificationRate: 85,
    reportsSubmitted: 5,
    verifiedReports: 4,
    reputationScore: 75,
    recentTransactions: [
      {
        id: '1',
        type: 'REPORT_SUBMITTED',
        description: 'Reported train delay on Line 1',
        points: 3,
        timestamp: Date.now() - 86400000, // 1 day ago
      },
      {
        id: '2',
        type: 'REPORT_VERIFIED',
        description: 'Report verified by community',
        points: 3,
        timestamp: Date.now() - 172800000, // 2 days ago
      },
    ],
  }

  const userRedemptions = [
    {
      id: '1',
      rewardName: 'Coffee Voucher',
      rewardDescription: 'Free coffee at participating cafes',
      pointsUsed: 10,
      status: 'PENDING',
      redemptionCode: 'RWD-ABC123',
      timestamp: Date.now() - 259200000, // 3 days ago
      completedAt: null,
      notes: null,
    },
  ]

  console.log('📊 Using hardcoded user stats:', userStats)
  console.log('🎁 Using hardcoded user redemptions:', userRedemptions)

  type RecentTransaction = {
    id: string
    type: string
    description: string
    points: number
    timestamp: number
  }

  type RecentActivity = {
    id: string
    type: 'earned' | 'redeemed'
    title: string
    timestamp: string
    points: number
    icon: ComponentType<{ className?: string }>
    iconBg: string
    iconColor: string
  }

  // Helper function to get icon for transaction type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'REPORT_SUBMITTED':
      case 'REPORT_VERIFIED':
      case 'REPORT_CONFIRMED':
        return Plus
      case 'WEEKLY_STREAK':
      case 'REPUTATION_BONUS':
        return TrendingUp
      case 'VOUCHER_REDEEMED':
        return Gift
      default:
        return Plus
    }
  }

  // Helper function to get icon styling based on point direction
  const getTransactionIconStyle = (points: number) => {
    if (points < 0) {
      return {
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      }
    }
    return {
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true })
  }

  // No loading state needed since we're using hardcoded data

  // Combine recent transactions for activity feed
  const recentTransactions = (userStats?.recentTransactions ??
    []) as unknown as RecentTransaction[]
  const recentActivities: RecentActivity[] =
    recentTransactions.slice(0, 5).map((transaction) => ({
      id: transaction.id,
      type: transaction.points > 0 ? 'earned' : 'redeemed',
      title: transaction.description,
      timestamp: formatTimestamp(transaction.timestamp),
      points: transaction.points,
      icon: getTransactionIcon(transaction.type),
      ...getTransactionIconStyle(transaction.points),
    })) || []

  return (
    <>
      {/* Rewards Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-lg">
            Your Rewards Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userStats ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Points Balance */}
              <Card className="bg-teal-400 border-none shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">3</div>
                  <div className="text-sm text-white/90">Points</div>
                </CardContent>
              </Card>

              {/* Verification Score */}
              <Card className="bg-teal-400 border-none shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {userStats.verificationRate}%
                  </div>
                  <div className="text-sm text-white/90">verified</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Loading your rewards data...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Earn Points Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Earn More Points</CardTitle>
          <CardDescription>
            Contribute to the community by reporting delays, cancellations, and
            overcrowding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/reports/register">
            <Button className="w-full bg-teal-400 hover:bg-teal-500 text-white">
              Report a Disruption
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        {/* Section Title */}
        <div className="px-2">
          <p className="text-sm font-medium text-muted-foreground">
            Recent Activity
          </p>
        </div>

        {/* Recent Activity Card */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <div key={activity.id}>
                      <div className="flex items-center justify-between">
                        {/* Left Side - Action */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 ${activity.iconBg} rounded-full flex items-center justify-center`}
                          >
                            <Icon className={`w-5 h-5 ${activity.iconColor}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {activity.title}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{activity.timestamp}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Points */}
                        <div
                          className={`font-semibold ${activity.type === 'earned' ? 'text-green-600' : 'text-gray-600'}`}
                        >
                          {activity.type === 'earned' ? '+' : ''}3 Points
                        </div>
                      </div>

                      {/* Add separator except for last item */}
                      {index < recentActivities.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No activity yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Start reporting disruptions to earn points!
                  </p>
                </div>
              )}
            </div>

            {/* View All Activity Link */}
            <div className="mt-6 pt-4 border-t">
              <Link
                href="/rewards"
                className="flex items-center justify-center text-teal-600 hover:text-teal-700 font-medium"
              >
                <span>View All Activity</span>
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
