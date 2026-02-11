/**
 * DataExplorationStep - Terminology System 통합 테스트
 *
 * 검증 범위:
 * - useTerminology() 훅 연결 확인
 * - 빈 상태(empty state) terminology 텍스트 렌더링
 * - 수치형 변수 부족 경고 terminology 렌더링
 *
 * 전략: L2 (렌더링 확인) - 최소 mock으로 terminology 통합 검증
 */

import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataExplorationStep } from '@/components/smart-flow/steps/DataExplorationStep'
import type { DataRow, ValidationResults } from '@/types/smart-flow'

// ===== Mock: Terminology =====
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'aquaculture',
    displayName: '수산과학',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    smartFlow: {
      stepTitles: { dataExploration: '데이터 탐색' },
      stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' },
      statusMessages: {},
      buttons: {},
      resultSections: { effectSizeDetail: '' },
      executionStages: {
        prepare: { label: '', message: '' }, preprocess: { label: '', message: '' },
        assumptions: { label: '', message: '' }, analysis: { label: '', message: '' },
        additional: { label: '', message: '' }, finalize: { label: '', message: '' },
      },
      layout: {
        appTitle: '', historyTitle: '', historyClose: '',
        historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '',
        nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '',
        memoryRecommendation: '', detectedMemory: () => '',
        limitFileSize: '', limitDataSize: '', limitRecommended: '',
        memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '',
      },
      execution: {
        runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '',
        pauseDisabledTooltip: '', cancelConfirm: '',
        logSectionLabel: () => '', noLogs: '', dataRequired: '',
        unknownError: '', estimatedTimeRemaining: () => '',
      },
    },
    purposeInput: {
      purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' },
      buttons: { back: '', allMethods: '', useThisMethod: '' },
      labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' },
      messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' },
      aiLabels: { recommendTitle: '' },
    },
    dataExploration: {
      empty: {
        title: 'TEST_EMPTY_TITLE',
        description: 'TEST_EMPTY_DESC',
      },
      features: {
        descriptiveTitle: 'TEST_DESCRIPTIVE',
        descriptiveDesc: 'desc',
        distributionTitle: 'TEST_DISTRIBUTION',
        distributionDesc: 'desc',
        correlationTitle: 'TEST_CORRELATION',
        correlationDesc: 'desc',
      },
      tabs: {
        dataSummary: 'TEST_SUMMARY_TAB',
        fullDataView: (n: number) => `전체 데이터 (${n}건)`,
        statistics: 'TEST_STATS_TAB',
        preview: 'TEST_PREVIEW_TAB',
      },
      headers: {
        variableName: '', count: '', mean: '', stdDev: '',
        median: '', min: '', max: '', skewness: '', kurtosis: '', outliers: '',
      },
      interpretGuide: { title: '', skewness: '', kurtosis: '', outlierDef: '', nDef: '' },
      outlier: {
        detected: () => '', variableDetail: () => '',
        moreVars: () => '', count: () => '', info: () => '',
      },
      chartTypes: { histogram: '', boxplot: '', ariaLabel: '' },
      distribution: { title: '', description: '' },
      histogram: { title: () => '', yAxisLabel: '' },
      boxplot: { selectInstruction: '', singleTitle: () => '', multipleTitle: () => '' },
      scatterTabs: { scatter: '', heatmap: '' },
      scatter: { variableRelation: '', xAxis: '', yAxis: '' },
      correlation: { coefficient: '', determination: '', strong: '', medium: '', weak: '' },
      heatmap: { title: '', description: '', calculating: '', variableCount: () => '' },
      heatmapGuide: { title: '', strongPositive: '', strongNegative: '', noCorrelation: '', veryStrong: '' },
      strongCorrelations: { title: '' },
      strength: { weak: '', medium: '', strong: '', veryStrong: '' },
      assumptions: { loading: '', loadingDescription: '', badge: '', title: '', description: '' },
      normality: { title: '', normal: '', nonNormal: '', statLabel: '', normalInterpretation: '', nonNormalInterpretation: '' },
      homogeneity: { title: '', equal: '', unequal: '', statLabel: '', equalInterpretation: '', unequalInterpretation: '' },
      highlight: { description: () => '', clearButton: '', notFound: '' },
      preview: { title: '', topN: () => '', viewAll: () => '', fullDataInstruction: () => '' },
      warnings: {
        fewNumericVars: 'TEST_FEW_NUMERIC',
        correlationRequires: 'TEST_CORR_REQ',
        currentStatus: (n: number, c: number) => `수치형: ${n}개, 범주형: ${c}개`,
        nextStepHint: 'TEST_NEXT_HINT',
      },
      fallbackFileName: 'TEST_FALLBACK',
    },
  }),
  useTerminologyContext: () => ({
    dictionary: { domain: 'aquaculture', displayName: '수산과학' },
    setDomain: vi.fn(),
    currentDomain: 'aquaculture',
  }),
}))

// ===== Mock: Pyodide =====
vi.mock('@/components/providers/PyodideProvider', () => ({
  usePyodide: () => ({ isLoaded: false, service: null }),
}))

// ===== Mock: SmartFlow Store =====
vi.mock('@/lib/stores/smart-flow-store', () => {
  const hook = Object.assign(
    () => ({
      uploadedFile: null,
      uploadedFileName: null,
      selectedMethod: null,
      quickAnalysisMode: false,
    }),
    {
      getState: () => ({
        assumptionResults: null,
        setAssumptionResults: vi.fn(),
      }),
    }
  )
  return { useSmartFlowStore: hook }
})

// ===== Mock: Template Store =====
vi.mock('@/lib/stores/template-store', () => ({
  useTemplateStore: () => ({
    recentTemplates: [],
    loadTemplates: vi.fn(),
  }),
}))

// ===== Mock: Heavy child components =====
vi.mock('@/components/smart-flow/common', () => ({
  StepHeader: ({ title }: { title: string }) => <div data-testid="step-header">{title}</div>,
}))

vi.mock('@/components/common/analysis/DataProfileSummary', () => ({
  DataProfileSummary: () => null,
}))

vi.mock('@/components/charts/scatterplot', () => ({
  Scatterplot: () => null,
}))

vi.mock('@/components/charts/histogram', () => ({
  Histogram: () => null,
}))

vi.mock('@/components/charts/boxplot', () => ({
  BoxPlot: () => null,
}))

vi.mock('@/components/common/analysis/DataPreviewTable', () => ({
  DataPreviewTable: () => null,
}))

vi.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
  DataUploadStep: () => <div data-testid="data-upload-step" />,
}))

vi.mock('@/components/smart-flow/steps/validation/charts/CorrelationHeatmap', () => ({
  CorrelationHeatmap: () => null,
}))

vi.mock('@/components/common/analysis/OutlierDetailPanel', () => ({
  OutlierDetailPanel: () => null,
  OutlierInfo: () => null,
}))

vi.mock('@/components/statistics/common/DataPrepGuide', () => ({
  DataPrepGuide: () => null,
}))

vi.mock('@/components/smart-flow/TemplateSelector', () => ({
  TemplateSelector: () => null,
}))

vi.mock('@/components/smart-flow/TemplateManagePanel', () => ({
  TemplateManagePanel: () => null,
}))

vi.mock('@/lib/utils/open-data-window', () => ({
  openDataWindow: vi.fn(),
}))

vi.mock('@/lib/utils/exploration-profile', () => ({
  getExplorationProfile: () => ({
    focusTabs: null,
    focusHint: null,
    skipCorrelation: false,
  }),
}))

// ===== Tests =====
describe('DataExplorationStep - Terminology 통합', () => {
  const defaultProps = {
    validationResults: null,
    data: [] as DataRow[],
    onNext: vi.fn(),
    onPrevious: vi.fn(),
  }

  it('빈 데이터 → empty state terminology 텍스트 렌더링', () => {
    render(<DataExplorationStep {...defaultProps} />)

    // Terminology system에서 가져온 텍스트가 렌더링되는지 확인
    expect(screen.getByText('TEST_EMPTY_TITLE')).toBeInTheDocument()
    expect(screen.getByText('TEST_EMPTY_DESC')).toBeInTheDocument()
  })

  it('빈 데이터 → 기능 안내 카드 terminology 렌더링', () => {
    render(<DataExplorationStep {...defaultProps} />)

    expect(screen.getByText('TEST_DESCRIPTIVE')).toBeInTheDocument()
    expect(screen.getByText('TEST_DISTRIBUTION')).toBeInTheDocument()
    expect(screen.getByText('TEST_CORRELATION')).toBeInTheDocument()
  })

  it('수치형 변수 1개 → 경고 메시지 terminology 렌더링', () => {
    const dataWithOneNumeric: DataRow[] = [
      { category: 'A', value: 1 },
      { category: 'B', value: 2 },
      { category: 'C', value: 3 },
    ]

    render(
      <DataExplorationStep
        {...defaultProps}
        data={dataWithOneNumeric}
        validationResults={{
          isValid: true,
          totalRows: 3,
          totalColumns: 2,
          columnCount: 2,
          missingValues: 0,
          duplicateRows: 0,
          dataType: 'tabular',
          variables: ['category', 'value'],
          errors: [],
          warnings: [],
          columnStats: [
            { name: 'category', type: 'categorical' as const, uniqueValues: 3, missingCount: 0, numericCount: 0, textCount: 3 },
            { name: 'value', type: 'numeric' as const, uniqueValues: 3, missingCount: 0, numericCount: 3, textCount: 0, min: 1, max: 3, mean: 2, median: 2, std: 1 },
          ],
        }}
      />
    )

    // 수치형 변수 부족 → 상관분석 불가 경고 (직접 렌더링 텍스트)
    expect(screen.getByText('TEST_CORR_REQ')).toBeInTheDocument()
    expect(screen.getByText('TEST_NEXT_HINT')).toBeInTheDocument()
  })

  it('onUploadComplete 제공 시 DataUploadStep 렌더링', () => {
    render(
      <DataExplorationStep
        {...defaultProps}
        onUploadComplete={vi.fn()}
      />
    )

    expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
  })
})
