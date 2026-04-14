import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnifiedVariableSelector, CANDIDATE_STATUS_LABELS } from '@/components/analysis/variable-selector/UnifiedVariableSelector'

function setupTwoSampleDataset() {
  mockAnalyzeDataset.mockReturnValue({
    columns: [
      makeColumn({ name: 'score', type: 'continuous', dataType: 'number', uniqueCount: 18, samples: [71, 74, 80, 77] }),
      makeColumn({ name: 'sex', type: 'categorical', dataType: 'string', uniqueCount: 2, samples: ['M', 'F', 'M', 'F'] }),
      makeColumn({ name: 'age', type: 'continuous', dataType: 'number', uniqueCount: 18, samples: [21, 22, 23, 24] }),
    ],
  })
}

function expectCandidateStatus(columnName: string, label: string) {
  expect(screen.getByTestId(`pool-var-${columnName}-status`)).toHaveTextContent(label)
}

const mockAnalyzeDataset = vi.fn()

vi.mock('@/lib/services', () => ({
  analyzeDataset: (...args: unknown[]) => mockAnalyzeDataset(...args),
}))

vi.mock('@/components/analysis/variable-selector/LiveDataSummary', () => ({
  LiveDataSummary: () => <div data-testid="live-data-summary" />,
}))

function makeColumn(params: {
  name: string
  type: 'continuous' | 'categorical'
  dataType: 'number' | 'string'
  uniqueCount: number
  samples: unknown[]
}) {
  return {
    name: params.name,
    type: params.type,
    dataType: params.dataType,
    uniqueCount: params.uniqueCount,
    missingCount: 0,
    totalCount: params.samples.length,
    samples: params.samples,
    idDetection: { isId: false },
  }
}

describe('UnifiedVariableSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows mismatch guidance before allowing execution', () => {
    const onFitAction = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'pre',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 12,
          samples: [1, 2, 3, 4],
        }),
        makeColumn({
          name: 'post',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 12,
          samples: [2, 3, 4, 5],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ pre: 1, post: 2 }]}
        selectorType="group-comparison"
        methodId="two-sample-t"
        methodName="Independent Samples t-Test"
        mismatchHint={{
          title: 'Possible method mismatch',
          message: 'Paired structure detected in this dataset.',
          actionLabel: 'Consider switching to a paired comparison test.',
          actionCtaLabel: 'Choose a different method',
        }}
        onFitAction={onFitAction}
        onComplete={vi.fn()}
      />
    )

    expect(screen.getByTestId('method-fit-banner')).toHaveTextContent('Paired structure detected in this dataset.')
    expect(screen.getByTestId('method-fit-banner')).toHaveTextContent('Consider switching to a paired comparison test.')
    expect(screen.getByTestId('method-fit-action')).toHaveTextContent('Choose a different method')
    fireEvent.click(screen.getByTestId('method-fit-action'))
    expect(onFitAction).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('method-guidance-panel')).toBeInTheDocument()
    expect(screen.getByTestId('method-guidance-panel')).toHaveTextContent('Method Guide')
    expect(screen.getByTestId('method-guidance-panel')).toHaveTextContent('Default settings')
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()
  })

  it('surfaces an error for an invalid candidate and completes once required slots are filled', () => {
    const onComplete = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'score',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [71, 74, 80, 77],
        }),
        makeColumn({
          name: 'sex',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['M', 'F', 'M', 'F'],
        }),
        makeColumn({
          name: 'age',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [21, 22, 23, 24],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ score: 71, sex: 'M', age: 21 }]}
        selectorType="group-comparison"
        methodId="two-sample-t"
        methodName="Independent Samples t-Test"
        onComplete={onComplete}
      />
    )

    const factorSlotButton = screen.getByTestId('slot-factor').querySelector('button')
    expect(factorSlotButton).not.toBeNull()
    fireEvent.click(factorSlotButton as HTMLButtonElement)

    fireEvent.click(screen.getByTestId('pool-var-age'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()

    fireEvent.click(screen.getByTestId('pool-var-sex'))
    expect(screen.getByTestId('chip-sex')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.getByTestId('chip-score')).toBeInTheDocument()

    const nextButton = screen.getByTestId('variable-selection-next')
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        dependentVar: 'score',
        groupVar: 'sex',
      })
    )
  })

  it('lets users unassign a variable by clicking it again in the pool', () => {
    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'score',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [71, 74, 80, 77],
        }),
        makeColumn({
          name: 'sex',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['M', 'F', 'M', 'F'],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ score: 71, sex: 'M' }]}
        selectorType="group-comparison"
        methodId="two-sample-t"
        onComplete={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.getByTestId('chip-score')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.queryByTestId('chip-score')).not.toBeInTheDocument()
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()
  })

  it('supports chi-square-goodness with a single categorical role in the unified selector', () => {
    const onComplete = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'bloodType',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 4,
          samples: ['A', 'B', 'O', 'AB'],
        }),
        makeColumn({
          name: 'score',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 20,
          samples: [71, 74, 80, 77],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ bloodType: 'A', score: 71 }]}
        selectorType="chi-square"
        methodId="chi-square-goodness"
        methodName="Chi-square Goodness of Fit"
        onComplete={onComplete}
      />
    )

    expect(screen.getByTestId('slot-dependent')).toBeInTheDocument()
    expect(screen.queryByTestId('slot-independent')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()

    fireEvent.click(screen.getByTestId('pool-var-bloodType'))
    expect(screen.getByTestId('chip-bloodType')).toBeInTheDocument()

    const nextButton = screen.getByTestId('variable-selection-next')
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        dependentVar: 'bloodType',
      })
    )
  })

  it('supports mcnemar with exactly two binary variables in the unified selector', () => {
    const onComplete = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'before',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['yes', 'no', 'yes', 'no'],
        }),
        makeColumn({
          name: 'after',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['yes', 'yes', 'no', 'no'],
        }),
        makeColumn({
          name: 'group',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 3,
          samples: ['A', 'B', 'C', 'A'],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ before: 'yes', after: 'no', group: 'A' }]}
        selectorType="chi-square"
        methodId="mcnemar"
        methodName="McNemar Test"
        onComplete={onComplete}
      />
    )

    expect(screen.getByTestId('slot-variables')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pool-var-group'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()

    fireEvent.click(screen.getByTestId('pool-var-before'))
    fireEvent.click(screen.getByTestId('pool-var-after'))

    expect(screen.getByTestId('chip-before')).toBeInTheDocument()
    expect(screen.getByTestId('chip-after')).toBeInTheDocument()

    const nextButton = screen.getByTestId('variable-selection-next')
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: ['before', 'after'],
      })
    )
  })

  it('supports proportion-test with a single binary variable in the unified selector', () => {
    const onComplete = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'outcome',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['Yes', 'No', 'Yes', 'No'],
        }),
        makeColumn({
          name: 'treatment',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 3,
          samples: ['A', 'B', 'C', 'A'],
        }),
        makeColumn({
          name: 'score',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [71, 74, 80, 77],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ outcome: 'Yes', treatment: 'A', score: 71 }]}
        selectorType="chi-square"
        methodId="proportion-test"
        methodName="One-sample Proportion Test"
        onComplete={onComplete}
      />
    )

    expect(screen.getByTestId('slot-dependent')).toBeInTheDocument()
    expect(screen.queryByTestId('slot-independent')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pool-var-treatment'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()

    fireEvent.click(screen.getByTestId('pool-var-outcome'))
    expect(screen.getByTestId('chip-outcome')).toBeInTheDocument()

    const nextButton = screen.getByTestId('variable-selection-next')
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        dependentVar: 'outcome',
      })
    )
  })
})

// Why: click-first UX가 성립하려면 pool의 상태 뱃지(추천/가능/불가/배정됨)가
// 활성 슬롯에 따라 정확히 재계산되어야 한다. 잘못 돌면 사용자가 맞는 변수를 고를 수 없다.
describe('UnifiedVariableSelector — role-based candidate filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderGroupComparison = () =>
    render(
      <UnifiedVariableSelector
        data={[{ score: 71, sex: 'M', age: 21 }]}
        selectorType="group-comparison"
        methodId="two-sample-t"
        onComplete={vi.fn()}
      />,
    )

  it('moves sex from 불가 (dependent focus) to 추천 (factor focus) as active slot changes', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    // 기본 focus는 dependent → 범주형 sex는 부적합("불가").
    expectCandidateStatus('sex', CANDIDATE_STATUS_LABELS.invalid)
    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.recommended)

    // factor 슬롯으로 focus 이동하면 sex가 2-level binary라 "추천"으로 전환.
    const factorButton = screen.getByTestId('slot-factor').querySelector('button')
    fireEvent.click(factorButton as HTMLButtonElement)

    expectCandidateStatus('sex', CANDIDATE_STATUS_LABELS.recommended)
    expectCandidateStatus('age', CANDIDATE_STATUS_LABELS.invalid)
  })

  it('shows 추천 on numeric columns by default when dependent slot is the first required focus', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.recommended)
    expectCandidateStatus('age', CANDIDATE_STATUS_LABELS.recommended)
    expectCandidateStatus('sex', CANDIDATE_STATUS_LABELS.invalid)
  })

  it('marks assigned variable as 배정됨 and re-clicking unassigns it (toggle UX)', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.getByTestId('chip-score')).toBeInTheDocument()
    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.assigned)

    // 배정된 상태에서 재클릭 → 언어사인 (disabled 아닌 toggle 동작).
    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.queryByTestId('chip-score')).not.toBeInTheDocument()
    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.recommended)
  })

  it('shows "추천 후보 2개" when two numeric columns qualify for the focused dependent slot', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    expect(screen.getByText(/추천 후보\s+2개/)).toBeInTheDocument()
  })

  it('blocks progression when user force-clicks a numeric into factor slot (role mismatch guard)', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    const factorButton = screen.getByTestId('slot-factor').querySelector('button')
    fireEvent.click(factorButton as HTMLButtonElement)
    fireEvent.click(screen.getByTestId('pool-var-age'))

    expect(screen.queryByTestId('chip-age')).not.toBeInTheDocument()
    expect(screen.getByTestId('variable-selection-next')).toBeDisabled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    // 상태 뱃지는 여전히 "불가" — 클릭으로 바뀌지 않았음을 재확인.
    expectCandidateStatus('age', CANDIDATE_STATUS_LABELS.invalid)
  })
})
