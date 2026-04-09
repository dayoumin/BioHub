import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnifiedVariableSelector } from '@/components/analysis/variable-selector/UnifiedVariableSelector'

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
        }}
        onComplete={vi.fn()}
      />
    )

    expect(screen.getByTestId('method-fit-banner')).toHaveTextContent('Paired structure detected in this dataset.')
    expect(screen.getByTestId('method-fit-banner')).toHaveTextContent('Consider switching to a paired comparison test.')
    expect(screen.getByTestId('method-guidance-panel')).toBeInTheDocument()
    expect(screen.getByTestId('method-guidance-panel')).toHaveTextContent('Method Guide')
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
