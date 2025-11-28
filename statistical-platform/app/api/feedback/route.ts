/**
 * Feedback API Routes
 *
 * Endpoints:
 * - GET /api/feedback - Get all votes and comments
 * - POST /api/feedback - Submit a vote or comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Types
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

interface FeedbackData {
  votes: Record<string, number>
  vote_details: Vote[]
  comments: Comment[]
}

// Keys for KV storage
const VOTES_KEY = 'feedback:votes'
const VOTE_DETAILS_KEY = 'feedback:vote_details'
const COMMENTS_KEY = 'feedback:comments'

/**
 * GET /api/feedback
 * Returns all votes and comments
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [votes, voteDetails, comments] = await Promise.all([
      kv.hgetall<Record<string, number>>(VOTES_KEY),
      kv.lrange<Vote>(VOTE_DETAILS_KEY, 0, -1),
      kv.lrange<Comment>(COMMENTS_KEY, 0, -1),
    ])

    const data: FeedbackData = {
      votes: votes || {},
      vote_details: voteDetails || [],
      comments: comments || [],
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feedback
 * Submit a vote or comment
 *
 * Body for vote:
 * { type: 'vote', method_id: string }
 *
 * Body for comment:
 * { type: 'comment', category: string, content: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      type: 'vote' | 'comment'
      method_id?: string
      category?: string
      content?: string
    }

    if (body.type === 'vote') {
      if (!body.method_id) {
        return NextResponse.json(
          { error: 'method_id is required for votes' },
          { status: 400 }
        )
      }

      // Increment vote count
      await kv.hincrby(VOTES_KEY, body.method_id, 1)

      // Store vote detail
      const voteDetail: Vote = {
        method_id: body.method_id,
        timestamp: Date.now(),
      }
      await kv.lpush(VOTE_DETAILS_KEY, voteDetail)

      // Get updated count
      const newCount = await kv.hget<number>(VOTES_KEY, body.method_id)

      return NextResponse.json({
        success: true,
        method_id: body.method_id,
        votes: newCount,
      })
    }

    if (body.type === 'comment') {
      if (!body.content || !body.category) {
        return NextResponse.json(
          { error: 'content and category are required for comments' },
          { status: 400 }
        )
      }

      const comment: Comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        category: body.category,
        content: body.content,
        timestamp: Date.now(),
      }

      await kv.lpush(COMMENTS_KEY, comment)

      return NextResponse.json({
        success: true,
        comment,
      })
    }

    return NextResponse.json(
      { error: 'Invalid type. Use "vote" or "comment"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
