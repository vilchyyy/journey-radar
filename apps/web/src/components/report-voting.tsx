'use client'

import { ArrowBigDown, ArrowBigUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReportVoting } from '@/hooks/use-report-voting'
import { cn } from '@/lib/utils'

interface ReportVotingProps {
  reportId: string
  upvotes: number
  downvotes: number
  voteScore: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  onUpdate?: (newScore: number, deleted?: boolean) => void
}

export function ReportVoting({
  reportId,
  upvotes,
  downvotes,
  voteScore,
  className,
  size = 'md',
  onUpdate,
}: ReportVotingProps) {
  const { userVote, isAuthenticated, isLoading, upvote, downvote } =
    useReportVoting(reportId)

  const handleVote = async (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    try {
      const result = await (voteType === 'UPVOTE' ? upvote() : downvote())
      if (result?.deleted) {
        onUpdate?.(result.voteScore, true)
      } else {
        onUpdate?.(result.voteScore)
      }
    } catch (error) {
      console.error('Vote failed:', error)
    }
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const buttonSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'p-0 hover:bg-transparent',
          buttonSizes[size],
          userVote === 'UPVOTE' && 'text-green-600',
          !isAuthenticated && 'opacity-50',
        )}
        onClick={() => handleVote('UPVOTE')}
        disabled={isLoading || !isAuthenticated}
        title={!isAuthenticated ? 'Sign in to vote' : 'Upvote'}
      >
        <ArrowBigUp className={cn('h-4 w-4', sizeClasses[size])} />
      </Button>

      <span
        className={cn(
          'font-medium min-w-[2rem] text-center',
          voteScore > 0
            ? 'text-green-600'
            : voteScore < 0
              ? 'text-red-600'
              : 'text-muted-foreground',
          sizeClasses[size],
        )}
      >
        {voteScore > 0 ? '+' : ''}
        {voteScore}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'p-0 hover:bg-transparent',
          buttonSizes[size],
          userVote === 'DOWNVOTE' && 'text-red-600',
          !isAuthenticated && 'opacity-50',
        )}
        onClick={() => handleVote('DOWNVOTE')}
        disabled={isLoading || !isAuthenticated}
        title={!isAuthenticated ? 'Sign in to vote' : 'Downvote'}
      >
        <ArrowBigDown className={cn('h-4 w-4', sizeClasses[size])} />
      </Button>
    </div>
  )
}
