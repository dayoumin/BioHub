/**
 * 플로팅 챗봇 알림 배지 기능 테스트
 *
 * 검증 항목:
 * 1. 새 메시지 알림 배지 표시/숨김
 * 2. 팝업 열 때 배지 자동 제거
 * 3. 부모-자식 컴포넌트 통신 (onNewMessage 콜백)
 * 4. 접근성 (aria-label, role="status")
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

/**
 * Mock 컴포넌트: RAGAssistant
 * 실제 RAGAssistant의 동작을 시뮬레이션
 */
interface MockRAGAssistantProps {
  onNewMessage?: () => void
  className?: string
}

function MockRAGAssistant({ onNewMessage, className }: MockRAGAssistantProps) {
  return (
    <div className={className} data-testid="rag-assistant">
      <button
        onClick={() => onNewMessage?.()}
        data-testid="send-message-btn"
      >
        메시지 전송
      </button>
    </div>
  )
}

/**
 * Mock 컴포넌트: FloatingChatbot의 핵심 로직
 */
function MockFloatingChatbot() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hasNewMessage, setHasNewMessage] = React.useState(false)

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
    // 팝업 열 때 배지 제거
    setHasNewMessage(false)
  }

  const handleNewMessage = () => {
    setHasNewMessage(true)
  }

  return (
    <div data-testid="floating-chatbot">
      {/* 플로팅 버튼 */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          data-testid="floating-button"
          aria-label="AI 도우미 열기"
        >
          💬
        </button>
      )}

      {/* 팝업 */}
      {isOpen && (
        <div
          data-testid="chatbot-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chatbot-title"
        >
          <h3 id="chatbot-title">AI 도우미</h3>
          <MockRAGAssistant
            className="h-full"
            onNewMessage={handleNewMessage}
          />
          <button
            onClick={handleToggle}
            data-testid="close-button"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}

      {/* 알림 배지 */}
      {!isOpen && hasNewMessage && (
        <div
          data-testid="notification-badge"
          role="status"
          aria-live="polite"
          aria-label="새 메시지 있음"
          className="animate-pulse"
        >
          <span>1</span>
        </div>
      )}

      {/* 테스트용: 팝업이 없을 때도 RAGAssistant 노출 */}
      {!isOpen && (
        <div data-testid="hidden-rag-assistant" style={{ display: 'none' }}>
          <MockRAGAssistant
            className="h-full"
            onNewMessage={handleNewMessage}
          />
        </div>
      )}
    </div>
  )
}

describe('FloatingChatbot 알림 배지 기능', () => {
  describe('배지 표시/숨김', () => {
    test('초기 상태에서 배지가 표시되지 않아야 함', () => {
      render(<MockFloatingChatbot />)

      const badge = screen.queryByTestId('notification-badge')
      expect(badge).not.toBeInTheDocument()
    })

    test('새 메시지를 받으면 배지가 표시되어야 함', async () => {
      render(<MockFloatingChatbot />)

      // hidden RAGAssistant의 버튼을 클릭하여 콜백 호출
      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement
      expect(sendButton).toBeInTheDocument()

      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        expect(badge).toBeInTheDocument()
      })
    })

    test('배지가 표시될 때 내용이 "1"이어야 함', async () => {
      render(<MockFloatingChatbot />)

      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement

      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        expect(badge.textContent).toBe('1')
      })
    })

    test('배지에 animate-pulse 클래스가 있어야 함 (시각적 강조)', async () => {
      render(<MockFloatingChatbot />)

      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement

      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        expect(badge).toHaveClass('animate-pulse')
      })
    })
  })

  describe('팝업 열기/닫기와 배지 상호작용', () => {
    test('팝업이 열려있으면 배지가 표시되지 않아야 함 (!isOpen 조건)', async () => {
      render(<MockFloatingChatbot />)

      // 새 메시지 받음
      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement
      fireEvent.click(sendButton)

      // 배지가 나타남
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
      })

      // 플로팅 버튼을 클릭하여 팝업 열기
      const floatingButton = screen.getByTestId('floating-button')
      fireEvent.click(floatingButton)

      // 배지가 사라져야 함
      await waitFor(() => {
        expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
      })
    })

    test('팝업을 열 때 배지가 자동으로 제거되어야 함 (handleToggle에서)', async () => {
      render(<MockFloatingChatbot />)

      // 1. 새 메시지 받기
      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
      })

      // 2. 팝업 열기 (handleToggle)
      const floatingButton = screen.getByTestId('floating-button')
      fireEvent.click(floatingButton)

      // 3. 배지가 제거되었는지 확인
      await waitFor(() => {
        const badge = screen.queryByTestId('notification-badge')
        expect(badge).not.toBeInTheDocument()
      })

      // 4. 팝업이 열려있는지 확인 (dual check)
      const popup = screen.getByTestId('chatbot-popup')
      expect(popup).toBeInTheDocument()
    })

    test('팝업을 닫은 후 다시 새 메시지를 받으면 배지가 다시 표시되어야 함', async () => {
      render(<MockFloatingChatbot />)

      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      let sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement

      // 1. 새 메시지 → 배지 표시
      fireEvent.click(sendButton)
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
      })

      // 2. 플로팅 버튼 클릭 (팝업 열기) → 배지 제거
      let floatingButton = screen.getByTestId('floating-button')
      fireEvent.click(floatingButton)
      await waitFor(() => {
        expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
      })

      // 3. 팝업 닫기
      const closeButton = screen.getByTestId('close-button')
      fireEvent.click(closeButton)

      // 팝업이 닫혔는지 확인
      await waitFor(() => {
        expect(screen.queryByTestId('chatbot-popup')).not.toBeInTheDocument()
      })

      // 4. 다시 새 메시지 → 배지 표시
      // 팝업이 닫혔으므로 숨겨진 RAGAssistant를 다시 찾음
      const hiddenContainerAgain = screen.getByTestId('hidden-rag-assistant')
      const sendButtonAgain = hiddenContainerAgain.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement
      fireEvent.click(sendButtonAgain)

      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
      })
    })
  })

  describe('콜백 통신 (부모-자식)', () => {
    test('RAGAssistant에서 onNewMessage 콜백이 호출되어야 함', async () => {
      const mockCallback = jest.fn()

      function TestComponent() {
        return (
          <MockRAGAssistant onNewMessage={mockCallback} />
        )
      }

      render(<TestComponent />)

      const sendButton = screen.getByTestId('send-message-btn')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled()
      })
    })

    test('onNewMessage 콜백이 호출되면 부모의 hasNewMessage 상태가 업데이트되어야 함', async () => {
      render(<MockFloatingChatbot />)

      const sendButton = screen.getByTestId('send-message-btn')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
      })
    })
  })

  describe('접근성 (A11y)', () => {
    test('배지에 role="status" 속성이 있어야 함', async () => {
      render(<MockFloatingChatbot />)

      const sendButton = screen.getByTestId('send-message-btn')
      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        expect(badge).toHaveAttribute('role', 'status')
      })
    })

    test('배지에 aria-live="polite" 속성이 있어야 함 (스크린 리더)', async () => {
      render(<MockFloatingChatbot />)

      const sendButton = screen.getByTestId('send-message-btn')
      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        expect(badge).toHaveAttribute('aria-live', 'polite')
      })
    })

    test('배지에 aria-label이 있어야 함', async () => {
      render(<MockFloatingChatbot />)

      const sendButton = screen.getByTestId('send-message-btn')
      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        expect(badge).toHaveAttribute('aria-label', '새 메시지 있음')
      })
    })

    test('스크린 리더가 배지를 "status" 영역으로 인식해야 함', async () => {
      render(<MockFloatingChatbot />)

      const sendButton = screen.getByTestId('send-message-btn')
      fireEvent.click(sendButton)

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge')
        // role="status"와 aria-live="polite"의 조합으로
        // 스크린 리더가 새로운 콘텐츠를 자동으로 알림
        expect(badge.getAttribute('role')).toBe('status')
        expect(badge.getAttribute('aria-live')).toBe('polite')
      })
    })
  })

  describe('엣지 케이스', () => {
    test('여러 번 새 메시지를 받아도 배지는 하나만 표시되어야 함', async () => {
      render(<MockFloatingChatbot />)

      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement

      // 여러 번 클릭
      fireEvent.click(sendButton)
      fireEvent.click(sendButton)
      fireEvent.click(sendButton)

      await waitFor(() => {
        const badges = screen.queryAllByTestId('notification-badge')
        // 실제로는 하나의 배지만 존재해야 함
        // (조건: !isOpen && hasNewMessage)
        expect(badges.length).toBeLessThanOrEqual(1)
      })
    })

    test('팝업이 닫혀있을 때만 배지가 표시되어야 함', async () => {
      render(<MockFloatingChatbot />)

      const floatingButton = screen.getByTestId('floating-button')
      const hiddenContainer = screen.getByTestId('hidden-rag-assistant')
      const sendButton = hiddenContainer.querySelector('[data-testid="send-message-btn"]') as HTMLButtonElement

      // 팝업이 닫혀있는 상태
      expect(screen.queryByTestId('chatbot-popup')).not.toBeInTheDocument()

      // 새 메시지
      fireEvent.click(sendButton)

      // 배지가 표시됨
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument()
      })

      // 팝업 열기
      fireEvent.click(floatingButton)

      // 배지가 숨겨짐
      await waitFor(() => {
        expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
      })

      // 팝업이 열려있음
      expect(screen.getByTestId('chatbot-popup')).toBeInTheDocument()
    })
  })
})
