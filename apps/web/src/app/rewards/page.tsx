'use client'

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Gift,
  Plus,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function RewardsPage() {
  const recentActivities = [
    {
      id: 1,
      type: 'earned',
      title: 'Reported delay on Line 52',
      timestamp: 'Today, 4:15 PM',
      points: 10,
      icon: Plus,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 2,
      type: 'earned',
      title: 'Verified report: Train cancellation',
      timestamp: 'Today, 2:30 PM',
      points: 5,
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 3,
      type: 'earned',
      title: 'Reported overcrowding on Bus 23',
      timestamp: 'Yesterday, 8:45 AM',
      points: 8,
      icon: Plus,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 4,
      type: 'redeemed',
      title: 'Redeemed: Free travel voucher',
      timestamp: '2 days ago',
      points: -50,
      icon: Gift,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 5,
      type: 'earned',
      title: 'Weekly streak bonus',
      timestamp: '3 days ago',
      points: 25,
      icon: TrendingUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ]

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
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Rewards Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Rewards Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">
              Your Rewards Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Points Balance */}
              <Card className="bg-teal-400 border-none shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">1000</div>
                  <div className="text-sm text-white/90">Points</div>
                </CardContent>
              </Card>

              {/* Verification Score */}
              <Card className="bg-teal-400 border-none shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">97%</div>
                  <div className="text-sm text-white/90">verified</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* How to Earn Points Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earn More Points</CardTitle>
            <CardDescription>
              Contribute to the community by reporting delays, cancellations,
              and overcrowding.
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
                {recentActivities.map((activity, index) => {
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
                          className={`font-semibold ${
                            activity.type === 'earned'
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {activity.type === 'earned' ? '+' : ''}
                          {activity.points} Points
                        </div>
                      </div>

                      {/* Add separator except for last item */}
                      {index < recentActivities.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* View All Activity Link */}
              <div className="mt-6 pt-4 border-t">
                <Link
                  href="/rewards/activity"
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
      </div>
    </div>
  )
}
