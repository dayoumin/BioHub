/**
 * VariableSelectionStep 테스트
 *
 * 검증 항목:
 * 1. SELECTOR_MAP: 51개 실제 method ID가 'default' 미반환
 * 2. chi-square → ChiSquareSelector 렌더
 * 3. kaplan-meier → AutoConfirmSelector 렌더
 * 4. anova + 2 factors → TwoWayAnovaSelector 렌더
 * 5. ancova → GroupComparisonSelector + covariate 패널
 * 6. validation 에러 발생 시 Alert 표시
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Selector component mocks ─────────────────────────────────────────────────
vi.mock('@/components/common/variable-selectors', () => ({
  GroupComparisonSelector: ({ showCovariate, onComplete }: { showCovariate?: boolean; onComplete: (m: unknown) => void }) => (
    <div data-testid="group-comparison-selector">
      {showCovariate && <div data-testid="covariate-panel">covariate</div>}
      <button onClick={() => onComplete({ groupVar: 'g', dependentVar: 'd' })}>완료</button>
    </div>
  ),
  TwoWayAnovaSelector: ({ onComplete }: { onComplete: (m: unknown) => void }) => (
    <div data-testid="two-way-anova-selector">
      <button onClick={() => onComplete({ groupVar: 'f1,f2', dependentVar: 'd' })}>완료</button>
    </div>
  ),
  CorrelationSelector: () => <div data-testid="correlation-selector" />,
  MultipleRegressionSelector: () => <div data-testid="multiple-regression-selector" />,
  PairedSelector: () => <div data-testid="paired-selector" />,
  OneSampleSelector: () => <div data-testid="one-sample-selector" />,
  ChiSquareSelector: ({ onComplete }: { onComplete: (m: unknown) => void }) => (
    <div data-testid="chi-square-selector">
      <button onClick={() => onComplete({ independentVar: 'r', dependentVar: 'c' })}>완료</button>
    </div>
  ),
  AutoConfirmSelector: ({ onComplete }: { onComplete: (m: unknown) => void }) => (
    <div data-testid="auto-confirm-selector">
      <button data-testid="run-analysis-btn" onClick={() => onComplete({})}>분석 시작</button>
    </div>
  ),
}))

vi.mock('@/components/common/VariableSelectorToggle', () => ({
  VariableSelectorToggle: () => <div data-testid="variable-selector-toggle" />,
}))

vi.mock('@/components/smart-flow/common', () => ({
  StepHeader: ({ title }: { title: string }) => <div data-testid="step-header">{title}</div>,
}))

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/lib/statistics/variable-mapping', () => ({
  validateVariableMapping: vi.fn(() => ({ isValid: true, errors: [] })),
}))

// ─── Store mock factory ────────────────────────────────────────────────────────
const mockSetVariableMapping = vi.fn()
const mockGoToNextStep = vi.fn()
const mockGoToPreviousStep = vi.fn()

const defaultStoreState = {
  uploadedData: [{ x: 1 }] as unknown[],
  selectedMethod: null as { id: string; name: string } | null,
  detectedVariables: null as Record<string, unknown> | null,
  // use unknown to allow test overrides without full ValidationResults type
  validationResults: null as unknown,
  setVariableMapping: mockSetVariableMapping,
  goToNextStep: mockGoToNextStep,
  goToPreviousStep: mockGoToPreviousStep,
}

let storeState = { ...defaultStoreState }

vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => storeState,
}))

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
      dependent:    { title: 'Dependent', description: '' },
      independent:  { title: 'Independent', description: '' },
      group:        { title: 'Group', description: '' },
      pairedFirst:  { title: 'First' },
      pairedSecond: { title: 'Second' },
    },
    validation: {
      factorRequired: 'Factor required',
      differentVariablesRequired: 'Different variables required',
      dependentRequired: 'Dependent required',
      groupRequired: 'Group required',
      independentRequired: 'Independent required',
      twoGroupsRequired: (n: number) => `Needs 2 groups (got ${n})`,
      maxVariablesExceeded: (n: number) => `Max ${n}`,
      minVariablesRequired: (n: number) => `Min ${n}`,
    },
    success: { allVariablesSelected: '완료' },
    smartFlow: {
      stepTitles: { variableSelection: '변수 선택' },
      emptyStates: {
        dataRequired: '데이터 필요',
        dataRequiredDescription: '데이터를 업로드하세요',
      },
      aiVariables: {
        title: 'AI 감지 변수',
        roles: { dependent: 'Y:', group: 'G:', factors: 'F:', independent: 'X:', covariate: 'C:' },
      },
    },
  }),
}))

// ─── Import after mocks ────────────────────────────────────────────────────────
import { VariableSelectionStep } from '@/components/smart-flow/steps/VariableSelectionStep'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  storeState = { ...defaultStoreState }
  vi.clearAllMocks()
})

describe('VariableSelectionStep', () => {

  // =========================================================================
  describe('SELECTOR_MAP 커버리지', () => {

    const realMethodIds = [
      't-test', 'welch-t', 'one-sample-t', 'paired-t', 'anova', 'welch-anova',
      'repeated-measures-anova', 'ancova', 'manova', 'mixed-model',
      'mann-whitney', 'wilcoxon', 'kruskal-wallis', 'friedman', 'sign-test',
      'mcnemar', 'cochran-q', 'binomial-test', 'runs-test', 'ks-test',
      'mood-median', 'non-parametric', 'correlation', 'partial-correlation',
      'regression', 'logistic-regression', 'poisson', 'ordinal-regression',
      'stepwise', 'dose-response', 'response-surface',
      'chi-square', 'chi-square-goodness', 'chi-square-independence',
      'descriptive', 'normality-test', 'explore-data', 'means-plot',
      'arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall',
      'kaplan-meier', 'cox-regression', 'pca', 'factor-analysis', 'cluster',
      'discriminant', 'power-analysis', 'reliability', 'proportion-test',
    ]

    it('실제 method ID 51개 모두 VariableSelectorToggle(default)을 렌더하지 않는다', () => {
      let defaultCount = 0

      for (const id of realMethodIds) {
        storeState = {
          ...defaultStoreState,
          selectedMethod: { id, name: id },
        }
        const { unmount, queryByTestId } = render(<VariableSelectionStep />)
        if (queryByTestId('variable-selector-toggle') !== null) {
          defaultCount++
          console.warn(`[SELECTOR_MAP] '${id}' fell to default (VariableSelectorToggle)`)
        }
        unmount()
      }

      expect(defaultCount).toBe(0)
    })
  })

  // =========================================================================
  describe('chi-square → ChiSquareSelector', () => {

    it('chi-square method → ChiSquareSelector 렌더', () => {
      renderWithMethod('chi-square')
      expect(screen.getByTestId('chi-square-selector')).toBeDefined()
      expect(screen.queryByTestId('variable-selector-toggle')).toBeNull()
    })

    it('mcnemar method → ChiSquareSelector 렌더 (기존 paired 매핑 제거 확인)', () => {
      renderWithMethod('mcnemar')
      expect(screen.getByTestId('chi-square-selector')).toBeDefined()
      expect(screen.queryByTestId('paired-selector')).toBeNull()
    })

    it('proportion-test → ChiSquareSelector 렌더', () => {
      renderWithMethod('proportion-test')
      expect(screen.getByTestId('chi-square-selector')).toBeDefined()
    })
  })

  // =========================================================================
  describe('auto-confirm 메서드', () => {

    it('kaplan-meier → AutoConfirmSelector 렌더', () => {
      renderWithMethod('kaplan-meier')
      expect(screen.getByTestId('auto-confirm-selector')).toBeDefined()
    })

    it('power-analysis → AutoConfirmSelector 렌더', () => {
      renderWithMethod('power-analysis')
      expect(screen.getByTestId('auto-confirm-selector')).toBeDefined()
    })

    it('AutoConfirmSelector에서 분석 시작 클릭 시 goToNextStep 호출', () => {
      renderWithMethod('arima')
      fireEvent.click(screen.getByTestId('run-analysis-btn'))
      expect(mockSetVariableMapping).toHaveBeenCalled()
      expect(mockGoToNextStep).toHaveBeenCalled()
    })
  })

  // =========================================================================
  describe('anova + AI factors → TwoWayAnovaSelector', () => {

    it('anova + factors 1개 → GroupComparisonSelector (일반 one-way)', () => {
      renderWithMethod('anova', 'ANOVA', { factors: ['gender'] })
      expect(screen.getByTestId('group-comparison-selector')).toBeDefined()
      expect(screen.queryByTestId('two-way-anova-selector')).toBeNull()
    })

    it('anova + factors 2개 → TwoWayAnovaSelector', () => {
      renderWithMethod('anova', 'ANOVA', {
        factors: ['gender', 'treatment'],
        dependentCandidate: 'score'
      })
      expect(screen.getByTestId('two-way-anova-selector')).toBeDefined()
      expect(screen.queryByTestId('group-comparison-selector')).toBeNull()
    })
  })

  // =========================================================================
  describe('ancova → GroupComparisonSelector + covariate', () => {

    it('ancova method → GroupComparisonSelector 렌더', () => {
      renderWithMethod('ancova')
      expect(screen.getByTestId('group-comparison-selector')).toBeDefined()
    })

    it('ancova → covariate 패널 표시', () => {
      renderWithMethod('ancova')
      expect(screen.getByTestId('covariate-panel')).toBeDefined()
    })

    it('t-test → covariate 패널 없음', () => {
      renderWithMethod('t-test')
      expect(screen.queryByTestId('covariate-panel')).toBeNull()
    })
  })

  // =========================================================================
  describe('validation alert 표시', () => {

    it('validateVariableMapping가 에러를 반환하면 Alert가 렌더된다', () => {
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValueOnce({ isValid: false, errors: ['그룹 변수를 선택하세요'] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: { id: 'ancova', name: 'ANCOVA' },
        validationResults: {
          isValid: true,
          errors: [],
          warnings: [],
          columnStats: [
            { name: 'score', type: 'numeric', uniqueValues: 30, missingCount: 0, completenessRate: 1 }
          ]
        },
      }

      render(<VariableSelectionStep />)
      // GroupComparisonSelector mock의 완료 버튼 클릭
      fireEvent.click(screen.getByText('완료'))

      expect(screen.getByText('그룹 변수를 선택하세요')).toBeDefined()
      // 에러가 있어도 goToNextStep은 여전히 호출됨 (경고 후 진행)
      expect(mockGoToNextStep).toHaveBeenCalled()
    })

    it('정상 매핑 시 validation Alert 없음', () => {
      const mockValidate = vi.mocked(validateVariableMapping)
      mockValidate.mockReturnValueOnce({ isValid: true, errors: [] })

      storeState = {
        ...defaultStoreState,
        selectedMethod: { id: 't-test', name: 't-test' },
        validationResults: null,
      }

      render(<VariableSelectionStep />)
      fireEvent.click(screen.getByText('완료'))

      expect(screen.queryByText(/선택하세요/)).toBeNull()
    })
  })

  // =========================================================================
  describe('AI 감지 변수 배지', () => {

    it('detectedVariables가 있으면 AI 감지 정보 섹션이 표시된다', () => {
      renderWithMethod('t-test', 't-test', {
        dependentCandidate: 'score',
        groupVariable: 'gender'
      })
      expect(screen.getByText('AI 감지 변수')).toBeDefined()
      expect(screen.getByText(/score/)).toBeDefined()
    })

    it('detectedVariables가 없으면 AI 감지 정보 섹션이 없다', () => {
      renderWithMethod('t-test', 't-test', null)
      expect(screen.queryByText('AI 감지 변수')).toBeNull()
    })
  })

  // =========================================================================
  describe('데이터 없음 처리', () => {

    it('uploadedData가 비어있으면 EmptyState 표시', () => {
      storeState = { ...defaultStoreState, uploadedData: [] }
      render(<VariableSelectionStep />)
      expect(screen.getByText('데이터 필요')).toBeDefined()
    })
  })
})
