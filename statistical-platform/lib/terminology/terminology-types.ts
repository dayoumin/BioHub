/**
 * Terminology System Types
 *
 * 도메인별 용어 사전 시스템의 타입 정의
 * - 수산과학, 범용 통계 등 도메인에 따라 UI 텍스트를 동적으로 변경
 * - 타입 안전성을 보장하며 중앙 집중식 관리
 */

/**
 * 변수 타입별 용어
 */
export interface VariableTerminology {
  /** 변수 제목 */
  title: string
  /** 변수 설명 (예시 포함) */
  description: string
  /** 짧은 라벨 (공간이 제한된 곳에 사용) */
  shortLabel?: string
}

/**
 * 변수 선택기 용어 모음
 */
export interface VariableSelectorTerminology {
  /** 실험구/그룹 변수 */
  group: VariableTerminology
  /** 측정값/종속 변수 */
  dependent: VariableTerminology
  /** 요인 변수/독립 변수 */
  independent: VariableTerminology
  /** 처리 조건/요인 */
  factor: VariableTerminology
  /** 공변량 */
  covariate: VariableTerminology
  /** 시간 변수 */
  time: VariableTerminology
  /** 사건 변수 */
  event: VariableTerminology
  /** 대응 표본 - 첫 번째 측정 */
  pairedFirst: VariableTerminology
  /** 대응 표본 - 두 번째 측정 */
  pairedSecond: VariableTerminology
  /** 상관분석 변수 */
  correlation: VariableTerminology
}

/**
 * 유효성 검증 메시지
 */
export interface ValidationMessages {
  groupRequired: string
  dependentRequired: string
  independentRequired: string
  factorRequired: string
  twoGroupsRequired: (current: number) => string
  minVariablesRequired: (min: number) => string
  maxVariablesExceeded: (max: number) => string
  differentVariablesRequired: string
  noNumericVariables: string
  noCategoricalVariables: string
}

/**
 * 성공/완료 메시지
 */
export interface SuccessMessages {
  allVariablesSelected: string
  readyForAnalysis: string
  variablesSelected: (count: number) => string
  correlationPairsCount: (count: number) => string
  modelReady: (type: 'simple' | 'multiple', predictors: number) => string
}

/**
 * 변수 선택기 UI 텍스트
 */
export interface SelectorUIText {
  /** 제목 */
  titles: {
    groupComparison: string
    oneSample: string
    paired: string
    correlation: string
    multipleRegression: string
    twoWayAnova: string
  }
  /** 설명 */
  descriptions: {
    groupComparison: string
    oneSample: string
    paired: string
    correlation: string
    multipleRegression: string
    twoWayAnova: string
  }
  /** 버튼 텍스트 */
  buttons: {
    back: string
    runAnalysis: string
    selectAll: string
    clear: string
    swap: string
  }
  /** 기타 라벨 */
  labels: {
    selected: string
    compare: string
    across: string
    model: string
    levels: string
    groups: string
    numeric: string
    range: string
    mean: string
  }
}

/**
 * 통계 방법 용어
 */
export interface StatisticalMethodTerminology {
  /** 방법명 */
  name: string
  /** 짧은 설명 */
  description: string
  /** 사용 사례 예시 */
  useCase?: string
}

/**
 * 분석 목적 텍스트
 */
export interface AnalysisPurposeText {
  title: string
  description: string
  examples: string
}

/**
 * 분석 실행 단계 텍스트
 */
export interface ExecutionStageText {
  label: string
  message: string
}

/**
 * Smart Flow UI 텍스트
 */
export interface SmartFlowText {
  /** Step 제목 (전체) */
  stepTitles: {
    dataUpload: string
    dataExploration: string
    purposeInput: string
    variableSelection: string
    analysisExecution: string
    results: string
  }
  /** Step 짧은 라벨 (스테퍼 UI용) */
  stepShortLabels: {
    exploration: string
    method: string
    variable: string
    analysis: string
  }
  /** Status 메시지 */
  statusMessages: {
    analyzing: string
    analysisComplete: string
    uploadingData: string
    validatingData: string
  }
  /** 버튼 텍스트 */
  buttons: {
    runAnalysis: string
    reanalyze: string
    downloadResults: string
    backToHub: string
  }
  /** 결과 섹션 제목 */
  resultSections: {
    effectSizeDetail: string
  }
  /** 분석 실행 단계 */
  executionStages: {
    prepare: ExecutionStageText
    preprocess: ExecutionStageText
    assumptions: ExecutionStageText
    analysis: ExecutionStageText
    additional: ExecutionStageText
    finalize: ExecutionStageText
  }
  /** 레이아웃 UI 텍스트 */
  layout: {
    appTitle: string
    historyTitle: string
    historyClose: string
    historyCount: (n: number) => string
    aiChatbot: string
    helpLabel: string
    settingsLabel: string
    nextStep: string
    analyzingDefault: string
    dataSizeGuide: string
    currentLimits: string
    memoryRecommendation: string
    detectedMemory: (gb: number) => string
    /** 데이터 크기 제한 목록 */
    limitFileSize: string
    limitDataSize: string
    limitRecommended: string
    /** 메모리 티어별 권장 크기 */
    memoryTier4GB: string
    memoryTier8GB: string
    memoryTier16GB: string
    stepTooltip: (stepName: string) => string
  }
  /** 분석 실행 UI 텍스트 */
  execution: {
    runningTitle: string
    resumeButton: string
    pauseButton: string
    cancelButton: string
    pauseDisabledTooltip: string
    cancelConfirm: string
    logSectionLabel: (n: number) => string
    noLogs: string
    dataRequired: string
    unknownError: string
    estimatedTimeRemaining: (seconds: number) => string
  }
}

/**
 * 분석 목적 선택 UI 텍스트
 */
export interface PurposeInputText {
  /** 분석 목적 카드 (8개) */
  purposes: {
    compare: AnalysisPurposeText
    relationship: AnalysisPurposeText
    distribution: AnalysisPurposeText
    prediction: AnalysisPurposeText
    timeseries: AnalysisPurposeText
    survival: AnalysisPurposeText
    multivariate: AnalysisPurposeText
    utility: AnalysisPurposeText
  }
  /** 입력 모드 탭 */
  inputModes: {
    aiRecommend: string
    directSelect: string
    modeAriaLabel: string
  }
  /** 버튼 텍스트 */
  buttons: {
    back: string
    allMethods: string
    useThisMethod: string
  }
  /** 라벨 */
  labels: {
    selectionPrefix: string
    directBadge: string
    purposeHeading: string
  }
  /** 안내 메시지 */
  messages: {
    purposeHelp: string
    guidanceAlert: string
    aiRecommendError: string
    genericError: string
  }
  /** AI 추천 관련 라벨 */
  aiLabels: {
    recommendTitle: string
  }
}

/**
 * 적합도 점수 텍스트
 */
export interface FitScoreLevelText {
  label: string
  shortLabel: string
  description: string
}

export interface FitScoreText {
  levels: {
    excellent: FitScoreLevelText
    good: FitScoreLevelText
    caution: FitScoreLevelText
    poor: FitScoreLevelText
    unknown: FitScoreLevelText
  }
  confidenceLabel: string
}

/**
 * 분석 정보 카드 텍스트
 */
export interface AnalysisInfoText {
  cardTitle: string
  labels: {
    fileName: string
    dataSize: string
    method: string
    analysisTime: string
    dataQuality: string
    assumptions: string
    variables: string
  }
  variableRoles: {
    dependent: string
    independent: string
    group: string
    factor: string
    paired: string
  }
  dataQuality: {
    missingValues: (count: number, percent: string) => string
    duplicateRows: (count: number) => string
    warnings: (count: number) => string
  }
  assumptions: {
    normality: string
    homogeneity: string
    independence: string
    met: string
    partialViolation: string
    allGroupsNormal: string
    someGroupsNonNormal: string
  }
  units: {
    rows: string
    nVariables: (count: number) => string
  }
}

/**
 * 분석 히스토리 패널 텍스트
 */
export interface HistoryText {
  empty: {
    title: string
    description: string
  }
  recordCount: (n: number) => string
  buttons: {
    saveCurrent: string
    clearAll: string
    cancel: string
    save: string
    delete: string
  }
  labels: {
    filterByMethod: string
    showAll: string
    searchPlaceholder: string
    noMethod: string
    noPurpose: string
    current: string
    rows: string
    pValue: string
    effectSize: string
  }
  tooltips: {
    viewResults: string
    reanalyze: string
    delete: string
  }
  dialogs: {
    deleteTitle: string
    deleteDescription: string
    clearTitle: string
    clearDescription: (count: number) => string
    saveTitle: string
    saveDescription: string
    analysisName: string
    savePlaceholder: string
  }
}

/**
 * 메인 허브 UI 텍스트
 */
export interface HubText {
  hero: {
    heading: string
    subheading: string
    description: string
    statMethods: (count: number) => string
    statCategories: (count: number) => string
    statAi: string
    uploadButton: string
    browseButton: string
  }
  cards: {
    methodsTitle: string
    methodsDescription: (categories: number) => string
    methodsLink: string
    aiTitle: string
    aiDescription: string
    aiLink: string
    recentTitle: string
    viewAll: string
    historyLabel: string
    unknownMethod: string
    emptyTitle: string
    emptyDescription: string
  }
  quickAnalysis: {
    title: string
    emptyPlaceholder: string
    editTooltip: string
    editButton: string
    frequentlyUsed: string
  }
  aiSearch: {
    title: string
    description: string
    placeholder: string
    sendButton: string
    startButton: string
    alternatives: (count: number) => string
    detailedLink: string
  }
  editDialog: {
    title: string
    selectedCount: (count: number) => string
    cancel: string
    save: string
  }
  timeAgo: {
    justNow: string
    minutesAgo: (n: number) => string
    hoursAgo: (n: number) => string
    daysAgo: (n: number) => string
  }
  categoryLabels: Record<string, string>
  entryPoints: {
    dataUpload: string
    aiRecommend: string
    methodSelect: string
    history: string
  }
  quickMethodNames: Record<string, string>
}

/**
 * 가이드 질문 UI 텍스트
 */
export interface GuidedQuestionsText {
  assumptionLabels: {
    normality: string
    homogeneity: string
  }
  assumptionStatus: {
    met: string
    violated: string
    needsCheck: string
  }
  badges: {
    manualOverride: string
  }
  buttons: {
    modify: string
    autoApply: string
    browseAll: string
    directSelect: string
    back: string
    next: string
    close: string
    collapse: string
    expand: string
  }
  tooltips: {
    switchToClassic: string
    switchToConversational: string
  }
  sections: {
    assumptionResults: string
    advancedOptions: string
  }
  card: {
    title: string
    description: string
  }
}

/**
 * 데이터 탐색 단계 UI 텍스트
 */
export interface DataExplorationText {
  /** 데이터 없을 때 */
  empty: {
    title: string
    description: string
  }
  /** 지원 기능 카드 */
  features: {
    descriptiveTitle: string
    descriptiveDesc: string
    distributionTitle: string
    distributionDesc: string
    correlationTitle: string
    correlationDesc: string
  }
  /** 탭 라벨 */
  tabs: {
    dataSummary: string
    fullDataView: (n: number) => string
    statistics: string
    preview: string
  }
  /** 기초 통계량 테이블 헤더 */
  headers: {
    variableName: string
    count: string
    mean: string
    stdDev: string
    median: string
    min: string
    max: string
    skewness: string
    kurtosis: string
    outliers: string
  }
  /** 해석 가이드 */
  interpretGuide: {
    title: string
    skewness: string
    kurtosis: string
    outlierDef: string
    nDef: string
  }
  /** 이상치 */
  outlier: {
    detected: (varCount: number, totalCount: number) => string
    variableDetail: (name: string, count: number) => string
    moreVars: (count: number) => string
    count: (n: number) => string
    info: (count: number, lower: string, upper: string) => string
  }
  /** 차트 타입 */
  chartTypes: {
    histogram: string
    boxplot: string
    ariaLabel: string
  }
  /** 데이터 분포 시각화 */
  distribution: {
    title: string
    description: string
  }
  /** 히스토그램 */
  histogram: {
    title: (varName: string) => string
    yAxisLabel: string
  }
  /** 박스플롯 */
  boxplot: {
    selectInstruction: string
    singleTitle: (varName: string) => string
    multipleTitle: (count: number) => string
  }
  /** 산점도 / 상관 탭 */
  scatterTabs: {
    scatter: string
    heatmap: string
  }
  /** 산점도 */
  scatter: {
    variableRelation: string
    xAxis: string
    yAxis: string
  }
  /** 상관계수 */
  correlation: {
    coefficient: string
    determination: string
    strong: string
    medium: string
    weak: string
  }
  /** 상관 히트맵 */
  heatmap: {
    title: string
    description: string
    calculating: string
    variableCount: (n: number) => string
  }
  /** 히트맵 해석 가이드 */
  heatmapGuide: {
    title: string
    strongPositive: string
    strongNegative: string
    noCorrelation: string
    veryStrong: string
  }
  /** 주요 상관관계 */
  strongCorrelations: {
    title: string
  }
  /** 상관 강도 라벨 */
  strength: {
    weak: string
    medium: string
    strong: string
    veryStrong: string
  }
  /** 가정 검정 */
  assumptions: {
    loading: string
    loadingDescription: string
    badge: string
    title: string
    description: string
    passed: string
    failed: string
  }
  /** 정규성 검정 */
  normality: {
    title: string
    normal: string
    nonNormal: string
    statLabel: string
    normalInterpretation: string
    nonNormalInterpretation: string
  }
  /** 등분산성 검정 */
  homogeneity: {
    title: string
    equal: string
    unequal: string
    statLabel: string
    equalInterpretation: string
    unequalInterpretation: string
  }
  /** 하이라이트 */
  highlight: {
    description: (column: string, count: number) => string
    clearButton: string
    notFound: string
  }
  /** 데이터 미리보기 */
  preview: {
    title: string
    topN: (n: number) => string
    viewAll: (n: number) => string
    fullDataInstruction: (n: number) => string
  }
  /** 경고 */
  warnings: {
    fewNumericVars: string
    correlationRequires: string
    currentStatus: (numeric: number, categorical: number) => string
    nextStepHint: string
  }
  /** 단위/기타 */
  fallbackFileName: string
}

/**
 * 결과 표시 UI 텍스트
 */
export interface ResultsText {
  /** 효과크기 해석 라벨 */
  effectSizeLabels: {
    small: string
    medium: string
    large: string
    veryLarge: string
  }
  /** 결과 없을 때 */
  noResults: string
  /** 핵심 결론 */
  conclusion: {
    assumptionWarning: string
    significant: string
    notSignificant: string
  }
  /** 통계량 카드 */
  statistics: {
    statistic: string
    statisticTooltip: string
    pValue: string
    pValueTooltip: string
    effectSize: string
    effectSizeTooltip: string
    significant: string
    notSignificant: string
  }
  /** AI 해석 */
  ai: {
    loading: string
    detailedLabel: string
    reinterpret: string
    retry: string
    defaultError: string
  }
  /** 섹션 라벨 */
  sections: {
    detailedResults: string
    confidenceInterval: string
    apaFormat: string
    diagnostics: string
    caution: string
    recommendations: string
    warnings: string
    alternatives: string
  }
  /** 메타데이터 라벨 */
  metadata: {
    file: string
    data: string
    variables: string
    rowsCols: (rows: number, cols: number) => string
  }
  /** 액션 버튼 */
  buttons: {
    saved: string
    save: string
    generating: string
    pdf: string
    copied: string
    copy: string
    saveTemplate: string
    reanalyze: string
    newAnalysis: string
  }
  /** 저장 관련 */
  save: {
    defaultName: (date: string) => string
    promptMessage: string
    success: string
    errorTitle: string
    unknownError: string
  }
  /** 토스트 메시지 */
  toast: {
    reanalyzeReady: string
    reanalyzeMethod: (name: string) => string
    newAnalysis: string
    pdfSuccess: string
    pdfError: string
    copyWithAi: string
    copySuccess: string
    copyError: string
    templateSaved: string
  }
  /** 클립보드 내보내기 */
  clipboard: {
    itemHeader: string
    valueHeader: string
    statistic: (name: string) => string
    df: string
    effectSize: string
    confidenceInterval: string
    interpretation: string
    aiInterpretation: string
    aiSeparator: string
  }
}

/**
 * 데이터 업로드 UI 텍스트
 */
export interface DataUploadText {
  /** 에러 메시지 */
  errors: {
    fileTooLarge: (maxMB: number) => string
    fileSizeExceeded: string
    currentFileSize: (sizeMB: string) => string
    validationFailed: string
    noDataInFile: string
    noDataTitle: string
    noValidData: string
    tooManyRows: (maxRows: string) => string
    dataSizeExceeded: string
    currentRowCount: (rows: string) => string
    processingError: string
    excelValidationFailed: string
    excelFileError: string
    excelProcessingError: string
    unsupportedFormat: string
    unsupportedFormatTitle: string
    csvRequired: string
    sheetProcessingError: string
  }
  /** 성공 메시지 */
  success: {
    fileUploaded: string
    excelFileUploaded: string
    sheetLoaded: string
    dataLoaded: (rows: string) => string
  }
  /** 버튼 텍스트 */
  buttons: {
    selectFile: string
    changeFile: string
    uploading: string
    loading: string
    cancel: string
    loadSelectedSheet: string
    deleteRecentFile: string
  }
  /** 라벨 */
  labels: {
    dragOrClick: string
    dropHere: string
    fileSpecifications: string
    recentFiles: string
    recentFilesNote: string
    selectSheet: string
    sheetsFound: (count: number) => string
    selectSheetPlaceholder: string
    sheetInfo: (name: string, rows: string, cols: number) => string
    processing: (current: string, total: string) => string
    estimatedTime: (seconds: number) => string
    analyzing: string
    helpText: string
    fileMetadata: (rows: string, size: string, time: string) => string
  }
  /** 경고 */
  warnings: {
    highMemoryTitle: string
    highMemoryDescription: string
  }
  /** 토스트 */
  toast: {
    selectSheet: string
    sheetsFoundDescription: (count: number) => string
  }
}

/**
 * 데이터 검증 UI 텍스트
 */
export interface DataValidationText {
  /** 상태 메시지 */
  status: {
    dataRequired: string
    failed: string
    warningComplete: string
    readyComplete: string
  }
  /** 라벨 */
  labels: {
    sampleSize: string
    analyzableVariables: string
    numeric: string
    categorical: string
    dataQuality: string
    uploadedFile: string
    missing: string
    columnsCount: (count: number) => string
    otherVariables: (count: number) => string
  }
  /** 뱃지 */
  badges: {
    largeSample: string
    smallSample: string
    numeric: string
    categorical: string
    idSequential: string
  }
  /** 데이터 품질 */
  quality: {
    perfect: string
    good: string
    caution: string
  }
  /** 단위 */
  units: {
    count: string
  }
  /** 섹션 제목 */
  sections: {
    needsAttention: string
    variableSummary: string
  }
  /** 테이블 헤더 */
  table: {
    variableName: string
    type: string
    uniqueValues: string
    missing: string
    excluded: string
  }
  /** ID 감지 */
  idDetection: {
    label: string
    heading: string
    explanation: string
  }
  /** 분석 추천 */
  recommendations: {
    title: string
    hint: string
    twoGroupComparison: string
    multiGroupComparison: string
    correlation: string
    regression: string
    chiSquare: string
  }
  /** 경고 */
  warnings: {
    canContinue: string
  }
  /** 폴백 */
  fallback: {
    noFileName: string
  }
}

/**
 * 자연어 입력 UI 텍스트
 */
export interface NaturalLanguageInputText {
  /** 설명 */
  description: string
  /** 데이터 요약 */
  dataSummary: {
    dimension: (rows: number, cols: number) => string
    numeric: (count: number) => string
    categorical: (count: number) => string
    privacyNotice: string
  }
  /** 입력 영역 */
  input: {
    placeholder: string
    sendHint: string
    newlineHint: string
  }
  /** 예시 라벨 */
  examplesLabel: string
  /** 예시 프롬프트 */
  examples: string[]
  /** 로딩 메시지 */
  loadingMessages: string[]
  /** 에러 */
  error: {
    title: string
  }
  /** AI 분석 */
  aiAnalysis: {
    label: string
  }
  /** 추천 결과 */
  recommendation: {
    badgeLabel: string
    confidenceUnit: string
    reasoningTitle: string
    variableAssignmentTitle: string
    preprocessingTitle: (count: number) => string
    alternativesTitle: (count: number) => string
    variableRoles: {
      dependent: string
      independent: string
      factor: string
      covariate: string
      within: string
      between: string
    }
  }
  /** 버튼 */
  buttons: {
    getRecommendation: string
    analyzing: string
    goToGuided: string
    selectMethod: string
    retry: string
    select: string
    guidedQuestions: string
    browseAll: string
  }
  /** Provider 라벨 */
  providers: {
    keyword: string
  }
}

/**
 * 분석 방법 선택기 UI 텍스트
 */
export interface MethodSelectorText {
  /** 검색 */
  searchPlaceholder: string
  /** 카운트 */
  methodCount: (count: number) => string
  searchPrefix: string
  selected: string
  /** 뱃지 */
  recommendedBadge: string
  requirementNotMet: string
  /** 접기/펼치기 */
  showBrief: string
  showDetails: string
  /** 요구사항 */
  noDataProfile: string
  fitScoreDetails: string
  sampleSizeRequirement: (rows: number, min: number) => string
  numericVarsCount: (count: number) => string
  categoricalVarsCount: (count: number) => string
  /** 가정 검정 */
  assumptions: {
    normality: string
    homogeneity: string
    needsTest: string
    met: string
    notMet: string
  }
  /** 그룹 제목 */
  aiRecommended: (count: number) => string
  otherMethods: (count: number) => string
  /** 빈 상태 */
  noSearchResults: (query: string) => string
  clearSearch: string
}

/**
 * 방법 브라우저 UI 텍스트
 */
export interface MethodBrowserText {
  /** 호환성 뱃지 */
  compatibilityStatus: {
    warning: string
    incompatible: string
  }
  /** 툴팁 */
  tooltips: {
    warning: string
    incompatible: string
  }
  /** AI 추천 */
  aiRecommendation: {
    label: string
    badge: string
  }
  /** 검색 */
  searchPlaceholder: string
  /** 라벨 */
  selectedLabel: string
  selectedPrefix: string
  methodsLabel: string
  requirementsNotMet: string
  /** 버튼 */
  useThisButton: string
  /** 빈 상태 */
  noResultsMessage: (query: string) => string
  clearSearchButton: string
}

/**
 * 템플릿 UI 텍스트
 */
export interface TemplateText {
  saveTitle: string
  saveDescription: string
  manageTitle: string
  manageDescription: string
  editTitle: string
  editDescription: string
  savedTemplates: string
  loading: string
  templateCount: (count: number) => string
  usageCount: (count: number) => string
  usageCountShort: (count: number) => string
  methodCategories: Record<string, string>
  variableLabels: {
    dependent: string
    independent: string
    group: string
    factor: string
  }
  labels: {
    nameRequired: string
    descriptionOptional: string
    name: string
    description: string
  }
  placeholders: {
    name: string
    description: string
    search: string
  }
  buttons: {
    cancel: string
    save: string
    saving: string
    edit: string
    delete: string
    deleteAll: string
    deleteAllConfirm: string
    viewAll: string
  }
  errors: {
    nameRequired: string
    settingsIncomplete: string
    saveFailed: string
  }
  sortOptions: Record<string, string>
  timeAgo: {
    justNow: string
    minutesAgo: (n: number) => string
    hoursAgo: (n: number) => string
    daysAgo: (n: number) => string
  }
  empty: {
    title: string
    description: string
  }
  dialogs: {
    deleteTitle: string
    deleteConfirm: (name: string) => string
    clearTitle: string
    clearConfirm: (count: number) => string
    irreversible: string
  }
}

/**
 * 수치형 통계 테이블 텍스트
 */
export interface NumericStatsText {
  title: string
  headers: {
    variableName: string
    mean: string
    median: string
    stdDev: string
    cv: string
    skewness: string
    kurtosis: string
    min: string
    max: string
    outliers: string
  }
  explanation: {
    cvLabel: string
    cvDescription: string
    skewnessLabel: string
    skewnessNormal: string
    skewnessModerate: string
    skewnessSevere: string
    kurtosisLabel: string
    kurtosisNormal: string
    kurtosisModerate: string
    kurtosisSevere: string
  }
  problemGuide: {
    title: string
    skewnessTitle: string
    skewnessPositive: string
    skewnessNegative: string
    skewnessAlternative: string
    kurtosisTitle: string
    kurtosisHigh: string
    kurtosisLow: string
    kurtosisAlternative: string
    outlierTitle: string
    outlierIdentify: string
    outlierTreatment: string
    outlierAlternative: string
    generalTitle: string
    generalCompare: string
    generalNonParametric: string
    generalPreserveOriginal: string
    generalCLT: string
  }
}

export interface MethodDescriptionPair {
  name: string
  description: string
}

/**
 * 가정검정 결과 패널 텍스트
 */
export interface AssumptionsText {
  parametricAvailable: string
  nonParametricRecommended: string
  violationsFound: string
  recommendedMethods: string
  violationKeywords: {
    normality: string
    homogeneity: string
    outlier: string
    sampleSize: string
    etcSuffix: string
  }
  badges: {
    correlationAvailable: string
    groupComparisonAvailable: string
    regressionAvailable: string
  }
  parametricMethods: {
    tTest: MethodDescriptionPair
    anova: MethodDescriptionPair
    linearRegression: MethodDescriptionPair
  }
  nonParametricMethods: {
    mannWhitney: MethodDescriptionPair
    kruskalWallis: MethodDescriptionPair
    spearman: MethodDescriptionPair
    robustRegression: MethodDescriptionPair
  }
}

/**
 * 데이터 편집 가이드 텍스트
 */
export interface DataEditGuideText {
  title: string
  introMessage: string
  warningMessage: string
  normality: {
    title: string
    methodsLabel: string
    logTransform: string
    sqrtTransform: string
    boxCoxTransform: string
  }
  outlierHandling: {
    title: string
    methodsLabel: string
    removal: string
    winsorization: string
    iqrMethod: string
  }
  missingValues: {
    title: string
    methodsLabel: string
    meanImputation: string
    medianImputation: string
    deletion: string
  }
}

/**
 * 이상치 분석 텍스트
 */
export interface OutlierText {
  title: string
  detectionMethod: string
  position: string
  outlierValues: string
  noOutliers: string
  treatmentTitle: string
  treatmentUnder5: string
  treatment5to10: string
  treatmentOver10: string
  outlierCount: (count: number, percent: number) => string
  lowerCount: (count: number) => string
  upperCount: (count: number) => string
  moreValues: (count: number) => string
}

/**
 * 범주형 변수 빈도 분석 텍스트
 */
export interface CategoricalText {
  title: string
  skewedDistribution: string
  sparseCategory: string
  emptyValue: string
  noFrequencyInfo: string
  categoryCount: (count: number) => string
  itemCount: (count: number) => string
  moreCategories: (count: number) => string
  missingCount: (count: number) => string
}

/**
 * 추가 기초 통계 텍스트
 */
export interface AdditionalStatsText {
  title: string
  labels: {
    quartileRange: string
    iqr: string
    range: string
    standardError: string
    confidenceInterval: string
  }
}

/**
 * 검증 상세 UI 텍스트 (6개 하위 컴포넌트)
 */
export interface ValidationDetailsText {
  numericStats: NumericStatsText
  assumptions: AssumptionsText
  dataEditGuide: DataEditGuideText
  outlier: OutlierText
  categorical: CategoricalText
  additional: AdditionalStatsText
}

/**
 * 검증 요약 UI 텍스트
 */
export interface ValidationSummaryText {
  detailAnalysisTitle: (columnName: string) => string
  chartTypes: {
    histogram: string
    boxplot: string
    ariaLabel: string
  }
  histogramHoverTemplate: string
  heatmapHoverTemplate: string
  axisLabels: {
    frequency: string
  }
  statistics: {
    mean: string
    stdDev: string
    minMax: string
    outliers: string
    meanLabel: string
    stdDevLabel: string
    modeLabel: string
    frequencyLabel: string
  }
  outlierCount: (count: number) => string
  categoryFrequencyTitle: string
  mixedTypeMessage: string
  correlationTitle: string
  tableHeaders: {
    variableName: string
    type: string
    missingValues: string
    uniqueValues: string
    statistics: string
    actions: string
  }
  typeLabels: {
    numeric: string
    categorical: string
    mixed: string
  }
  viewDetailAriaLabel: (name: string) => string
  buttons: {
    view: string
  }
  cardTitle: string
  errorCount: (count: number) => string
  warningCount: (count: number) => string
  statusNormal: string
  summaryLabels: {
    totalRows: string
    totalColumns: string
    missingValues: string
    duplicateRows: string
  }
  sectionLabels: {
    errors: string
    warnings: string
  }
  allPassedMessage: string
}

/**
 * 결과 시각화 UI 텍스트
 */
export interface ResultsVisualizationText {
  labels: {
    mean: string
    sampleSize: string
    data: string
  }
  significantDifference: (pValue: string) => string
  groupComparison: { title: string }
  correlation: {
    title: string
    coefficientLabel: string
    determinationLabel: string
  }
  regression: {
    title: string
    independentVar: string
    dependentVar: string
    regressionLine: string
    equationLabel: string
  }
  nonparametric: {
    title: string
    medianMean: string
  }
  pca: {
    title: string
    individualVariance: string
    cumulativeVariance: string
    noDataMessage: string
    summary: (componentCount: number, totalPercent: string) => string
  }
  cluster: {
    title: string
    dimension1: string
    dimension2: string
    clusterCount: string
  }
  reliability: {
    title: string
    itemLabel: (index: number) => string
    noDataMessage: string
    acceptable: string
    low: string
  }
  power: {
    title: string
    powerLabel: string
    currentPower: string
    requiredSampleSize: string
  }
  fallback: {
    title: string
    preparing: (method: string) => string
    seeBelow: string
  }
}

/**
 * 방법별 결과 메트릭 텍스트
 */
export interface MethodSpecificResultsText {
  regression: {
    sectionTitle: string
    rSquaredTooltip: string
    adjRSquaredTooltip: string
    rmseTooltip: string
    aicTooltip: string
    bicTooltip: string
    interceptLabel: string
    interceptTooltip: string
    vifWarningTitle: string
    vifWarningMessage: (count: number) => string
  }
  classification: {
    sectionTitle: string
    accuracyLabel: string
    accuracyTooltip: string
    precisionLabel: string
    precisionTooltip: string
    recallLabel: string
    recallTooltip: string
    f1Tooltip: string
    rocAucTooltip: string
    confusionMatrixLabel: string
    predicted: (index: number) => string
    actual: (index: number) => string
  }
  pca: {
    sectionTitle: string
    varianceExplainedLabel: string
    cumulativePrefix: string
    eigenvalueLabel: (index: number) => string
    eigenvalueTooltip: (index: number, meetsKaiser: boolean) => string
  }
  cluster: {
    sectionTitle: string
    silhouetteTooltip: string
    dataCountLabel: string
    dataCountTooltip: string
    clusterCountLabel: string
    clusterCountTooltip: string
  }
  descriptive: {
    sectionTitle: string
    meanLabel: string
    meanTooltip: string
    medianLabel: string
    medianTooltip: string
    stdDevLabel: string
    stdDevTooltip: string
    skewnessLabel: string
    skewnessTooltip: string
    kurtosisLabel: string
    kurtosisTooltip: string
    sampleSizeLabel: string
    sampleSizeTooltip: string
  }
  reliability: {
    sectionTitle: string
    alphaTooltip: string
    itemCountLabel: string
    itemCountTooltip: string
  }
  power: {
    sectionTitle: string
    powerLabel: string
    powerTooltip: string
    requiredSampleLabel: string
    requiredSampleTooltip: string
    analysisSampleLabel: string
    analysisSampleTooltip: string
  }
}

/**
 * 추천 방법 UI 텍스트
 */
export interface RecommendedMethodsText {
  smartRecommend: string
  hide: string
  show: string
  methodCount: (count: number) => string
  aiRecommendTitle: string
  recommendedBadge: string
  showBrief: string
  showDetails: string
  noDataProfile: string
  fitScoreDetails: string
  sampleSize: (rows: number, minRequired: number) => string
  numericVars: (count: number) => string
  categoricalVars: (count: number) => string
  assumptionLabels: {
    normality: string
    homogeneity: string
  }
  assumptionStatus: {
    needsCheck: string
    met: string
    normalityFailed: string
    homogeneityFailed: string
  }
}

/**
 * 대화형 질문 UI 텍스트
 */
export interface ConversationalQuestionText {
  aiAnalyzed: string
  aiRecommendNeedsCheck: string
  aiReferenceInfo: string
  recommendedBadge: string
  keyboardHint: (optionCount: number) => string
}

/**
 * 변수 매핑 표시 UI 텍스트
 */
export interface VariableMappingText {
  title: string
  editButton: string
  hideButton: string
  roles: {
    dependent: string
    independent: string
    group: string
    time: string
    variableList: string
  }
  autoMappingHint: string
}

/**
 * 질문 흐름 내비게이션 UI 텍스트
 */
export interface QuestionFlowNavText {
  backToPurpose: string
  previous: string
  restart: string
  keyboardHint: string
  viewResults: string
  next: string
}

/**
 * 재분석 패널 UI 텍스트
 */
export interface ReanalysisText {
  title: string
  description: string
  savedVariableSettings: string
  variableRoles: Record<string, string>
  allVariablesMatch: string
  matchedCount: (n: number) => string
  typeMismatchWarning: (n: number) => string
  readyToAnalyze: string
  typeCaution: string
  analyzing: string
  runAnalysis: string
  variablesMismatch: string
  missingVariables: (required: number, missing: number) => string
  pleaseReselectVariables: string
  editVariables: string
  fixMappingFirst: string
}

/**
 * 통계 방법 관리 시트 UI 텍스트
 */
export interface MethodManagerText {
  title: string
  startAnalysis: (categoryTitle: string) => string
  notReady: string
}

/**
 * 전체 용어 사전 인터페이스
 */
export interface TerminologyDictionary {
  /** 도메인 식별자 */
  domain: 'aquaculture' | 'generic' | 'medical' | string
  /** 도메인 표시명 */
  displayName: string
  /** 변수 용어 */
  variables: VariableSelectorTerminology
  /** 유효성 검증 메시지 */
  validation: ValidationMessages
  /** 성공 메시지 */
  success: SuccessMessages
  /** Selector UI 텍스트 */
  selectorUI: SelectorUIText
  /** Smart Flow UI 텍스트 */
  smartFlow: SmartFlowText
  /** 분석 목적 선택 UI 텍스트 */
  purposeInput: PurposeInputText
  /** 적합도 점수 텍스트 */
  fitScore: FitScoreText
  /** 분석 정보 카드 텍스트 */
  analysisInfo: AnalysisInfoText
  /** 분석 히스토리 텍스트 */
  history: HistoryText
  /** 메인 허브 텍스트 */
  hub: HubText
  /** 가이드 질문 텍스트 */
  guidedQuestions: GuidedQuestionsText
  /** 데이터 탐색 텍스트 */
  dataExploration: DataExplorationText
  /** 결과 표시 텍스트 */
  results: ResultsText
  /** 데이터 업로드 텍스트 */
  dataUpload: DataUploadText
  /** 데이터 검증 텍스트 */
  dataValidation: DataValidationText
  /** 자연어 입력 텍스트 */
  naturalLanguageInput: NaturalLanguageInputText
  /** 방법 선택기 텍스트 */
  methodSelector: MethodSelectorText
  /** 방법 브라우저 텍스트 */
  methodBrowser: MethodBrowserText
  /** 템플릿 텍스트 */
  template: TemplateText
  /** 검증 상세 텍스트 */
  validationDetails: ValidationDetailsText
  /** 검증 요약 텍스트 */
  validationSummary: ValidationSummaryText
  /** 결과 시각화 텍스트 */
  resultsVisualization: ResultsVisualizationText
  /** 방법별 결과 텍스트 */
  methodSpecificResults: MethodSpecificResultsText
  /** 추천 방법 텍스트 */
  recommendedMethods: RecommendedMethodsText
  /** 대화형 질문 텍스트 */
  conversationalQuestion: ConversationalQuestionText
  /** 변수 매핑 텍스트 */
  variableMapping: VariableMappingText
  /** 질문 흐름 내비게이션 텍스트 */
  questionFlowNav: QuestionFlowNavText
  /** 재분석 텍스트 */
  reanalysis: ReanalysisText
  /** 방법 관리 텍스트 */
  methodManager: MethodManagerText
  /** 통계 방법 용어 (선택적) */
  methods?: Record<string, StatisticalMethodTerminology>
}

/**
 * Terminology Context Value
 */
export interface TerminologyContextValue {
  /** 현재 용어 사전 */
  dictionary: TerminologyDictionary
  /** 도메인 변경 함수 */
  setDomain: (domain: string) => void
  /** 현재 도메인 */
  currentDomain: string
}
