/**
 * 통계 페이지 변수 선택 및 분석 옵션 타입 정의
 *
 * 목적: Phase A-2-1 - unknown 타입 제거 및 타입 안전성 향상
 * 날짜: 2025-11-05
 */

// ============================================================================
// 변수 선택 타입
// ============================================================================

/**
 * 기본 변수 선택 인터페이스
 * - 모든 통계 페이지의 변수 선택 구조 표준화
 */
export interface VariableSelection {
  /** 종속 변수 (1개 또는 여러 개) */
  dependent?: string[]
  /** 독립 변수 (1개 이상) */
  independent?: string[]
  /** 집단 변수 (t-test, ANOVA 등) */
  groups?: string[]
  /** 모든 변수 (상관분석, PCA 등) */
  all?: string[]
  /** 위치 정보 (편상관분석 등) */
  location?: {
    column: string
    row: string
  }
  /** 공변량 (ANCOVA) */
  covariates?: string[]
  /** 조건 (반복측정) */
  conditions?: string[]
  /** 아이템 (신뢰도 분석) */
  items?: string[]
}

// ============================================================================
// 통계 기법별 특화 변수 타입
// ============================================================================

// 기초 통계
export interface DescriptiveVariables {
  all: string[] // 2개 이상
}

export interface FrequencyTableVariables {
  all: string[] // 1개 이상
}

// T-검정
export interface TTestVariables {
  dependent: string // 1개
  groups: string[] // 2개
}

export interface OneSampleTVariables {
  dependent: string // 1개
}

export interface WelchTVariables {
  dependent: string // 1개
  groups: string[] // 2개
}

// 분산분석
export interface ANOVAVariables {
  dependent: string // 1개 (단일 값)
  independent: string[] // 1개 이상
  covariates?: string[] // 선택적
}

export interface TwoWayANOVAVariables {
  dependent: string // 1개
  independent: string[] // 2개 (배열로 전달)
}

export interface ThreeWayANOVAVariables {
  dependent: string // 1개
  independent: string[] // 3개 (배열로 전달)
}

export interface RepeatedMeasuresVariables {
  dependent: string[] // 2개 이상
}

export interface ANCOVAVariables {
  dependent: string // 1개
  independent: string[] // 1개 이상
  covariates: string[] // 1개 이상
}

export interface MANOVAVariables {
  dependent: string[] // 2개 이상
  independent: string // 1개
}

// 상관분석
export interface CorrelationVariables {
  all: string[] // 2개 이상
}

export interface PartialCorrelationVariables {
  all: string[] // 2개 이상 (독립변수 + 통제변수)
  location?: {
    column: string
    row: string
  }
}

// 회귀분석
export interface RegressionVariables {
  dependent: string // 1개
  independent: string[] // 1개 이상
}

export interface StepwiseVariables {
  dependent: string[] // 배열 형태
  factor: string[] // 요인 변수들
  covariate?: string[] // 선택적 공변량
}

export interface OrdinalRegressionVariables {
  dependent: string // 1개 (순서형)
  independent: string[] // 1개 이상
}

export interface MixedModelVariables {
  dependent: string // 1개
  independent: string[] // 1개 이상
}

// 카이제곱 검정
export interface ChiSquareVariables {
  rows: string[] // 2개 이상
  columns: string[] // 2개 이상
}

export interface ChiSquareGoodnessVariables {
  dependent: string[] // 관찰 데이터
}

export interface ChiSquareIndependenceVariables {
  row: string // 1개
  column: string // 1개
}

export interface McNemarVariables {
  groups: string[] // 2개
}

// 비모수 검정
export interface NonParametricVariables {
  dependent: string // 1개
  groups: string[] // 2개 이상
}

export interface MannWhitneyVariables {
  dependent: string // 1개
  groups: string[] // 2개
}

export interface KruskalWallisVariables {
  dependent: string // 1개
  groups: string[] // 3개 이상
}

export interface WilcoxonVariables {
  dependent: string // 1개
}

export interface FriedmanVariables {
  dependent: string // 1개
  conditions: string[] // 3개 이상
}

export interface SignTestVariables {
  dependent: string // 1개
}

export interface RunsTestVariables {
  data: string // 1개 (이진 데이터)
}

// 정규성 및 검정력
export interface NormalityTestVariables {
  all: string[] // 1개 이상
}

export interface KSTestVariables {
  data: string // 1개
}

// power-analysis는 직접 입력이므로 변수 선택 없음

// 비율 검정
export interface ProportionTestVariables {
  groups: string[] // 1-2개
}

// 생존분석
export interface MannKendallVariables {
  data: string // 1개 (시계열)
}

// 신뢰도/타당도
export interface ReliabilityVariables {
  items: string[] // 2개 이상
}

// 다변량 분석
export interface PCAVariables {
  all: string[] // 2개 이상
}

export interface FactorAnalysisVariables {
  all: string[] // 3개 이상
}

export interface ClusterVariables {
  all: string[] // 2개 이상
}

export interface DiscriminantVariables {
  dependent: string // 1개 (범주형)
  independent: string[] // 2개 이상
}

// 실험설계
export interface ResponseSurfaceVariables {
  dependent: string // 1개
  independent: string[] // 2개 이상
}

export interface DoseResponseVariables {
  dose: string // 1개
  response: string // 1개
}

export interface CrossTabulationVariables {
  dependent: string // 1개 (행)
  independent: string // 1개 (열)
}

// 회귀진단
export interface PoissonVariables {
  dependent: string // 1개 (count)
  independent: string[] // 1개 이상
}

// 시각화
export interface MeansPlotVariables {
  dependent: string[] // 배열
  factor: string[] // 요인들
  covariate?: string[] // 선택적
}

// ============================================================================
// 분석 옵션 타입
// ============================================================================

/**
 * 공통 통계 옵션
 */
export interface CommonStatisticsOptions {
  /** 유의수준 (0.01 ~ 0.1, 기본값: 0.05) */
  alpha?: number
  /** 검정 방향 (기본값: 'two-sided') */
  alternative?: 'two-sided' | 'less' | 'greater'
  /** 신뢰수준 (0.9 ~ 0.99, 기본값: 0.95) */
  confidenceLevel?: number
}

/**
 * T-검정 옵션
 */
export interface TTestOptions extends CommonStatisticsOptions {
  /** 대응 표본 여부 (기본값: false) */
  paired: boolean
}

/**
 * 회귀분석 옵션
 */
export interface RegressionOptions {
  /** 회귀 유형 (기본값: 'linear') */
  type: 'linear' | 'logistic'
  /** 절편 포함 여부 (기본값: true) */
  includeIntercept: boolean
}

/**
 * ANOVA 옵션
 */
export interface ANOVAOptions extends CommonStatisticsOptions {
  /** 사후 검정 실시 여부 (기본값: false) */
  postHoc: boolean
}

/**
 * 카이제곱 검정 옵션
 */
export interface ChiSquareOptions extends CommonStatisticsOptions {
  // alternative만 사용
}

/**
 * 상관분석 옵션
 */
export interface CorrelationOptions extends CommonStatisticsOptions {
  /** 상관 계수 방법 (기본값: 'pearson') */
  method: 'pearson' | 'spearman' | 'kendall'
}

/**
 * 군집분석 옵션
 */
export interface ClusterOptions {
  /** 군집 수 (기본값: 3) */
  numClusters: number
  /** 최적 군집 수 자동 탐색 (기본값: false) */
  autoOptimalK: boolean
  /** 군집 방법 (기본값: 'kmeans') */
  method: 'kmeans' | 'hierarchical'
}

/**
 * 요인분석 옵션
 */
export interface FactorAnalysisOptions {
  /** 분석 유형 (기본값: 'exploratory') */
  analysisType: 'exploratory' | 'confirmatory'
  /** 요인 수 (기본값: 자동) */
  numFactors?: number
  /** 회전 방법 (기본값: 'varimax') */
  rotation: 'none' | 'varimax' | 'promax'
}

/**
 * PCA 옵션
 */
export interface PCAOptions {
  /** 주성분 수 (기본값: 자동) */
  numComponents?: number
  /** 표준화 여부 (기본값: true) */
  standardize: boolean
}

/**
 * 검정력 분석 옵션
 */
export interface PowerAnalysisOptions {
  /** 분석 유형 */
  analysisType: 't-test' | 'anova' | 'correlation' | 'regression'
  /** 표본 크기 */
  n?: number
  /** 효과 크기 */
  effect?: number
  /** 유의수준 (기본값: 0.05) */
  alpha?: number
  /** 검정력 (기본값: 0.8) */
  power?: number
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

/**
 * 변수 선택 검증 규칙
 */
export interface VariableValidationRule {
  field: keyof VariableSelection
  min?: number
  max?: number
  exact?: number
  message: string
}

/**
 * 옵션 검증 규칙
 */
export interface OptionValidationRule<T> {
  field: keyof T
  type: 'number' | 'boolean' | 'enum'
  range?: [number, number]
  values?: readonly unknown[]
  message: string
}

/**
 * 옵션 조합 검증 규칙
 */
export interface CombinationRule<T> {
  condition: (options: T) => boolean
  message: string
}

/**
 * 검증 결과
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}
