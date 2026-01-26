/**
 * FeedbackPanel Component Tests
 */

import React from 'react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return React.createElement('img', props)
  },
}))

describe('FeedbackPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        votes: { 't-test': 5, 'correlation': 3 },
        vote_details: [],
        comments: [],
      }),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Closed state', () => {
    it('renders floating button when closed', () => {
      render(<FeedbackPanel />)

      // Should show the floating button
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('opens panel when floating button is clicked', async () => {
      render(<FeedbackPanel />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        // 새로운 UI: "한참 작업 중이예요" 메시지
        expect(screen.getByText(/한참 작업 중이예요/)).toBeInTheDocument()
      })
    })
  })

  describe('Open state', () => {
    it('displays 3 tabs', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 새로운 탭 이름
        expect(screen.getByText('순위투표')).toBeInTheDocument()
        expect(screen.getByText('인기순위')).toBeInTheDocument()
        expect(screen.getByText('자유의견')).toBeInTheDocument()
      })
    })

    it('shows request tab by default with categories', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        // 새로운 카테고리 이름
        expect(screen.getByText('비교 분석 (차이 검정)')).toBeInTheDocument()
        expect(screen.getByText('관계 분석 (상관/회귀)')).toBeInTheDocument()
        expect(screen.getByText('비모수/범주형 검정')).toBeInTheDocument()
      })
    })

    it('switches to ranking tab when clicked', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('인기순위')).toBeInTheDocument()
      })

      // Click ranking tab (인기순위)
      fireEvent.click(screen.getByText('인기순위'))

      // 인기순위 탭은 method list를 보여줌 (votes가 있으면)
      await waitFor(() => {
        expect(screen.getByText('인기순위')).toBeInTheDocument()
      })
    })

    it('switches to memo tab when clicked', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('자유의견')).toBeInTheDocument()
      })

      // Click memo tab (자유의견)
      fireEvent.click(screen.getByText('자유의견'))

      await waitFor(() => {
        // 새로운 UI: 카테고리 버튼들
        expect(screen.getByText('버그')).toBeInTheDocument()
        expect(screen.getByText('기능')).toBeInTheDocument()
        expect(screen.getByText('개선')).toBeInTheDocument()
        expect(screen.getByText('기타')).toBeInTheDocument()
      })
    })

    it('closes panel when X button is clicked', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText(/한참 작업 중이예요/)).toBeInTheDocument()
      })

      // Find and click the close button (X)
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'))
      if (closeButton) {
        fireEvent.click(closeButton)
      }

      // Panel should close
      await waitFor(() => {
        expect(screen.queryByText(/한참 작업 중이예요/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Voting functionality', () => {
    it('fetches votes when panel opens', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/feedback')
      })
    })

    it('submits vote when method is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ votes: {}, vote_details: [], comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, method_id: 't-test', votes: 1 }),
        })

      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('비교 분석 (차이 검정)')).toBeInTheDocument()
      })

      // Expand the category
      fireEvent.click(screen.getByText('비교 분석 (차이 검정)'))

      await waitFor(() => {
        expect(screen.getByText('t검정 (독립/대응)')).toBeInTheDocument()
      })

      // Click on a method to vote
      fireEvent.click(screen.getByText('t검정 (독립/대응)'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'vote', method_id: 't-test' }),
        }))
      })
    })

    it('saves voted IDs to localStorage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ votes: {}, vote_details: [], comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, method_id: 't-test', votes: 1 }),
        })

      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('비교 분석 (차이 검정)')).toBeInTheDocument()
      })

      // Expand the category
      fireEvent.click(screen.getByText('비교 분석 (차이 검정)'))

      await waitFor(() => {
        expect(screen.getByText('t검정 (독립/대응)')).toBeInTheDocument()
      })

      // Click on a method to vote
      fireEvent.click(screen.getByText('t검정 (독립/대응)'))

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'feedback_voted_ids',
          expect.stringContaining('t-test')
        )
      })
    })
  })

  describe('Comment functionality', () => {
    it('disables submit button when comment is empty', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      // Switch to memo tab
      await waitFor(() => {
        expect(screen.getByText('자유의견')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('자유의견'))

      await waitFor(() => {
        // 새로운 placeholder
        const textarea = screen.getByPlaceholderText(/버그, 아이디어 등 자유롭게/)
        expect(textarea).toBeInTheDocument()
      })

      // Submit button should be disabled without content
      const submitButtons = screen.getAllByRole('button')
      const sendButton = submitButtons.find(btn => btn.querySelector('.lucide-send'))
      expect(sendButton).toBeDisabled()
    })

    it('enables submit button when content provided', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      // Switch to memo tab
      await waitFor(() => {
        expect(screen.getByText('자유의견')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('자유의견'))

      await waitFor(() => {
        // Enter comment
        const textarea = screen.getByPlaceholderText(/버그, 아이디어 등 자유롭게/)
        fireEvent.change(textarea, { target: { value: 'Test comment' } })
      })

      // Submit button should be enabled
      const submitButtons = screen.getAllByRole('button')
      const sendButton = submitButtons.find(btn => btn.querySelector('.lucide-send'))
      expect(sendButton).not.toBeDisabled()
    })
  })
})
