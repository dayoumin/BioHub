/**
 * AiInterpretationCard — pill 자동 선택 동작 시뮬레이션
 *
 * 검증 대상: useEffect 기반 pill 자동 선택이 기존 render-time setState와 동일하게 동작하는지
 *
 * 시나리오:
 * 1. 스트리밍 완료 → 사용자 미조작 → 첫 pill 자동 선택
 * 2. 스트리밍 중 사용자 pill 클릭 → 완료 시 사용자 선택 유지 (회귀 방지)
 * 3. 히스토리 전환 (detail 변경) → userInteracted 리셋 + 새 첫 pill 자동 선택
 * 4. 스트리밍 중 "전체 보기" 클릭 → 완료 시 사용자 선택 유지
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import React, { createRef } from 'react'
import { AiInterpretationCard } from '@/components/analysis/steps/results/AiInterpretationCard'

// ===== Mocks =====

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props
      return <div ref={ref} {...rest}>{children as React.ReactNode}</div>
    }),
    button: React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: React.Ref<HTMLButtonElement>) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props
      return <button ref={ref} {...rest}>{children as React.ReactNode}</button>
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

// react-markdown mock
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <span>{children}</span>,
}))

// ===== Helpers =====

/** 볼드 마크다운 형식의 detail 텍스트 생성 (parseDetailSections가 파싱) */
function makeDetail(sections: Array<{ heading: string; content: string }>): string {
  return sections.map(s => `**${s.heading}**\n${s.content}`).join('\n\n')
}

const DETAIL_A = makeDetail([
  { heading: '통계량 해석', content: 't = 2.45, p = 0.021로 유의합니다.' },
  { heading: '효과크기', content: "Cohen's d = 0.82로 큰 효과크기입니다." },
  { heading: '주의할 점', content: '표본 크기가 작습니다.' },
])

const DETAIL_B = makeDetail([
  { heading: '통계량 해석', content: 'F = 5.12, p = 0.008로 유의합니다.' },
  { heading: '그룹/변수별 패턴', content: 'A > B > C 순서입니다.' },
])

/** 최소 terminology mock */
const minimalT = {
  results: {
    ai: {
      label: 'AI 해석',
      loading: '로딩 중...',
      reinterpret: '다시 해석',
      retry: '다시 시도',
      retryExhausted: '재시도 횟수 초과',
      defaultError: '오류',
    },
  },
} as never // TerminologyDictionary의 나머지 필드는 이 테스트에서 접근하지 않음

interface RenderProps {
  parsedInterpretation: { summary: string; detail: string | null } | null
  isInterpreting: boolean
}

function renderCard(overrides: Partial<RenderProps> = {}) {
  const ref = createRef<HTMLDivElement>()
  const defaults: RenderProps = {
    parsedInterpretation: null,
    isInterpreting: false,
    ...overrides,
  }
  return render(
    <AiInterpretationCard
      parsedInterpretation={defaults.parsedInterpretation}
      isInterpreting={defaults.isInterpreting}
      interpretationModel="test-model"
      interpretError={null}
      prefersReducedMotion
      onReinterpret={vi.fn()}
      containerRef={ref}
      phase={4}
      t={minimalT}
    />,
  )
}

/** detail pill 버튼들의 텍스트 목록 반환 */
function getPillTexts(): string[] {
  // SectionPill은 motion.button으로 렌더되고, shortLabel을 표시
  const pills = screen.queryAllByRole('button').filter(btn => {
    const text = btn.textContent ?? ''
    // pill은 짧은 한글 라벨 (통계량, 효과크기 등)
    return ['통계량', '효과크기', '가정 검정', '그룹 패턴', '활용법', '주의사항', '추가 분석'].some(
      label => text.includes(label),
    )
  })
  return pills.map(p => p.textContent ?? '')
}

/** 특정 pill 버튼 찾기 */
function findPill(shortLabel: string): HTMLElement | null {
  const pills = screen.queryAllByRole('button')
  return pills.find(btn => btn.textContent?.includes(shortLabel)) ?? null
}

/** 현재 활성(선택된) 섹션의 heading label 가져오기 */
function getActiveSectionLabel(): string | null {
  // 활성 섹션은 bg-surface-container/40 rounded-lg px-4 안에 렌더되는 SectionContent
  // SectionContent 내부에 uppercase tracking-wider span이 있음
  const sectionContents = screen.queryAllByText(
    (_, el) => el?.tagName === 'SPAN' && el?.className?.includes('uppercase') && el?.className?.includes('tracking-wider') || false,
  )
  // detail 카테고리 섹션만 (warning/action 제외 — 항상 표시됨)
  // 실제로 선택된 콘텐츠만 DOM에 있으므로 첫 번째가 활성 섹션
  return sectionContents.length > 0 ? sectionContents[0].textContent : null
}

// ===== Tests =====

describe('AiInterpretationCard — pill 자동 선택', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('시나리오 1: 스트리밍 완료 → 사용자 미조작 → 첫 detail pill 자동 선택', async () => {
    // 1) 스트리밍 시작 (isInterpreting=true, detail 점진적 증가)
    const { rerender } = renderCard({
      parsedInterpretation: { summary: '요약입니다.', detail: '**통계량 해석**\nt = 2.45' },
      isInterpreting: true,
    })

    // 스트리밍 중에는 pill이 보이지만 자동 선택 없음 (useEffect가 early return)
    // → activeSection = null이므로 SectionContent가 렌더되지 않음
    expect(getActiveSectionLabel()).toBeNull()

    // 2) 스트리밍 완료 (isInterpreting=false, detail 최종값)
    await act(async () => {
      rerender(
        <AiInterpretationCard
          parsedInterpretation={{ summary: '요약입니다.', detail: DETAIL_A }}
          isInterpreting={false}
          interpretationModel="test-model"
          interpretError={null}
          prefersReducedMotion
          onReinterpret={vi.fn()}
          containerRef={createRef()}
          phase={4}
          t={minimalT}
        />,
      )
    })

    // 첫 detail 섹션 = "통계량 해석" 자동 선택
    expect(getActiveSectionLabel()).toBe('통계량 해석')

    // pill 목록 확인 (detail 카테고리: 통계량, 효과크기)
    const pills = getPillTexts()
    expect(pills).toContain('통계량')
    expect(pills).toContain('효과크기')
  })

  it('시나리오 2: 스트리밍 중 사용자 pill 클릭 → 완료 시 사용자 선택 유지', async () => {
    // 1) 스트리밍 시작 — 두 섹션이 이미 도착한 상태
    const { rerender } = renderCard({
      parsedInterpretation: { summary: '요약.', detail: DETAIL_A },
      isInterpreting: true,
    })

    // 2) 사용자가 "효과크기" pill 클릭
    const effectPill = findPill('효과크기')
    expect(effectPill).not.toBeNull()
    await act(async () => {
      fireEvent.click(effectPill!)
    })

    // 효과크기 섹션이 활성화됨
    expect(getActiveSectionLabel()).toBe('효과크기')

    // 3) 스트리밍 완료 (isInterpreting false, detail 동일)
    await act(async () => {
      rerender(
        <AiInterpretationCard
          parsedInterpretation={{ summary: '요약.', detail: DETAIL_A }}
          isInterpreting={false}
          interpretationModel="test-model"
          interpretError={null}
          prefersReducedMotion
          onReinterpret={vi.fn()}
          containerRef={createRef()}
          phase={4}
          t={minimalT}
        />,
      )
    })

    // ★ 핵심 검증: 사용자가 선택한 "효과크기"가 유지되어야 함 (첫 pill로 리셋되면 안 됨)
    expect(getActiveSectionLabel()).toBe('효과크기')
    // "통계량 해석"으로 리셋되지 않았음을 명시 확인
    expect(getActiveSectionLabel()).not.toBe('통계량 해석')
  })

  it('시나리오 3: 히스토리 전환 (detail 변경) → userInteracted 리셋 + 새 첫 pill 자동 선택', async () => {
    // 1) 해석 A 완료 상태에서 사용자가 "효과크기" 선택
    const { rerender } = renderCard({
      parsedInterpretation: { summary: '요약 A.', detail: DETAIL_A },
      isInterpreting: false,
    })

    const effectPill = findPill('효과크기')
    expect(effectPill).not.toBeNull()
    await act(async () => {
      fireEvent.click(effectPill!)
    })
    expect(getActiveSectionLabel()).toBe('효과크기')

    // 2) 히스토리 전환 → detail이 DETAIL_B로 변경 (isInterpreting은 false 유지)
    await act(async () => {
      rerender(
        <AiInterpretationCard
          parsedInterpretation={{ summary: '요약 B.', detail: DETAIL_B }}
          isInterpreting={false}
          interpretationModel="test-model"
          interpretError={null}
          prefersReducedMotion
          onReinterpret={vi.fn()}
          containerRef={createRef()}
          phase={4}
          t={minimalT}
        />,
      )
    })

    // ★ 핵심 검증: detail이 바뀌었으므로 userInteracted 리셋 + 새 첫 pill 자동 선택
    // DETAIL_B의 첫 detail 섹션 = "통계량 해석"
    expect(getActiveSectionLabel()).toBe('통계량 해석')
    // 이전의 "효과크기" 선택이 남아있으면 안 됨
    expect(getActiveSectionLabel()).not.toBe('효과크기')
  })

  it('시나리오 4: 스트리밍 중 "전체 보기" 클릭 → 완료 시 사용자 선택 유지', async () => {
    // 1) 스트리밍 중 (detail 있음)
    const { rerender } = renderCard({
      parsedInterpretation: { summary: '요약.', detail: DETAIL_A },
      isInterpreting: true,
    })

    // 2) "전체 보기" 버튼 클릭
    const showAllBtn = screen.queryAllByRole('button').find(btn => btn.textContent?.includes('전체 보기'))
    expect(showAllBtn).toBeDefined()
    await act(async () => {
      fireEvent.click(showAllBtn!)
    })

    // 전체 보기가 활성화되면 activeSection은 null이지만 showAll=true
    // 개별 섹션 콘텐츠 대신 모든 섹션이 표시됨
    // 두 detail 섹션("통계량 해석", "효과크기") 모두 보여야 함
    // (pill에도 같은 텍스트가 있으므로 getAllByText로 복수 검증)
    expect(screen.getAllByText(/통계량 해석/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/효과크기/).length).toBeGreaterThanOrEqual(2) // pill + section label

    // 3) 스트리밍 완료 (detail 동일)
    await act(async () => {
      rerender(
        <AiInterpretationCard
          parsedInterpretation={{ summary: '요약.', detail: DETAIL_A }}
          isInterpreting={false}
          interpretationModel="test-model"
          interpretError={null}
          prefersReducedMotion
          onReinterpret={vi.fn()}
          containerRef={createRef()}
          phase={4}
          t={minimalT}
        />,
      )
    })

    // ★ 핵심 검증: "전체 보기" 상태가 유지 → "접기" 버튼이 보임
    const collapseBtn = screen.queryAllByRole('button').find(btn => btn.textContent?.includes('접기'))
    expect(collapseBtn).toBeDefined()
  })
})
