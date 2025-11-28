/**
 * Feedback Admin API Routes
 *
 * Endpoints:
 * - GET /api/feedback/admin - Get detailed feedback stats (for admin page)
 * - DELETE /api/feedback/admin - Clear all feedback data (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Keys for KV storage
const VOTES_KEY = 'feedback:votes'
const VOTE_DETAILS_KEY = 'feedback:vote_details'
const COMMENTS_KEY = 'feedback:comments'

interface Vote {
  method_id: string
  timestamp: number
  user_id?: string
}

interface Comment {
  id: string
  category: string
  content: string
  timestamp: number
  user_id?: string
}

interface AdminStats {
  total_votes: number
  total_comments: number
  votes_by_method: Record<string, number>
  comments_by_category: Record<string, number>
  recent_votes: Vote[]
  recent_comments: Comment[]
  vote_timeline: Array<{ date: string; count: number }>
}

/**
 * GET /api/feedback/admin
 * Returns detailed statistics for admin dashboard
 * Public endpoint - voting stats are not sensitive
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const [votes, voteDetails, comments] = await Promise.all([
      kv.hgetall<Record<string, number>>(VOTES_KEY),
      kv.lrange<Vote>(VOTE_DETAILS_KEY, 0, 100), // Last 100 votes
      kv.lrange<Comment>(COMMENTS_KEY, 0, 100), // Last 100 comments
    ])

    const votesData = votes || {}
    const voteDetailsData = voteDetails || []
    const commentsData = comments || []

    // Calculate total votes
    const totalVotes = Object.values(votesData).reduce((sum, count) => sum + count, 0)

    // Group comments by category
    const commentsByCategory: Record<string, number> = {}
    for (const comment of commentsData) {
      commentsByCategory[comment.category] = (commentsByCategory[comment.category] || 0) + 1
    }

    // Calculate vote timeline (last 7 days)
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const voteTimeline: Array<{ date: string; count: number }> = []

    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayMs
      const dayEnd = now - i * dayMs
      const date = new Date(dayEnd).toISOString().split('T')[0]
      const count = voteDetailsData.filter(
        v => v.timestamp >= dayStart && v.timestamp < dayEnd
      ).length
      voteTimeline.push({ date, count })
    }

    const stats: AdminStats = {
      total_votes: totalVotes,
      total_comments: commentsData.length,
      votes_by_method: votesData,
      comments_by_category: commentsByCategory,
      recent_votes: voteDetailsData.slice(0, 20),
      recent_comments: commentsData.slice(0, 20),
      vote_timeline: voteTimeline,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/feedback/admin
 * Clear all feedback data (admin only)
 * Requires admin_key in query params for simple protection
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const adminKey = searchParams.get('admin_key')

    // Authentication - requires FEEDBACK_ADMIN_KEY environment variable
    const expectedKey = process.env.FEEDBACK_ADMIN_KEY
    if (!expectedKey) {
      return NextResponse.json(
        { error: 'FEEDBACK_ADMIN_KEY not configured' },
        { status: 500 }
      )
    }

    if (adminKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Clear all feedback data
    await Promise.all([
      kv.del(VOTES_KEY),
      kv.del(VOTE_DETAILS_KEY),
      kv.del(COMMENTS_KEY),
    ])

    return NextResponse.json({
      success: true,
      message: 'All feedback data cleared',
    })
  } catch (error) {
    console.error('Failed to clear feedback:', error)
    return NextResponse.json(
      { error: 'Failed to clear feedback' },
      { status: 500 }
    )
  }
}
