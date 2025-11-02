/**
 * FloatingChatbot 컴포넌트 통합 테스트
 *
 * 테스트 범위:
 * - 버튼 렌더링 및 클릭
 * - 팝업 열기/닫기
 * - 키보드 단축키 (Esc)
 * - 설정에 따른 표시/숨김
 * - 최소화 기능
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FloatingChatbot } from '@/components/chatbot/floating-chatbot'
import { ChatStorage } from '@/lib/services/chat-storage'

// LocalStorage Mock
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

global.localStorage = new LocalStorageMock() as Storage

// Next.js usePathname Mock
const mockPathname = jest.fn(() => '/')
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

// RAGAssistant Mock (react-markdown 의존성 회피)
jest.mock('@/components/rag/rag-assistant', () => ({
  RAGAssistant: () => <div>RAG 도우미</div>,
}))

// queryRAG Mock
jest.mock('@/lib/rag/rag-service', () => ({
  queryRAG: jest.fn().mockResolvedValue({
    answer: '모의 답변입니다.',
    sources: [],
  }),
}))

describe('FloatingChatbot', () => {
  beforeEach(() => {
    localStorage.clear()
    // 기본 경로: 홈페이지
    mockPathname.mockReturnValue('/')
    // 기본 설정: 플로팅 버튼 활성화
    ChatStorage.saveSettings({
      floatingButtonEnabled: true,
      theme: 'system',
    })
  })

  afterEach(() => {
    ChatStorage.clearAll()
    jest.clearAllMocks()
  })

  describe('버튼 렌더링', () => {
    it('플로팅 버튼이 렌더링되어야 함', () => {
      render(<FloatingChatbot />)

      const button = screen.getByLabelText('AI 도우미 열기')
      expect(button).toBeInTheDocument()
    })

    it('설정이 비활성화되면 렌더링되지 않아야 함', () => {
      ChatStorage.saveSettings({
        floatingButtonEnabled: false,
        theme: 'system',
      })

      const { container } = render(<FloatingChatbot />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('팝업 열기/닫기', () => {
    it('버튼 클릭 시 팝업이 열려야 함', async () => {
      render(<FloatingChatbot />)

      const button = screen.getByLabelText('AI 도우미 열기')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('AI 도우미')).toBeInTheDocument()
      })
    })

    it('닫기 버튼 클릭 시 팝업이 닫혀야 함', async () => {
      render(<FloatingChatbot />)

      // 팝업 열기
      const openButton = screen.getByLabelText('AI 도우미 열기')
      fireEvent.click(openButton)

      await waitFor(() => {
        expect(screen.getByText('AI 도우미')).toBeInTheDocument()
      })

      // 팝업 닫기
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-x')
      )

      if (closeButton) {
        fireEvent.click(closeButton)
      }

      await waitFor(() => {
        expect(screen.queryByText('AI 도우미')).not.toBeInTheDocument()
      })
    })

    it('Esc 키로 팝업을 닫을 수 있어야 함', async () => {
      render(<FloatingChatbot />)

      // 팝업 열기
      const button = screen.getByLabelText('AI 도우미 열기')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('AI 도우미')).toBeInTheDocument()
      })

      // Esc 키 누르기
      fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByText('AI 도우미')).not.toBeInTheDocument()
      })
    })
  })

  describe('최소화 기능', () => {
    it('최소화 버튼 클릭 시 본문이 숨겨져야 함', async () => {
      render(<FloatingChatbot />)

      // 팝업 열기
      const button = screen.getByLabelText('AI 도우미 열기')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('AI 도우미')).toBeInTheDocument()
      })

      // 최소화 버튼 찾기
      const minimizeButtons = screen.getAllByRole('button')
      const minimizeButton = minimizeButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-minus')
      )

      if (minimizeButton) {
        fireEvent.click(minimizeButton)
      }

      // RAG 도우미 텍스트가 사라져야 함 (본문이 숨겨짐)
      await waitFor(() => {
        expect(screen.queryByText('RAG 도우미')).not.toBeInTheDocument()
      })
    })
  })

  describe('접근성', () => {
    it('버튼에 적절한 aria-label이 있어야 함', () => {
      render(<FloatingChatbot />)

      const button = screen.getByLabelText('AI 도우미 열기')
      expect(button).toHaveAttribute('aria-label', 'AI 도우미 열기')
    })
  })

  describe('반응형', () => {
    it('PC 화면에서 팝업이 렌더링되어야 함', async () => {
      render(<FloatingChatbot />)

      const button = screen.getByLabelText('AI 도우미 열기')
      fireEvent.click(button)

      await waitFor(() => {
        const popup = screen.getByText('AI 도우미')
        expect(popup).toBeInTheDocument()
      })
    })
  })

  describe('경로 기반 조건부 렌더링', () => {
    it('/chatbot 페이지에서는 플로팅 버튼이 렌더링되지 않아야 함', () => {
      // /chatbot 경로로 설정
      mockPathname.mockReturnValue('/chatbot')

      const { container } = render(<FloatingChatbot />)

      // 컴포넌트가 null을 반환해야 함
      expect(container.firstChild).toBeNull()

      // 플로팅 버튼이 존재하지 않아야 함
      const button = screen.queryByLabelText('AI 도우미 열기')
      expect(button).toBeNull()
    })

    it('다른 페이지(/statistics)에서는 플로팅 버튼이 렌더링되어야 함', () => {
      // /statistics 경로로 설정
      mockPathname.mockReturnValue('/statistics')

      render(<FloatingChatbot />)

      const button = screen.getByLabelText('AI 도우미 열기')
      expect(button).toBeInTheDocument()
    })

    it('홈페이지(/)에서는 플로팅 버튼이 렌더링되어야 함', () => {
      // / 경로로 설정
      mockPathname.mockReturnValue('/')

      render(<FloatingChatbot />)

      const button = screen.getByLabelText('AI 도우미 열기')
      expect(button).toBeInTheDocument()
    })

    it('/chatbot 페이지에서는 설정이 활성화되어도 렌더링되지 않아야 함', () => {
      // /chatbot 경로로 설정
      mockPathname.mockReturnValue('/chatbot')

      // 설정 활성화
      ChatStorage.saveSettings({
        floatingButtonEnabled: true,
        theme: 'system',
      })

      const { container } = render(<FloatingChatbot />)

      // 경로 체크가 설정 체크보다 우선하므로 렌더링되지 않음
      expect(container.firstChild).toBeNull()
    })
  })
})
