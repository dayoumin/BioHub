import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { DataExplorationStep } from '@/components/analysis/steps/DataExplorationStep'
import type { DataRow, ValidationResults } from '@/types/analysis'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'aquaculture',
    displayName: 'Aquaculture',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    analysis: {
      stepTitles: { dataExploration: 'TEST_EXPLORATION_STEP', dataPreparation: 'TEST_PREPARATION_STEP' },
      stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' },
      statusMessages: {},
      buttons: {},
      resultSections: { effectSizeDetail: '' },
      executionStages: {
        prepare: { label: '', message: '' },
        preprocess: { label: '', message: '' },
        assumptions: { label: '', message: '' },
        analysis: { label: '', message: '' },
        additional: { label: '', message: '' },
        finalize: { label: '', message: '' },
      },
      layout: {
        appTitle: '',
        historyTitle: '',
        historyClose: '',
        historyCount: () => '',
        aiChatbot: '',
        helpLabel: '',
        settingsLabel: '',
        nextStep: 'TEST_LAYOUT_NEXT',
        analyzingDefault: '',
        dataSizeGuide: '',
        currentLimits: '',
        memoryRecommendation: '',
        detectedMemory: () => '',
        limitFileSize: '',
        limitDataSize: '',
        limitRecommended: '',
        memoryTier4GB: '',
        memoryTier8GB: '',
        memoryTier16GB: '',
      },
      execution: {
        runningTitle: '',
        resumeButton: '',
        pauseButton: '',
        cancelButton: '',
        pauseDisabledTooltip: '',
        cancelConfirm: '',
        logSectionLabel: () => '',
        noLogs: '',
        dataRequired: '',
        unknownError: '',
        estimatedTimeRemaining: () => '',
      },
      floatingNav: {
        toMethod: 'TEST_TO_METHOD',
        toVariables: 'TEST_TO_VARIABLES',
      },
    },
    purposeInput: {
      purposes: {},
      inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' },
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
      badgeBar: {
        rows: 'TEST_ROWS',
        cols: 'TEST_COLS',
        numeric: 'TEST_BADGE_NUMERIC',
        categorical: 'TEST_BADGE_CATEGORICAL',
        missing: 'TEST_BADGE_MISSING',
        outlier: 'TEST_BADGE_OUTLIER',
      },
      summaryCards: {
        ariaLabel: 'TEST_SUMMARY_ARIA',
        overview: 'TEST_OVERVIEW',
        descriptive: 'TEST_DESCRIPTIVE_CARD',
        distribution: 'TEST_DISTRIBUTION_CARD',
        correlation: 'TEST_CORRELATION_CARD',
        rowsCols: (rows: number, cols: number) => `${rows}x${cols}`,
        numericCategorical: (numeric: number, categorical: number) => `N${numeric}/C${categorical}`,
        missingCount: (count: number) => `M${count}`,
        variables: (count: number) => `V${count}`,
        outlierCount: (count: number) => `O${count}`,
        noOutliers: 'TEST_NO_OUTLIERS',
        normalitySummary: (pass: number, fail: number) => `PASS${pass}/FAIL${fail}`,
        normalityTesting: 'TEST_NORMALITY_TESTING',
        homogeneityTesting: 'TEST_HOMOGENEITY_TESTING',
        homogeneityPass: 'TEST_HOMO_PASS',
        homogeneityFail: 'TEST_HOMO_FAIL',
        maxCorrelation: (r: string) => `R${r}`,
        strongPairs: (count: number) => `P${count}`,
        needsTwoNumeric: 'TEST_NEEDS_TWO',
      },
      features: {
        descriptiveTitle: 'TEST_DESCRIPTIVE',
        descriptiveDesc: 'TEST_DESCRIPTIVE_DESC',
        distributionTitle: 'TEST_DISTRIBUTION',
        distributionDesc: 'TEST_DISTRIBUTION_DESC',
        correlationTitle: 'TEST_CORRELATION',
        correlationDesc: 'TEST_CORRELATION_DESC',
      },
      tabs: {
        dataSummary: 'TEST_SUMMARY_TAB',
        fullDataView: (count: number) => `TEST_FULL_DATA_${count}`,
        statistics: 'TEST_STATS_TAB',
        preview: 'TEST_PREVIEW_TAB',
      },
      headers: {
        variableName: '',
        count: '',
        mean: '',
        stdDev: '',
        median: '',
        min: '',
        max: '',
        skewness: '',
        kurtosis: '',
        outliers: '',
        q1Tooltip: '',
        q3Tooltip: '',
      },
      interpretGuide: { title: '', skewness: '', kurtosis: '', outlierDef: '', nDef: '' },
      outlier: {
        detected: () => '',
        variableDetail: () => '',
        moreVars: () => '',
        count: () => '',
        info: () => '',
      },
      chartTypes: { histogram: 'TEST_HISTOGRAM', boxplot: 'TEST_BOXPLOT', ariaLabel: '' },
      distribution: { title: 'TEST_VISUALIZATION', description: '' },
      histogram: { title: () => '', yAxisLabel: '' },
      boxplot: { selectInstruction: '', singleTitle: () => '', multipleTitle: () => '' },
      scatterTabs: { scatter: 'TEST_SCATTER', heatmap: 'TEST_HEATMAP' },
      scatter: { variableRelation: '', xAxis: '', yAxis: '' },
      correlation: { coefficient: '', determination: '', strong: '', medium: '', weak: '' },
      heatmap: { title: '', description: '', calculating: '', variableCount: () => '' },
      heatmapGuide: { title: '', strongPositive: '', strongNegative: '', noCorrelation: '', veryStrong: '' },
      strongCorrelations: { title: '' },
      strength: { weak: '', medium: '', strong: '', veryStrong: '' },
      assumptions: {
        loading: '',
        loadingDescription: '',
        badge: '',
        title: '',
        description: '',
        passed: '',
        failed: '',
      },
      normality: {
        title: 'TEST_NORMALITY_TITLE',
        normal: '',
        nonNormal: '',
        statLabel: '',
        normalInterpretation: '',
        nonNormalInterpretation: '',
        normalReview: (stepName: string) => `TEST_NORMAL_REVIEW_${stepName}`,
        nonNormalReview: (stepName: string) => `TEST_NONNORMAL_REVIEW_${stepName}`,
      },
      homogeneity: {
        title: 'TEST_HOMOGENEITY_TITLE',
        equal: '',
        unequal: '',
        statLabel: '',
        equalInterpretation: '',
        unequalInterpretation: '',
        requiresGroupVariable: 'TEST_GROUP_REQUIRED',
        failedSummary: (failed: number, total: number, stepName: string) => `TEST_FAILED_${failed}_${total}_${stepName}`,
        passedSummary: (total: number, stepName: string) => `TEST_PASSED_${total}_${stepName}`,
        groupVariable: (groupName: string) => `TEST_GROUP_${groupName}`,
        passCount: (passed: number, total: number) => `TEST_PASSCOUNT_${passed}_${total}`,
        insufficientCombinations: 'TEST_INSUFFICIENT_COMBINATIONS',
      },
      highlight: { description: () => '', clearButton: '', notFound: '' },
      preview: { title: 'TEST_PREVIEW_TITLE', topN: () => '', viewAll: () => '', fullDataInstruction: () => '' },
      warnings: {
        fewNumericVars: 'TEST_FEW_NUMERIC',
        correlationRequires: 'TEST_CORR_REQ',
        currentStatus: (numeric: number, categorical: number) => `TEST_CURRENT_${numeric}_${categorical}`,
        nextStepHint: 'TEST_NEXT_HINT',
      },
      insightPanel: {
        statusTitle: 'TEST_STATUS_TITLE',
        statusReady: 'TEST_STATUS_READY',
        statusReview: 'TEST_STATUS_REVIEW',
        statusBlocked: 'TEST_STATUS_BLOCKED',
        statusVariables: (numeric: number, categorical: number) => `TEST_STATUS_VARS_${numeric}_${categorical}`,
        qualityTitle: 'TEST_QUALITY_TITLE',
        qualityHealthy: 'TEST_QUALITY_HEALTHY',
        qualityWarnings: (count: number) => `TEST_QUALITY_WARN_${count}`,
        qualityErrors: (count: number) => `TEST_QUALITY_ERR_${count}`,
        qualityMissing: (count: number) => `TEST_QUALITY_MISSING_${count}`,
        qualityOutliers: (count: number) => `TEST_QUALITY_OUTLIERS_${count}`,
        qualityNonNormal: (count: number) => `TEST_QUALITY_NONNORMAL_${count}`,
        qualityFewNumeric: 'TEST_QUALITY_FEW_NUMERIC',
        nextStepTitle: 'TEST_NEXT_TITLE',
        nextOverviewTitle: 'TEST_NEXT_OVERVIEW',
        nextOverviewDescription: 'TEST_NEXT_OVERVIEW_DESC',
        nextDescriptiveTitle: 'TEST_NEXT_DESCRIPTIVE',
        nextDescriptiveDescription: 'TEST_NEXT_DESCRIPTIVE_DESC',
        nextDistributionTitle: 'TEST_NEXT_DISTRIBUTION',
        nextDistributionDescription: 'TEST_NEXT_DISTRIBUTION_DESC',
        nextCorrelationTitle: 'TEST_NEXT_CORRELATION',
        nextCorrelationDescription: 'TEST_NEXT_CORRELATION_DESC',
        openOverview: 'TEST_OPEN_OVERVIEW',
        openDescriptive: 'TEST_OPEN_DESCRIPTIVE',
        openDistribution: 'TEST_OPEN_DISTRIBUTION',
        openCorrelation: 'TEST_OPEN_CORRELATION',
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
        missingValues: (count: number) => `${count} missing`,
        totalColumns: 'TEST_TOTAL_COL',
        recommendedAnalysis: 'TEST_REC',
        parametric: 'TEST_PARAM',
        nonParametric: 'TEST_NONPARAM',
        columnList: 'TEST_COL_LIST',
        numericShort: 'TEST_NUM',
        categoricalShort: 'TEST_CAT',
        rowColCount: (rows: number, cols: number) => `${rows}x${cols}`,
        rowCount: (rows: number) => `${rows} rows`,
      },
      fallbackFileName: 'TEST_FALLBACK',
    },
  }),
  useTerminologyContext: () => ({
    dictionary: { domain: 'aquaculture', displayName: 'Aquaculture' },
    setDomain: vi.fn(),
    currentDomain: 'aquaculture',
  }),
}))

vi.mock('@/components/providers/PyodideProvider', () => ({
  usePyodide: () => ({ isLoaded: false, service: null }),
}))

vi.mock('@/lib/stores/analysis-store', () => {
  const hook = Object.assign(
    () => ({
      uploadedFile: null,
      uploadedFileName: null,
      selectedMethod: null,
    }),
    {
      getState: () => ({
        assumptionResults: null,
        setAssumptionResults: vi.fn(),
      }),
    }
  )

  return { useAnalysisStore: hook }
})

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: () => ({ stepTrack: 'normal' }),
}))

vi.mock('@/lib/stores/template-store', () => ({
  useTemplateStore: () => ({
    recentTemplates: [],
    loadTemplates: vi.fn(),
  }),
}))

vi.mock('@/components/analysis/common', () => ({
  StepHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <div data-testid="step-header">
      <span>{title}</span>
      {action}
    </div>
  ),
  CollapsibleSection: ({ label, children }: { label: string; children: ReactNode }) => (
    <div data-testid="collapsible-section">
      {label}
      {children}
    </div>
  ),
}))

vi.mock('@/components/common/analysis/DataPreviewTable', () => ({
  DataPreviewTable: () => null,
}))

vi.mock('@/components/analysis/steps/DataUploadStep', () => ({
  DataUploadStep: () => <div data-testid="data-upload-step" />,
}))

vi.mock('@/components/common/analysis/OutlierDetailPanel', () => ({
  OutlierDetailPanel: () => null,
}))

vi.mock('@/components/statistics/common/DataPrepGuide', () => ({
  DataPrepGuide: () => null,
}))

vi.mock('@/components/analysis/TemplateSelector', () => ({
  TemplateSelector: () => null,
}))

vi.mock('@/components/analysis/TemplateManagePanel', () => ({
  TemplateManagePanel: () => null,
}))

vi.mock('@/lib/utils/open-data-window', () => ({
  openDataWindow: vi.fn(),
}))

vi.mock('@/lib/utils/exploration-profile', () => ({
  getExplorationProfile: () => ({
    focusTabs: null,
    focusHint: null,
    dataPreview: 'primary',
    descriptiveStats: 'primary',
    assumptionTests: 'primary',
    distribution: 'primary',
    scatterplots: 'primary',
    correlationHeatmap: 'primary',
    defaultChartType: 'histogram',
  }),
}))

vi.mock('@/components/analysis/steps/exploration/DistributionChartSection', () => ({
  DistributionChartSection: () => null,
}))

vi.mock('@/components/analysis/steps/exploration/ScatterHeatmapSection', () => ({
  ScatterHeatmapSection: () => null,
}))

describe('DataExplorationStep terminology integration', () => {
  const defaultProps = {
    validationResults: null,
    data: [] as DataRow[],
  }

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

  it('renders empty state terminology', () => {
    render(<DataExplorationStep {...defaultProps} />)

    expect(screen.getByText('TEST_EXPLORATION_STEP')).toBeInTheDocument()
    expect(screen.getByText('TEST_EMPTY_DESC')).toBeInTheDocument()
  })

  it('renders empty state feature cards from terminology', () => {
    render(<DataExplorationStep {...defaultProps} />)

    expect(screen.getByText('TEST_DESCRIPTIVE')).toBeInTheDocument()
    expect(screen.getByText('TEST_DISTRIBUTION')).toBeInTheDocument()
    expect(screen.getByText('TEST_CORRELATION')).toBeInTheDocument()
  })

  it('renders upload step when onUploadComplete is provided', () => {
    render(<DataExplorationStep {...defaultProps} onUploadComplete={vi.fn()} />)

    expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
  })

  it('renders correlation card without legacy warning copy when numeric variables are insufficient', () => {
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

    expect(screen.queryByText('TEST_CORR_REQ')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST_NEXT_HINT')).not.toBeInTheDocument()
  })

  it('renders loaded-state terminology and header actions', () => {
    render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)

    expect(screen.getByText('TEST_STATUS_VARS_3_1')).toBeInTheDocument()
    expect(screen.getAllByText('TEST_FULL_DATA_4').length).toBeGreaterThan(0)
    expect(screen.getByText('TEST_COL_PANEL')).toBeInTheDocument()
  })

  it('prefers parent-provided next label over fallback copy', () => {
    render(
      <DataExplorationStep
        {...defaultProps}
        data={multiNumericData}
        validationResults={multiNumericValidation}
        onNext={vi.fn()}
        nextLabel="TEST_PARENT_NEXT"
      />,
    )

    expect(screen.getByText('TEST_PARENT_NEXT')).toBeInTheDocument()
    expect(screen.queryByText('TEST_LAYOUT_NEXT')).not.toBeInTheDocument()
  })

  it('renders compact column panel without duplicated summary metrics', () => {
    render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)

    expect(screen.getByText('TEST_COL_PANEL')).toBeInTheDocument()
    expect(screen.getByText('TEST_WARNING')).toBeInTheDocument()
    expect(screen.getByText('TEST_COL_LIST')).toBeInTheDocument()
    expect(screen.queryByText('TEST_SAMPLE')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST_TOTAL_COL')).not.toBeInTheDocument()
    expect(screen.queryByText('TEST_REC')).not.toBeInTheDocument()
  })

  it('renders summary values from terminology helpers', () => {
    render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)

    expect(screen.getByText('V3 / TEST_NO_OUTLIERS')).toBeInTheDocument()
    expect(screen.getByText('TEST_NORMALITY_TITLE / TEST_HOMOGENEITY_TITLE')).toBeInTheDocument()
    expect(screen.getByText('TEST_HISTOGRAM / TEST_BOXPLOT')).toBeInTheDocument()
    expect(screen.getByText('TEST_SCATTER / TEST_HEATMAP')).toBeInTheDocument()
  })

  it('does not fall back to legacy hardcoded column panel copy', () => {
    render(<DataExplorationStep {...defaultProps} data={multiNumericData} validationResults={multiNumericValidation} />)

    const legacyCopy = ['error', 'normal', 'numeric', 'categorical', 'sample', 'missing', 'total columns', 'recommended analysis', 'parametric', 'nonparametric']
    legacyCopy.forEach((text) => {
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    })
  })
})
