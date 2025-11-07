/**
 * RAG 챗 인터페이스 개선 사항 테스트
 *
 * 테스트 대상:
 * 1. any 타입 제거 (PluggableList 사용)
 * 2. 스트리밍 에러 로깅 강화
 * 3. 메시지 편집 UI (복사/편집/삭제 버튼)
 *
 * @author Claude Code
 * @date 2025-11-07
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import { RAGChatInterface } from '@/components/rag/rag-chat-interface'

// Mock markdown libraries
jest.mock('remark-gfm', () => () => {})
jest.mock('remark-breaks', () => () => {})
jest.mock('remark-math', () => () => {})
jest.mock('rehype-katex', () => () => {})

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div className="prose">{children}</div>
  }
})

// Mock modules
jest.mock('@/lib/rag/rag-service', () => ({
  queryRAG: jest.fn(() =>
    Promise.resolve({
      answer: 'Test answer',
      sources: [],
      model: 'test-model',
    })
  ),
}))

jest.mock('@/lib/services/storage/chat-storage-indexed-db', () => ({
  ChatStorageIndexedDB: {
    loadSession: jest.fn(() =>
      Promise.resolve({
        id: 'test-session',
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
            sources: [],
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ),
    addMessage: jest.fn(() => Promise.resolve()),
    deleteMessage: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock('@/components/rag/chat-sources-display', () => ({
  ChatSourcesDisplay: ({ sources }: { sources: unknown[] }) => (
    <div data-testid="chat-sources">{sources.length} sources</div>
  ),
}))

describe('RAG Chat Interface Improvements', () => {
  const mockSessionUpdate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('P1: 타입 안전성 (PluggableList)', () => {
    it('ReactMarkdown 컴포넌트가 타입 에러 없이 렌더링되어야 함', async () => {
      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      // 메시지 로드 대기
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('Hi there!')).toBeInTheDocument()
      })

      // assistant 메시지가 Markdown으로 렌더링되는지 확인
      const assistantMessage = screen.getByText('Hi there!')
      expect(assistantMessage.closest('.prose')).toBeInTheDocument()
    })
  })

  describe('P4: 메시지 편집 UI', () => {
    it('user 메시지에 복사/편집/삭제 버튼이 렌더링되어야 함', async () => {
      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // user 메시지의 버튼들 확인
      const userMessage = screen.getByText('Hello').closest('.group')
      expect(userMessage).toBeInTheDocument()

      // 버튼들이 존재하는지 확인 (title로 찾기)
      const buttons = userMessage?.querySelectorAll('button')
      expect(buttons).toBeDefined()
      expect(buttons!.length).toBeGreaterThanOrEqual(3) // 복사, 편집, 삭제
    })

    it('assistant 메시지에는 편집 버튼이 없어야 함', async () => {
      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hi there!')).toBeInTheDocument()
      })

      // assistant 메시지 찾기
      const assistantMessage = screen.getByText('Hi there!').closest('.group')
      expect(assistantMessage).toBeInTheDocument()

      // 편집 버튼이 없는지 확인 (title="편집")
      const editButton = assistantMessage?.querySelector('button[title="편집"]')
      expect(editButton).toBeNull()
    })

    it('복사 버튼 클릭 시 클립보드에 복사되어야 함', async () => {
      // clipboard API mock
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(() => Promise.resolve()),
        },
      })

      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // 복사 버튼 찾기
      const userMessage = screen.getByText('Hello').closest('.group')
      const copyButton = userMessage?.querySelector('button[title="복사"]')

      expect(copyButton).toBeInTheDocument()

      // 버튼 클릭
      act(() => {
        fireEvent.click(copyButton!)
      })

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello')
      })
    })

    it('삭제 버튼 클릭 시 메시지가 삭제되어야 함', async () => {
      const { ChatStorageIndexedDB } = require('@/lib/services/storage/chat-storage-indexed-db')

      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // 삭제 버튼 찾기
      const userMessage = screen.getByText('Hello').closest('.group')
      const deleteButton = userMessage?.querySelector('button[title="삭제"]')

      expect(deleteButton).toBeInTheDocument()

      // 버튼 클릭
      act(() => {
        fireEvent.click(deleteButton!)
      })

      await waitFor(() => {
        expect(ChatStorageIndexedDB.deleteMessage).toHaveBeenCalledWith('test-session', 'msg-1')
      })
    })

    it('편집 버튼 클릭 시 입력 필드에 내용이 채워져야 함', async () => {
      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // 편집 버튼 찾기
      const userMessage = screen.getByText('Hello').closest('.group')
      const editButton = userMessage?.querySelector('button[title="편집"]')

      expect(editButton).toBeInTheDocument()

      // 버튼 클릭
      act(() => {
        fireEvent.click(editButton!)
      })

      // 입력 필드에 내용이 채워졌는지 확인
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
        expect(textarea).toHaveValue('Hello')
      })
    })
  })

  describe('P3: 스트리밍 에러 로깅', () => {
    it('스트리밍 실패 시 에러 로깅이 되어야 함', async () => {
      // console.error mock
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      // fetch를 실패하도록 mock
      global.fetch = jest.fn(() =>
        Promise.reject(new TypeError('Network error'))
      )

      const { queryRAG } = require('@/lib/rag/rag-service')
      queryRAG.mockResolvedValueOnce({
        answer: 'Fallback answer',
        sources: [],
        model: 'test-model',
      })

      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // 메시지 전송
      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)
      const sendButton = screen.getByText('전송').closest('button')

      act(() => {
        fireEvent.change(textarea, { target: { value: 'Test query' } })
      })

      act(() => {
        fireEvent.click(sendButton!)
      })

      // 에러 로깅 확인
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('스트리밍 실패'),
          expect.any(Error)
        )
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('네트워크 에러'),
          expect.any(String)
        )
      })

      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('기본 기능', () => {
    it('메시지가 로드되어야 함', async () => {
      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('Hi there!')).toBeInTheDocument()
      })
    })

    it('입력 필드와 전송 버튼이 렌더링되어야 함', async () => {
      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
        expect(screen.getByText('전송')).toBeInTheDocument()
      })
    })

    it('Enter 키로 메시지를 전송할 수 있어야 함', async () => {
      const { ChatStorageIndexedDB } = require('@/lib/services/storage/chat-storage-indexed-db')

      render(
        <RAGChatInterface
          sessionId="test-session"
          onSessionUpdate={mockSessionUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/질문을 입력하세요/)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/질문을 입력하세요/)

      act(() => {
        fireEvent.change(textarea, { target: { value: 'Test message' } })
      })

      act(() => {
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      })

      await waitFor(() => {
        expect(ChatStorageIndexedDB.addMessage).toHaveBeenCalled()
      })
    })
  })
})
