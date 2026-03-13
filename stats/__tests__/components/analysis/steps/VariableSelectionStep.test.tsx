/**
 * VariableSelectionStep 테스트
 *
 * 검증 항목:
 * 1. SELECTOR_MAP: 51개 실제 method ID가 올바른 컴포넌트 렌더
 * 2. auto 메서드 → AutoConfirmSelector
 * 3. chi-square 메서드 → ChiSquareSelector
 * 4. 나머지 전부 → UnifiedVariableSelector
 * 5. anova + 2 factors → selectorType='two-way-anova'로 전달
 * 5. validation 에러 발생 시 Alert 표시
 * 6. AI 감지 변수 배지 표시
 * 7. 데이터 없음 → EmptyState
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Component mocks ─────────────────────────────────────────────────────────

let capturedSelectorType: string | null = null

vi.mock('@/components/common/variable-selectors', () => ({
  AutoConfirmSelector: ({ onComplete }: { onComplete: (m: unknown) => void }) => (
    <div data-testid="auto-confirm-selector">
      <button data-testid="run-analysis-btn" onClick={() => onComplete({})}>분석 시작</button>
    </div>
  ),
  ChiSquareSelector: ({ onComplete }: { onComplete: (m: unknown) => void }) => (
    <div data-testid="chi-square-selector">
      <button onClick={() => onComplete({ independentVar: 'row', dependentVar: 'col' })}>완료</button>
    </div>
  ),
}))

vi.mock('@/components/analysis/variable-selector/UnifiedVariableSelector', () => ({
  UnifiedVariableSelector: ({ selectorType, onComplete }: { selectorType: string; onComplete: (m: unknown) => void }) => {
    capturedSelectorType = selectorType
    return (
      <div data-testid="unified-variable-selector" data-selector-type={selectorType}>
        <button onClick={() => onComplete({ dependentVar: 'd', groupVar: 'g' })}>완료</button>
      </div>
    )
  },
}))

vi.mock('@/components/analysis/common', () => ({
  StepHeader: ({ title }: { title: string }) => <div data-testid="step-header">{title}</div>,
  CollapsibleSection: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div data-testid="collapsible-section" data-label={label}>{children}</div>
  ),
}))

vi.mock('@/components/analysis/variable-selector/AnalysisOptions', () => ({
  AnalysisOptionsSection: () => <div data-testid="analysis-options-section" />,
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
  validationResults: null as unknown,
  setVariableMapping: mockSetVariableMapping,
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
        dataRequiredDescription: '데이터를 업로드하세요',
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

// ─── Import after mocks ────────────────────────────────────────────────────────
import { VariableSelectionStep } from '@/components/analysis/steps/VariableSelectionStep'
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
  capturedSelectorType = null
  vi.clearAllMocks()
})

describe('VariableSelectionStep', () => {

  // =========================================================================
  describe('SELECTOR_MAP 커버리지', () => {

    const autoMethodIds = [
      'repeated-measures-anova', 'manova', 'mixed-model',
      'arima', 'seasonal-decompose', 'stationarity-test',
      'kaplan-meier', 'cox-regression', 'roc-curve',
      'discriminant', 'power-analysis', 'friedman',
    ]

    const chiSquareMethodIds = [
      'chi-square', 'chi-square-goodness', 'chi-square-independence',
      'mcnemar', 'proportion-test',
    ]

    const nonAutoMethodIds = [
      't-test', 'welch-t', 'one-sample-t', 'paired-t', 'anova', 'welch-anova',
      'ancova', 'mann-whitney', 'wilcoxon', 'kruskal-wallis',
      'sign-test', 'cochran-q', 'binomial-test', 'runs-test',
      'ks-test', 'mood-median', 'non-parametric', 'correlation',
      'partial-correlation', 'regression', 'logistic-regression', 'poisson',
      'ordinal-regression', 'stepwise', 'dose-response', 'response-surface',
      'descriptive', 'normality-test', 'explore-data', 'means-plot',
      'mann-kendall', 'pca', 'factor-analysis', 'cluster', 'reliability',
    ]

    it('auto 메서드 12개 → AutoConfirmSelector 렌더', () => {
      for (const id of autoMethodIds) {
        storeState = {
          ...defaultStoreState,
          selectedMethod: { id, name: id },
        }
        const { unmount, getByTestId, queryByTestId } = render(<VariableSelectionStep />)
        expect(getByTestId('auto-confirm-selector')).toBeDefined()
        expect(queryByTestId('unified-variable-selector')).toBeNull()
        expect(queryByTestId('chi-square-selector')).toBeNull()
        unmount()
      }
    })

    it('chi-square 메서드 5개 → ChiSquareSelector 렌더', () => {
      for (const id of chiSquareMethodIds) {
        storeState = {
          ...defaultStoreState,
          selectedMethod: { id, name: id },
        }
        const { unmount, getByTestId, queryByTestId } = render(<VariableSelectionStep />)
        expect(getByTestId('chi-square-selector')).toBeDefined()
        expect(queryByTestId('unified-variable-selector')).toBeNull()
        expect(queryByTestId('auto-confirm-selector')).toBeNull()
        unmount()
      }
    })

    it('비-auto/비-chi-square 메서드 전부 → UnifiedVariableSelector 렌더', () => {
      for (const id of nonAutoMethodIds) {
        storeState = {
          ...defaultStoreState,
          selectedMethod: { id, name: id },
        }
        const { unmount, getByTestId, queryByTestId } = render(<VariableSelectionStep />)
        expect(getByTestId('unified-variable-selector')).toBeDefined()
        expect(queryByTestId('auto-confirm-selector')).toBeNull()
        expect(queryByTestId('chi-square-selector')).toBeNull()
        unmount()
      }
    })
  })

  // =========================================================================
  describe('SelectorType 전달', () => {

    it('t-test → selectorType="group-comparison"', () => {
      renderWithMethod('t-test')
      expect(capturedSelectorType).toBe('group-comparison')
    })

    it('correlation → selectorType="correlation"', () => {
      renderWithMethod('correlation')
      expect(capturedSelectorType).toBe('correlation')
    })

    it('regression → selectorType="multiple-regression"', () => {
      renderWithMethod('regression')
      expect(capturedSelectorType).toBe('multiple-regression')
    })

    it('chi-square → ChiSquareSelector 렌더', () => {
      renderWithMethod('chi-square')
      expect(screen.getByTestId('chi-square-selector')).toBeDefined()
      expect(screen.queryByTestId('unified-variable-selector')).toBeNull()
    })

    it('paired-t → selectorType="paired"', () => {
      renderWithMethod('paired-t')
      expect(capturedSelectorType).toBe('paired')
    })

    it('one-sample-t → selectorType="one-sample"', () => {
      renderWithMethod('one-sample-t')
      expect(capturedSelectorType).toBe('one-sample')
    })
  })

  // =========================================================================
  describe('anova + AI factors → two-way-anova', () => {

    it('anova + factors 1개 → group-comparison', () => {
      renderWithMethod('anova', 'ANOVA', { factors: ['gender'] })
      expect(capturedSelectorType).toBe('group-comparison')
    })

    it('anova + factors 2개 → two-way-anova', () => {
      renderWithMethod('anova', 'ANOVA', {
        factors: ['gender', 'treatment'],
        dependentCandidate: 'score'
      })
      expect(capturedSelectorType).toBe('two-way-anova')
    })
  })

  // =========================================================================
  describe('auto-confirm 메서드', () => {

    it('kaplan-meier → AutoConfirmSelector 렌더', () => {
      renderWithMethod('kaplan-meier')
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
  describe('onComplete → setVariableMapping + goToNextStep', () => {

    it('UnifiedVariableSelector 완료 시 store 업데이트 + 다음 스텝', () => {
      renderWithMethod('t-test')
      fireEvent.click(screen.getByText('완료'))
      expect(mockSetVariableMapping).toHaveBeenCalledWith({
        dependentVar: 'd',
        groupVar: 'g',
      })
      expect(mockGoToNextStep).toHaveBeenCalled()
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
