import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VariableSelectionStep } from '@/components/analysis/steps/VariableSelectionStep'
import { getMethodByAlias } from '@/lib/constants/statistical-methods'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { AnalysisOptions, StatisticalMethod } from '@/types/analysis'

let capturedSelectorType: string | null = null
let capturedAnalysisOptionsProps: Record<string, unknown> | null = null
let capturedUnifiedMethodId: string | undefined
let capturedUnifiedMethodName: string | undefined

function createTerminology(domain: 'aquaculture' | 'generic') {
  return {
    domain,
    language: domain === 'generic' ? 'en' : 'ko',
    variables: domain === 'generic'
      ? {
          group: { title: 'Group Variable', description: 'Categorical grouping variable' },
          dependent: { title: 'Dependent Variable', description: 'Numeric outcome variable' },
          independent: { title: 'Independent Variable', description: 'Predictor variable' },
          factor: { title: 'Group Variable', description: 'Categorical grouping factor' },
          covariate: { title: 'Covariate', description: 'Continuous control variable' },
          time: { title: 'Time Variable', description: 'Time or sequence variable' },
          event: { title: 'Event Variable', description: 'Binary event indicator' },
          pairedFirst: { title: 'Time 1 / Before', description: 'First paired measure' },
          pairedSecond: { title: 'Time 2 / After', description: 'Second paired measure' },
          correlation: { title: 'Analysis Variables', description: 'Variables analyzed together' },
        }
      : {
          group: { title: '그룹 변수', description: '범주형 그룹 변수' },
          dependent: { title: '종속 변수', description: '수치형 결과 변수' },
          independent: { title: '독립 변수', description: '예측 변수' },
          factor: { title: '그룹 변수', description: '범주형 요인 변수' },
          covariate: { title: '공변량', description: '통제 변수' },
          time: { title: '시간 변수', description: '시간 또는 순서 변수' },
          event: { title: '사건 변수', description: '이진 사건 지표' },
          pairedFirst: { title: '사전', description: '첫 번째 측정값' },
          pairedSecond: { title: '사후', description: '두 번째 측정값' },
          correlation: { title: '분석 변수', description: '함께 분석할 변수' },
        },
    analysis: {
      stepTitles: { variableSelection: domain === 'generic' ? 'Variable Selection' : '변수 선택' },
      layout: { prevStep: domain === 'generic' ? 'Previous step' : '이전 단계' },
      emptyStates: {
        dataRequired: domain === 'generic' ? 'Data required' : '데이터 필요',
        dataRequiredDescription: domain === 'generic' ? 'Upload data first' : '데이터를 업로드해 주세요',
      },
      aiVariables: {
        title: domain === 'generic' ? 'AI detected variables' : 'AI 감지 변수',
        roles: { dependent: 'Y:', group: 'G:', factors: 'F:', independent: 'X:', covariate: 'C:' },
      },
    },
    selectorUI: {
      labels: {
        analysisOptions: domain === 'generic' ? 'Analysis options' : '분석 옵션',
      },
    },
  }
}

let mockTerminology = createTerminology('aquaculture')

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
    methodId,
    methodName,
    onComplete,
    onMappingChange,
  }: {
    selectorType: string
    methodId?: string
    methodName?: string
    onComplete: (mapping: unknown) => void
    onMappingChange?: (mapping: unknown) => void
  }) => {
    capturedSelectorType = selectorType
    capturedUnifiedMethodId = methodId
    capturedUnifiedMethodName = methodName
    return (
      <div data-testid="unified-variable-selector" data-selector-type={selectorType}>
        <button onClick={() => onMappingChange?.({ variables: ['x1', 'x2'] })}>Preview update</button>
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

vi.mock('@/lib/statistics/variable-mapping', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/statistics/variable-mapping')>()
  return {
    ...actual,
    validateVariableMapping: vi.fn(() => ({ isValid: true, errors: [] })),
  }
})

const mockSetVariableMapping = vi.fn()
const mockUpdateVariableMappingWithInvalidation = vi.fn()
const mockGoToNextStep = vi.fn()
const mockGoToPreviousStep = vi.fn()

type TestAnalysisOptions = AnalysisOptions & {
  nullProportion?: number
}

const defaultStoreState = {
  uploadedData: [{ x: 1 }] as unknown[],
  selectedMethod: null as StatisticalMethod | null,
  detectedVariables: null as Record<string, unknown> | null,
  variableMapping: null as Record<string, unknown> | null,
  validationResults: null as unknown,
  suggestedSettings: null as Record<string, unknown> | null,
  analysisOptions: {
    alpha: 0.05,
    showAssumptions: true,
    showEffectSize: true,
    nullProportion: 0.5,
    methodSettings: {},
  } as TestAnalysisOptions,
  setVariableMapping: mockSetVariableMapping,
  updateVariableMappingWithInvalidation: mockUpdateVariableMappingWithInvalidation,
  goToNextStep: mockGoToNextStep,
  goToPreviousStep: mockGoToPreviousStep,
}

let storeState = { ...defaultStoreState }

function makeSelectedMethod(methodId: string, methodName = methodId): StatisticalMethod {
  const resolved = getMethodByAlias(methodId)
  if (resolved) {
    return {
      id: methodId,
      name: methodName,
      category: resolved.category,
      description: '',
    }
  }

  return {
    id: methodId,
    name: methodName,
    category: 'descriptive',
    description: '',
  }
}

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: () => storeState,
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => mockTerminology,
}))

function renderWithMethod(
  methodId: string,
  methodName = methodId,
  detectedVariables: Record<string, unknown> | null = null
) {
  storeState = {
    ...defaultStoreState,
    selectedMethod: makeSelectedMethod(methodId, methodName),
    detectedVariables,
  }

  return render(<VariableSelectionStep />)
}

beforeEach(() => {
  mockTerminology = createTerminology('aquaculture')
  storeState = { ...defaultStoreState }
  capturedSelectorType = null
  capturedAnalysisOptionsProps = null
  capturedUnifiedMethodId = undefined
  capturedUnifiedMethodName = undefined
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
          selectedMethod: makeSelectedMethod(id),
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
          selectedMethod: makeSelectedMethod(id),
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
      expect(capturedUnifiedMethodId).toBe('two-sample-t')
      expect(screen.getByTestId('variable-selection-step')).toHaveAttribute('data-method-id', 'two-sample-t')
    })

    it('maps correlation to correlation', () => {
      renderWithMethod('correlation')
      expect(capturedSelectorType).toBe('correlation')
    })

    it('maps mann-kendall alias to one-sample via canonical method id', () => {
      renderWithMethod('mann-kendall')
      expect(capturedSelectorType).toBe('one-sample')
      expect(capturedUnifiedMethodId).toBe('mann-kendall-test')
      expect(screen.getByTestId('variable-selection-step')).toHaveAttribute('data-method-id', 'mann-kendall-test')
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

    it('canonicalizes compat alias ids before building method requirements and selector props', () => {
      renderWithMethod('anova', 'ANOVA')

      expect(capturedSelectorType).toBe('group-comparison')
      expect(capturedUnifiedMethodId).toBe('one-way-anova')
      expect(capturedUnifiedMethodName).toBe('ANOVA')
      expect(capturedAnalysisOptionsProps).toEqual(
        expect.objectContaining({
          methodRequirements: expect.objectContaining({
            id: 'one-way-anova',
          }),
        })
      )
      expect(screen.getByTestId('variable-selection-step')).toHaveAttribute('data-method-id', 'one-way-anova')
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
      renderWithMethod('one-way-anova', 'ANOVA', { factors: ['gender'] })
      expect(capturedSelectorType).toBe('group-comparison')
    })

    it('upgrades to two-way-anova when anova has two factors', () => {
      renderWithMethod('one-way-anova', 'ANOVA', {
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

  describe('execution preview', () => {
    it('shows Step 3 execution preview using the same merged settings source as Step 4', () => {
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('one-sample-t', 'One Sample T-Test'),
        suggestedSettings: { alternative: 'greater' },
        analysisOptions: {
          alpha: 0.05,
          showAssumptions: true,
          showEffectSize: true,
          alternative: 'two-sided',
          testValue: 10,
          nullProportion: 0.5,
          methodSettings: {},
        },
        detectedVariables: {
          dependentCandidate: 'score',
        },
      }

      render(<VariableSelectionStep />)

      expect(screen.getByTestId('analysis-execution-preview')).toBeDefined()
      expect(screen.getByTestId('execution-preview-setting-alpha')).toHaveTextContent('alpha 0.05')
      expect(screen.getByTestId('execution-preview-setting-testValue')).toHaveTextContent('검정값 (μ₀) 10')
      expect(screen.getByTestId('execution-preview-setting-alternative')).toHaveTextContent('대립가설 단측 검정 (greater)')
      expect(screen.getByText('변수 1개')).toBeDefined()
    })

    it('shows missing required slots when execution is not ready yet', () => {
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('t-test'),
        detectedVariables: null,
      }

      render(<VariableSelectionStep />)

      expect(screen.getByTestId('analysis-execution-preview')).toBeDefined()
      expect(screen.getByTestId('execution-preview-missing')).toBeDefined()
      expect(screen.getByTestId('execution-preview-missing-dependent')).toHaveTextContent('종속 변수을(를) 선택해야 합니다')
      expect(screen.getByTestId('execution-preview-missing-factor')).toHaveTextContent('그룹 변수을(를) 선택해야 합니다')
    })

    it('localizes preview slot copy for the generic domain', () => {
      mockTerminology = createTerminology('generic')
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('t-test'),
        detectedVariables: null,
      }

      render(<VariableSelectionStep />)

      expect(screen.getByText('Execution settings for the next step')).toBeDefined()
      expect(screen.getByText('Variables 0')).toBeDefined()
      expect(screen.getByText('Required before running')).toBeDefined()
      expect(screen.getByTestId('execution-preview-missing-dependent')).toHaveTextContent('Dependent Variable must be selected.')
      expect(screen.getByTestId('execution-preview-missing-factor')).toHaveTextContent('Group Variable must be selected.')
      expect(screen.getByText('Dependent Variable')).toBeDefined()
      expect(screen.getByText('Group Variable')).toBeDefined()
    })

    it('keeps method-specific preview slot copy for binary and contingency-table methods in the generic domain', () => {
      mockTerminology = createTerminology('generic')

      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('one-sample-proportion'),
        detectedVariables: null,
      }

      const { unmount } = render(<VariableSelectionStep />)
      expect(screen.getByTestId('execution-preview-missing-dependent')).toHaveTextContent('Binary Variable must be selected.')
      unmount()

      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('chi-square-independence'),
        detectedVariables: null,
      }

      render(<VariableSelectionStep />)
      expect(screen.getByTestId('execution-preview-missing-independent')).toHaveTextContent('Row Variable must be selected.')
      expect(screen.getByTestId('execution-preview-missing-dependent')).toHaveTextContent('Column Variable must be selected.')
    })

    it('uses resolved method slots for the guide panel as well as the preview', () => {
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('t-test'),
        detectedVariables: null,
      }

      render(<VariableSelectionStep />)

      expect(screen.getByText('종속 변수')).toBeDefined()
      expect(screen.getByText('그룹 변수')).toBeDefined()
      expect(screen.queryByText('공변량')).toBeNull()
    })

    it('shows minimum count guidance for multi-variable selectors', () => {
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('correlation'),
        detectedVariables: {
          numericVars: ['x1'],
        },
      }

      render(<VariableSelectionStep />)

      expect(screen.getByTestId('execution-preview-missing-variables')).toHaveTextContent('분석 변수 2개 필요, 현재 1개')
    })

    it('uses method requirements instead of generic chi-square slots for one-sample-proportion', () => {
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('one-sample-proportion'),
        detectedVariables: null,
      }

      render(<VariableSelectionStep />)

      expect(screen.getByTestId('execution-preview-missing-dependent')).toHaveTextContent('이진 변수을(를) 선택해야 합니다')
      expect(screen.queryByTestId('execution-preview-missing-independent')).toBeNull()
    })

    it('updates the preview from the selector live mapping before submit', () => {
      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('correlation'),
        detectedVariables: {
          numericVars: ['x1'],
        },
      }

      render(<VariableSelectionStep />)

      expect(screen.getByTestId('execution-preview-missing-variables')).toHaveTextContent('분석 변수 2개 필요, 현재 1개')
      fireEvent.click(screen.getByText('Preview update'))
      expect(screen.queryByTestId('execution-preview-missing-variables')).toBeNull()
      expect(screen.getByText('변수 2개')).toBeDefined()
    })
  })

  describe('validation alert', () => {
    it('shows an alert and blocks progression when validateVariableMapping returns errors', () => {
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValue({ isValid: false, errors: ['그룹 변수(범주형)를 선택해주세요'] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('ancova', 'ANCOVA'),
        validationResults: {
          isValid: true,
          errors: [],
          warnings: [],
          columnStats: [{ name: 'score', type: 'numeric', uniqueValues: 30, missingCount: 0, completenessRate: 1 }],
        },
      }

      render(<VariableSelectionStep />)
      fireEvent.click(screen.getByText('Complete'))

      expect(screen.getByText('그룹 변수(범주형)를 선택해주세요')).toBeDefined()
      expect(mockGoToNextStep).not.toHaveBeenCalled()
      expect(mockSetVariableMapping).not.toHaveBeenCalled()
      expect(mockUpdateVariableMappingWithInvalidation).not.toHaveBeenCalled()
    })

    it('localizes submit-time validation errors in the generic domain', () => {
      mockTerminology = createTerminology('generic')
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValue({ isValid: false, errors: ['그룹 변수(범주형)를 선택해주세요'] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('ancova', 'ANCOVA'),
        validationResults: {
          isValid: true,
          errors: [],
          warnings: [],
          columnStats: [{ name: 'score', type: 'numeric', uniqueValues: 30, missingCount: 0, completenessRate: 1 }],
        },
      }

      render(<VariableSelectionStep />)
      fireEvent.click(screen.getByText('Complete'))

      expect(screen.getByText('Select a categorical group variable.')).toBeDefined()
      expect(screen.queryByText('그룹 변수(범주형)를 선택해주세요')).toBeNull()
      expect(mockGoToNextStep).not.toHaveBeenCalled()
    })

    it('keeps one-sample submit-time validation aligned with Test Variable copy in the generic domain', () => {
      mockTerminology = createTerminology('generic')
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValue({ isValid: false, errors: ['종속변수(수치형)를 선택해주세요'] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('one-sample-t', 'One Sample T-Test'),
        validationResults: {
          isValid: true,
          errors: [],
          warnings: [],
          columnStats: [{ name: 'score', type: 'numeric', uniqueValues: 30, missingCount: 0, completenessRate: 1 }],
        },
      }

      render(<VariableSelectionStep />)
      fireEvent.click(screen.getByText('Complete'))

      expect(screen.getByText('Select a numeric test variable.')).toBeDefined()
      expect(screen.queryByText('Select a numeric dependent variable.')).toBeNull()
      expect(mockGoToNextStep).not.toHaveBeenCalled()
    })

    it('does not show an alert for valid mappings', () => {
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValueOnce({ isValid: true, errors: [] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: makeSelectedMethod('t-test'),
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
