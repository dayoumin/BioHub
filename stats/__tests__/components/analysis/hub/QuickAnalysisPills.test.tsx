import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    hub: {
      quickAnalysis: {
        title: '빠른 분석',
        editTooltip: '빠른 분석 편집',
        editButton: '편집',
      },
      quickMethodNames: {
        'two-sample-t': '두 집단 차이 비교',
        'one-way-anova': '세 집단 이상 비교',
        'pearson-correlation': '변수 간 관계',
        'simple-regression': '예측 모델 생성',
        'chi-square-independence': '범주형 연관성 검정',
      },
      editDialog: {
        title: '빠른 분석 편집',
        selectedCount: (count: number) => `${count}개 선택`,
        cancel: '취소',
        save: '저장',
      },
      categoryLabels: {},
    },
  }),
}))

vi.mock('@/lib/utils/quick-methods-storage', () => ({
  loadQuickMethods: (_key: string, fallback: string[]) => fallback,
  saveQuickMethods: vi.fn(),
}))

import { QuickAnalysisPills } from '@/components/analysis/hub/QuickAnalysisPills'

describe('QuickAnalysisPills', () => {
  it('exposes a group label for assistive tech', () => {
    render(<QuickAnalysisPills onQuickAnalysis={vi.fn()} />)

    expect(screen.getByRole('group', { name: '빠른 분석' })).toBeInTheDocument()
  })

  it('uses 44px touch targets for quick pills and settings', () => {
    const { container } = render(<QuickAnalysisPills onQuickAnalysis={vi.fn()} />)

    const quickPills = container.querySelectorAll('[data-testid^="quick-pill-"]')
    expect(quickPills.length).toBeGreaterThan(0)
    quickPills.forEach((pill) => {
      expect(pill.className).toContain('h-11')
    })
    expect(screen.getByTestId('quick-analysis-settings').className).toContain('h-11')
  })

  it('shows a leading lightning marker before the configured methods', () => {
    const { container } = render(<QuickAnalysisPills onQuickAnalysis={vi.fn()} />)

    const group = screen.getByRole('group', { name: '빠른 분석' })
    const firstChild = group.firstElementChild as HTMLElement | null
    expect(firstChild?.querySelector('.lucide-zap')).not.toBeNull()
    expect(firstChild?.nextElementSibling).toHaveAttribute('data-testid', 'quick-pill-two-sample-t')
    expect(container.querySelector('.lucide-zap')).not.toBeNull()
  })
})
