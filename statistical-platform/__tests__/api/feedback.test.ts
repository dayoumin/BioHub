/**
 * Feedback API Logic Tests
 *
 * Tests for feedback API logic (unit tests without Next.js runtime)
 */

// Mock @vercel/kv with proper types
import { vi } from 'vitest'
const mockKv = {
  hgetall: vi.fn(),
  lrange: vi.fn(),
  hincrby: vi.fn(),
  lpush: vi.fn(),
  hget: vi.fn(),
  del: vi.fn(),
}

vi.mock('@vercel/kv', () => ({
  kv: mockKv,
}))

// Define types
interface Vote {
  method_id: string
  timestamp: number
}

interface FeedbackComment {
  id: string
  category: string
  content: string
  timestamp: number
}

interface FeedbackData {
  votes: Record<string, number>
  vote_details: Vote[]
  comments: FeedbackComment[]
}

// Helper functions that mirror API logic (for unit testing)
async function getFeedback(): Promise<FeedbackData> {
  const [votes, voteDetails, comments] = await Promise.all([
    mockKv.hgetall('feedback:votes'),
    mockKv.lrange('feedback:vote_details', 0, -1),
    mockKv.lrange('feedback:comments', 0, -1),
  ])

  return {
    votes: (votes as Record<string, number>) || {},
    vote_details: (voteDetails as Vote[]) || [],
    comments: (comments as FeedbackComment[]) || [],
  }
}

async function submitVote(methodId: string): Promise<{ success: boolean; votes: number }> {
  await mockKv.hincrby('feedback:votes', methodId, 1)
  await mockKv.lpush('feedback:vote_details', {
    method_id: methodId,
    timestamp: Date.now(),
  })
  const newCount = await mockKv.hget('feedback:votes', methodId) as number
  return { success: true, votes: newCount }
}

async function submitComment(category: string, content: string): Promise<{ success: boolean; comment: FeedbackComment }> {
  const comment: FeedbackComment = {
    id: `comment_${Date.now()}`,
    category,
    content,
    timestamp: Date.now(),
  }
  await mockKv.lpush('feedback:comments', comment)
  return { success: true, comment }
}

describe('Feedback API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getFeedback', () => {
    it('returns empty data when no feedback exists', async () => {
      mockKv.hgetall.mockResolvedValue(null)
      mockKv.lrange.mockResolvedValue([])

      const data = await getFeedback()

      expect(data).toEqual({
        votes: {},
        vote_details: [],
        comments: [],
      })
    })

    it('returns existing feedback data', async () => {
      const mockVotes = { 'ind-ttest': 5, 'pearson': 3 }
      const mockVoteDetails = [
        { method_id: 'ind-ttest', timestamp: 1700000000000 },
      ]
      const mockComments = [
        { id: 'comment_1', category: 'Bug', content: 'Test', timestamp: 1700000000000 },
      ]

      mockKv.hgetall.mockResolvedValue(mockVotes)
      mockKv.lrange.mockResolvedValueOnce(mockVoteDetails)
      mockKv.lrange.mockResolvedValueOnce(mockComments)

      const data = await getFeedback()

      expect(data.votes).toEqual(mockVotes)
      expect(data.vote_details).toEqual(mockVoteDetails)
      expect(data.comments).toEqual(mockComments)
    })

    it('calls KV with correct keys', async () => {
      mockKv.hgetall.mockResolvedValue({})
      mockKv.lrange.mockResolvedValue([])

      await getFeedback()

      expect(mockKv.hgetall).toHaveBeenCalledWith('feedback:votes')
      expect(mockKv.lrange).toHaveBeenCalledWith('feedback:vote_details', 0, -1)
      expect(mockKv.lrange).toHaveBeenCalledWith('feedback:comments', 0, -1)
    })
  })

  describe('submitVote', () => {
    it('increments vote count for method', async () => {
      mockKv.hincrby.mockResolvedValue(6)
      mockKv.lpush.mockResolvedValue(1)
      mockKv.hget.mockResolvedValue(6)

      const result = await submitVote('ind-ttest')

      expect(result.success).toBe(true)
      expect(result.votes).toBe(6)
      expect(mockKv.hincrby).toHaveBeenCalledWith('feedback:votes', 'ind-ttest', 1)
    })

    it('stores vote detail with timestamp', async () => {
      mockKv.hincrby.mockResolvedValue(1)
      mockKv.lpush.mockResolvedValue(1)
      mockKv.hget.mockResolvedValue(1)

      await submitVote('pearson')

      expect(mockKv.lpush).toHaveBeenCalledWith(
        'feedback:vote_details',
        expect.objectContaining({
          method_id: 'pearson',
          timestamp: expect.any(Number),
        })
      )
    })
  })

  describe('submitComment', () => {
    it('creates comment with category and content', async () => {
      mockKv.lpush.mockResolvedValue(1)

      const result = await submitComment('Bug Report', 'Found an issue')

      expect(result.success).toBe(true)
      expect(result.comment.category).toBe('Bug Report')
      expect(result.comment.content).toBe('Found an issue')
      expect(result.comment.id).toContain('comment_')
      expect(result.comment.timestamp).toBeDefined()
    })

    it('stores comment in KV', async () => {
      mockKv.lpush.mockResolvedValue(1)

      await submitComment('Feature Request', 'New feature please')

      expect(mockKv.lpush).toHaveBeenCalledWith(
        'feedback:comments',
        expect.objectContaining({
          category: 'Feature Request',
          content: 'New feature please',
        })
      )
    })
  })

  describe('Statistical method IDs', () => {
    const validMethodIds = [
      'ind-ttest',
      'paired-ttest',
      'oneway-anova',
      'twoway-anova',
      'repeated-anova',
      'pearson',
      'spearman',
      'linear-reg',
      'multiple-reg',
      'mann-whitney',
      'wilcoxon',
      'kruskal',
      'chi-square',
    ]

    it.each(validMethodIds)('accepts valid method ID: %s', async (methodId) => {
      mockKv.hincrby.mockResolvedValue(1)
      mockKv.lpush.mockResolvedValue(1)
      mockKv.hget.mockResolvedValue(1)

      const result = await submitVote(methodId)

      expect(result.success).toBe(true)
      expect(mockKv.hincrby).toHaveBeenCalledWith('feedback:votes', methodId, 1)
    })
  })

  describe('Comment categories', () => {
    const validCategories = ['버그 신고', '기능 요청', '개선 의견', '기타']

    it.each(validCategories)('accepts valid category: %s', async (category) => {
      mockKv.lpush.mockResolvedValue(1)

      const result = await submitComment(category, 'Test content')

      expect(result.success).toBe(true)
      expect(result.comment.category).toBe(category)
    })
  })
})
