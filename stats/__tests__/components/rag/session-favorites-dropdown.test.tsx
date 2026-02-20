/**
 * SessionFavoritesDropdown 테스트
 */

import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { SessionFavoritesDropdown } from '@/components/rag/session-favorites-dropdown'
import type { ChatSession } from '@/lib/types/chat'

// 테스트 데이터
const mockSessions: ChatSession[] = [
  {
    id: 'session-1',
    title: '즐겨찾기 세션 1',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: true,
    isArchived: false,
  },
  {
    id: 'session-2',
    title: '일반 세션',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    isArchived: false,
  },
  {
    id: 'session-3',
    title: '즐겨찾기 세션 2',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: true,
    isArchived: false,
  },
]

describe('SessionFavoritesDropdown', () => {
  const mockOnSelectSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('즐겨찾기 세션이 없으면 렌더링하지 않음', () => {
    const noFavoriteSessions: ChatSession[] = [
      {
        id: 'session-1',
        title: '일반 세션',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        isArchived: false,
      },
    ]

    const { container } = render(
      <SessionFavoritesDropdown
        sessions={noFavoriteSessions}
        currentSessionId={null}
        onSelectSession={mockOnSelectSession}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('즐겨찾기 버튼을 렌더링함', () => {
    render(
      <SessionFavoritesDropdown
        sessions={mockSessions}
        currentSessionId={null}
        onSelectSession={mockOnSelectSession}
      />
    )

    const button = screen.getByTitle('즐겨찾기')
    expect(button).toBeInTheDocument()
  })

  it('즐겨찾기 세션만 표시함', async () => {
    const user = userEvent.setup()

    render(
      <SessionFavoritesDropdown
        sessions={mockSessions}
        currentSessionId={null}
        onSelectSession={mockOnSelectSession}
      />
    )

    // 드롭다운 열기
    const button = screen.getByTitle('즐겨찾기')
    await user.click(button)

    // 즐겨찾기 세션만 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText('즐겨찾기 세션 1')).toBeInTheDocument()
      expect(screen.getByText('즐겨찾기 세션 2')).toBeInTheDocument()
      expect(screen.queryByText('일반 세션')).not.toBeInTheDocument()
    })
  })

  it('현재 세션을 하이라이트함', async () => {
    const user = userEvent.setup()

    render(
      <SessionFavoritesDropdown
        sessions={mockSessions}
        currentSessionId="session-1"
        onSelectSession={mockOnSelectSession}
      />
    )

    // 드롭다운 열기
    const button = screen.getByTitle('즐겨찾기')
    await user.click(button)

    // 현재 세션이 bg-accent 클래스를 가지는지 확인
    await waitFor(() => {
      const sessionItem = screen.getByText('즐겨찾기 세션 1').closest('div[role="menuitem"]')
      expect(sessionItem).toHaveClass('bg-accent')
    })
  })

  it('세션 클릭 시 onSelectSession 호출', async () => {
    const user = userEvent.setup()

    render(
      <SessionFavoritesDropdown
        sessions={mockSessions}
        currentSessionId={null}
        onSelectSession={mockOnSelectSession}
      />
    )

    // 드롭다운 열기
    const button = screen.getByTitle('즐겨찾기')
    await user.click(button)

    // 세션 클릭
    await waitFor(() => {
      expect(screen.getByText('즐겨찾기 세션 1')).toBeInTheDocument()
    })

    const sessionItem = screen.getByText('즐겨찾기 세션 1')
    await user.click(sessionItem)

    expect(mockOnSelectSession).toHaveBeenCalledWith('session-1')
    expect(mockOnSelectSession).toHaveBeenCalledTimes(1)
  })

  it('타임스탬프를 한국어 형식으로 표시함', async () => {
    const user = userEvent.setup()
    const now = new Date('2025-11-16T10:30:00')
    const sessionsWithTimestamp: ChatSession[] = [
      {
        id: 'session-1',
        title: '즐겨찾기 세션',
        messages: [],
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        isFavorite: true,
        isArchived: false,
      },
    ]

    render(
      <SessionFavoritesDropdown
        sessions={sessionsWithTimestamp}
        currentSessionId={null}
        onSelectSession={mockOnSelectSession}
      />
    )

    // 드롭다운 열기
    const button = screen.getByTitle('즐겨찾기')
    await user.click(button)

    // 타임스탬프 형식 확인 (한국어 로케일)
    await waitFor(() => {
      const timestamp = screen.getByText(/11월/)
      expect(timestamp).toBeInTheDocument()
    })
  })
})
