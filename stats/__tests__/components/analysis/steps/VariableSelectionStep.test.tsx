import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VariableSelectionStep } from '@/components/analysis/steps/VariableSelectionStep'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'

let capturedSelectorType: string | null = null
let capturedAnalysisOptionsProps: Record<string, unknown> | null = null

vi.mock('@/components/common/variable-selectors', () => ({
  AutoConfirmSelector: ({ onComplete }: { onComplete: (mapping: unknown) => void }) => (
    <div data-testid="auto-confirm-selector">
      <button data-testid="run-analysis-btn" onClick={() => onComplete({})}>
        Analyze
      </button>
    </div>
  ),
}))

vi.mock('@/components/analysis/variable-selector/UnifiedVariableSelector', () => ({
  UnifiedVariableSelector: ({
    selectorType,
    onComplete,
  }: {
    selectorType: string
    onComplete: (mapping: unknown) => void
  }) => {
    capturedSelectorType = selectorType
    return (
      <div data-testid="unified-variable-selector" data-selector-type={selectorType}>
        <button onClick={() => onComplete({ dependentVar: 'd', groupVar: 'g' })}>Complete</button>
      </div>
    )
  },
}))

vi.mock('@/components/analysis/common', () => ({
  StepHeader: ({ title }: { title: string }) => <div data-testid="step-header">{title}</div>,
  CollapsibleSection: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div data-testid="collapsible-section" data-label={label}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/analysis/variable-selector/AnalysisOptions', () => ({
  AnalysisOptionsSection: (props: Record<string, unknown>) => {
    capturedAnalysisOptionsProps = props
    return <div data-testid="analysis-options-section" />
  },
}))

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/lib/statistics/variable-mapping', () => ({
  validateVariableMapping: vi.fn(() => ({ isValid: true, errors: [] })),
}))

const mockSetVariableMapping = vi.fn()
const mockUpdateVariableMappingWithInvalidation = vi.fn()
const mockGoToNextStep = vi.fn()
const mockGoToPreviousStep = vi.fn()

const defaultStoreState = {
  uploadedData: [{ x: 1 }] as unknown[],
  selectedMethod: null as { id: string; name: string } | null,
  detectedVariables: null as Record<string, unknown> | null,
  variableMapping: null as Record<string, unknown> | null,
  validationResults: null as unknown,
  analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true, nullProportion: 0.5 },
  setVariableMapping: mockSetVariableMapping,
  updateVariableMappingWithInvalidation: mockUpdateVariableMappingWithInvalidation,
  goToNextStep: mockGoToNextStep,
  goToPreviousStep: mockGoToPreviousStep,
}

let storeState = { ...defaultStoreState }

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: () => storeState,
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    analysis: {
      stepTitles: { variableSelection: '변수 선택' },
      layout: { prevStep: '이전 단계' },
      emptyStates: {
        dataRequired: '데이터 필요',
        dataRequiredDescription: '데이터를 업로드해 주세요',
      },
      aiVariables: {
        title: 'AI 감지 변수',
        roles: { dependent: 'Y:', group: 'G:', factors: 'F:', independent: 'X:', covariate: 'C:' },
      },
    },
    selectorUI: {
      labels: {
        analysisOptions: '분석 옵션',
      },
    },
  }),
}))

function renderWithMethod(
  methodId: string,
  methodName = methodId,
  detectedVariables: Record<string, unknown> | null = null
) {
  storeState = {
    ...defaultStoreState,
    selectedMethod: { id: methodId, name: methodName },
    detectedVariables,
  }

  return render(<VariableSelectionStep />)
}

beforeEach(() => {
  storeState = { ...defaultStoreState }
  capturedSelectorType = null
  capturedAnalysisOptionsProps = null
  vi.clearAllMocks()
})

describe('VariableSelectionStep', () => {
  describe('selector routing', () => {
    const autoMethodIds = ['power-analysis']

    const unifiedMethodIds = [
      't-test',
      'welch-t',
      'one-sample-t',
      'paired-t',
      'anova',
      'welch-anova',
      'ancova',
      'mann-whitney',
      'wilcoxon',
      'kruskal-wallis',
      'sign-test',
      'cochran-q',
      'binomial-test',
      'runs-test',
      'ks-test',
      'mood-median',
      'non-parametric',
      'correlation',
      'partial-correlation',
      'regression',
      'logistic-regression',
      'poisson',
      'ordinal-regression',
      'stepwise',
      'dose-response',
      'response-surface',
      'descriptive',
      'normality-test',
      'explore-data',
      'means-plot',
      'mann-kendall',
      'pca',
      'factor-analysis',
      'cluster',
      'reliability',
      'chi-square',
      'chi-square-goodness',
      'chi-square-independence',
      'mcnemar',
      'proportion-test',
      'repeated-measures-anova',
      'manova',
      'mixed-model',
      'arima',
      'seasonal-decompose',
      'stationarity-test',
      'kaplan-meier',
      'cox-regression',
      'roc-curve',
      'discriminant',
      'friedman',
    ]

    it('routes auto methods to AutoConfirmSelector', () => {
      for (const id of autoMethodIds) {
        storeState = {
          ...defaultStoreState,
          selectedMethod: { id, name: id },
        }

        const { unmount } = render(<VariableSelectionStep />)
        expect(screen.getByTestId('auto-confirm-selector')).toBeDefined()
        expect(screen.queryByTestId('unified-variable-selector')).toBeNull()
        unmount()
      }
    })

    it('routes all other methods to UnifiedVariableSelector', () => {
      for (const id of unifiedMethodIds) {
        storeState = {
          ...defaultStoreState,
          selectedMethod: { id, name: id },
        }

        const { unmount } = render(<VariableSelectionStep />)
        expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
        expect(screen.queryByTestId('auto-confirm-selector')).toBeNull()
        unmount()
      }
    })
  })

  describe('selectorType mapping', () => {
    it('maps t-test to group-comparison', () => {
      renderWithMethod('t-test')
      expect(capturedSelectorType).toBe('group-comparison')
    })

    it('maps correlation to correlation', () => {
      renderWithMethod('correlation')
      expect(capturedSelectorType).toBe('correlation')
    })

    it('maps regression to multiple-regression', () => {
      renderWithMethod('regression')
      expect(capturedSelectorType).toBe('multiple-regression')
    })

    it('maps chi-square to UnifiedVariableSelector with chi-square selector type', () => {
      renderWithMethod('chi-square')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('chi-square')
    })

    it('maps chi-square-goodness to UnifiedVariableSelector with chi-square selector type', () => {
      renderWithMethod('chi-square-goodness')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('chi-square')
    })

    it('maps chi-square-independence to UnifiedVariableSelector with chi-square selector type', () => {
      renderWithMethod('chi-square-independence')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('chi-square')
    })

    it('maps mcnemar to UnifiedVariableSelector with chi-square selector type', () => {
      renderWithMethod('mcnemar')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('chi-square')
    })

    it('maps proportion-test to UnifiedVariableSelector with chi-square selector type', () => {
      renderWithMethod('proportion-test')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('chi-square')
    })

    it('maps paired-t to paired', () => {
      renderWithMethod('paired-t')
      expect(capturedSelectorType).toBe('paired')
    })

    it('maps one-sample-t to one-sample', () => {
      renderWithMethod('one-sample-t')
      expect(capturedSelectorType).toBe('one-sample')
    })

    it('shows null proportion input for proportion-test options', () => {
      renderWithMethod('proportion-test')
      expect(capturedAnalysisOptionsProps).toEqual(
        expect.objectContaining({
          methodRequirements: expect.objectContaining({
            id: 'one-sample-proportion',
            settings: expect.objectContaining({
              testProportion: expect.any(Object),
            }),
          }),
        })
      )
    })

    it('passes testValue settings to analysis options for one-sample-t', () => {
      renderWithMethod('one-sample-t')
      expect(capturedAnalysisOptionsProps).toEqual(
        expect.objectContaining({
          methodRequirements: expect.objectContaining({
            id: 'one-sample-t',
            settings: expect.objectContaining({
              testValue: expect.any(Object),
            }),
          }),
        })
      )
    })
  })

  describe('anova factor override', () => {
    it('keeps group-comparison when anova has one factor', () => {
      renderWithMethod('anova', 'ANOVA', { factors: ['gender'] })
      expect(capturedSelectorType).toBe('group-comparison')
    })

    it('upgrades to two-way-anova when anova has two factors', () => {
      renderWithMethod('anova', 'ANOVA', {
        factors: ['gender', 'treatment'],
        dependentCandidate: 'score',
      })
      expect(capturedSelectorType).toBe('two-way-anova')
    })
  })

  describe('auto-confirm flow', () => {
    it('renders AutoConfirmSelector for power-analysis', () => {
      renderWithMethod('power-analysis')
      expect(screen.getByTestId('auto-confirm-selector')).toBeDefined()
    })

    it('advances after AutoConfirmSelector completion', () => {
      renderWithMethod('power-analysis')
      fireEvent.click(screen.getByTestId('run-analysis-btn'))
      expect(mockUpdateVariableMappingWithInvalidation).toHaveBeenCalled()
      expect(mockGoToNextStep).toHaveBeenCalled()
    })

    it('renders UnifiedVariableSelector for kaplan-meier', () => {
      renderWithMethod('kaplan-meier')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('survival')
    })

    it('renders UnifiedVariableSelector for arima', () => {
      renderWithMethod('arima')
      expect(screen.getByTestId('unified-variable-selector')).toBeDefined()
      expect(capturedSelectorType).toBe('time-series')
    })
  })

  describe('completion flow', () => {
    it('updates mapping and advances after UnifiedVariableSelector completion', () => {
      renderWithMethod('t-test')
      fireEvent.click(screen.getByText('Complete'))
      expect(mockUpdateVariableMappingWithInvalidation).toHaveBeenCalledWith({
        dependentVar: 'd',
        groupVar: 'g',
      })
      expect(mockGoToNextStep).toHaveBeenCalled()
    })
  })

  describe('validation alert', () => {
    it('shows an alert when validateVariableMapping returns errors', () => {
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValueOnce({ isValid: false, errors: ['그룹 변수를 선택해 주세요'] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: { id: 'ancova', name: 'ANCOVA' },
        validationResults: {
          isValid: true,
          errors: [],
          warnings: [],
          columnStats: [{ name: 'score', type: 'numeric', uniqueValues: 30, missingCount: 0, completenessRate: 1 }],
        },
      }

      render(<VariableSelectionStep />)
      fireEvent.click(screen.getByText('Complete'))

      expect(screen.getByText('그룹 변수를 선택해 주세요')).toBeDefined()
      expect(mockGoToNextStep).toHaveBeenCalled()
    })

    it('does not show an alert for valid mappings', () => {
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValueOnce({ isValid: true, errors: [] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: { id: 't-test', name: 't-test' },
        validationResults: null,
      }

      render(<VariableSelectionStep />)
      fireEvent.click(screen.getByText('Complete'))

      expect(screen.queryByText(/선택해 주세요/)).toBeNull()
    })
  })

  describe('AI detected variables', () => {
    it('shows the AI detected variables section when data exists', () => {
      renderWithMethod('t-test', 't-test', {
        dependentCandidate: 'score',
        groupVariable: 'gender',
      })
      expect(screen.getByText('AI 감지 변수')).toBeDefined()
      expect(screen.getByText(/score/)).toBeDefined()
    })

    it('hides the AI detected variables section when data does not exist', () => {
      renderWithMethod('t-test', 't-test', null)
      expect(screen.queryByText('AI 감지 변수')).toBeNull()
    })
  })

  describe('empty data handling', () => {
    it('shows EmptyState when uploadedData is empty', () => {
      storeState = { ...defaultStoreState, uploadedData: [] }
      render(<VariableSelectionStep />)
      expect(screen.getByText('데이터 필요')).toBeDefined()
    })
  })
})
