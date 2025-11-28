/**
 * FeedbackPanel Component Tests
 */

import React from 'react'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel'

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('FeedbackPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        votes: { 'ind-ttest': 5, 'pearson': 3 },
        vote_details: [],
        comments: [],
      }),
    } as Response)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Closed state', () => {
    it('renders floating button when closed', () => {
      render(<FeedbackPanel />)

      // Should show the floating button with tooltip text
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('opens panel when floating button is clicked', async () => {
      render(<FeedbackPanel />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('어떤 분석을 점검할까요?')).toBeInTheDocument()
      })
    })
  })

  describe('Open state', () => {
    it('displays 3 tabs', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('점검 요청')).toBeInTheDocument()
        expect(screen.getByText('순위')).toBeInTheDocument()
        expect(screen.getByText('메모')).toBeInTheDocument()
      })
    })

    it('shows request tab by default with categories', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('비교 분석')).toBeInTheDocument()
        expect(screen.getByText('상관/회귀')).toBeInTheDocument()
        expect(screen.getByText('비모수 검정')).toBeInTheDocument()
      })
    })

    it('switches to ranking tab when clicked', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('순위')).toBeInTheDocument()
      })

      // Click ranking tab
      fireEvent.click(screen.getByText('순위'))

      await waitFor(() => {
        expect(screen.getByText('현재까지 가장 많이 요청된 분석 방법')).toBeInTheDocument()
      })
    })

    it('switches to memo tab when clicked', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('메모')).toBeInTheDocument()
      })

      // Click memo tab
      fireEvent.click(screen.getByText('메모'))

      await waitFor(() => {
        expect(screen.getByText('자유롭게 의견을 남겨주세요')).toBeInTheDocument()
        expect(screen.getByText('버그 신고')).toBeInTheDocument()
        expect(screen.getByText('기능 요청')).toBeInTheDocument()
      })
    })

    it('closes panel when X button is clicked', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('어떤 분석을 점검할까요?')).toBeInTheDocument()
      })

      // Find and click the close button (X)
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'))
      if (closeButton) {
        fireEvent.click(closeButton)
      }

      // Panel should close, showing floating button again
      await waitFor(() => {
        expect(screen.queryByText('어떤 분석을 점검할까요?')).not.toBeInTheDocument()
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
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, method_id: 'ind-ttest', votes: 1 }),
        } as Response)

      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Independent t-test')).toBeInTheDocument()
      })

      // Click on a method to vote
      fireEvent.click(screen.getByText('Independent t-test'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'vote', method_id: 'ind-ttest' }),
        }))
      })
    })

    it('saves voted IDs to localStorage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ votes: {}, vote_details: [], comments: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, method_id: 'ind-ttest', votes: 1 }),
        } as Response)

      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Independent t-test')).toBeInTheDocument()
      })

      // Click on a method to vote
      fireEvent.click(screen.getByText('Independent t-test'))

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'feedback_voted_ids',
          expect.stringContaining('ind-ttest')
        )
      })
    })
  })

  describe('Comment functionality', () => {
    it('disables submit button when no category selected', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      // Switch to memo tab
      await waitFor(() => {
        expect(screen.getByText('메모')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('메모'))

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('어떤 생각이든 좋아요...')
        fireEvent.change(textarea, { target: { value: 'Test comment' } })
      })

      // Submit button should be disabled without category
      const submitButton = screen.getByRole('button', { name: /보내기/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when category and content provided', async () => {
      render(<FeedbackPanel />)

      // Open the panel
      fireEvent.click(screen.getByRole('button'))

      // Switch to memo tab
      await waitFor(() => {
        expect(screen.getByText('메모')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('메모'))

      await waitFor(() => {
        // Select a category
        fireEvent.click(screen.getByText('버그 신고'))

        // Enter comment
        const textarea = screen.getByPlaceholderText('어떤 생각이든 좋아요...')
        fireEvent.change(textarea, { target: { value: 'Test comment' } })
      })

      // Submit button should be enabled
      const submitButton = screen.getByRole('button', { name: /보내기/i })
      expect(submitButton).not.toBeDisabled()
    })
  })
})
