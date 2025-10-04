'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    transportType: '',
    lineNumber: '',
    direction: '',
    delayReason: '',
    delayDuration: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigate to verification page
    router.push('/reports/verify')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="w-10 h-10 rounded-full bg-[#48c9b0] flex items-center justify-center text-white">
                <Menu className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              Reports Registration
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto px-4 py-6 space-y-6"
      >
        {/* Timing Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timing</h2>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type="date"
                placeholder="Choose Date"
                className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div className="relative">
              <Input
                type="time"
                placeholder="Choose Time"
                className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Location & Route Details */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Location & Route Details
          </h2>
          <div className="space-y-3">
            <Input
              placeholder="Use Current Location"
              className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
            />
            <Input
              placeholder="Transport Type"
              className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
              value={formData.transportType}
              onChange={(e) =>
                setFormData({ ...formData, transportType: e.target.value })
              }
            />
            <Input
              placeholder="Line Number"
              className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
              value={formData.lineNumber}
              onChange={(e) =>
                setFormData({ ...formData, lineNumber: e.target.value })
              }
            />
            <Input
              placeholder="Direction"
              className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
              value={formData.direction}
              onChange={(e) =>
                setFormData({ ...formData, direction: e.target.value })
              }
            />
          </div>
        </div>

        {/* Delay Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Delay Information
          </h2>
          <div className="space-y-3">
            <Input
              placeholder="Delay Reason"
              className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
              value={formData.delayReason}
              onChange={(e) =>
                setFormData({ ...formData, delayReason: e.target.value })
              }
            />
            <Input
              placeholder="(Possible) Delay Duration"
              className="w-full h-12 rounded-xl border-gray-200 text-[#48c9b0] placeholder:text-[#48c9b0]"
              value={formData.delayDuration}
              onChange={(e) =>
                setFormData({ ...formData, delayDuration: e.target.value })
              }
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-14 bg-[#48c9b0] hover:bg-[#3fb5a3] text-white text-lg font-semibold rounded-2xl"
        >
          Submit
        </Button>
      </form>
    </div>
  )
}
