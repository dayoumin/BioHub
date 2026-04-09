import { render, screen, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MethodBrowserStep } from '@/components/analysis/steps/MethodBrowserStep'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import type { StatisticalMethod } from '@/types/analysis'

const BROWSED_METHOD = {
  id: 't-test',
  name: '독립표본 t-검정',
  category: 't-test',
  description: '두 그룹 평균 비교',
} as StatisticalMethod

vi.mock('@/lib/statistics/method-catalog', () => ({
  getAllMethodsGrouped: vi.fn(() => []),
}))

vi.mock('@/hooks/use-method-compatibility', () => ({
  getNormalitySummary: vi.fn(() => null),
}))

vi.mock('@/lib/constants/statistical-methods', () => ({
  getKoreanName: vi.fn((id: string) => (id === 't-test' ? '독립표본 t-검정' : null)),
}))

vi.mock('@/components/analysis/steps/purpose/MethodBrowser', () => ({
  MethodBrowser: ({ onMethodSelect }: { onMethodSelect: (method: StatisticalMethod) => void }) => (
    <button type="button" onClick={() => onMethodSelect(BROWSED_METHOD)}>
      브라우저에서 메서드 선택
    </button>
  ),
}))

beforeEach(() => {
  act(() => {
    useAnalysisStore.getState().reset()
  })
  vi.clearAllMocks()
})

describe('MethodBrowserStep scenarios', () => {
  it('lets the user return to AI recommendation from Step 2', () => {
    const onAskAiRecommendation = vi.fn()

    render(
      <MethodBrowserStep
        onMethodConfirm={vi.fn()}
        onBack={vi.fn()}
        onAskAiRecommendation={onAskAiRecommendation}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'AI 추천 받기' }))

    expect(onAskAiRecommendation).toHaveBeenCalledTimes(1)
  })

  it('confirms the browsed method after the user selects it in Step 2', () => {
    const onMethodConfirm = vi.fn()

    render(
      <MethodBrowserStep
        onMethodConfirm={onMethodConfirm}
        onBack={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '브라우저에서 메서드 선택' }))
    fireEvent.click(screen.getByRole('button', { name: /이 방법으로 진행/ }))

    expect(onMethodConfirm).toHaveBeenCalledWith(BROWSED_METHOD)
  })
})
