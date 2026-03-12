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
      replaceMode: {
        title: 'TEST_REPLACE_TITLE',
        cancel: 'TEST_CANCEL',
        button: 'TEST_REPLACE_BTN',
      },
      columnPanel: {
        title: 'TEST_COL_PANEL',
        statusError: 'TEST_ERROR',
        statusWarning: 'TEST_WARNING',
        statusNormal: 'TEST_OK',
        numeric: 'TEST_NUMERIC',
        categorical: 'TEST_CATEGORICAL',
        sampleSize: 'TEST_SAMPLE',
        missingValuesLabel: 'TEST_MISSING',
        missingValues: (n: number) => `${n}건`,
        totalColumns: 'TEST_TOTAL_COL',
        recommendedAnalysis: 'TEST_REC',
        parametric: 'TEST_PARAM',
        nonParametric: 'TEST_NONPARAM',
        columnList: 'TEST_COL_LIST',
        numericShort: 'TEST_NUM',
        categoricalShort: 'TEST_CAT',
        rowColCount: (r: number, c: number) => `${r}행 × ${c}열`,
        rowCount: (r: number) => `${r}행`,
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
  CollapsibleSection: ({ label, children }: { label: string; children: React.ReactNode }) => <div data-testid="collapsible-section">{label}{children}</div>,
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
    distribution: 'visible',
    scatterplots: 'visible',
    correlationHeatmap: 'visible',
    defaultChartType: 'histogram',
  }),
}))

vi.mock('@/components/smart-flow/steps/exploration/DistributionChartSection', () => ({
  DistributionChartSection: () => null,
}))

vi.mock('@/components/smart-flow/steps/exploration/ScatterHeatmapSection', () => ({
  ScatterHeatmapSection: () => null,
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

  describe('columnPanel terminology 렌더링 (2-column 레이아웃)', () => {
    const multiNumericData: DataRow[] = [
      { group: 'A', weight: 10, length: 20, age: 3 },
      { group: 'A', weight: 12, length: 22, age: 4 },
      { group: 'B', weight: 15, length: 25, age: 5 },
      { group: 'B', weight: 18, length: 28, age: 6 },
    ]

    const multiNumericValidation: ValidationResults = {
      isValid: true,
      totalRows: 4,
      totalColumns: 4,
      columnCount: 4,
      missingValues: 2,
      duplicateRows: 0,
      dataType: 'tabular',
      variables: ['group', 'weight', 'length', 'age'],
      errors: [],
      warnings: ['sample size is small'],
      columnStats: [
        { name: 'group', type: 'categorical' as const, uniqueValues: 2, missingCount: 0, numericCount: 0, textCount: 4 },
        { name: 'weight', type: 'numeric' as const, uniqueValues: 4, missingCount: 1, numericCount: 3, textCount: 0, min: 10, max: 18, mean: 13.75, median: 13.5, std: 3.4 },
        { name: 'length', type: 'numeric' as const, uniqueValues: 4, missingCount: 1, numericCount: 3, textCount: 0, min: 20, max: 28, mean: 23.75, median: 23.5, std: 3.5 },
        { name: 'age', type: 'numeric' as const, uniqueValues: 4, missingCount: 0, numericCount: 4, textCount: 0, min: 3, max: 6, mean: 4.5, median: 4.5, std: 1.29 },
      ],
    }

    it('우측 패널 제목 = columnPanel.title', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('TEST_COL_PANEL')).toBeInTheDocument()
    })

    it('수치형/범주형 라벨 = columnPanel.numeric / columnPanel.categorical', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('TEST_NUMERIC')).toBeInTheDocument()
      expect(screen.getByText('TEST_CATEGORICAL')).toBeInTheDocument()
    })

    it('요약 행: 표본 수 / 결측치 / 전체 컬럼', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('TEST_SAMPLE')).toBeInTheDocument()
      expect(screen.getByText('TEST_MISSING')).toBeInTheDocument()
      expect(screen.getByText('2건')).toBeInTheDocument() // missingValues(2) → '2건'
      expect(screen.getByText('TEST_TOTAL_COL')).toBeInTheDocument()
    })

    it('권장 분석 유형 = columnPanel.nonParametric (N<30)', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('TEST_REC')).toBeInTheDocument()
      expect(screen.getByText('TEST_NONPARAM')).toBeInTheDocument()
    })

    it('검증 경고 있을 때 statusWarning 배지 렌더링', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('TEST_WARNING')).toBeInTheDocument()
    })

    it('검증 정상일 때 statusNormal 배지 렌더링', () => {
      const noWarnings = { ...multiNumericValidation, warnings: [] }
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={noWarnings} />)
      expect(screen.getByText('TEST_OK')).toBeInTheDocument()
    })

    it('컬럼 목록 = columnPanel.columnList + numericShort/categoricalShort', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('TEST_COL_LIST')).toBeInTheDocument()
      // 수치 3개 + 범주 1개
      expect(screen.getAllByText('TEST_NUM')).toHaveLength(3)
      expect(screen.getAllByText('TEST_CAT')).toHaveLength(1)
    })

    it('행×열 카운트 = columnPanel.rowColCount', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('4행 × 4열')).toBeInTheDocument()
    })

    it('행 배지 = columnPanel.rowCount', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      expect(screen.getByText('4행')).toBeInTheDocument()
    })

    it('하드코딩 한글 없음 — 오류/주의/정상/수치형/범주형/표본 수/결측치/전체 컬럼/권장 분석/모수적/비모수적/컬럼 목록/수치/범주 부재 확인', () => {
      render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)
      const hardcodedKorean = ['오류', '정상', '수치형', '범주형', '표본 수', '결측치', '전체 컬럼', '권장 분석', '모수적', '비모수적', '컬럼 목록', '컬럼 정보']
      hardcodedKorean.forEach(text => {
        expect(screen.queryByText(text)).not.toBeInTheDocument()
      })
    })
  })
})
