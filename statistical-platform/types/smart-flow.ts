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
  columnStats?: ColumnStatistics[]
}

export interface ColumnStatistics {
  name: string
  type: 'numeric' | 'categorical' | 'mixed'
  numericCount: number
  textCount: number
  missingCount: number
  uniqueValues: number
  count?: number  // Total count of values
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
  category: 'descriptive' | 't-test' | 'anova' | 'regression' | 'correlation' | 'chi-square' | 'nonparametric' | 'advanced'
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
      statistic: number
      pValue: number
      isNormal: boolean
      interpretation?: string
    }
    group2?: {
      statistic: number
      pValue: number
      isNormal: boolean
      interpretation?: string
    }
    // 검정 방법별 상세 결과
    shapiroWilk?: {
      statistic: number
      pValue: number
      isNormal: boolean
    }
    kolmogorovSmirnov?: {
      statistic: number
      pValue: number
      isNormal: boolean
    }
  }
  homogeneity?: {
    levene?: {
      statistic: number
      pValue: number
      equalVariance: boolean
    }
    bartlett?: {
      statistic: number
      pValue: number
      equalVariance: boolean
    }
  }
  independence?: {
    durbin?: {
      statistic: number
      pValue: number
      isIndependent: boolean
    }
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
    itemTotalCorrelations?: number[]
    alpha?: number  // Cronbach's alpha
    power?: number
    requiredSampleSize?: number
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