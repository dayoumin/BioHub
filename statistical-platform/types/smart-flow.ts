import { LucideIcon } from 'lucide-react'

export interface StepConfig {
  id: number
  name: string
  icon: LucideIcon
  description: string
}

export interface ValidationResults {
  isValid: boolean
  totalRows: number
  totalColumns?: number // Alias for columnCount
  columnCount: number
  missingValues: number
  duplicateRows?: number
  dataType: string
  variables: string[]
  errors: string[]
  warnings: string[]
  columns?: ColumnStatistics[] // Alias for columnStats (backward compatibility)
  columnStats?: ColumnStatistics[]
  // 가정 검정 결과 (Step 2에서 표시)
  assumptionTests?: StatisticalAssumptions
  // 시각화 데이터 (Step 2에서 표시)
  visualizationData?: {
    histograms?: Array<{
      variable: string
      data: number[]
      bins: number
    }>
    boxPlots?: Array<{
      variable: string
      data: number[]
      outliers?: number[]
    }>
  }
}

export interface ColumnStatistics {
  name: string
  type: 'numeric' | 'categorical' | 'mixed'
  numericCount: number
  textCount: number
  missingCount: number
  uniqueValues: number
  count?: number  // Total count of values
  // ID/일련번호 감지 결과
  idDetection?: {
    isId: boolean
    reason: string
    confidence: number
    source: 'name' | 'value' | 'none'
  }
  // 수치형 변수일 경우
  mean?: number
  median?: number
  std?: number
  min?: number
  max?: number
  q1?: number
  q3?: number
  q25?: number
  q75?: number
  skewness?: number
  kurtosis?: number
  cv?: number  // Coefficient of Variation
  outliers?: number[]
  // 범주형 변수일 경우
  topCategories?: { value: string; count: number }[]
  topValues?: { value: string; count: number }[]
}

export interface AnalysisConfig {
  purpose: string
  selectedMethod: StatisticalMethod | null
  parameters?: Record<string, string | number | boolean>
}

export interface StatisticalMethod {
  id: string
  name: string
  description: string
  category:
    | 'descriptive'
    | 't-test'
    | 'anova'
    | 'regression'
    | 'correlation'
    | 'chi-square'
    | 'nonparametric'
    | 'advanced'
    | 'timeseries'
    | 'pca'
    | 'clustering'
    | 'psychometrics'
    | 'design'
    | 'survival'
  subcategory?: string
  requirements?: {
    minSampleSize?: number
    variableTypes?: string[]
    assumptions?: string[]
  }
}

/**
 * 경고/알림 항목 (StatisticalMethod와 별도 타입)
 */
export interface MethodWarning {
  id: string
  name: string
  description: string
  type: 'warning' | 'info' | 'recommendation'
}

/**
 * 통계 메서드 또는 경고 (UI 표시용 유니온 타입)
 */
export type MethodOrWarning = StatisticalMethod | MethodWarning

/**
 * 분석 목적 타입 (Decision Tree 선택지)
 */
export type AnalysisPurpose =
  | 'compare'       // 그룹 간 차이 비교
  | 'relationship'  // 변수 간 관계 분석
  | 'distribution'  // 분포와 빈도 분석
  | 'prediction'    // 예측 모델링
  | 'timeseries'    // 시계열 분석
  | 'survival'      // 생존 분석
  | 'multivariate'  // 다변량 분석 (PCA, 요인분석, 군집, 판별)
  | 'utility'       // 유틸리티 (검정력 분석, 신뢰도 분석)

/**
 * 변수 선택 정보 (Step 3에서 사용)
 */
export interface VariableSelection {
  /** 분석 목적 */
  purpose: AnalysisPurpose
  /** 그룹 변수 (독립 변수) - 그룹 간 차이 비교용 */
  groupVariable?: string
  /** 종속 변수 - 비교할 값 */
  dependentVariable?: string
  /** 변수 목록 - 상관분석용 (2개 이상) */
  variables?: string[]
  /** 공변량 - ANCOVA 등에서 사용 */
  covariates?: string[]
}

/**
 * AI 추천 결과
 */
export interface AIRecommendation {
  /** 추천 방법 */
  method: StatisticalMethod
  /** 신뢰도 (0-1 범위, LLM 반환값 그대로. UI에서 Math.round(confidence * 100)으로 표시) */
  confidence: number
  /** 추천 이유 목록 */
  reasoning: string[]
  /** 추천 근거 검증용 키워드 (Phase 4 검증용) */
  expectedReasoningKeywords?: string[]
  /** 가정 검정 결과 */
  assumptions: {
    name: string
    passed: boolean
    pValue?: number
  }[]
  /** 대안 방법 목록 (옵션) */
  alternatives?: StatisticalMethod[]
  /** 감지된 변수 정보 (옵션) */
  detectedVariables?: {
    groupVariable?: {
      name: string
      uniqueValues: (string | number)[]
      count: number
    }
    dependentVariables?: string[]
  }

  // === LLM Enhanced Recommendation fields ===

  /** LLM이 추천한 변수 할당 (실제 데이터 컬럼명 → 역할 매핑) */
  variableAssignments?: {
    dependent?: string[]
    independent?: string[]
    factor?: string[]
    covariate?: string[]
    within?: string[]
    between?: string[]
  }
  /** 분석 설정 제안 */
  suggestedSettings?: SuggestedSettings
  /** 데이터/가정 관련 경고 */
  warnings?: string[]
  /** 전처리 제안 */
  dataPreprocessing?: string[]
  /** 모호성 감지 노트 (질문이 여러 관점 포함 시) */
  ambiguityNote?: string
}

/**
 * LLM이 추천한 분석 설정 (Step 2 → Step 4 전달용)
 */
export interface SuggestedSettings {
  alpha?: number
  postHoc?: string
  alternative?: 'two-sided' | 'less' | 'greater'
  [key: string]: unknown
}

/**
 * 통계적 가정 검정 요약
 */
export interface StatisticalAssumptionsSummary {
  meetsAssumptions: boolean
  recommendation: string
  canUseParametric: boolean
  reasons: string[]
  recommendations: string[]
  violations?: string[]
}

/**
 * 통계적 가정 검정 결과
 */
export interface StatisticalAssumptions {
  normality?: {
    // 그룹별 정규성 검정 (t-test, ANOVA 등)
    group1?: {
      statistic?: number
      pValue?: number
      isNormal: boolean
      interpretation?: string
    }
    group2?: {
      statistic?: number
      pValue?: number
      isNormal: boolean
      interpretation?: string
    }
    // 검정 방법별 상세 결과
    shapiroWilk?: {
      statistic?: number
      pValue?: number
      isNormal: boolean
    }
    kolmogorovSmirnov?: {
      statistic?: number
      pValue?: number
      isNormal: boolean
    }
  }
  homogeneity?: {
    levene?: {
      statistic?: number
      pValue?: number
      equalVariance: boolean
    }
    bartlett?: {
      statistic?: number
      pValue?: number
      equalVariance: boolean
    }
  }
  independence?: {
    durbin?: {
      statistic?: number
      pValue?: number
      isIndependent: boolean
    }
  }
  // 선형성 (회귀분석)
  linearity?: {
    passed: boolean
    statistic?: number
    pValue?: number
    interpretation?: string
  }
  // 구형성 (반복측정 ANOVA)
  sphericity?: {
    mauchly?: {
      statistic?: number
      pValue?: number
      passed: boolean
    }
    epsilonGG?: number // Greenhouse-Geisser epsilon
    epsilonHF?: number // Huynh-Feldt epsilon
  }
  // 비례 오즈 가정 (순서형 로지스틱 회귀)
  proportionalOdds?: {
    brant?: {
      statistic?: number
      pValue?: number
      passed: boolean
    }
  }
  // 과분산 검정 (포아송/음이항 회귀)
  overdispersion?: {
    dispersionRatio?: number // variance/mean ratio
    detected: boolean
  }
  // 비례위험 가정 (Cox 회귀)
  proportionalHazards?: {
    schoenfeld?: {
      statistic?: number
      pValue?: number
      passed: boolean
    }
  }
  // 정상성 (시계열)
  stationarity?: {
    adf?: {
      statistic?: number
      pValue?: number
      isStationary: boolean
    }
    kpss?: {
      statistic?: number
      pValue?: number
      isStationary: boolean
    }
  }
  // 백색잡음 (시계열 잔차)
  whiteNoise?: {
    ljungBox?: {
      statistic?: number
      pValue?: number
      isWhiteNoise: boolean
    }
  }
  // 계절성 (시계열)
  seasonality?: {
    detected: boolean
    period?: number
  }
  summary?: StatisticalAssumptionsSummary
}

/**
 * 효과크기 정보
 */
export interface EffectSizeInfo {
  value: number
  type: string  // "Cohen's d", "eta-squared", "r", etc.
  interpretation: string  // "작은 효과", "중간 효과", "큰 효과"
}

/**
 * 사후검정 결과
 */
export interface PostHocResult {
  group1: string | number
  group2: string | number
  meanDiff?: number
  zStatistic?: number
  pvalue: number
  pvalueAdjusted?: number
  significant: boolean
}

/**
 * 회귀 계수 정보
 */
export interface CoefficientResult {
  name: string
  value: number
  stdError: number
  tValue: number
  pvalue: number
}

/**
 * 그룹별 통계
 */
export interface GroupStats {
  name?: string
  mean: number
  std: number
  n: number
  median?: number
}

/**
 * 시각화 데이터 설정
 */
export interface VisualizationData {
  type: string  // 'histogram', 'boxplot', 'scatter', 'bar', 'line', 'heatmap', 'pca-biplot', 'roc-curve', etc.
  data: Record<string, unknown>
  options?: Record<string, unknown>
}

export interface AnalysisResult {
  method: string
  statistic: number
  pValue: number
  df?: number  // 자유도
  effectSize?: number | EffectSizeInfo  // 단순 숫자 또는 상세 정보
  omegaSquared?: EffectSizeInfo  // omega-squared 효과크기 (ANOVA용)
  confidence?: {
    lower: number
    upper: number
    level?: number  // 신뢰수준 (기본 0.95)
  }
  interpretation: string
  nextActions?: NextAction[]
  assumptions?: StatisticalAssumptions

  // 추가 상세 정보
  postHoc?: PostHocResult[]  // 사후검정 결과
  coefficients?: CoefficientResult[]  // 회귀계수
  groupStats?: GroupStats[]  // 그룹별 통계

  // 제곱합 (ANOVA용)
  ssBetween?: number
  ssWithin?: number
  ssTotal?: number

  // 고급 정보
  additional?: {
    intercept?: number
    rmse?: number
    rSquared?: number
    adjustedRSquared?: number
    adjRSquared?: number  // Alias for adjustedRSquared (legacy compatibility)
    vif?: number[]  // 분산팽창지수
    residuals?: number[]
    predictions?: number[]
    confusionMatrix?: number[][]
    accuracy?: number
    precision?: number
    recall?: number
    f1Score?: number
    rocAuc?: number
    silhouetteScore?: number
    clusters?: number[]
    centers?: number[][]
    explainedVarianceRatio?: number[]
    loadings?: number[][]
    communalities?: number[]
    eigenvalues?: number[]
    rankings?: number[]
    // Phase 5: Basic Statistics
    mean?: number
    median?: number
    std?: number
    variance?: number
    min?: number
    max?: number
    q1?: number
    q3?: number
    iqr?: number
    skewness?: number
    kurtosis?: number
    n?: number

    // Proportion Test
    sampleProportion?: number
    nullProportion?: number
    pValueExact?: number
    pValueApprox?: number
    zStatistic?: number

    // One-sample t-test
    testValue?: number
    mu?: number
    cohensD?: number

    // Means Plot & Explore
    descriptives?: Record<string, {
      group?: string
      mean?: number
      std?: number
      sem?: number
      count?: number
      ciLower?: number
      ciUpper?: number
    }>
    plotData?: Array<{
      group?: string
      mean?: number
      ciLower?: number
      ciUpper?: number
    }>

    // Phase 4: Advanced Statistics (기존 필드 유지)
    model?: string
    // Phase 4: Advanced Statistics (추가 필드)
    modelType?: string
    marginalRSquared?: number
    conditionalRSquared?: number
    icc?: number
    analysisType?: 'a-priori' | 'post-hoc' | 'compromise'
    sampleSize?: number
    requiredSampleSize?: number  // Required sample size (Power Analysis)
    power?: number
    alpha?: number
    ec50?: number
    ic50?: number
    aic?: number
    bic?: number
    itemTotalCorrelations?: number[]
    pseudoRSquaredMcfadden?: number  // McFadden pseudo R² (Poisson, Ordinal)
    pseudoRSquaredNagelkerke?: number  // Nagelkerke pseudo R² (Ordinal, Logistic)
    pseudoRSquaredCoxSnell?: number  // Cox-Snell pseudo R² (Ordinal, Logistic)
    pseudoRSquared?: number  // Generic pseudo R² (Ordinal, Logistic)
    finalVariables?: string[]  // Selected variables in stepwise regression
    deviance?: number  // Model deviance
    logLikelihood?: number  // Log-likelihood
    // Discriminant Analysis
    wilksLambda?: {
      pValue?: number
      significant?: boolean
    }
    boxM?: {
      pValue?: number
      significant?: boolean
    }
    // Dose-Response Analysis
    hill_slope?: number
    // Response Surface Methodology
    selectedFunctions?: string[]
    // Effect Size (ANOVA, ANCOVA, etc.)
    effectSize?: number | { value: number; interpretation: string; type: string }
  }

  // 시각화 데이터
  visualizationData?: VisualizationData
}

export interface NextAction {
  id: string
  title: string
  description: string
  icon?: LucideIcon
  action: () => void
}

export interface DataRow {
  [columnName: string]: string | number | null | undefined
}

export interface SmartFlowState {
  currentStep: number
  completedSteps: number[]
  uploadedFile: File | null
  uploadedData: DataRow[] | null
  validationResults: ValidationResults | null
  analysisConfig: AnalysisConfig | null
  results: AnalysisResult | null
  isLoading: boolean
  error: string | null
}

// ============================================
// Guided Flow Types (Step 2 재설계)
// ============================================

/**
 * Guided Flow 단계
 */
export type GuidedFlowStep =
  | 'ai-chat'      // AI 자연어 입력 (NEW - 기본 시작점)
  | 'category'     // 대분류 선택
  | 'subcategory'  // 중분류 선택
  | 'purpose'      // 목적 선택 (legacy, 호환성 유지)
  | 'questions'    // 조건 질문
  | 'result'       // 추천 결과
  | 'browse'       // 직접 선택 (전체 목록)

/**
 * 분석 대분류 (4개)
 */
export type AnalysisCategory =
  | 'compare'      // 차이/비교 분석
  | 'relationship' // 관계 분석
  | 'prediction'   // 예측 분석
  | 'advanced'     // 고급 분석

/**
 * 중분류 정의
 */
export interface SubcategoryDefinition {
  id: string
  title: string
  description: string
  icon?: string
  /** 매핑되는 기존 AnalysisPurpose */
  mapsToPurpose: AnalysisPurpose
  /** 자동 설정되는 답변 (preset) */
  presetAnswers?: Record<string, string>
  /** 바로 결과로 가는지, 추가 질문이 필요한지 */
  skipQuestions?: boolean
}

/**
 * 대분류 정의
 */
export interface CategoryDefinition {
  id: AnalysisCategory
  title: string
  description: string
  icon: string
  subcategories: SubcategoryDefinition[]
}

/**
 * 질문 옵션
 */
export interface QuestionOption {
  value: string
  label: string
  hint?: string
}

/**
 * 조건 질문 정의
 */
export interface GuidedQuestion {
  id: string
  question: string
  options: QuestionOption[]
  /** true면 데이터에서 자동 감지 시도 */
  autoAnswer?: boolean
  required?: boolean
}

/**
 * Auto-Answer 결과
 */
export interface AutoAnswerResult {
  value: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  source: 'assumptionResults' | 'validationResults' | 'heuristic' | 'none'
  evidence?: string
  requiresConfirmation: boolean
}

/**
 * 결정 트리 추론 단계
 */
export interface ReasoningStep {
  step: string
  description: string
}

/**
 * 결정 트리 결과
 */
export interface DecisionResult {
  method: StatisticalMethod
  reasoning: ReasoningStep[]
  alternatives: {
    method: StatisticalMethod
    reason: string
  }[]
  warnings?: string[]
}

/**
 * Guided Flow 상태
 */
export interface GuidedFlowState {
  step: GuidedFlowStep
  /** 선택된 대분류 (NEW) */
  selectedCategory: AnalysisCategory | null
  /** 선택된 중분류 ID (NEW) */
  selectedSubcategory: string | null
  /** 선택된 목적 (기존, 중분류에서 자동 매핑) */
  selectedPurpose: AnalysisPurpose | null
  answers: Record<string, string>
  autoAnswers: Record<string, AutoAnswerResult>
  result: DecisionResult | null
  previousStep: GuidedFlowStep | null
  /** AI 자연어 입력 (NEW) */
  aiChatInput: string | null
  /** AI 추천 결과 (NEW) */
  aiRecommendation: AIRecommendation | null
  /** AI 응답 텍스트 - 스트리밍용 (NEW) */
  aiResponseText: string | null
  /** AI 에러 메시지 (NEW) */
  aiError: string | null
  /** AI 로딩 상태 (NEW) */
  isAiLoading: boolean
  /** AI provider 정보 (NEW) */
  aiProvider: 'openrouter' | 'ollama' | 'keyword' | null
}

/**
 * Guided Flow 액션
 */
export type GuidedFlowAction =
  | { type: 'SELECT_CATEGORY'; category: AnalysisCategory }
  | { type: 'SELECT_SUBCATEGORY'; subcategoryId: string; mapsToPurpose: AnalysisPurpose; presetAnswers?: Record<string, string> }
  | { type: 'SELECT_PURPOSE'; purpose: AnalysisPurpose }
  | { type: 'ANSWER_QUESTION'; questionId: string; value: string }
  | { type: 'SET_AUTO_ANSWER'; questionId: string; result: AutoAnswerResult }
  | { type: 'COMPLETE_QUESTIONS' }
  | { type: 'BROWSE_ALL' }
  | { type: 'GO_BACK' }
  | { type: 'SELECT_METHOD'; method: StatisticalMethod }
  | { type: 'CONFIRM' }
  | { type: 'RESET' }
  // AI Chat 관련 액션 (NEW)
  | { type: 'SET_AI_INPUT'; input: string }
  | { type: 'START_AI_CHAT' }
  | { type: 'SET_AI_RESPONSE'; text: string }
  | { type: 'SET_AI_RECOMMENDATION'; recommendation: AIRecommendation }
  | { type: 'AI_CHAT_ERROR'; error: string }
  | { type: 'GO_TO_GUIDED' }  // AI에서 단계별 가이드로 이동
  | { type: 'SET_AI_PROVIDER'; provider: 'openrouter' | 'ollama' | 'keyword' }


// ============================================
// Analysis Template Types (재분석 간소화)
// ============================================

/**
 * 변수 역할 매핑 (변수명 대신 역할 저장)
 * 새 데이터에 동일 역할의 변수를 자동 매칭
 */
export interface VariableRoleMapping {
  /** 종속변수 역할 */
  dependent?: {
    role: 'dependent'
    type: 'numeric' | 'categorical'
    description?: string
  }
  /** 독립변수/그룹변수 역할 */
  independent?: {
    role: 'independent' | 'group'
    type: 'numeric' | 'categorical'
    description?: string
  }
  /** 요인 변수들 (ANOVA 등) */
  factors?: Array<{
    role: 'factor'
    type: 'categorical'
    description?: string
  }>
  /** 공변량 (ANCOVA 등) */
  covariates?: Array<{
    role: 'covariate'
    type: 'numeric'
    description?: string
  }>
  /** 추가 변수들 (상관분석 등) */
  additionalVariables?: Array<{
    role: string
    type: 'numeric' | 'categorical'
    description?: string
  }>
}

/**
 * 분석 템플릿
 * 데이터 없이 분석 설정만 저장하여 재사용
 */
export interface AnalysisTemplate {
  /** 고유 ID */
  id: string
  /** 사용자 지정 이름 */
  name: string
  /** 설명 메모 */
  description: string
  /** 생성 시간 */
  createdAt: number
  /** 수정 시간 */
  updatedAt: number
  /** 사용 횟수 (정렬/추천용) */
  usageCount: number
  /** 마지막 사용 시간 */
  lastUsedAt: number | null
  
  // === 분석 설정 ===
  /** 분석 목적 */
  purpose: string
  /** 통계 방법 */
  method: {
    id: string
    name: string
    category: string
    description?: string
  }
  /** 변수 역할 매핑 (변수명 대신 역할) */
  variableRoles: VariableRoleMapping
  /** 분석 옵션 (사후검정, 신뢰수준 등) */
  options?: Record<string, unknown>
  
  // === 메타 정보 ===
  /** 원본 데이터 정보 (참고용) */
  originalData?: {
    fileName?: string
    rowCount?: number
    columnCount?: number
  }
}

/**
 * 템플릿 목록 필터/정렬 옵션
 */
export interface TemplateListOptions {
  /** 정렬 기준 */
  sortBy: 'recent' | 'usage' | 'name' | 'created'
  /** 정렬 방향 */
  sortOrder: 'asc' | 'desc'
  /** 카테고리 필터 */
  categoryFilter?: string
  /** 검색어 */
  searchQuery?: string
}

/**
 * 템플릿 적용 결과
 */
export interface TemplateApplyResult {
  /** 적용 성공 여부 */
  success: boolean
  /** 자동 매칭된 변수 */
  matchedVariables: Record<string, string>
  /** 매칭 실패한 역할 */
  unmatchedRoles: string[]
  /** 경고 메시지 */
  warnings: string[]
}
