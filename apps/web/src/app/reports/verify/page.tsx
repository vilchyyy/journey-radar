'use client'

import { Bell, Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function VerifyPage() {
  const router = useRouter()
  const [selectedAnswer, setSelectedAnswer] = useState<'yes' | 'no' | null>(
    null,
  )
  const [reason, setReason] = useState('')
  const [showReasonInput, setShowReasonInput] = useState(false)

  const handleSubmit = () => {
    // Handle submission
    alert('Report verified successfully!')
    router.push('/')
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
              Reports Verification
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Icon and Title */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Confirmation
            </h2>
          </div>

          {/* Question */}
          <div className="text-center mb-6">
            <p className="text-[#48c9b0] font-medium text-lg mb-1">
              Tram Accident Near You
            </p>
            <p className="text-[#48c9b0] font-medium">Salzwater Streer 122</p>
          </div>

          {/* Yes/No Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setSelectedAnswer('yes')}
              className={`h-12 rounded-xl font-medium transition-colors ${
                selectedAnswer === 'yes'
                  ? 'bg-[#48c9b0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setSelectedAnswer('no')}
              className={`h-12 rounded-xl font-medium transition-colors ${
                selectedAnswer === 'no'
                  ? 'bg-[#48c9b0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              No
            </button>
          </div>

          {/* Add Reason Button */}
          {!showReasonInput ? (
            <Button
              onClick={() => setShowReasonInput(true)}
              className="w-full h-14 bg-[#48c9b0] hover:bg-[#3fb5a3] text-white font-semibold rounded-2xl mb-3"
            >
              Add your Reason
            </Button>
          ) : (
            <div className="mb-3">
              <Textarea
                placeholder="Enter your reason here..."
                className="w-full min-h-24 rounded-xl border-gray-200 resize-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full h-14 bg-[#48c9b0] hover:bg-[#3fb5a3] text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
