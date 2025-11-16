/**
 * RAGAssistantCompact 컴포넌트 테스트
 *
 * 테스트 범위:
 * - Lily 스타일 수평 채팅 기록 UI
 * - 세션 관리 (생성, 선택, 필터링)
 * - 전용 챗봇 페이지 열기
 * - 기본 RAG 기능 (질문/답변)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RAGAssistantCompact } from '@/components/rag/rag-assistant-compact'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import { queryRAG } from '@/lib/rag/rag-service'
import type { ChatSession } from '@/lib/types/chat'

// Mock markdown dependencies (ESM modules)
jest.mock('remark-gfm', () => ({}))
jest.mock('remark-breaks', () => ({}))
jest.mock('remark-math', () => ({}))
jest.mock('rehype-katex', () => ({}))
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>
}))

// Mock dependencies
jest.mock('@/lib/rag/rag-service')
jest.mock('@/lib/services/storage/chat-storage-indexed-db')
jest.mock('@/components/rag/chat-sources-display', () => ({
  ChatSourcesDisplay: () => <div data-testid="chat-sources">Sources</div>
}))

const mockQueryRAG = queryRAG as jest.MockedFunction<typeof queryRAG>
const mockLoadSessions = ChatStorageIndexedDB.loadSessions as jest.MockedFunction<typeof ChatStorageIndexedDB.loadSessions>
const mockLoadSession = ChatStorageIndexedDB.loadSession as jest.MockedFunction<typeof ChatStorageIndexedDB.loadSession>
const mockCreateNewSession = ChatStorageIndexedDB.createNewSession as jest.MockedFunction<typeof ChatStorageIndexedDB.createNewSession>
const mockAddMessage = ChatStorageIndexedDB.addMessage as jest.MockedFunction<typeof ChatStorageIndexedDB.addMessage>

// window.open mock
const mockWindowOpen = jest.fn()

describe('RAGAssistantCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.open = mockWindowOpen

    // Default mocks
    mockLoadSessions.mockResolvedValue([])
    mockCreateNewSession.mockResolvedValue({
      id: 'session-1',
      title: '새 대화',
      messages: [],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  })

  describe('기본 렌더링', () => {
    it('빈 상태로 렌더링되어야 함', async () => {
      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByText('질문을 입력해주세요.')).toBeInTheDocument()
      })

      // Lily 스타일 헤더 버튼들
      expect(screen.getByText('새 대화')).toBeInTheDocument()
      expect(screen.getByTitle('전용 챗봇 페이지 열기 (새 창)')).toBeInTheDocument()
    })

    it('입력창과 전송 버튼이 표시되어야 함', () => {
      render(<RAGAssistantCompact />)

      expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /전송/ })).toBeInTheDocument()
    })
  })

  describe('세션 관리', () => {
    const mockSessions: ChatSession[] = [
      {
        id: 'session-1',
        title: '통계 질문',
        messages: [
          { id: 'msg-1', role: 'user', content: 'test question', timestamp: Date.now() },
          { id: 'msg-2', role: 'assistant', content: 'test answer', timestamp: Date.now() }
        ],
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'session-2',
        title: '데이터 분석',
        messages: [],
        isFavorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    it('기존 세션 목록을 로드해야 함', async () => {
      mockLoadSessions.mockResolvedValue(mockSessions)

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByText('통계 질문')).toBeInTheDocument()
        expect(screen.getByText('데이터 분석')).toBeInTheDocument()
      })
    })

    it('새 대화 버튼 클릭 시 새 세션이 생성되어야 함', async () => {
      mockLoadSessions.mockResolvedValue([])

      const newSession: ChatSession = {
        id: 'new-session',
        title: '새 대화 2',
        messages: [],
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      mockCreateNewSession.mockResolvedValue(newSession)

      render(<RAGAssistantCompact />)

      const newChatButton = await screen.findByText('새 대화')
      fireEvent.click(newChatButton)

      await waitFor(() => {
        expect(mockCreateNewSession).toHaveBeenCalledTimes(2) // 초기 1회 + 버튼 클릭 1회
      })
    })

    it('세션 선택 시 해당 세션의 메시지를 로드해야 함', async () => {
      mockLoadSessions.mockResolvedValue(mockSessions)
      mockLoadSession.mockResolvedValue(mockSessions[1])

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByText('데이터 분석')).toBeInTheDocument()
      })

      const sessionButton = screen.getByText('데이터 분석')
      fireEvent.click(sessionButton)

      await waitFor(() => {
        expect(mockLoadSession).toHaveBeenCalledWith('session-2')
      })
    })

    it('즐겨찾기 필터가 작동해야 함', async () => {
      mockLoadSessions.mockResolvedValue(mockSessions)

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByText('통계 질문')).toBeInTheDocument()
        expect(screen.getByText('데이터 분석')).toBeInTheDocument()
      })

      // Star 아이콘 찾기
      const starIcons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-star')
        return svg !== null
      })

      expect(starIcons.length).toBeGreaterThan(0)

      const favoriteButton = starIcons[0]
      fireEvent.click(favoriteButton)

      await waitFor(() => {
        // 즐겨찾기 아닌 세션은 숨김
        const allSessions = screen.queryByText('통계 질문')
        const favoriteSession = screen.getByText('데이터 분석')

        expect(allSessions).toBeNull() // 즐겨찾기 아님
        expect(favoriteSession).toBeInTheDocument() // 즐겨찾기
      }, { timeout: 2000 })
    })

    it('최대 5개 세션만 표시해야 함', async () => {
      const manySessions: ChatSession[] = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        title: `대화 ${i + 1}`,
        messages: [],
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))

      mockLoadSessions.mockResolvedValue(manySessions)

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByText('대화 1')).toBeInTheDocument()
        expect(screen.getByText('대화 5')).toBeInTheDocument()
        expect(screen.queryByText('대화 6')).not.toBeInTheDocument()
      })
    })
  })

  describe('전용 챗봇 페이지 열기', () => {
    it('ExternalLink 버튼 클릭 시 /chatbot 페이지가 새 창에서 열려야 함', async () => {
      render(<RAGAssistantCompact />)

      const openPageButton = await screen.findByTitle('전용 챗봇 페이지 열기 (새 창)')
      fireEvent.click(openPageButton)

      expect(mockWindowOpen).toHaveBeenCalledWith('/chatbot', '_blank', 'noopener,noreferrer')
    })
  })

  describe('RAG 질문/답변', () => {
    beforeEach(() => {
      mockQueryRAG.mockResolvedValue({
        answer: 'This is a test answer',
        sources: [
          {
            doc_id: 'doc-1',
            title: 'Test Document',
            content: 'Test content',
            score: 0.9
          }
        ],
        model: { provider: 'ollama' }
      })

      mockAddMessage.mockResolvedValue()
      mockLoadSessions.mockResolvedValue([
        {
          id: 'session-1',
          title: '새 대화',
          messages: [],
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ])
    })

    it('질문을 입력하고 전송할 수 있어야 함', async () => {
      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByRole('button', { name: /전송/ })

      fireEvent.change(textarea, { target: { value: 'What is t-test?' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockQueryRAG).toHaveBeenCalledWith({
          query: 'What is t-test?',
          method: undefined
        })
      })
    })

    it('답변을 화면에 표시해야 함', async () => {
      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByRole('button', { name: /전송/ })

      fireEvent.change(textarea, { target: { value: 'Test question' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('This is a test answer')).toBeInTheDocument()
      })
    })

    it('Enter 키로 전송할 수 있어야 함 (Shift+Enter는 줄바꿈)', async () => {
      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)

      fireEvent.change(textarea, { target: { value: 'Test question' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      await waitFor(() => {
        expect(mockQueryRAG).toHaveBeenCalled()
      })
    })

    it('로딩 중 UI를 표시해야 함', async () => {
      let resolveQuery: (value: unknown) => void = () => {}

      mockQueryRAG.mockImplementation(() => new Promise(resolve => {
        resolveQuery = resolve
      }))

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByRole('button', { name: /전송/ })

      fireEvent.change(textarea, { target: { value: 'Test' } })
      fireEvent.click(sendButton)

      // 로딩 UI 확인 (로딩 인디케이터 찾기)
      await waitFor(() => {
        const loadingIndicators = screen.getAllByText('생각 중...')
        // 적어도 하나는 있어야 함
        expect(loadingIndicators.length).toBeGreaterThan(0)
      }, { timeout: 500 })

      // 프로미스 완료
      resolveQuery({
        answer: 'Test',
        sources: [],
        model: { provider: 'ollama' }
      })
    })

    it('메시지를 IndexedDB에 저장해야 함', async () => {
      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByRole('button', { name: /전송/ })

      fireEvent.change(textarea, { target: { value: 'Test question' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockAddMessage).toHaveBeenCalledTimes(2) // user + assistant
      })

      // User message
      expect(mockAddMessage).toHaveBeenNthCalledWith(1, 'session-1', expect.objectContaining({
        role: 'user',
        content: 'Test question'
      }))

      // Assistant message
      expect(mockAddMessage).toHaveBeenNthCalledWith(2, 'session-1', expect.objectContaining({
        role: 'assistant',
        content: 'This is a test answer'
      }))
    })
  })

  describe('에러 처리', () => {
    it('RAG 에러 발생 시 에러 메시지를 표시해야 함', async () => {
      mockQueryRAG.mockRejectedValue(new Error('RAG service error'))

      render(<RAGAssistantCompact />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByRole('button', { name: /전송/ })

      fireEvent.change(textarea, { target: { value: 'Test' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/오류가 발생했습니다/)).toBeInTheDocument()
      })
    })
  })

  describe('method prop', () => {
    it('method가 제공되면 queryRAG에 전달되어야 함', async () => {
      mockQueryRAG.mockResolvedValue({
        answer: 'Test',
        sources: [],
        model: { provider: 'ollama' }
      })

      render(<RAGAssistantCompact method="tTest" />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByRole('button', { name: /전송/ })

      fireEvent.change(textarea, { target: { value: 'Test' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockQueryRAG).toHaveBeenCalledWith({
          query: 'Test',
          method: 'tTest'
        })
      })
    })
  })
})
