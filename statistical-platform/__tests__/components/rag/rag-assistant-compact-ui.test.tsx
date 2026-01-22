/**
 * RAG Assistant Compact UI 테스트
 *
 * 목적: 가로 스크롤 제거 및 최신 UI 패턴 검증
 */

import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { RAGAssistantCompact } from '@/components/rag/rag-assistant-compact'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'

// ChatStorageIndexedDB 모킹
vi.mock('@/lib/services/storage/chat-storage-indexed-db', () => ({
  ChatStorageIndexedDB: {
    loadSessions: vi.fn(),
    createNewSession: vi.fn(),
    loadSession: vi.fn(),
    addMessage: vi.fn(),
  },
}))

// queryRAG 모킹
vi.mock('@/lib/rag/rag-service', () => ({
  queryRAG: vi.fn(),
}))

// RAG config 모킹 (remark-gfm ESM 이슈 회피)
vi.mock('@/lib/rag/config', () => ({
  MARKDOWN_CONFIG: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
  RAG_UI_CONFIG: {
    placeholders: {
      query: '질문을 입력하세요',
    },
    titles: {
      chatInterface: 'AI 통계 챗봇',
    },
    messages: {
      welcomeSubtext: '통계 관련 질문에 답변드립니다',
      thinking: '생각 중...',
    },
    buttons: {
      send: '전송',
    },
  },
}))

describe('RAG Assistant Compact - UI 개선 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('가로 스크롤 제거 검증', () => {
    it('상단 헤더에 overflow-x-auto 클래스가 없어야 함', async () => {
      const mockSession = {
        id: 'test-session-1',
        title: '테스트 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        // overflow-x-auto 클래스를 가진 요소가 없어야 함
        const overflowElements = container.querySelectorAll('.overflow-x-auto')
        expect(overflowElements.length).toBe(0)
      })
    })

    it('세션 목록이 여러 개여도 가로 스크롤이 발생하지 않아야 함', async () => {
      const mockSessions = [
        { id: '1', title: '첫 번째 매우 긴 세션 제목입니다', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
        { id: '2', title: '두 번째 매우 긴 세션 제목입니다', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
        { id: '3', title: '세 번째 매우 긴 세션 제목입니다', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
      ]

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue(mockSessions)

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        const overflowElements = container.querySelectorAll('.overflow-x-auto')
        expect(overflowElements.length).toBe(0)
      })
    })
  })

  describe('현재 세션만 표시 패턴', () => {
    it('현재 세션 제목이 표시되어야 함', async () => {
      const mockSession = {
        id: 'current-session',
        title: '현재 활성 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        const titleElement = screen.getByText('현재 활성 세션')
        expect(titleElement).toBeInTheDocument()
      })
    })

    it('다른 세션들은 표시되지 않아야 함', async () => {
      const mockSessions = [
        { id: '1', title: '현재 세션', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
        { id: '2', title: '다른 세션 1', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
        { id: '3', title: '다른 세션 2', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
      ]

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue(mockSessions)

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        // 현재 세션만 표시
        expect(screen.getByText('현재 세션')).toBeInTheDocument()
        // 다른 세션은 표시되지 않음
        expect(screen.queryByText('다른 세션 1')).not.toBeInTheDocument()
        expect(screen.queryByText('다른 세션 2')).not.toBeInTheDocument()
      })
    })
  })

  describe('툴팁 기능', () => {
    it('긴 제목에 title 속성이 있어야 함 (hover 툴팁)', async () => {
      const longTitle = '매우 긴 세션 제목입니다. 이 제목은 화면에 다 표시되지 않을 수 있습니다.'
      const mockSession = {
        id: 'test-session',
        title: longTitle,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        const titleElement = screen.getByText(longTitle)
        expect(titleElement).toHaveAttribute('title', longTitle)
      })
    })
  })

  describe('새 대화 버튼', () => {
    it('새 대화 버튼이 아이콘만 표시되어야 함 (텍스트 없음)', async () => {
      const mockSession = {
        id: 'test-session',
        title: '테스트 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        // Plus 아이콘이 있는 버튼 확인
        const newChatButton = container.querySelector('button[title="새 대화"]')
        expect(newChatButton).toBeInTheDocument()

        // 버튼 내부에 "새 대화" 텍스트가 없어야 함
        expect(newChatButton?.textContent).not.toContain('새 대화')
      })
    })
  })

  describe('반응형 레이아웃', () => {
    it('truncate 클래스로 긴 제목이 잘려야 함', async () => {
      const longTitle = '매우 긴 세션 제목입니다. 이 제목은 화면에 다 표시되지 않을 수 있습니다. 더 길게 만들어보겠습니다.'
      const mockSession = {
        id: 'test-session',
        title: longTitle,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        const titleElement = screen.getByText(longTitle)
        expect(titleElement).toHaveClass('truncate')
      })
    })

    it('flex-1 min-w-0 조합으로 제목 영역이 flex 컨테이너 안에서 올바르게 축소되어야 함', async () => {
      const mockSession = {
        id: 'test-session',
        title: '테스트 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        const titleContainer = container.querySelector('.flex-1.min-w-0')
        expect(titleContainer).toBeInTheDocument()
      })
    })
  })

  describe('UI 일관성', () => {
    it('상단 헤더 높이가 h-12로 고정되어야 함', async () => {
      const mockSession = {
        id: 'test-session',
        title: '테스트 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        const header = container.querySelector('.h-12.flex-shrink-0.border-b')
        expect(header).toBeInTheDocument()
      })
    })

    it('justify-between으로 양 끝 정렬이 되어야 함', async () => {
      const mockSession = {
        id: 'test-session',
        title: '테스트 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([mockSession])

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        const headerContent = container.querySelector('.justify-between')
        expect(headerContent).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('세션이 없을 때 에러가 발생하지 않아야 함', async () => {
      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([])
      ;(ChatStorageIndexedDB.createNewSession as jest.Mock).mockResolvedValue({
        id: 'new-session',
        title: '새 대화',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      const { container } = render(<RAGAssistantCompact />)

      await waitFor(() => {
        // 에러 없이 렌더링되어야 함
        expect(container).toBeInTheDocument()
      })
    })

    it('currentSession이 null일 때 제목이 표시되지 않아야 함', async () => {
      ;(ChatStorageIndexedDB.loadSessions as jest.Mock).mockResolvedValue([])

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        // 세션 제목이 없어야 함
        const titleElements = screen.queryAllByText(/테스트|세션|대화/)
        expect(titleElements.length).toBe(0)
      })
    })
  })
})
