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
  columnCount: number
  missingValues: number
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
  category: 'descriptive' | 't-test' | 'anova' | 'regression' | 'nonparametric' | 'advanced'
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
  summary?: {
    meetsAssumptions: boolean
    recommendation: string
  }
}

export interface AnalysisResult {
  method: string
  statistic: number
  pValue: number
  effectSize?: number
  confidence?: {
    lower: number
    upper: number
  }
  interpretation: string
  nextActions?: NextAction[]
  assumptions?: StatisticalAssumptions
  additional?: {
    intercept?: number
    rmse?: number
  }
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