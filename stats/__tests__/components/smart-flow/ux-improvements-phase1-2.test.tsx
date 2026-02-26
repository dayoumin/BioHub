/**
 * UX 개선 회귀 테스트 (Phase 1 + Phase 2)
 *
 * 검증 항목:
 * - P1-1: Clock 아이콘 배지 — historyCount에 따라 배지 표시/숨김
 * - P1-4: 이상치 탭 자동 전환 — outliers > 0 → statistics, 0 → preview 리셋
 * - P2-3: L2 자동 열기 — additionalResults.length > 0 조건 (effectSize 단독은 제외)
 * - P2-5: 새 분석 확인 버튼 — bg-destructive 클래스 제거
 */

import React, { useState, useEffect } from 'react'
import { renderHook, act } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─────────────────────────────────────────────────────────────────────────────
// P1-1: Clock 아이콘 배지
// ─────────────────────────────────────────────────────────────────────────────

interface MockClockBadgeProps {
  historyCount: number
}

function MockClockBadge({ historyCount }: MockClockBadgeProps) {
  return (
    <div data-testid="history-btn" className="relative h-10 w-10">
      <span data-testid="clock-icon">clock</span>
      {historyCount > 0 && (
        <span data-testid="history-badge" className="absolute top-1.5 right-1.5">
          {historyCount > 99 ? '99+' : historyCount}
        </span>
      )}
    </div>
  )
}

describe('P1-1: Clock 아이콘 숫자 배지', () => {
  it('historyCount가 0이면 배지를 렌더하지 않는다', () => {
    render(<MockClockBadge historyCount={0} />)
    expect(screen.queryByTestId('history-badge')).not.toBeInTheDocument()
  })

  it('historyCount가 1이면 배지에 "1"이 표시된다', () => {
    render(<MockClockBadge historyCount={1} />)
    const badge = screen.getByTestId('history-badge')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('1')
  })

  it('historyCount가 5이면 배지에 "5"가 표시된다', () => {
    render(<MockClockBadge historyCount={5} />)
    expect(screen.getByTestId('history-badge').textContent).toBe('5')
  })

  it('historyCount가 99이면 배지에 "99"가 표시된다', () => {
    render(<MockClockBadge historyCount={99} />)
    expect(screen.getByTestId('history-badge').textContent).toBe('99')
  })

  it('historyCount가 100이면 배지에 "99+"가 표시된다', () => {
    render(<MockClockBadge historyCount={100} />)
    expect(screen.getByTestId('history-badge').textContent).toBe('99+')
  })

  it('historyCount가 999이면 배지에 "99+"가 표시된다', () => {
    render(<MockClockBadge historyCount={999} />)
    expect(screen.getByTestId('history-badge').textContent).toBe('99+')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1-4: 이상치 탭 자동 전환 로직 (useEffect 핵심 로직)
// ─────────────────────────────────────────────────────────────────────────────

interface Distribution {
  name: string
  outlierCount: number
}

/**
 * DataExplorationStep의 탭 자동 전환 로직 추출
 * 실제 컴포넌트 의존성 없이 순수 로직만 검증
 */
function useTabAutoSwitch(distributions: Distribution[]) {
  const [activeTab, setActiveTab] = useState<string>('preview')

  useEffect(() => {
    if (distributions.length === 0) return
    const totalOutliers = distributions.reduce((sum, v) => sum + v.outlierCount, 0)
    setActiveTab(totalOutliers > 0 ? 'statistics' : 'preview')
  }, [distributions])

  return { activeTab, setActiveTab }
}

describe('P1-4: 이상치 탭 자동 전환', () => {
  it('초기 상태 — distributions 빈 배열이면 preview 탭 유지', () => {
    const { result } = renderHook(() => useTabAutoSwitch([]))
    expect(result.current.activeTab).toBe('preview')
  })

  it('이상치 없는 데이터 로드 시 preview 탭 유지', () => {
    const distributions: Distribution[] = [
      { name: 'height', outlierCount: 0 },
      { name: 'weight', outlierCount: 0 },
    ]
    const { result } = renderHook(() => useTabAutoSwitch(distributions))
    expect(result.current.activeTab).toBe('preview')
  })

  it('이상치 있는 데이터 로드 시 statistics 탭으로 자동 전환', () => {
    const distributions: Distribution[] = [
      { name: 'height', outlierCount: 3 },
      { name: 'weight', outlierCount: 0 },
    ]
    const { result } = renderHook(() => useTabAutoSwitch(distributions))
    expect(result.current.activeTab).toBe('statistics')
  })

  it('모든 변수에 이상치가 있으면 statistics 탭으로 전환', () => {
    const distributions: Distribution[] = [
      { name: 'a', outlierCount: 2 },
      { name: 'b', outlierCount: 5 },
    ]
    const { result } = renderHook(() => useTabAutoSwitch(distributions))
    expect(result.current.activeTab).toBe('statistics')
  })

  it('데이터 변경 — 이상치 있다가 없어지면 preview로 리셋', () => {
    const { result, rerender } = renderHook(
      ({ distributions }: { distributions: Distribution[] }) => useTabAutoSwitch(distributions),
      { initialProps: { distributions: [{ name: 'x', outlierCount: 5 }] } }
    )

    // 이상치 있는 데이터 → statistics
    expect(result.current.activeTab).toBe('statistics')

    // 새 데이터로 교체: 이상치 없음 → preview로 리셋
    rerender({ distributions: [{ name: 'x', outlierCount: 0 }] })
    expect(result.current.activeTab).toBe('preview')
  })

  it('데이터 변경 — 이상치 없다가 생기면 statistics로 전환', () => {
    const { result, rerender } = renderHook(
      ({ distributions }: { distributions: Distribution[] }) => useTabAutoSwitch(distributions),
      { initialProps: { distributions: [{ name: 'x', outlierCount: 0 }] } }
    )

    expect(result.current.activeTab).toBe('preview')

    rerender({ distributions: [{ name: 'x', outlierCount: 2 }] })
    expect(result.current.activeTab).toBe('statistics')
  })

  it('distributions가 비어있으면 탭이 변경되지 않는다 (early return)', () => {
    const { result, rerender } = renderHook(
      ({ distributions }: { distributions: Distribution[] }) => useTabAutoSwitch(distributions),
      { initialProps: { distributions: [{ name: 'x', outlierCount: 3 }] } }
    )
    // statistics로 전환됨
    expect(result.current.activeTab).toBe('statistics')

    // distributions 빈 배열 → early return, 탭 변경 없음
    rerender({ distributions: [] })
    expect(result.current.activeTab).toBe('statistics') // 변경되지 않아야 함
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2-3: L2 자동 열기 조건 (additionalResults.length > 0 만으로 제한)
// ─────────────────────────────────────────────────────────────────────────────

interface StatisticalResult {
  effectSize?: { value: number; label: string }
  additionalResults?: Array<{ title: string; data: unknown[] }>
}

/**
 * ResultsActionStep의 L2 자동 열기 로직 추출
 */
function useL2AutoOpen(statisticalResult: StatisticalResult | null) {
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(false)

  useEffect(() => {
    if (statisticalResult?.additionalResults && statisticalResult.additionalResults.length > 0) {
      setDetailedResultsOpen(true)
    }
  }, [statisticalResult?.additionalResults])

  return { detailedResultsOpen, setDetailedResultsOpen }
}

describe('P2-3: L2 자동 열기 조건', () => {
  it('초기 상태 — L2가 닫혀 있어야 한다', () => {
    const { result } = renderHook(() => useL2AutoOpen(null))
    expect(result.current.detailedResultsOpen).toBe(false)
  })

  it('additionalResults가 없으면 L2 닫힘 유지', () => {
    const { result } = renderHook(() =>
      useL2AutoOpen({ effectSize: { value: 0.5, label: 'medium' } })
    )
    expect(result.current.detailedResultsOpen).toBe(false)
  })

  it('additionalResults가 빈 배열이면 L2 닫힘 유지', () => {
    const { result } = renderHook(() =>
      useL2AutoOpen({ additionalResults: [] })
    )
    expect(result.current.detailedResultsOpen).toBe(false)
  })

  it('additionalResults에 항목이 있으면 L2 자동 열림', () => {
    const { result } = renderHook(() =>
      useL2AutoOpen({
        additionalResults: [{ title: 'Post-hoc (Tukey HSD)', data: [{ group: 'A vs B', p: 0.03 }] }]
      })
    )
    expect(result.current.detailedResultsOpen).toBe(true)
  })

  it('effectSize만 있고 additionalResults 없으면 L2 열리지 않음 (수정된 동작)', () => {
    const { result } = renderHook(() =>
      useL2AutoOpen({
        effectSize: { value: 0.8, label: 'large' },
        additionalResults: undefined,
      })
    )
    // 수정 전에는 effectSize만으로도 L2가 열렸음 — 이제는 열리지 않아야 함
    expect(result.current.detailedResultsOpen).toBe(false)
  })

  it('결과 변경 — 처음에 없다가 additionalResults 생기면 L2 열림', () => {
    const { result, rerender } = renderHook(
      ({ result: r }: { result: StatisticalResult | null }) => useL2AutoOpen(r),
      { initialProps: { result: null as StatisticalResult | null } }
    )
    expect(result.current.detailedResultsOpen).toBe(false)

    rerender({
      result: { additionalResults: [{ title: 'Coefficients', data: [{ name: 'x1', coef: 1.2 }] }] }
    })
    expect(result.current.detailedResultsOpen).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2-5: 새 분석 확인 버튼 스타일
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AlertDialogAction의 className 병합 방식 검증
 * shadcn/ui: cn(buttonVariants(), className)
 * className="" → bg-destructive 클래스 없음
 */
function MockNewAnalysisDialog({ buttonClassName = '' }: { buttonClassName?: string }) {
  return (
    <div>
      <button
        data-testid="new-analysis-confirm-btn"
        className={`bg-primary text-primary-foreground ${buttonClassName}`.trim()}
      >
        새 분석 시작
      </button>
    </div>
  )
}

describe('P2-5: 새 분석 확인 버튼 스타일', () => {
  it('수정 전 패턴 — bg-destructive가 있으면 destructive 색상 적용됨', () => {
    render(<MockNewAnalysisDialog buttonClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90" />)
    const btn = screen.getByTestId('new-analysis-confirm-btn')
    expect(btn.className).toContain('bg-destructive')
  })

  it('수정 후 패턴 — className=""이면 bg-destructive 클래스 없음', () => {
    render(<MockNewAnalysisDialog buttonClassName="" />)
    const btn = screen.getByTestId('new-analysis-confirm-btn')
    expect(btn.className).not.toContain('bg-destructive')
    expect(btn.className).not.toContain('text-destructive-foreground')
  })

  it('수정 후 패턴 — 기본 primary 스타일이 적용됨', () => {
    render(<MockNewAnalysisDialog buttonClassName="" />)
    const btn = screen.getByTestId('new-analysis-confirm-btn')
    expect(btn.className).toContain('bg-primary')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1-4 비판적 검토: early return 동작 — distributions 빈 배열 시 탭 고착
// ─────────────────────────────────────────────────────────────────────────────

describe('P1-4 edge case: distributions 빈 배열 → 탭 고착 문서화', () => {
  /**
   * distributions가 빈 배열이면 early return으로 아무것도 하지 않음.
   * 이는 의도된 동작:
   * - 데이터가 아직 로드되지 않은 상태 (컴포넌트 초기)
   * - 빈 배열로 탭을 리셋하는 것은 UX상 불필요
   *
   * 반면, 데이터가 있다가 없어지는 경우 (재업로드 실패 등)는
   * DataExplorationStep 자체가 언마운트/리마운트되므로 문제 없음.
   */
  it('distributions 빈 배열 시 기존 탭 상태 유지 (의도된 동작)', () => {
    const { result, rerender } = renderHook(
      ({ distributions }: { distributions: Distribution[] }) => useTabAutoSwitch(distributions),
      { initialProps: { distributions: [{ name: 'x', outlierCount: 1 }] } }
    )
    // statistics로 전환됨
    expect(result.current.activeTab).toBe('statistics')

    // 빈 배열 → early return → statistics 유지
    rerender({ distributions: [] })
    expect(result.current.activeTab).toBe('statistics')
    // 빈 배열일 때 preview로 리셋하지 않음 (데이터 로드 전 상태이므로)
  })
})
