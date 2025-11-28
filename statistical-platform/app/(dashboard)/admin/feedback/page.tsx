'use client'

/**
 * Admin Feedback Page
 *
 * Displays all feedback data:
 * - Vote statistics by method
 * - Recent comments
 * - Vote timeline (last 7 days)
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Trophy,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Calendar,
  Clock,
  Tag,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminStats {
  total_votes: number
  total_comments: number
  votes_by_method: Record<string, number>
  comments_by_category: Record<string, number>
  recent_votes: Array<{ method_id: string; timestamp: number }>
  recent_comments: Array<{ id: string; category: string; content: string; timestamp: number }>
  vote_timeline: Array<{ date: string; count: number }>
}

// Method ID to name mapping
const METHOD_NAMES: Record<string, { title: string; titleKr: string }> = {
  'ind-ttest': { title: 'Independent t-test', titleKr: '독립표본 t검정' },
  'paired-ttest': { title: 'Paired t-test', titleKr: '대응표본 t검정' },
  'oneway-anova': { title: 'One-way ANOVA', titleKr: '일원분산분석' },
  'twoway-anova': { title: 'Two-way ANOVA', titleKr: '이원분산분석' },
  'repeated-anova': { title: 'Repeated ANOVA', titleKr: '반복측정 분산분석' },
  'pearson': { title: 'Pearson Correlation', titleKr: '피어슨 상관' },
  'spearman': { title: 'Spearman Correlation', titleKr: '스피어만 상관' },
  'linear-reg': { title: 'Linear Regression', titleKr: '선형회귀' },
  'multiple-reg': { title: 'Multiple Regression', titleKr: '다중회귀' },
  'mann-whitney': { title: 'Mann-Whitney U', titleKr: '맨-휘트니 U' },
  'wilcoxon': { title: 'Wilcoxon Signed-Rank', titleKr: '윌콕슨 부호순위' },
  'kruskal': { title: 'Kruskal-Wallis', titleKr: '크루스칼-왈리스' },
  'chi-square': { title: 'Chi-square Test', titleKr: '카이제곱 검정' },
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function AdminFeedbackPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/feedback/admin')
      if (response.ok) {
        const data: AdminStats = await response.json()
        setStats(data)
      } else {
        setError('Failed to load statistics')
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err)
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Sort methods by votes
  const sortedMethods = stats
    ? Object.entries(stats.votes_by_method)
        .sort(([, a], [, b]) => b - a)
        .map(([id, votes]) => ({
          id,
          votes,
          name: METHOD_NAMES[id] || { title: id, titleKr: id },
        }))
    : []

  // Max votes for bar width calculation
  const maxVotes = sortedMethods.length > 0 ? sortedMethods[0].votes : 1

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Admin</h1>
          <p className="text-muted-foreground">User feedback and voting statistics</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Total Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_votes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sortedMethods.length} methods voted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Total Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_comments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(stats.comments_by_category).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              This Week Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.vote_timeline.reduce((sum, day) => sum + day.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">votes in last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Vote Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vote Timeline (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.vote_timeline.map((day, index) => {
              const maxDayVotes = Math.max(...stats.vote_timeline.map(d => d.count), 1)
              const height = (day.count / maxDayVotes) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-violet-500 to-pink-500 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{day.count}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatShortDate(day.date)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vote Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Vote Ranking
            </CardTitle>
            <CardDescription>Methods sorted by vote count</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No votes yet</p>
            ) : (
              sortedMethods.map((method, index) => (
                <div key={method.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      index === 0 && "bg-yellow-400 text-yellow-900",
                      index === 1 && "bg-gray-300 text-gray-700",
                      index === 2 && "bg-amber-600 text-amber-100",
                      index >= 3 && "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{method.name.title}</div>
                    <div className="text-xs text-muted-foreground">{method.name.titleKr}</div>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${(method.votes / maxVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold shrink-0">{method.votes}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Recent Comments
            </CardTitle>
            <CardDescription>Latest user feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recent_comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
            ) : (
              stats.recent_comments.slice(0, 10).map(comment => (
                <div key={comment.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">
                      <Tag className="h-3 w-3 mr-1" />
                      {comment.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comments by Category */}
      {Object.keys(stats.comments_by_category).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comments by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.comments_by_category).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg"
                >
                  <span className="font-medium">{category}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
