import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'

interface VoteResult {
  action: 'added' | 'removed' | 'changed' | 'deleted'
  voteScore: number
}

export function useReportVoting(reportId: string) {
  const [userVote, setUserVote] = useState<'UPVOTE' | 'DOWNVOTE' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication and get current vote
  useEffect(() => {
    const checkAuthAndVote = async () => {
      try {
        const session = await authClient.getSession()
        if (session.data?.user?.id) {
          setIsAuthenticated(true)

          // Get current vote for this report
          const response = await fetch(
            `/api/reports/vote/get?reportId=${reportId}`,
          )
          if (response.ok) {
            const data = await response.json()
            setUserVote(data.vote)
          }
        } else {
          setIsAuthenticated(false)
          setUserVote(null)
        }
      } catch (error) {
        console.error('Error checking auth and vote:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuthAndVote()
  }, [reportId])

  const handleVote = useCallback(
    async (voteType: 'UPVOTE' | 'DOWNVOTE') => {
      if (!isAuthenticated) {
        // Redirect to sign in or show sign-in modal
        window.location.href = '/sign-in'
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/reports/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportId,
            voteType,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to vote')
        }

        const result: VoteResult = await response.json()

        if (result.action === 'deleted') {
          // Report was deleted due to low score
          return { deleted: true, voteScore: result.voteScore }
        }

        // Update local state based on action
        if (result.action === 'removed') {
          setUserVote(null)
        } else if (result.action === 'added' || result.action === 'changed') {
          setUserVote(voteType)
        }

        return { deleted: false, voteScore: result.voteScore }
      } catch (error) {
        console.error('Error voting:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [reportId, isAuthenticated],
  )

  const upvote = useCallback(() => handleVote('UPVOTE'), [handleVote])
  const downvote = useCallback(() => handleVote('DOWNVOTE'), [handleVote])

  return {
    userVote,
    isAuthenticated,
    isLoading,
    upvote,
    downvote,
    handleVote,
  }
}
