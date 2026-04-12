import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props
      return <div {...rest}>{children as React.ReactNode}</div>
    },
  },
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    hub: {
      cards: {
        recentTitle: '최근 활동',
        unknownMethod: '알 수 없음',
        emptyTitle: '아직 활동 기록이 없습니다',
        emptyDescription: '통계 분석이나 데이터 시각화를 시작해보세요',
        visualizationSummaryWithType: (chartTypeLabel: string) => `${chartTypeLabel} summary`,
        visualizationSummaryFallback: 'visualization summary',
        analysisSummaryFallback: 'analysis summary',
        showMore: (n: number) => `전체 ${n}개 보기`,
      },
      timeAgo: {
        justNow: '방금 전',
        minutesAgo: (n: number) => `${n}분 전`,
        hoursAgo: (n: number) => `${n}시간 전`,
        daysAgo: (n: number) => `${n}일 전`,
      },
      recentStatus: {
        completed: '완료',
        inProgress: '진행 중',
        visualization: '시각화',
      },
    },
    history: {
      labels: {
        moreActions: '더보기',
      },
      tooltips: {
        pin: '고정',
        unpin: '고정 해제',
        delete: '삭제',
        maxPinned: (n: number) => `최대 ${n}개`,
      },
      dialogs: {
        deleteTitle: '삭제 확인',
        deleteDescription: '정말 삭제하시겠습니까?',
      },
      buttons: {
        cancel: '취소',
        delete: '삭제',
      },
    },
  }),
}))

const mockAnalysisHistory: Array<{
  id: string
  name: string
  timestamp: Date
  purpose?: string
  method: { id: string; name: string; category: string; description?: string } | null
  results: Record<string, unknown> | null
  dataFileName: string
}> = []

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({
    analysisHistory: mockAnalysisHistory,
  }),
}))

vi.mock('@/lib/utils/pinned-history-storage', () => ({
  usePinnedHistoryIds: () => [[], vi.fn()] as const,
  MAX_PINNED: 3,
  MAX_VISIBLE_PILLS: 5,
  togglePinId: (ids: string[]) => ids,
}))

const { GRAPH_PROJECTS_CHANGED_EVENT } = vi.hoisted(() => ({
  GRAPH_PROJECTS_CHANGED_EVENT: 'graph-studio-projects-changed',
}))

vi.mock('@/lib/graph-studio', () => ({
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects: () => [],
  deleteProjectCascade: vi.fn(),
  CHART_TYPE_HINTS: {},
}))

vi.mock('sonner', () => ({
  toast: { info: vi.fn() },
}))

import { QuickAccessBar } from '@/components/analysis/hub/QuickAccessBar'

const defaultProps = {
  onHistoryClick: vi.fn(),
  onHistoryDelete: vi.fn().mockResolvedValue(undefined),
}

describe('QuickAccessBar regressions', () => {
  beforeEach(() => {
    mockAnalysisHistory.length = 0
    mockRouterPush.mockClear()
    defaultProps.onHistoryClick.mockClear()
    defaultProps.onHistoryDelete.mockClear()
  })

  it('uses terminology fallback text for statistics summaries', () => {
    mockAnalysisHistory.push({
      id: 'stat-summary',
      name: '',
      timestamp: new Date(),
      purpose: '',
      method: { id: 't-test', name: 'fallback method', category: 't-test', description: '' },
      results: { pValue: 0.031 },
      dataFileName: 'fallback.csv',
    })

    render(<QuickAccessBar {...defaultProps} />)

    expect(screen.getByText('analysis summary')).toBeInTheDocument()
  })

  it('Enter opens the overflow menu without opening the card', async () => {
    const user = userEvent.setup()

    mockAnalysisHistory.push({
      id: 'stat-enter',
      name: '',
      timestamp: new Date(),
      method: { id: 't-test', name: 'menu test', category: 't-test' },
      results: { pValue: 0.01 },
      dataFileName: 'data.csv',
    })

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('menu test').closest('[role="button"]') as HTMLElement
    const moreButton = within(card).getByRole('button', { name: '더보기' })

    moreButton.focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByText('고정')).toBeInTheDocument()
    expect(defaultProps.onHistoryClick).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('Space opens the overflow menu without opening the card', async () => {
    const user = userEvent.setup()

    mockAnalysisHistory.push({
      id: 'stat-space',
      name: '',
      timestamp: new Date(),
      method: { id: 't-test', name: 'space menu', category: 't-test' },
      results: { pValue: 0.02 },
      dataFileName: 'data.csv',
    })

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('space menu').closest('[role="button"]') as HTMLElement
    const moreButton = within(card).getByRole('button', { name: '더보기' })

    moreButton.focus()
    await user.keyboard(' ')

    expect(await screen.findByText('고정')).toBeInTheDocument()
    expect(defaultProps.onHistoryClick).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
