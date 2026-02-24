/**
 * Variable Selector 색상 토큰 일관성 테스트
 *
 * 검증 항목:
 * 1. 각 CardHeader에 역할별 배경 토큰이 적용되어 있는지
 * 2. 변수 선택/해제 시 버튼 상태 토큰이 올바르게 변하는지
 * 3. 모든 변수 선택 완료 시 success Alert 토큰이 적용되는지
 *
 * 역할-색상 스키마:
 *   종속변수(Dependent)      → info   (파랑)
 *   집단/Factor1             → success (초록)
 *   독립/Factor2/대응쌍2nd   → highlight (보라)
 *   완료 Alert               → success
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { GroupComparisonSelector } from '@/components/common/variable-selectors/GroupComparisonSelector'
import { TwoWayAnovaSelector } from '@/components/common/variable-selectors/TwoWayAnovaSelector'
import { MultipleRegressionSelector } from '@/components/common/variable-selectors/MultipleRegressionSelector'
import { PairedSelector } from '@/components/common/variable-selectors/PairedSelector'
import { OneSampleSelector } from '@/components/common/variable-selectors/OneSampleSelector'
import { CorrelationSelector } from '@/components/common/variable-selectors/CorrelationSelector'

// ─── Mock: useTerminology ───────────────────────────────────────────────────

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    selectorUI: {
      titles: {
        groupComparison: 'Group Comparison',
        twoWayAnova: 'Two-Way ANOVA',
        multipleRegression: 'Multiple Regression',
        paired: 'Paired Test',
        oneSample: 'One-Sample Test',
        correlation: 'Correlation',
      },
      descriptions: {
        groupComparison: '',
        twoWayAnova: '',
        multipleRegression: '',
        paired: '',
        oneSample: '',
        correlation: '',
      },
      labels: { groups: 'groups' },
    },
    variables: {
      dependent:    { title: 'Dependent Variable', description: 'Outcome measure' },
      independent:  { title: 'Independent Variables', description: 'Predictors' },
      group:        { title: 'Group Variable', description: 'Grouping factor' },
      pairedFirst:  { title: 'First Measurement' },
      pairedSecond: { title: 'Second Measurement' },
    },
    validation: {
      factorRequired:              'Factor required',
      differentVariablesRequired:  'Different variables required',
      dependentRequired:           'Dependent variable required',
      groupRequired:               'Group variable required',
      independentRequired:         'Independent variable required',
      twoGroupsRequired:           (n: number) => `Needs 2 groups (got ${n})`,
      maxVariablesExceeded:        (n: number) => `Max ${n} variables`,
      minVariablesRequired:        (n: number) => `Min ${n} variables required`,
    },
    success: { allVariablesSelected: 'All variables selected' },
  }),
}))

// ─── Mock data: categorical (group, treatment) + continuous (score, value) ──
// score/value: 25 unique values (> 20 threshold in GroupComparisonSelector) → continuous only
// group: 2 unique, treatment: 3 unique → categorical only
const groups   = ['A', 'B'] as const
const treats   = ['X', 'Y', 'Z'] as const
const mockData = Array.from({ length: 25 }, (_, i) => ({
  group:     groups[i % 2],
  treatment: treats[i % 3],
  score:     10 + i * 1.5,   // 25 unique: 10, 11.5, 13 … 46
  value:     1  + i * 0.5,   // 25 unique: 1, 1.5, 2 … 13
}))

// ─── Helper: 컬럼 이름으로 버튼 찾기 ─────────────────────────────────────────

function findVarButton(container: HTMLElement, varName: string): HTMLElement | null {
  const spans = Array.from(container.querySelectorAll('span.font-medium, span.font-medium.block'))
  const match = spans.find(s => s.textContent?.trim() === varName)
  return (match?.closest('button') ?? null) as HTMLElement | null
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Variable Selector 색상 토큰 일관성', () => {

  // =========================================================================
  describe('GroupComparisonSelector — 집단=success, 종속=info', () => {

    it('집단 CardHeader에 bg-success-bg, 종속 CardHeader에 bg-info-bg가 적용된다', () => {
      const { container } = render(
        <GroupComparisonSelector data={mockData} onComplete={vi.fn()} />
      )

      // Group Variable title 상위 CardHeader
      const groupHeader = screen.getByText('Group Variable').closest('.pb-3')
      expect(groupHeader).toHaveClass('bg-success-bg')
      expect(groupHeader).not.toHaveClass('bg-info-bg')

      // Dependent Variable title 상위 CardHeader
      const depHeader = screen.getByText('Dependent Variable').closest('.pb-3')
      expect(depHeader).toHaveClass('bg-info-bg')
      expect(depHeader).not.toHaveClass('bg-success-bg')
    })

    it('집단 변수 선택 전: border-success-border 없음', () => {
      const { container } = render(
        <GroupComparisonSelector data={mockData} onComplete={vi.fn()} />
      )
      const btn = findVarButton(container, 'group')
      expect(btn).not.toBeNull()
      expect(btn).not.toHaveClass('border-success-border')
    })

    it('집단 변수 선택 후: border-success-border bg-success-bg 적용', () => {
      const { container } = render(
        <GroupComparisonSelector data={mockData} onComplete={vi.fn()} />
      )
      const btn = findVarButton(container, 'group')!
      fireEvent.click(btn)
      expect(btn).toHaveClass('border-success-border')
      expect(btn).toHaveClass('bg-success-bg')
    })

    it('종속 변수 선택 후: border-info-border bg-info-bg 적용', () => {
      const { container } = render(
        <GroupComparisonSelector data={mockData} onComplete={vi.fn()} />
      )
      const btn = findVarButton(container, 'score')!
      fireEvent.click(btn)
      expect(btn).toHaveClass('border-info-border')
      expect(btn).toHaveClass('bg-info-bg')
    })

    it('완료 전: success Alert 없음 / 완료 후: bg-success-bg border-success-border Alert 표시', () => {
      const { container } = render(
        <GroupComparisonSelector data={mockData} onComplete={vi.fn()} />
      )

      // 완료 전
      expect(screen.queryByText('All variables selected')).not.toBeInTheDocument()

      // 집단 + 종속 선택
      fireEvent.click(findVarButton(container, 'group')!)
      fireEvent.click(findVarButton(container, 'score')!)

      // 완료 후
      const alert = screen.getByText('All variables selected').closest('[role="alert"]')
      expect(alert).toHaveClass('bg-success-bg')
      expect(alert).toHaveClass('border-success-border')
    })
  })

  // =========================================================================
  describe('TwoWayAnovaSelector — Factor1=success, Factor2=highlight, 종속=info', () => {

    it('Factor1 CardHeader=bg-success-bg, Factor2 CardHeader=bg-highlight-bg, 종속 CardHeader=bg-info-bg', () => {
      render(<TwoWayAnovaSelector data={mockData} onComplete={vi.fn()} />)

      const f1Header = screen.getByText('Factor 1').closest('.pb-3')
      expect(f1Header).toHaveClass('bg-success-bg')
      expect(f1Header).not.toHaveClass('bg-info-bg')

      const f2Header = screen.getByText('Factor 2').closest('.pb-3')
      expect(f2Header).toHaveClass('bg-highlight-bg')
      expect(f2Header).not.toHaveClass('bg-success-bg')

      const depHeader = screen.getByText('Dependent Variable').closest('.pb-3')
      expect(depHeader).toHaveClass('bg-info-bg')
    })

    it('Factor1 선택: border-success-border / Factor2 선택: border-highlight-border', () => {
      render(<TwoWayAnovaSelector data={mockData} onComplete={vi.fn()} />)

      // Factor1 카드와 Factor2 카드에 같은 컬럼 목록이 렌더링되므로
      // 각 카드의 첫 번째 버튼으로 테스트
      const f1Card = screen.getByText('Factor 1').closest('.pb-3')?.closest('[class*="rounded"]') as HTMLElement
      const f2Card = screen.getByText('Factor 2').closest('.pb-3')?.closest('[class*="rounded"]') as HTMLElement

      const f1Btn = f1Card?.querySelector('button') as HTMLElement
      fireEvent.click(f1Btn)
      expect(f1Btn).toHaveClass('border-success-border')
      expect(f1Btn).toHaveClass('bg-success-bg')

      // Factor1에서 선택된 변수는 Factor2에서 비활성화 → 활성화된 첫 번째 버튼 선택
      const f2Btn = f2Card?.querySelector('button:not([disabled])') as HTMLElement
      fireEvent.click(f2Btn)
      expect(f2Btn).toHaveClass('border-highlight-border')
      expect(f2Btn).toHaveClass('bg-highlight-bg')
    })
  })

  // =========================================================================
  describe('MultipleRegressionSelector — 종속=info, 독립=success', () => {

    it('종속 CardHeader=bg-info-bg, 독립 CardHeader=bg-success-bg', () => {
      render(<MultipleRegressionSelector data={mockData} onComplete={vi.fn()} />)

      const depHeader = screen.getByText('Dependent Variable').closest('.pb-3')
      expect(depHeader).toHaveClass('bg-info-bg')

      const indHeader = screen.getByText('Independent Variables').closest('.pb-3')
      expect(indHeader).toHaveClass('bg-success-bg')
    })

    it('종속 선택: border-info-border / 독립 선택: border-success-border', () => {
      render(<MultipleRegressionSelector data={mockData} onComplete={vi.fn()} />)

      // 각 섹션 카드로 스코프를 제한해 버튼 탐색
      const depCard = screen.getByText('Dependent Variable').closest('.pb-3')?.closest('[class*="rounded"]') as HTMLElement
      const indCard = screen.getByText('Independent Variables').closest('.pb-3')?.closest('[class*="rounded"]') as HTMLElement

      const depBtn = findVarButton(depCard, 'score')!
      fireEvent.click(depBtn)
      expect(depBtn).toHaveClass('border-info-border')
      expect(depBtn).toHaveClass('bg-info-bg')

      // 독립변수 섹션에서 value 선택 (score는 종속에서 이미 선택)
      const indBtn = findVarButton(indCard, 'value')!
      fireEvent.click(indBtn)
      expect(indBtn).toHaveClass('border-success-border')
      expect(indBtn).toHaveClass('bg-success-bg')
    })
  })

  // =========================================================================
  describe('PairedSelector — Var1=info, Var2=highlight', () => {

    it('첫 번째 측정 CardHeader=bg-info-bg, 두 번째 측정 CardHeader=bg-highlight-bg', () => {
      render(<PairedSelector data={mockData} onComplete={vi.fn()} />)

      const v1Header = screen.getByText('First Measurement').closest('.pb-3')
      expect(v1Header).toHaveClass('bg-info-bg')

      const v2Header = screen.getByText('Second Measurement').closest('.pb-3')
      expect(v2Header).toHaveClass('bg-highlight-bg')
    })

    it('Var1 선택: border-info-border / Var2 선택: border-highlight-border', () => {
      render(<PairedSelector data={mockData} onComplete={vi.fn()} />)

      const v1Card = screen.getByText('First Measurement').closest('.pb-3')?.closest('[class*="rounded"]') as HTMLElement
      const v2Card = screen.getByText('Second Measurement').closest('.pb-3')?.closest('[class*="rounded"]') as HTMLElement

      // v1: 첫 번째 버튼 클릭 (score)
      const v1Btn = v1Card?.querySelector('button') as HTMLElement
      fireEvent.click(v1Btn)
      expect(v1Btn).toHaveClass('border-info-border')

      // v2: v1에서 선택된 변수는 비활성화됨 → 활성화된 첫 번째 버튼 선택
      const v2Btn = v2Card?.querySelector('button:not([disabled])') as HTMLElement
      fireEvent.click(v2Btn)
      expect(v2Btn).toHaveClass('border-highlight-border')
    })
  })

  // =========================================================================
  describe('OneSampleSelector — 아이콘=text-info, 선택 배지=bg-info', () => {

    it('BarChart3 아이콘에 text-info 클래스가 적용된다', () => {
      const { container } = render(
        <OneSampleSelector data={mockData} onComplete={vi.fn()} />
      )
      // lucide 아이콘은 svg 또는 부모 span에 text-info가 전달됨
      const icon = container.querySelector('.text-info')
      expect(icon).not.toBeNull()
    })

    it('변수 선택 전: bg-info 없음 / 선택 후: bg-info 적용', () => {
      const { container } = render(
        <OneSampleSelector data={mockData} onComplete={vi.fn()} />
      )
      expect(container.querySelector('.bg-info')).toBeNull()

      // Badge 클릭 (numeric columns 중 하나)
      const badges = container.querySelectorAll('[class*="cursor-pointer"]')
      const numericBadge = Array.from(badges).find(b =>
        b.textContent?.includes('score')
      ) as HTMLElement
      expect(numericBadge).not.toBeUndefined()

      fireEvent.click(numericBadge)
      expect(container.querySelector('.bg-info')).not.toBeNull()
    })
  })

  // =========================================================================
  describe('CorrelationSelector — 완료 Alert=success 토큰', () => {

    it('변수 2개 선택 완료 시 Alert에 bg-success-bg border-success-border 적용', () => {
      const { container } = render(
        <CorrelationSelector data={mockData} onComplete={vi.fn()} minVariables={2} />
      )

      // 완료 전
      expect(screen.queryByText('All variables selected')).not.toBeInTheDocument()

      // score, value 선택
      const scoreBtn = findVarButton(container, 'score')!
      const valueBtn = findVarButton(container, 'value')!
      fireEvent.click(scoreBtn)
      fireEvent.click(valueBtn)

      // 완료 후
      const alert = screen.getByText('All variables selected').closest('[role="alert"]')
      expect(alert).toHaveClass('bg-success-bg')
      expect(alert).toHaveClass('border-success-border')
    })

    it('변수 1개만 선택: success Alert 없음 (미완료 상태)', () => {
      const { container } = render(
        <CorrelationSelector data={mockData} onComplete={vi.fn()} minVariables={2} />
      )
      fireEvent.click(findVarButton(container, 'score')!)
      expect(screen.queryByText('All variables selected')).not.toBeInTheDocument()
    })
  })

})
