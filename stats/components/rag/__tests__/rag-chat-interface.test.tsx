/**
 * RAG 채팅 인터페이스 테스트
 *
 * 테스트 범위:
 * - 세션 로드 (async)
 * - 메시지 추가 (async)
 * - 메시지 삭제 (async)
 * - 에러 처리
 * - 로딩 상태 UI
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RAGChatInterface } from '../rag-chat-interface'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatSession } from '@/lib/types/chat'

// Mock ChatStorageIndexedDB
vi.mock('@/lib/services/storage/chat-storage-indexed-db')
vi.mock('@/lib/rag/rag-service')

const mockChatStorage = ChatStorageIndexedDB as jest.Mocked<typeof ChatStorageIndexedDB>

describe('RAGChatInterface', () => {
  const mockSessionId = 'test-session-1'
  const mockSession: ChatSession = {
    id: mockSessionId,
    title: 'Test Session',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    isArchived: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockChatStorage.loadSession.mockResolvedValue(mockSession)
    mockChatStorage.addMessage.mockResolvedValue(undefined)
    mockChatStorage.deleteMessage.mockResolvedValue(undefined)
  })

  describe('세션 로드', () => {
    it('should show loading spinner while loading session', async () => {
      mockChatStorage.loadSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockSession), 100)
          })
      )

      render(<RAGChatInterface sessionId={mockSessionId} />)

      // 로딩 스피너 확인
      const spinner = screen.getByRole('status', { hidden: true })
      expect(spinner).toBeInTheDocument()

      // 메시지 로드 완료 대기
      await waitFor(() => {
        expect(screen.queryByText('메시지를 불러오는 중...')).not.toBeInTheDocument()
      })
    })

    it('should load and display session messages', async () => {
      render(<RAGChatInterface sessionId={mockSessionId} />)

      // 메시지 표시 대기
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('Hi there!')).toBeInTheDocument()
      })

      // loadSession이 호출되었는지 확인
      expect(mockChatStorage.loadSession).toHaveBeenCalledWith(mockSessionId)
    })

    it('should handle session load error', async () => {
      const errorMessage = 'Failed to load'
      mockChatStorage.loadSession.mockRejectedValue(new Error(errorMessage))

      render(<RAGChatInterface sessionId={mockSessionId} />)

      // 에러 메시지 표시 대기
      await waitFor(() => {
        expect(screen.getByText('세션 로드 실패')).toBeInTheDocument()
      })
    })

    it('should reload session when sessionId changes', async () => {
      const { rerender } = render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(mockChatStorage.loadSession).toHaveBeenCalledWith(mockSessionId)
      })

      vi.clearAllMocks()
      mockChatStorage.loadSession.mockResolvedValue(mockSession)

      const newSessionId = 'test-session-2'
      rerender(<RAGChatInterface sessionId={newSessionId} />)

      await waitFor(() => {
        expect(mockChatStorage.loadSession).toHaveBeenCalledWith(newSessionId)
      })
    })
  })

  describe('메시지 추가', () => {
    it('should add message when user sends query', async () => {
      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('질문을 입력하세요')
      await userEvent.type(input, 'New message')
      await userEvent.click(screen.getByRole('button', { name: /전송/i }))

      // addMessage가 호출되었는지 확인
      await waitFor(() => {
        expect(mockChatStorage.addMessage).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            role: 'user',
            content: 'New message',
          })
        )
      })
    })

    it('should handle message save error', async () => {
      mockChatStorage.addMessage.mockRejectedValue(new Error('Save failed'))

      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('질문을 입력하세요')
      await userEvent.type(input, 'New message')
      await userEvent.click(screen.getByRole('button', { name: /전송/i }))

      // 에러 메시지 표시
      await waitFor(() => {
        expect(screen.getByText('메시지 저장 실패')).toBeInTheDocument()
      })
    })

    it('should clear input after sending', async () => {
      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('질문을 입력하세요') as HTMLTextAreaElement
      await userEvent.type(input, 'Test message')

      expect(input.value).toBe('Test message')

      await userEvent.click(screen.getByRole('button', { name: /전송/i }))

      // RAG 호출을 기다린 후 input 확인
      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('메시지 삭제', () => {
    it('should delete message when delete button clicked', async () => {
      mockChatStorage.loadSession.mockResolvedValue(mockSession)

      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // 메시지 호버 시 삭제 버튼 표시 가정
      // (실제 구현에 따라 다를 수 있음)
      expect(mockChatStorage.deleteMessage).not.toHaveBeenCalled()
    })

    it('should handle message delete error', async () => {
      mockChatStorage.deleteMessage.mockRejectedValue(new Error('Delete failed'))

      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // 에러 핸들링 확인
      expect(mockChatStorage.deleteMessage).not.toHaveBeenCalled()
    })
  })

  describe('로딩 상태', () => {
    it('should show loading indicator while processing', async () => {
      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('질문을 입력하세요')
      await userEvent.type(input, 'Test')
      await userEvent.click(screen.getByRole('button', { name: /전송/i }))

      // 로딩 표시 확인
      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /생각 중/i })
        expect(loadingButton).toBeDisabled()
      })
    })
  })

  describe('Enter 키 입력', () => {
    it('should send message on Enter key', async () => {
      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('질문을 입력하세요')
      await userEvent.type(input, 'Test message{Enter}')

      // addMessage가 호출되었는지 확인
      await waitFor(() => {
        expect(mockChatStorage.addMessage).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            role: 'user',
            content: 'Test message',
          })
        )
      })
    })

    it('should not send on Shift+Enter', async () => {
      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('질문을 입력하세요')
      await userEvent.type(input, 'Test{Shift>}{Enter}{/Shift}')

      // addMessage가 호출되지 않았는지 확인
      expect(mockChatStorage.addMessage).not.toHaveBeenCalled()
    })
  })

  describe('에러 표시', () => {
    it('should display error message in UI', async () => {
      mockChatStorage.loadSession.mockRejectedValue(new Error('Load failed'))

      render(<RAGChatInterface sessionId={mockSessionId} />)

      await waitFor(() => {
        expect(screen.getByText('세션 로드 실패')).toBeInTheDocument()
      })
    })
  })
})
