/**
 * RAGAssistantCompact 헤더 UI 테스트
 *
 * 테스트 대상:
 * - 최근 3개 세션 탭 렌더링
 * - 즐겨찾기 드롭다운 통합
 * - 헤더 레이아웃
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { RAGAssistantCompact } from '@/components/rag/rag-assistant-compact'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatSession } from '@/lib/types/chat'

// IndexedDB Mock
vi.mock('@/lib/services/storage/chat-storage-indexed-db', () => ({
  ChatStorageIndexedDB: {
    loadSessions: vi.fn(),
    createNewSession: vi.fn(),
    loadSession: vi.fn(),
    addMessage: vi.fn(),
    toggleFavorite: vi.fn(),
  },
}))

// Ollama Mock
vi.mock('@/lib/rag/utils/ollama-check', () => ({
  checkOllamaStatus: vi.fn().mockResolvedValue({
    isAvailable: true,
    hasEmbeddingModel: true,
    hasInferenceModel: true,
    error: null,
  }),
}))

describe('RAGAssistantCompact - 헤더 UI', () => {
  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      title: '최근 세션 1',
      messages: [],
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
      isFavorite: false,
      isArchived: false,
    },
    {
      id: 'session-2',
      title: '최근 세션 2',
      messages: [],
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000,
      isFavorite: true,
      isArchived: false,
    },
    {
      id: 'session-3',
      title: '최근 세션 3',
      messages: [],
      createdAt: Date.now() - 3000,
      updatedAt: Date.now() - 3000,
      isFavorite: false,
      isArchived: false,
    },
    {
      id: 'session-4',
      title: '오래된 세션 (탭에 미표시)',
      messages: [],
      createdAt: Date.now() - 4000,
      updatedAt: Date.now() - 4000,
      isFavorite: false,
      isArchived: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(ChatStorageIndexedDB.loadSessions as Mock).mockResolvedValue(mockSessions)
    ;(ChatStorageIndexedDB.createNewSession as Mock).mockResolvedValue({
      id: 'new-session',
      title: '새 대화',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isArchived: false,
    })
  })

  it('헤더 영역이 3개 섹션으로 구성됨 (좌/중앙/우측)', async () => {
    render(<RAGAssistantCompact />)

    await waitFor(() => {
      // 좌측: 새 대화 + 채팅 목록 버튼
      expect(screen.getByTitle('새 대화')).toBeInTheDocument()
      expect(screen.getByTitle('채팅 목록')).toBeInTheDocument()

      // 중앙: 최근 3개 세션 탭
      expect(screen.getByText('최근 세션 1')).toBeInTheDocument()
      expect(screen.getByText('최근 세션 2')).toBeInTheDocument()
      expect(screen.getByText('최근 세션 3')).toBeInTheDocument()

      // 우측: 즐겨찾기 토글 버튼
      expect(screen.getByTitle('즐겨찾기')).toBeInTheDocument()
    })
  })

  it('최근 3개 세션만 탭으로 표시됨', async () => {
    render(<RAGAssistantCompact />)

    await waitFor(() => {
      // 최근 3개 표시
      expect(screen.getByText('최근 세션 1')).toBeInTheDocument()
      expect(screen.getByText('최근 세션 2')).toBeInTheDocument()
      expect(screen.getByText('최근 세션 3')).toBeInTheDocument()

      // 4번째 세션은 탭에 미표시
      expect(screen.queryByText('오래된 세션 (탭에 미표시)')).not.toBeInTheDocument()
    })
  })

  it('현재 세션 탭이 하이라이트됨', async () => {
    render(<RAGAssistantCompact />)

    await waitFor(() => {
      const activeTab = screen.getByText('최근 세션 1').closest('button')
      expect(activeTab).toHaveClass('bg-primary/10')
      expect(activeTab).toHaveClass('text-primary')
      expect(activeTab).toHaveClass('border-primary/20')
    })
  })

  it('세션 탭 클릭 시 세션 전환', async () => {
    ;(ChatStorageIndexedDB.loadSession as Mock).mockImplementation((id) => {
      const session = mockSessions.find((s) => s.id === id)
      return Promise.resolve(session)
    })

    render(<RAGAssistantCompact />)

    await waitFor(() => {
      expect(screen.getByText('최근 세션 2')).toBeInTheDocument()
    })

    // 세션 2 클릭
    const session2Tab = screen.getByText('최근 세션 2')
    fireEvent.click(session2Tab)

    await waitFor(() => {
      expect(ChatStorageIndexedDB.loadSession).toHaveBeenCalledWith('session-2')
    })
  })

  it('세션 탭 제목이 max-width: 120px로 제한되고 ellipsis 처리됨', async () => {
    const longTitleSessions: ChatSession[] = [
      {
        id: 'long-1',
        title: '매우 긴 세션 제목입니다 이것은 120px를 초과합니다',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
      isArchived: false,
      },
    ]

    ;(ChatStorageIndexedDB.loadSessions as Mock).mockResolvedValue(longTitleSessions)

    render(<RAGAssistantCompact />)

    await waitFor(() => {
      const tab = screen.getByText('매우 긴 세션 제목입니다 이것은 120px를 초과합니다').closest('button')
      expect(tab).toHaveClass('max-w-[120px]')
      expect(tab).toHaveClass('truncate')
    })
  })

  it('새 대화 버튼 클릭 시 새 세션 생성', async () => {
    render(<RAGAssistantCompact />)

    await waitFor(() => {
      expect(screen.getByTitle('새 대화')).toBeInTheDocument()
    })

    const newChatButton = screen.getByTitle('새 대화')
    fireEvent.click(newChatButton)

    await waitFor(() => {
      expect(ChatStorageIndexedDB.createNewSession).toHaveBeenCalled()
    })
  })

  it('채팅 목록 버튼 클릭 시 드롭다운 표시', async () => {
    render(<RAGAssistantCompact />)

    await waitFor(() => {
      expect(screen.getByTitle('채팅 목록')).toBeInTheDocument()
    })

    const historyButton = screen.getByTitle('채팅 목록')
    fireEvent.click(historyButton)

    await waitFor(() => {
      // 드롭다운 내 모든 세션 표시 (최대 20개)
      expect(screen.getAllByText(/최근 세션/)).toHaveLength(3)
    })
  })

  it('즐겨찾기 토글 버튼이 현재 세션과 함께 표시됨', async () => {
    render(<RAGAssistantCompact />)

    await waitFor(() => {
      // 현재 세션(session-1)의 즐겨찾기 토글 버튼 표시
      const favoriteButton = screen.getByTitle('즐겨찾기')
      expect(favoriteButton).toBeInTheDocument()
    })
  })

  it('즐겨찾기 토글 버튼 클릭 시 isFavorite 상태 변경', async () => {
    ;(ChatStorageIndexedDB.toggleFavorite as Mock).mockResolvedValue(undefined)
    ;(ChatStorageIndexedDB.loadSessions as Mock).mockResolvedValue(
      mockSessions.map((s) =>
        s.id === 'session-1' ? { ...s, isFavorite: true } : s
      )
    )

    render(<RAGAssistantCompact />)

    await waitFor(() => {
      expect(screen.getByTitle('즐겨찾기')).toBeInTheDocument()
    })

    const favoriteButton = screen.getByTitle('즐겨찾기')
    fireEvent.click(favoriteButton)

    await waitFor(() => {
      expect(ChatStorageIndexedDB.toggleFavorite).toHaveBeenCalledWith('session-1')
    })
  })
})
