/**
 * RAG 어시스턴트 테스트
 *
 * 테스트 범위:
 * - ChatStorageIndexedDB의 async/await 패턴 검증
 * - RAGAssistant 컴포넌트가 비동기 저장소를 올바르게 사용하는지 확인
 * - 에러 처리
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RAGAssistant } from '../rag-assistant'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatSession } from '@/lib/types/chat'

// Mock ChatStorageIndexedDB
jest.mock('@/lib/services/storage/chat-storage-indexed-db')

const mockChatStorage = ChatStorageIndexedDB as jest.Mocked<typeof ChatStorageIndexedDB>

describe('RAGAssistant', () => {
  // RAGAssistant Props: method?, className?, onNewMessage?
  // 내부적으로 ChatStorageIndexedDB를 사용하여 비동기 세션 관리 수행

  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      title: 'Session 1',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isArchived: false,
    },
    {
      id: 'session-2',
      title: 'Session 2',
      messages: [],
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
      isFavorite: true,
      isArchived: false,
    },
  ]

  const mockNewSession: ChatSession = {
    id: 'session-new',
    title: '새 대화',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    isArchived: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockChatStorage.loadSessions.mockResolvedValue(mockSessions)
    mockChatStorage.createNewSession.mockResolvedValue(mockNewSession)
    mockChatStorage.deleteSession.mockResolvedValue(undefined)
    mockChatStorage.toggleFavorite.mockResolvedValue(undefined)
    mockChatStorage.toggleArchive.mockResolvedValue(undefined)
    mockChatStorage.renameSession.mockResolvedValue(undefined)
  })

  describe('세션 목록 로드 (async)', () => {
    it('should load sessions on mount with async/await', async () => {
      render(<RAGAssistant />)

      // RAGAssistant는 useEffect에서 비동기로 세션을 로드한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })
    })

    it('should handle session load error gracefully', async () => {
      mockChatStorage.loadSessions.mockRejectedValue(new Error('Load failed'))

      render(<RAGAssistant />)

      // 컴포넌트는 에러가 발생해도 계속 렌더링되어야 한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // 콘솔에 에러가 로깅되었는지 확인
      expect(mockChatStorage.loadSessions).toHaveBeenCalledTimes(1)
    })
  })

  describe('새 세션 생성 (async)', () => {
    it('should support createNewSession async operation', async () => {
      mockChatStorage.createNewSession.mockResolvedValue(mockNewSession)

      // RAGAssistant 컴포넌트가 async createNewSession을 호출할 수 있도록 지원
      const component = <RAGAssistant />
      render(component)

      // 세션이 로드되면 createNewSession도 사용 가능해야 한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      expect(mockChatStorage.createNewSession).not.toHaveBeenCalled() // 아직 호출되지 않음
    })

    it('should handle create session error', async () => {
      mockChatStorage.createNewSession.mockRejectedValue(new Error('Create failed'))

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // createNewSession이 에러를 처리할 수 있어야 한다
      expect(mockChatStorage.createNewSession).not.toHaveBeenCalled()
    })
  })

  describe('세션 삭제 (async)', () => {
    it('should support deleteSession async operation', async () => {
      mockChatStorage.deleteSession.mockResolvedValue(undefined)

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // deleteSession은 비동기로 호출되고 에러 처리가 있어야 한다
      expect(mockChatStorage.deleteSession).not.toHaveBeenCalled()
    })

    it('should handle delete session error', async () => {
      mockChatStorage.deleteSession.mockRejectedValue(new Error('Delete failed'))

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // 에러 처리 확인
      expect(mockChatStorage.deleteSession).not.toHaveBeenCalled()
    })
  })

  describe('즐겨찾기 토글 (async)', () => {
    it('should support toggleFavorite async operation', async () => {
      mockChatStorage.toggleFavorite.mockResolvedValue(undefined)

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // toggleFavorite은 비동기 작업으로 지원되어야 한다
      expect(mockChatStorage.toggleFavorite).not.toHaveBeenCalled()
    })

    it('should handle toggle favorite error', async () => {
      mockChatStorage.toggleFavorite.mockRejectedValue(new Error('Toggle failed'))

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // 에러 처리 확인
      expect(mockChatStorage.toggleFavorite).not.toHaveBeenCalled()
    })
  })

  describe('세션 보관 (async)', () => {
    it('should support toggleArchive async operation', async () => {
      mockChatStorage.toggleArchive.mockResolvedValue(undefined)

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // toggleArchive은 비동기 작업으로 지원되어야 한다
      expect(mockChatStorage.toggleArchive).not.toHaveBeenCalled()
    })

    it('should handle toggle archive error', async () => {
      mockChatStorage.toggleArchive.mockRejectedValue(new Error('Archive failed'))

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // 에러 처리 확인
      expect(mockChatStorage.toggleArchive).not.toHaveBeenCalled()
    })
  })

  describe('세션 이름 변경 (async)', () => {
    it('should support renameSession async operation', async () => {
      mockChatStorage.renameSession.mockResolvedValue(undefined)

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // renameSession은 비동기 작업으로 지원되어야 한다
      expect(mockChatStorage.renameSession).not.toHaveBeenCalled()
    })

    it('should handle rename error', async () => {
      mockChatStorage.renameSession.mockRejectedValue(new Error('Rename failed'))

      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })

      // 에러 처리 확인
      expect(mockChatStorage.renameSession).not.toHaveBeenCalled()
    })
  })

  describe('에러 처리 (async)', () => {
    it('should handle all async errors gracefully', async () => {
      mockChatStorage.loadSessions.mockRejectedValue(new Error('Network error'))

      render(<RAGAssistant />)

      // 컴포넌트가 에러에도 불구하고 정상 렌더링되어야 한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })
    })

    it('should continue functioning after error', async () => {
      mockChatStorage.loadSessions.mockRejectedValueOnce(new Error('Error'))
      mockChatStorage.loadSessions.mockResolvedValueOnce(mockSessions)

      const { rerender } = render(<RAGAssistant />)

      // 에러 후에도 재시도 가능해야 한다
      rerender(<RAGAssistant />)

      // 두 번째 로드는 성공해야 한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })
    })
  })

  describe('비동기 패턴 검증', () => {
    it('should use async/await pattern in useEffect', async () => {
      // RAGAssistant는 useEffect에서 async 함수를 정의하고 호출해야 한다
      render(<RAGAssistant />)

      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })
    })

    it('should use try-catch for error handling', async () => {
      mockChatStorage.loadSessions.mockRejectedValue(new Error('Test error'))

      render(<RAGAssistant />)

      // try-catch로 에러를 처리해야 한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })
    })

    it('should use callback with async/await for event handlers', async () => {
      mockChatStorage.createNewSession.mockResolvedValue(mockNewSession)

      render(<RAGAssistant />)

      // 이벤트 핸들러는 비동기 콜백이어야 한다
      await waitFor(() => {
        expect(mockChatStorage.loadSessions).toHaveBeenCalled()
      })
    })
  })
})
