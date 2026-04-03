/**
 * QuickAccessBar — 통합 최근 활동 (통계 + 시각화) 테스트
 *
 * 검증 항목:
 * 1. 통계 + 시각화 카드가 시간순 통합 정렬
 * 2. 통계 카드: 초록 아이콘 + p-value 표시
 * 3. 시각화 카드: 보라 아이콘 + 차트 유형 표시 + 좌측 border accent
 * 4. 시각화 카드 클릭 → router.push('/graph-studio?project=...')
 * 5. 시각화 카드 삭제 → localStorage에서 제거 + UI 갱신
 * 6. pinned 우선 정렬 (통계+시각화 혼합)
 * 7. 빈 상태 표시
 */

import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ===== Mocks =====

const mockRouterPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

// framer-motion: 애니메이션 무시
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, transition, ...rest } = props
      return <div {...rest}>{children as React.ReactNode}</div>
    },
  },
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

// terminology mock — 필요한 필드만
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    hub: {
      cards: {
        recentTitle: '최근 활동',
        unknownMethod: '알 수 없음',
        emptyTitle: '아직 활동 기록이 없습니다',
        emptyDescription: '통계 분석이나 데이터 시각화를 시작해보세요',
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

// Smart Flow Store mock
const mockAnalysisHistory: Array<{
  id: string
  name: string
  timestamp: Date
  method: { id: string; name: string; category: string } | null
  results: Record<string, unknown> | null
  dataFileName: string
}> = []

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({
    analysisHistory: mockAnalysisHistory,
  }),
}))

// Pinned history mock
const mockPinnedIds: string[] = []
const mockSetPinnedIds = vi.fn((updater: string[] | ((prev: string[]) => string[])) => {
  if (typeof updater === 'function') {
    const result = updater(mockPinnedIds)
    mockPinnedIds.length = 0
    mockPinnedIds.push(...result)
  } else {
    mockPinnedIds.length = 0
    mockPinnedIds.push(...updater)
  }
})

vi.mock('@/lib/utils/pinned-history-storage', () => ({
  usePinnedHistoryIds: () => [mockPinnedIds, mockSetPinnedIds] as const,
  MAX_PINNED: 3,
  MAX_VISIBLE_PILLS: 5,
}))

// Graph Studio project-storage mock
let mockProjects: Array<{
  id: string
  name: string
  chartSpec: { chartType: string }
  dataPackageId: string
  editHistory: unknown[]
  createdAt: string
  updatedAt: string
}> = []

vi.mock('@/lib/graph-studio/project-storage', () => ({
  listProjects: () => mockProjects,
  deleteProjectCascade: vi.fn((id: string) => {
    mockProjects = mockProjects.filter(p => p.id !== id)
  }),
}))

vi.mock('@/lib/graph-studio/chart-spec-defaults', () => ({
  CHART_TYPE_HINTS: {
    bar: { label: '막대 차트' },
    scatter: { label: '산점도' },
    line: { label: '선 그래프' },
    boxplot: { label: '박스 플롯' },
    histogram: { label: '히스토그램' },
    heatmap: { label: '히트맵' },
    'grouped-bar': { label: '그룹 막대 차트' },
    'stacked-bar': { label: '누적 막대 차트' },
    'error-bar': { label: '오차 막대' },
    violin: { label: '바이올린' },
    'km-curve': { label: 'KM 곡선' },
    'roc-curve': { label: 'ROC 곡선' },
  },
}))

vi.mock('sonner', () => ({
  toast: { info: vi.fn() },
}))

// ===== Import after mocks =====

import { QuickAccessBar } from '@/components/analysis/hub/QuickAccessBar'

// ===== Helpers =====

function makeStatHistory(overrides: Partial<typeof mockAnalysisHistory[number]> & { id: string }) {
  return {
    name: '',
    timestamp: new Date(),
    method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 't-test' },
    results: { pValue: 0.003 },
    dataFileName: 'test.csv',
    ...overrides,
  }
}

function makeVizProject(overrides: Partial<typeof mockProjects[number]> & { id: string }) {
  return {
    name: '내 차트',
    chartSpec: { chartType: 'bar' },
    dataPackageId: '',
    editHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const defaultProps = {
  onHistoryClick: vi.fn(),
  onHistoryDelete: vi.fn().mockResolvedValue(undefined),
  onShowMore: vi.fn(),
}

// ===== Tests =====

beforeEach(() => {
  mockAnalysisHistory.length = 0
  mockProjects = []
  mockPinnedIds.length = 0
  mockRouterPush.mockClear()
  defaultProps.onHistoryClick.mockClear()
  defaultProps.onHistoryDelete.mockClear()
  defaultProps.onShowMore.mockClear()
  mockSetPinnedIds.mockClear()
})

describe('QuickAccessBar — 통합 최근 활동', () => {
  // ─── 빈 상태 ───

  it('통계+시각화 모두 없으면 빈 상태 표시', () => {
    render(<QuickAccessBar {...defaultProps} />)

    expect(screen.getByText('아직 활동 기록이 없습니다')).toBeInTheDocument()
    expect(screen.getByText('통계 분석이나 데이터 시각화를 시작해보세요')).toBeInTheDocument()
  })

  // ─── 통계 카드 표시 ───

  it('통계 분석 카드: 메서드명 + 파일명 + p-value 표시', () => {
    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-1',
        method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 't-test' },
        results: { pValue: 0.003 },
        dataFileName: 'data.csv',
      })
    )

    render(<QuickAccessBar {...defaultProps} />)

    expect(screen.getByText('독립표본 t-검정')).toBeInTheDocument()
    expect(screen.getByText(/data\.csv/)).toBeInTheDocument()
    expect(screen.getByText(/p=0\.003/)).toBeInTheDocument()
    expect(screen.getByText(/완료/)).toBeInTheDocument()
  })

  // ─── 시각화 카드 표시 ───

  it('시각화 카드: 프로젝트명 + 차트 유형 + "시각화" 라벨 표시', () => {
    mockProjects = [
      makeVizProject({
        id: 'proj-1',
        name: '사료 비교 차트',
        chartSpec: { chartType: 'bar' },
      }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    expect(screen.getByText('사료 비교 차트')).toBeInTheDocument()
    // 차트 유형과 "시각화" 라벨은 같은 <p> 내 별도 텍스트 노드
    const card = screen.getByText('사료 비교 차트').closest('[role="button"]')!
    expect(card.textContent).toContain('막대 차트')
    expect(card.textContent).toContain('시각화')
  })

  it('시각화 카드: 산점도 차트 유형 표시', () => {
    mockProjects = [
      makeVizProject({
        id: 'proj-2',
        name: '상관 시각화',
        chartSpec: { chartType: 'scatter' },
      }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    expect(screen.getByText('상관 시각화')).toBeInTheDocument()
    expect(screen.getByText('산점도')).toBeInTheDocument()
  })

  // ─── 통합 정렬 ───

  it('통계+시각화가 시간순으로 통합 정렬 (최신이 먼저)', () => {
    const now = Date.now()

    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-old',
        timestamp: new Date(now - 3600_000), // 1시간 전
        method: { id: 't-test', name: 'T-검정', category: 't-test' },
      }),
      makeStatHistory({
        id: 'stat-new',
        timestamp: new Date(now - 60_000), // 1분 전
        method: { id: 'anova', name: 'ANOVA', category: 'anova' },
      }),
    )

    mockProjects = [
      makeVizProject({
        id: 'proj-mid',
        name: '중간 차트',
        updatedAt: new Date(now - 1800_000).toISOString(), // 30분 전
      }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    // 카드가 3개 있어야 함
    const cards = screen.getAllByRole('button')
      .filter(el => el.classList.contains('group'))
    expect(cards).toHaveLength(3)

    // 순서 검증: ANOVA(1분전) → 중간 차트(30분전) → T-검정(1시간전)
    const cardTexts = cards.map(c => c.textContent)
    expect(cardTexts[0]).toContain('ANOVA')
    expect(cardTexts[1]).toContain('중간 차트')
    expect(cardTexts[2]).toContain('T-검정')
  })

  // ─── pinned 우선 정렬 ───

  it('pinned 카드가 unpinned보다 먼저 표시 (통계+시각화 혼합)', () => {
    const now = Date.now()

    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-1',
        timestamp: new Date(now - 100_000),
        method: { id: 't-test', name: 'T-검정', category: 't-test' },
      }),
    )

    mockProjects = [
      makeVizProject({
        id: 'proj-pinned',
        name: '고정된 차트',
        updatedAt: new Date(now - 200_000).toISOString(), // 더 오래됨
      }),
    ]

    // 시각화 프로젝트를 pin
    mockPinnedIds.push('proj-pinned')

    render(<QuickAccessBar {...defaultProps} />)

    const cards = screen.getAllByRole('button')
      .filter(el => el.classList.contains('group'))

    // 고정된 차트(pinned, 오래됨)가 T-검정(unpinned, 최신)보다 먼저
    expect(cards[0]?.textContent).toContain('고정된 차트')
    expect(cards[1]?.textContent).toContain('T-검정')
  })

  // ─── 시각화 카드 클릭 → Graph Studio 라우팅 ───

  it('시각화 카드 클릭 시 router.push("/graph-studio?project=...") 호출', async () => {
    const user = userEvent.setup()

    mockProjects = [
      makeVizProject({ id: 'proj-nav', name: '네비 차트' }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('네비 차트').closest('[role="button"]')!
    await user.click(card)

    expect(mockRouterPush).toHaveBeenCalledWith('/graph-studio?project=proj-nav')
    // 통계 히스토리 클릭은 호출되지 않아야 함
    expect(defaultProps.onHistoryClick).not.toHaveBeenCalled()
  })

  it('통계 카드 클릭 시 onHistoryClick 호출 (router.push 아님)', async () => {
    const user = userEvent.setup()

    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-click',
        method: { id: 't-test', name: '클릭 테스트', category: 't-test' },
      }),
    )

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('클릭 테스트').closest('[role="button"]')!
    await user.click(card)

    expect(defaultProps.onHistoryClick).toHaveBeenCalledWith('stat-click')
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  // ─── 시각화 카드 삭제 ───

  it('시각화 카드 삭제 시 deleteProjectCascade 호출 + UI에서 사라짐', async () => {
    const user = userEvent.setup()
    const { deleteProjectCascade } = await import('@/lib/graph-studio/project-storage')

    mockProjects = [
      makeVizProject({ id: 'proj-del', name: '삭제할 차트' }),
    ]

    const { rerender } = render(<QuickAccessBar {...defaultProps} />)

    // 삭제할 차트가 보여야 함
    expect(screen.getByText('삭제할 차트')).toBeInTheDocument()

    // 더보기 메뉴 열기 — MoreVertical 아이콘을 가진 버튼
    const card = screen.getByText('삭제할 차트').closest('[role="button"]') as HTMLElement
    const moreButton = within(card).getAllByRole('button').find(
      btn => btn.querySelector('svg') !== null && btn !== card
    )!
    await user.click(moreButton)

    // "삭제" 메뉴 항목 클릭
    const deleteMenuItems = await screen.findAllByText('삭제')
    // 첫 번째는 드롭다운 메뉴의 삭제 항목
    await user.click(deleteMenuItems[0])

    // 삭제 확인 다이얼로그에서 확인 버튼 클릭
    const dialog = screen.getByRole('alertdialog')
    const confirmButton = within(dialog).getByRole('button', { name: '삭제' })
    await user.click(confirmButton)

    // deleteProjectCascade 호출 확인
    expect(deleteProjectCascade).toHaveBeenCalledWith('proj-del')
    // onHistoryDelete는 호출 안 됨 (시각화이므로)
    expect(defaultProps.onHistoryDelete).not.toHaveBeenCalled()

    // rerender 후 카드가 사라져야 함
    rerender(<QuickAccessBar {...defaultProps} />)
    expect(screen.queryByText('삭제할 차트')).not.toBeInTheDocument()
  })

  // ─── MAX_VISIBLE_PILLS 제한 ───

  it('MAX_VISIBLE_PILLS(5)를 초과하면 최근 5개만 표시', () => {
    const now = Date.now()

    // 통계 3개 + 시각화 4개 = 7개 → 5개만 표시
    for (let i = 0; i < 3; i++) {
      mockAnalysisHistory.push(
        makeStatHistory({
          id: `stat-${i}`,
          timestamp: new Date(now - i * 100_000),
          method: { id: 't-test', name: `통계${i}`, category: 't-test' },
        })
      )
    }

    mockProjects = Array.from({ length: 4 }, (_, i) =>
      makeVizProject({
        id: `proj-${i}`,
        name: `차트${i}`,
        updatedAt: new Date(now - (i + 3) * 100_000).toISOString(),
      })
    )

    render(<QuickAccessBar {...defaultProps} />)

    const cards = screen.getAllByRole('button')
      .filter(el => el.classList.contains('group'))
    expect(cards).toHaveLength(5)
  })

  // ─── "더보기" 버튼 — 통계 개수만 표시 ───

  it('"더보기" 버튼은 통계 분석 개수만 표시 (시각화 제외)', () => {
    const now = Date.now()

    // 통계 6개 (MAX_VISIBLE_PILLS 초과)
    for (let i = 0; i < 6; i++) {
      mockAnalysisHistory.push(
        makeStatHistory({
          id: `stat-${i}`,
          timestamp: new Date(now - i * 100_000),
          method: { id: 't-test', name: `통계${i}`, category: 't-test' },
        })
      )
    }

    // 시각화 2개
    mockProjects = [
      makeVizProject({ id: 'proj-0', name: '차트A' }),
      makeVizProject({ id: 'proj-1', name: '차트B' }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    // "전체 6개 보기" (통계 6개만, 시각화 2개 미포함)
    expect(screen.getByText('전체 6개 보기')).toBeInTheDocument()
  })

  // ─── 아이콘 색상 구분 ───

  it('통계: emerald 아이콘, 시각화: violet 아이콘', () => {
    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-color',
        results: { pValue: 0.05 },
        method: { id: 't-test', name: '통계 카드', category: 't-test' },
      })
    )

    mockProjects = [
      makeVizProject({ id: 'proj-color', name: '시각화 카드' }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    const cards = screen.getAllByRole('button')
      .filter(el => el.classList.contains('group'))

    // 통계 카드의 아이콘 컨테이너: emerald
    const statCard = cards.find(c => c.textContent?.includes('통계 카드'))!
    const statIcon = statCard.querySelector('.bg-emerald-100')
    expect(statIcon).not.toBeNull()

    // 시각화 카드의 아이콘 컨테이너: violet
    const vizCard = cards.find(c => c.textContent?.includes('시각화 카드'))!
    const vizIcon = vizCard.querySelector('.bg-violet-100')
    expect(vizIcon).not.toBeNull()
  })

  // ─── 시각화 카드 border-l accent ───

  it('시각화 카드는 좌측 보라 border accent를 가짐', () => {
    mockProjects = [
      makeVizProject({ id: 'proj-border', name: '보더 차트' }),
    ]

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('보더 차트').closest('[role="button"]')!
    expect(card.className).toContain('border-l-')
  })

  it('통계 카드는 좌측 border accent 없음', () => {
    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-border',
        method: { id: 't-test', name: '보더 없는 카드', category: 't-test' },
      })
    )

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('보더 없는 카드').closest('[role="button"]')!
    expect(card.className).not.toContain('border-l-violet')
  })

  // ─── p-value 없는 통계 ───

  it('results가 null인 통계 카드: "진행 중" 표시, p-value 없음', () => {
    mockAnalysisHistory.push(
      makeStatHistory({
        id: 'stat-inprog',
        results: null,
        method: { id: 't-test', name: '진행 중 분석', category: 't-test' },
      })
    )

    render(<QuickAccessBar {...defaultProps} />)

    const card = screen.getByText('진행 중 분석').closest('[role="button"]')!
    expect(card.textContent).toContain('진행 중')
    expect(card.textContent).not.toContain('p=')
  })

  // ─── 제목: "최근 활동" ───

  it('섹션 제목이 "최근 활동"으로 표시', () => {
    render(<QuickAccessBar {...defaultProps} />)
    expect(screen.getByText('최근 활동')).toBeInTheDocument()
  })
})
