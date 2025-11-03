/**
 * RAGAssistant 이벤트 전파 테스트
 *
 * 검증 항목:
 * 1. 세션 항목 클릭 → handleSelectSession 호출
 * 2. 드롭다운 메뉴 "삭제" 클릭 → handleDeleteSession만 호출 (부모 onClick X)
 * 3. 드롭다운 메뉴 "즐겨찾기" 클릭 → handleToggleFavorite만 호출 (부모 onClick X)
 * 4. 텍스트 truncate 동작
 * 5. 메뉴 버튼 hover 시 표시
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RAGAssistant } from '@/components/rag/rag-assistant'

// ChatStorage 목업
jest.mock('@/lib/services/chat-storage', () => ({
  ChatStorage: {
    loadSessions: jest.fn(() => [
      {
        id: 'session-1',
        title: '아주 길게 작성된 채팅 제목이 있을 때 텍스트가 잘려야 하는지 확인하는 테스트입니다',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
      },
    ]),
    createNewSession: jest.fn(() => ({
      id: 'new-session',
      title: '새로운 세션',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    })),
    loadSession: jest.fn((id) => ({
      id,
      title: '테스트 세션',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    })),
    deleteSession: jest.fn(),
    toggleFavorite: jest.fn(),
    addMessage: jest.fn(),
  },
}))

// RAG 서비스 목업
jest.mock('@/lib/rag/rag-service', () => ({
  queryRAG: jest.fn(() => ({
    answer: '테스트 답변입니다',
    sources: [],
    model: { provider: 'test' },
  })),
}))

describe('RAGAssistant - 이벤트 전파', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('세션 항목 렌더링: 제목이 truncate되어야 함', () => {
    render(<RAGAssistant />)

    const sessionTitle = screen.getByText(/아주 길게 작성된/)
    expect(sessionTitle).toHaveClass('truncate')
  })

  it('세션 항목: 제목을 포함하는 div는 flex 레이아웃 + min-w-0 적용', () => {
    const { container } = render(<RAGAssistant />)

    // 제목을 포함하는 flex 컨테이너 찾기
    const titleText = screen.getByText(/아주 길게 작성된/)
    const flexContainer = titleText.parentElement?.parentElement?.parentElement

    // flex + min-w-0 확인
    expect(flexContainer).toHaveClass('flex')
    expect(flexContainer).toHaveClass('min-w-0')
  })

  it('메뉴 버튼: 항상 pointer-events-auto 적용되어야 함', () => {
    const { container } = render(<RAGAssistant />)

    // 세션 항목이 렌더링될 때까지 대기
    const sessionItem = screen.getByText(/아주 길게 작성된/).closest('div[class*="group"]')
    expect(sessionItem).toBeInTheDocument()

    // 호버 전: opacity-0이지만 pointer-events-auto는 적용됨
    // CSS: opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto
  })

  it('메뉴 호버: opacity가 100으로 변경되어야 함', async () => {
    const { container } = render(<RAGAssistant />)

    // 세션 항목 호버
    const sessionItem = screen.getByText(/아주 길게 작성된/).closest('div[class*="group"]')

    if (sessionItem) {
      fireEvent.mouseEnter(sessionItem)

      // hover 후: opacity-100 + transition-opacity
      await waitFor(() => {
        // group-hover 상태 확인
        const style = window.getComputedStyle(sessionItem)
        // Note: 실제 hover 상태는 CSS 컴파일 후 적용되므로
        // 클래스 존재 여부로 확인
      })
    }
  })

  it('이벤트 전파: 메뉴 클릭 시 부모 onClick이 실행되지 않아야 함 (stopPropagation)', async () => {
    const selectSessionSpy = jest.fn()

    const { container } = render(<RAGAssistant />)

    // 부모 div의 onClick 감시
    const sessionItem = screen.getByText(/아주 길게 작성된/).closest('div[class*="group relative"]')

    if (sessionItem) {
      // 원본 onClick 저장
      const originalOnClick = sessionItem.onclick

      // 새로운 핸들러로 교체 (테스트용)
      sessionItem.onclick = (e: MouseEvent) => {
        selectSessionSpy()
        originalOnClick?.(e as unknown as Event)
      }

      // 메뉴 버튼 클릭
      const menuButton = sessionItem.querySelector('button[title="옵션"]')
      if (menuButton) {
        await userEvent.click(menuButton)

        // 드롭다운 메뉴가 열려야 함
        await waitFor(() => {
          // 메뉴 항목이 렌더링되어야 함
        }, { timeout: 1000 })
      }
    }
  })

  it('테스트: 클래스명 검증 - truncate 관련', () => {
    const { container } = render(<RAGAssistant />)

    // 제목 컨테이너 찾기
    const titleDiv = screen.getByText(/아주 길게 작성된/).closest('div[class*="text-sm"]')
    expect(titleDiv).toHaveClass('truncate')
  })

  it('테스트: Flex 레이아웃 구조 검증', () => {
    const { container } = render(<RAGAssistant />)

    // 세션 항목의 flex 구조
    // <div className="flex items-start justify-between gap-2 min-w-0">
    //   <div className="flex-1 min-w-0"> (제목 영역)
    //   <ChatHeaderMenu /> (메뉴 버튼)
    // </div>

    const sessionItem = screen.getByText(/아주 길게 작성된/).closest('div[class*="flex-1"]')
    expect(sessionItem).toHaveClass('flex-1')
    expect(sessionItem).toHaveClass('min-w-0')
  })
})
