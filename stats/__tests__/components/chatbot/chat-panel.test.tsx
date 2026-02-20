/**
 * ChatPanel 컴포넌트 테스트
 *
 * 테스트 범위:
 * - 드래그 리사이즈 기능
 * - 접기/펼치기 버튼
 * - 반응형 레이아웃
 * - localStorage 저장/로드
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ChatPanel } from '@/components/chatbot/chat-panel'
import { UIProvider } from '@/contexts/ui-context'

// RAGAssistantCompact 모킹
vi.mock('@/components/rag/rag-assistant-compact', () => ({
  RAGAssistantCompact: () => <div data-testid="rag-assistant">RAG Assistant Mock</div>
}))

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <UIProvider>
      {component}
    </UIProvider>
  )
}

// onClose prop 제거로 인한 수정
const mockOnClose = vi.fn()

describe('ChatPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('기본 렌더링', () => {
    it('펼쳐진 상태로 렌더링되어야 함', () => {
      // 너비 400px 이상으로 설정 (제목 표시)
      localStorage.setItem('chatPanelWidth', '500')

      renderWithProvider(<ChatPanel />)

      // 제목은 너비가 충분할 때만 표시되므로, 대신 RAGAssistant와 버튼 확인
      expect(screen.getByTestId('rag-assistant')).toBeInTheDocument()
      expect(screen.getByLabelText('챗봇 접기')).toBeInTheDocument()
    })

    it('접기 버튼이 표시되어야 함', () => {
      renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      expect(collapseButton).toBeInTheDocument()
    })
  })

  describe('접기/펼치기 기능', () => {
    it('접기 버튼 클릭 시 패널이 접혀야 함', async () => {
      renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        expect(screen.queryByTestId('rag-assistant')).not.toBeInTheDocument()
      })
    })

    it('접힌 상태에서 펼치기 버튼이 표시되어야 함', async () => {
      renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        const expandButton = screen.getByLabelText('챗봇 펼치기')
        expect(expandButton).toBeInTheDocument()
      })
    })

    it('펼치기 버튼 클릭 시 패널이 펼쳐져야 함', async () => {
      // 너비 400px 이상으로 설정
      localStorage.setItem('chatPanelWidth', '500')

      renderWithProvider(<ChatPanel />)

      // 접기
      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        expect(screen.getByLabelText('챗봇 펼치기')).toBeInTheDocument()
      })

      // 펼치기
      const expandButton = screen.getByLabelText('챗봇 펼치기')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByTestId('rag-assistant')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('드래그 핸들', () => {
    it('펼쳐진 상태에서 드래그 핸들이 표시되어야 함', () => {
      const { container } = renderWithProvider(<ChatPanel />)

      const dragHandle = container.querySelector('.cursor-col-resize')
      expect(dragHandle).toBeInTheDocument()
    })

    it('접힌 상태에서 드래그 핸들이 숨겨져야 함', async () => {
      const { container } = renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        const dragHandle = container.querySelector('.cursor-col-resize')
        expect(dragHandle).not.toBeInTheDocument()
      })
    })
  })

  describe('localStorage 저장/로드', () => {
    it('접힌 상태가 localStorage에 저장되어야 함', async () => {
      renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        expect(localStorage.getItem('chatPanelCollapsed')).toBe('true')
      })
    })

    it('펼친 상태가 localStorage에 저장되어야 함', async () => {
      renderWithProvider(<ChatPanel />)

      // 접기
      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        expect(localStorage.getItem('chatPanelCollapsed')).toBe('true')
      })

      // 펼치기
      const expandButton = screen.getByLabelText('챗봇 펼치기')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(localStorage.getItem('chatPanelCollapsed')).toBe('false')
      })
    })
  })

  describe('반응형 레이아웃', () => {
    it('너비 400px 이상에서 제목이 표시되어야 함', () => {
      localStorage.setItem('chatPanelWidth', '500')

      renderWithProvider(<ChatPanel />)

      expect(screen.getByText('AI 통계 챗봇')).toBeInTheDocument()
    })

    it('너비 400px 미만에서 제목이 숨겨져야 함', () => {
      // 기본 너비는 384px이므로 제목이 숨겨짐
      renderWithProvider(<ChatPanel />)

      expect(screen.queryByText('AI 통계 챗봇')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('접기 버튼에 aria-label이 있어야 함', () => {
      renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      expect(collapseButton).toHaveAttribute('aria-label', '챗봇 접기')
    })

    it('펼치기 버튼에 aria-label이 있어야 함', async () => {
      renderWithProvider(<ChatPanel />)

      const collapseButton = screen.getByLabelText('챗봇 접기')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        const expandButton = screen.getByLabelText('챗봇 펼치기')
        expect(expandButton).toHaveAttribute('aria-label', '챗봇 펼치기')
      })
    })
  })
})
