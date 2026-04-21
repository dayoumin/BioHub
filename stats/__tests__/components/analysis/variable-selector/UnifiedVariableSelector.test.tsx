import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnifiedVariableSelector, CANDIDATE_STATUS_LABELS } from '@/components/analysis/variable-selector/UnifiedVariableSelector'

const mockTerminology = {
  domain: 'generic',
  language: 'en',
  variables: {
    group: { title: 'Group Variable', description: 'Categorical grouping variable' },
    dependent: { title: 'Dependent Variable (Y)', description: 'Numeric outcome variable' },
    independent: { title: 'Independent Variable (X)', description: 'Predictor variable' },
    factor: { title: 'Factor', description: 'Categorical factor variable' },
    covariate: { title: 'Covariate', description: 'Continuous control variable' },
    time: { title: 'Time Variable', description: 'Time or sequence variable' },
    event: { title: 'Event Variable', description: 'Binary event variable' },
    pairedFirst: { title: 'Time 1 / Before', description: 'First measurement' },
    pairedSecond: { title: 'Time 2 / After', description: 'Second measurement' },
    correlation: { title: 'Numeric Variables', description: 'Select numeric variables to analyze' },
  },
  selectorUI: {
    methodGuidance: {
      title: 'Method Guide',
      dataFormat: 'Data format',
      minSample: 'Min sample',
      variableRoles: 'Variable roles',
      requiredRoles: 'Required roles',
      assumptions: 'Assumptions',
      notes: 'Notes',
      expectedColumns: 'Expected columns',
      defaultSettings: 'Default settings',
      required: 'Required',
      optional: 'Optional',
      noneRequiredRoles: 'This method can run without explicit variable role assignment.',
      noAssumptions: 'No major assumptions are registered for this method.',
      noExampleSchema: 'No example schema is attached to this method yet.',
      noDefaultSettings: 'No default execution settings are registered for this method.',
      translationPending: 'Localized guidance is not available for this section yet.',
      defaultValue: 'Default',
      typeFormatSuffix: 'format',
      singleVariableCount: '1 variable',
      multipleVariableCount: (min: number, max?: number) =>
        max ? `${min}-${max} variables` : `${min}+ variables`,
      yes: 'Yes',
      no: 'No',
      variableTypeLabels: {
        continuous: 'Continuous',
        categorical: 'Categorical',
        binary: 'Binary',
        ordinal: 'Ordinal',
        date: 'Date/Time',
        count: 'Count',
      },
      formatTypeLabels: {
        wide: 'Wide',
        long: 'Long',
        both: 'Wide/Long',
      },
    },
  },
}

function setupTwoSampleDataset() {
  mockAnalyzeDataset.mockReturnValue({
    columns: [
      makeColumn({ name: 'score', type: 'continuous', dataType: 'number', uniqueCount: 18, samples: [71, 74, 80, 77] }),
      makeColumn({ name: 'sex', type: 'categorical', dataType: 'string', uniqueCount: 2, samples: ['M', 'F', 'M', 'F'] }),
      makeColumn({ name: 'age', type: 'continuous', dataType: 'number', uniqueCount: 18, samples: [21, 22, 23, 24] }),
    ],
  })
}

function makeDateColumn(params: {
  name: string
  uniqueCount: number
  samples: unknown[]
}) {
  return {
    name: params.name,
    type: 'date',
    dataType: 'date',
    uniqueCount: params.uniqueCount,
    missingCount: 0,
    totalCount: params.samples.length,
    samples: params.samples,
    idDetection: { isId: false },
  }
}

function expectCandidateStatus(columnName: string, label: string) {
  expect(screen.getByTestId(`pool-var-${columnName}-status`)).toHaveTextContent(label)
}

const mockAnalyzeDataset = vi.fn()

vi.mock('@/lib/services', () => ({
  analyzeDataset: (...args: unknown[]) => mockAnalyzeDataset(...args),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => mockTerminology,
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

  it('localizes slot chrome and validation copy for the generic domain', () => {
    setupTwoSampleDataset()

    render(
      <UnifiedVariableSelector
        data={[{ score: 71, sex: 'M', age: 21 }]}
        selectorType="group-comparison"
        methodId="two-sample-t"
        methodName="Independent Samples t-Test"
        onComplete={vi.fn()}
      />
    )

    expect(screen.getByText('Fill the role slots first')).toBeInTheDocument()
    expect(screen.getAllByText('Factor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dependent Variable (Y)').length).toBeGreaterThan(0)
    expect(screen.getByText('Required slots 0/2')).toBeInTheDocument()
    expect(screen.getByText('Selected variables 0')).toBeInTheDocument()
    expect(screen.getByText('Available variables')).toBeInTheDocument()
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

  it('filters detected ID columns out of the pool and keeps date columns for time-series slots', () => {
    mockAnalyzeDataset.mockReturnValue({
      columns: [
        {
          ...makeColumn({
            name: 'recordId',
            type: 'categorical',
            dataType: 'string',
            uniqueCount: 8,
            samples: ['1', '2', '3', '4'],
          }),
          idDetection: { isId: true },
        },
        makeDateColumn({
          name: 'observedAt',
          uniqueCount: 8,
          samples: ['2026-01-01', '2026-01-02', '2026-01-03'],
        }),
        makeColumn({
          name: 'temperature',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 8,
          samples: [18.1, 18.4, 18.8, 19.0],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ recordId: '1', observedAt: '2026-01-01', temperature: 18.1 }]}
        selectorType="time-series"
        methodId="arima"
        methodName="ARIMA"
        onComplete={vi.fn()}
      />
    )

    expect(screen.queryByTestId('pool-var-recordId')).toBeNull()
    expect(screen.getByTestId('pool-var-observedAt')).toBeInTheDocument()
    expect(screen.getByTestId('pool-var-temperature')).toBeInTheDocument()

    const timeButton = screen.getByTestId('slot-time').querySelector('button')
    expect(timeButton).not.toBeNull()
    fireEvent.click(timeButton as HTMLButtonElement)
    fireEvent.click(screen.getByTestId('pool-var-observedAt'))
    expect(screen.getByTestId('chip-observedAt')).toBeInTheDocument()
  })

  it('allows repeated-measures completion without filling the optional group slot', () => {
    const onComplete = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'pre',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [71, 74, 80, 77],
        }),
        makeColumn({
          name: 'post',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [73, 76, 81, 79],
        }),
        makeColumn({
          name: 'group',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['A', 'B', 'A', 'B'],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ pre: 71, post: 73, group: 'A' }]}
        selectorType="repeated-measures"
        methodId="repeated-measures-anova"
        methodName="Repeated Measures ANOVA"
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByTestId('pool-var-pre'))
    fireEvent.click(screen.getByTestId('pool-var-post'))

    const nextButton = screen.getByTestId('variable-selection-next')
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: ['pre', 'post'],
      }),
    )
    expect(onComplete).not.toHaveBeenCalledWith(
      expect.objectContaining({
        groupVar: expect.anything(),
      }),
    )
  })

  it('emits the optional repeated-measures group slot when the user assigns it', () => {
    const onComplete = vi.fn()

    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'pre',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [71, 74, 80, 77],
        }),
        makeColumn({
          name: 'post',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 18,
          samples: [73, 76, 81, 79],
        }),
        makeColumn({
          name: 'group',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 2,
          samples: ['A', 'B', 'A', 'B'],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ pre: 71, post: 73, group: 'A' }]}
        selectorType="repeated-measures"
        methodId="repeated-measures-anova"
        methodName="Repeated Measures ANOVA"
        onComplete={onComplete}
      />
    )

    fireEvent.click(screen.getByTestId('pool-var-pre'))
    fireEvent.click(screen.getByTestId('pool-var-post'))

    const groupButton = screen.getByTestId('slot-group').querySelector('button')
    expect(groupButton).not.toBeNull()
    fireEvent.click(groupButton as HTMLButtonElement)
    fireEvent.click(screen.getByTestId('pool-var-group'))

    fireEvent.click(screen.getByTestId('variable-selection-next'))
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: ['pre', 'post'],
        groupVar: 'group',
      }),
    )
  })

  it('keeps high-cardinality categorical factors selectable for one-way-anova', () => {
    mockAnalyzeDataset.mockReturnValue({
      columns: [
        makeColumn({
          name: 'score',
          type: 'continuous',
          dataType: 'number',
          uniqueCount: 60,
          samples: [71, 74, 80, 77],
        }),
        makeColumn({
          name: 'treatment',
          type: 'categorical',
          dataType: 'string',
          uniqueCount: 50,
          samples: ['G1', 'G2', 'G3', 'G4'],
        }),
      ],
    })

    render(
      <UnifiedVariableSelector
        data={[{ score: 71, treatment: 'G1' }]}
        selectorType="group-comparison"
        methodId="one-way-anova"
        methodName="One-Way ANOVA"
        onComplete={vi.fn()}
      />
    )

    const factorButton = screen.getByTestId('slot-factor').querySelector('button')
    expect(factorButton).not.toBeNull()
    fireEvent.click(factorButton as HTMLButtonElement)

    expectCandidateStatus('treatment', CANDIDATE_STATUS_LABELS.generic.recommended)
    fireEvent.click(screen.getByTestId('pool-var-treatment'))
    expect(screen.getByTestId('chip-treatment')).toBeInTheDocument()
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
    expectCandidateStatus('sex', CANDIDATE_STATUS_LABELS.generic.invalid)
    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.generic.recommended)

    // factor 슬롯으로 focus 이동하면 sex가 2-level binary라 "추천"으로 전환.
    const factorButton = screen.getByTestId('slot-factor').querySelector('button')
    fireEvent.click(factorButton as HTMLButtonElement)

    expectCandidateStatus('sex', CANDIDATE_STATUS_LABELS.generic.recommended)
    expectCandidateStatus('age', CANDIDATE_STATUS_LABELS.generic.invalid)
  })

  it('shows 추천 on numeric columns by default when dependent slot is the first required focus', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.generic.recommended)
    expectCandidateStatus('age', CANDIDATE_STATUS_LABELS.generic.recommended)
    expectCandidateStatus('sex', CANDIDATE_STATUS_LABELS.generic.invalid)
  })

  it('marks assigned variable as 배정됨 and re-clicking unassigns it (toggle UX)', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.getByTestId('chip-score')).toBeInTheDocument()
    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.generic.assigned)

    // 배정된 상태에서 재클릭 → 언어사인 (disabled 아닌 toggle 동작).
    fireEvent.click(screen.getByTestId('pool-var-score'))
    expect(screen.queryByTestId('chip-score')).not.toBeInTheDocument()
    expectCandidateStatus('score', CANDIDATE_STATUS_LABELS.generic.recommended)
  })

  it('shows "추천 후보 2개" when two numeric columns qualify for the focused dependent slot', () => {
    setupTwoSampleDataset()
    renderGroupComparison()

    expect(screen.getByText(/Recommended candidates\s+2/)).toBeInTheDocument()
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
    expectCandidateStatus('age', CANDIDATE_STATUS_LABELS.generic.invalid)
  })
})
