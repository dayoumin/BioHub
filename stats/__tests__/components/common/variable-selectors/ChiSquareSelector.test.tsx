/**
 * ChiSquareSelector 테스트
 *
 * 검증 항목:
 * 1. independence 모드: 행/열 2개 범주형 변수 선택
 * 2. goodness 모드: 단일 변수 선택
 * 3. initialSelection 반영 (before/after 상태)
 * 4. 동일 변수 중복 선택 불가
 * 5. onComplete 콜백 올바른 payload 반환
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ChiSquareSelector } from '@/components/common/variable-selectors/ChiSquareSelector'

// ─── Mock data ────────────────────────────────────────────────────────────────
// gender: 2 levels, treatment: 3 levels → categorical
// score: 25 unique values → continuous (will NOT appear in categorical list)
const mockData = Array.from({ length: 30 }, (_, i) => ({
  gender:    i % 2 === 0 ? 'M' : 'F',
  treatment: ['A', 'B', 'C'][i % 3],
  score:     i * 1.5 + 10,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findVarButton(container: HTMLElement, varName: string): HTMLElement | null {
  const spans = Array.from(container.querySelectorAll('span.font-medium'))
  const match = spans.find(s => s.textContent?.trim() === varName)
  return (match?.closest('button') ?? null) as HTMLElement | null
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChiSquareSelector', () => {

  describe('independence 모드 (default / chi-square / mcnemar)', () => {

    it('범주형 변수(gender, treatment)가 행/열 두 패널에 모두 표시된다', () => {
      const { container } = render(
        <ChiSquareSelector data={mockData} onComplete={vi.fn()} />
      )
      // 두 패널 각각에 gender, treatment 버튼이 있어야 함
      const genderBtns = container.querySelectorAll('button')
      const names = Array.from(genderBtns).map(b => b.textContent)
      expect(names.some(n => n?.includes('gender'))).toBe(true)
      expect(names.some(n => n?.includes('treatment'))).toBe(true)
      // 연속형 score는 표시 안 됨
      expect(names.some(n => n?.includes('score'))).toBe(false)
    })

    it('행 변수 선택 후 run-analysis-btn은 비활성 상태 (열 변수 미선택)', () => {
      const { container } = render(
        <ChiSquareSelector data={mockData} onComplete={vi.fn()} />
      )
      const runBtn = screen.getByTestId('run-analysis-btn')
      expect(runBtn).toBeDisabled()

      const genderBtn = findVarButton(container, 'gender')
      fireEvent.click(genderBtn!)
      // 행만 선택 → 여전히 비활성
      expect(runBtn).toBeDisabled()
    })

    it('행+열 선택 완료 후 run-analysis-btn 활성 → onComplete 호출', () => {
      const onComplete = vi.fn()
      const { container } = render(
        <ChiSquareSelector data={mockData} onComplete={onComplete} />
      )

      // 두 Card 패널 분리
      const cards = container.querySelectorAll('[data-slot="card"]')
      const rowPanel = cards[0]
      const colPanel = cards[1]

      // 행 패널에서 gender 선택
      const genderInRow = findVarButton(rowPanel as HTMLElement, 'gender')
      fireEvent.click(genderInRow!)

      // 열 패널에서 treatment 선택 (gender는 disabled)
      const treatInCol = findVarButton(colPanel as HTMLElement, 'treatment')
      fireEvent.click(treatInCol!)

      const runBtn = screen.getByTestId('run-analysis-btn')
      expect(runBtn).not.toBeDisabled()

      fireEvent.click(runBtn)
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          independentVar: 'gender',
          dependentVar: 'treatment'
        })
      )
    })

    it('행 변수로 선택된 변수는 열 패널에서 비활성화된다', () => {
      const { container } = render(
        <ChiSquareSelector data={mockData} onComplete={vi.fn()} />
      )
      // 행: gender 선택
      const allGenderBtns = Array.from(container.querySelectorAll('button')).filter(
        b => b.textContent?.includes('gender')
      )
      fireEvent.click(allGenderBtns[0])

      // 열 패널의 gender 버튼은 disabled여야 함
      const allBtnsAfter = Array.from(container.querySelectorAll('button')).filter(
        b => b.textContent?.includes('gender')
      ) as HTMLButtonElement[]
      const disabledGender = allBtnsAfter.filter(b => b.disabled)
      expect(disabledGender.length).toBeGreaterThan(0)
    })

    it('initialSelection으로 사전 선택이 반영된다', () => {
      const { container } = render(
        <ChiSquareSelector
          data={mockData}
          onComplete={vi.fn()}
          initialSelection={{ independentVar: 'gender', dependentVar: 'treatment' }}
        />
      )
      const runBtn = screen.getByTestId('run-analysis-btn')
      expect(runBtn).not.toBeDisabled()
    })

    it('mcnemar methodId 시 패널 레이블이 전/후로 표시된다', () => {
      render(
        <ChiSquareSelector
          data={mockData}
          onComplete={vi.fn()}
          methodId="mcnemar"
        />
      )
      expect(screen.getByText('전(Before) 변수')).toBeDefined()
      expect(screen.getByText('후(After) 변수')).toBeDefined()
    })
  })

  describe('goodness 모드 (chi-square-goodness / proportion-test)', () => {

    it('단일 패널만 표시된다 (행/열 없음)', () => {
      render(
        <ChiSquareSelector
          data={mockData}
          onComplete={vi.fn()}
          methodId="chi-square-goodness"
        />
      )
      expect(screen.getByText('검정 변수')).toBeDefined()
      expect(screen.queryByText('행 변수 (Row)')).toBeNull()
    })

    it('변수 선택 후 onComplete가 dependentVar만 반환한다', () => {
      const onComplete = vi.fn()
      const { container } = render(
        <ChiSquareSelector
          data={mockData}
          onComplete={onComplete}
          methodId="chi-square-goodness"
        />
      )

      const genderBtn = findVarButton(container, 'gender')
      fireEvent.click(genderBtn!)

      const runBtn = screen.getByTestId('run-analysis-btn')
      expect(runBtn).not.toBeDisabled()
      fireEvent.click(runBtn)

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ dependentVar: 'gender' })
      )
      // independentVar 없어야 함
      expect(onComplete.mock.calls[0][0]).not.toHaveProperty('independentVar')
    })

    it('proportion-test는 이진 변수만 표시하고 nullProportion 입력을 노출한다', () => {
      const { container } = render(
        <ChiSquareSelector
          data={mockData}
          onComplete={vi.fn()}
          methodId="proportion-test"
        />
      )

      // mockData에서 binary는 gender만 해당
      expect(findVarButton(container, 'gender')).not.toBeNull()
      expect(findVarButton(container, 'treatment')).toBeNull()
      expect(screen.getByLabelText('p₀ =')).toBeDefined()
    })

    it('proportion-test 제출 시 nullProportion이 함께 전달된다', () => {
      const onComplete = vi.fn()
      const { container } = render(
        <ChiSquareSelector
          data={mockData}
          onComplete={onComplete}
          methodId="proportion-test"
        />
      )

      const genderBtn = findVarButton(container, 'gender')
      fireEvent.click(genderBtn!)
      fireEvent.change(screen.getByLabelText('p₀ ='), { target: { value: '0.3' } })

      const runBtn = screen.getByTestId('run-analysis-btn')
      expect(runBtn).not.toBeDisabled()
      fireEvent.click(runBtn)

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          dependentVar: 'gender',
          nullProportion: '0.3'
        })
      )
    })
  })
})
