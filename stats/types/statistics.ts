/**
 * 통계 페이지 변수 선택 및 분석 옵션 타입 정의
 *
 * 목적: Phase A-2-1 - unknown 타입 제거 및 타입 안전성 향상
 * 날짜: 2025-11-05
 *
 * 🚨 CRITICAL: 변수 role 명명 규칙 (SPSS/R/SAS 표준)
 * - variable-requirements.ts의 role을 정확히 반영해야 함
 * - factor → factor (❌ groups, independent)
 * - within → within (❌ conditions)
 * - covariate → covariate (❌ covariates)
 * - blocking → blocking (❌ randomEffects)
 *
 * 📋 참고: CLAUDE.md - "현재 중요 규칙" 섹션
 * 📋 참고: STATISTICS_CODING_STANDARDS.md - Section 17
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
  dependent: string[] // 1개 이상 (variable-requirements.ts: role: 'dependent')
}

// T-검정
export interface TTestVariables {
  dependent: string // 1개
  factor: string[] // 2개 (variable-requirements.ts: role: 'factor')
}

export interface OneSampleTVariables {
  dependent: string // 1개
}

export interface WelchTVariables {
  dependent: string // 1개
  factor: string[] // 2개 (variable-requirements.ts: role: 'factor')
}

// 분산분석
/**
 * ANOVA (일원분산분석) 변수
 * - Section 17 규정: variable-requirements.ts의 role과 정확히 일치
 */
export interface ANOVAVariables {
  /** 종속변수 */
  dependent: string
  /** 요인 변수 (variable-requirements.ts: role: 'factor') */
  factor: string[]
  /** 공변량 (variable-requirements.ts: role: 'covariate') */
  covariate?: string[]
}

/**
 * Two-Way ANOVA (이원분산분석) 변수
 * - Section 17 규정: variable-requirements.ts의 role과 정확히 일치
 */
export interface TwoWayANOVAVariables {
  /** 종속변수 */
  dependent: string
  /** 요인 변수 2개 (variable-requirements.ts: role: 'factor') */
  factor: string[] // 2개
}

/**
 * Three-Way ANOVA (삼원분산분석) 변수
 * - Section 17 규정: variable-requirements.ts의 role과 정확히 일치
 */
export interface ThreeWayANOVAVariables {
  /** 종속변수 */
  dependent: string
  /** 요인 변수 3개 (variable-requirements.ts: role: 'factor') */
  factor: string[] // 3개
}

/**
 * Repeated Measures ANOVA (반복측정 분산분석) 변수
 * - Section 17 규정: variable-requirements.ts의 role과 정확히 일치
 */
export interface RepeatedMeasuresVariables {
  /** 종속변수 (반복 측정값 2개 이상) */
  dependent: string[] // 2개 이상
}

/**
 * ANCOVA (공분산분석) 변수
 * - Section 17 규정: variable-requirements.ts의 role과 정확히 일치
 */
export interface ANCOVAVariables {
  /** 종속변수 */
  dependent: string
  /** 요인 변수 (variable-requirements.ts: role: 'factor') */
  factor: string[]
  /** 공변량 (variable-requirements.ts: role: 'covariate') */
  covariate: string[]
}

/**
 * MANOVA (다변량 분산분석) 변수
 * - Section 17 규정: variable-requirements.ts의 role과 정확히 일치
 */
export interface MANOVAVariables {
  /** 종속변수 (2개 이상) */
  dependent: string[]
  /** 요인 변수 (variable-requirements.ts: role: 'factor') */
  factor: string[]
}

// 상관분석
export interface CorrelationVariables {
  all: string[] // 2개 이상
}

export interface PartialCorrelationVariables {
  dependent: string[] // 2개 이상 (variable-requirements.ts: role: 'dependent')
  covariate?: string[] // 통제변수 (선택적)
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
  factor: string[] // 1개 이상 (variable-requirements.ts: role: 'factor' - 고정효과)
  blocking?: string[] // 선택적 (variable-requirements.ts: role: 'blocking' - 무선효과)
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
  row: string // 1개 (variable-requirements.ts: role: 'independent')
  column: string // 1개 (variable-requirements.ts: role: 'dependent')
}

export interface McNemarVariables {
  dependent: string[] // 2개 (variable-requirements.ts: role: 'dependent', multiple: true, minCount: 2, maxCount: 2)
}

// 비모수 검정
export interface NonParametricVariables {
  dependent: string // 1개
  factor: string[] // 2개 이상 (variable-requirements.ts: role: 'factor')
}

export interface MannWhitneyVariables {
  dependent: string // 1개
  factor: string[] // 2개 (variable-requirements.ts: role: 'factor')
}

export interface KruskalWallisVariables {
  dependent: string // 1개
  factor: string // 1개 (variable-requirements.ts: role: 'factor', multiple: false) - 그룹값이 3개 이상
}

export interface WilcoxonVariables {
  dependent: string[] // 2개 (paired samples)
}

export interface FriedmanVariables {
  dependent: string // 1개
  within: string[] // 3개 이상 (variable-requirements.ts: role: 'within')
}

export interface SignTestVariables {
  before: string // 전 변수 (variable-requirements.ts: role: 'dependent', label: '전 변수')
  after: string // 후 변수 (variable-requirements.ts: role: 'dependent', label: '후 변수')
}

export interface RunsTestVariables {
  dependent: string // 1개 (variable-requirements.ts: role: 'dependent')
}

export interface CochranQVariables {
  independent: string // 피험자 식별 변수 (variable-requirements.ts: role: 'independent')
  dependent: string[] // 3개 이상 이진 변수 (variable-requirements.ts: role: 'dependent', multiple: true, minCount: 3)
}

export interface MoodMedianVariables {
  factor: string // 1개 (variable-requirements.ts: role: 'factor')
  dependent: string // 1개 (variable-requirements.ts: role: 'dependent')
}

export interface BinomialTestVariables {
  dependent: string // 1개 (variable-requirements.ts: role: 'dependent')
}

// 정규성 및 검정력
export interface NormalityTestVariables {
  dependent: string // 1개 (variable-requirements.ts: role: 'dependent')
}

export interface KSTestVariables {
  variables: string[] // 1-2개 (1-sample or 2-sample KS test)
}

// power-analysis는 직접 입력이므로 변수 선택 없음

// 비율 검정
export interface ProportionTestVariables {
  dependent: string // 1개 (variable-requirements.ts: role: 'dependent', multiple: false)
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
  dependent: string[] // 3개 이상 (variable-requirements.ts: role: 'dependent', multiple: true, minCount: 3)
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
  factor?: string[] // 예측변수 (independent와 동일, 호환성)
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
// 시계열 분석 (Time Series)
// ============================================================================
export interface StationarityTestVariables {
  dependent: string // 시계열 변수
}

export interface ARIMAVariables {
  dependent: string // 시계열 변수
  time?: string // 시간 인덱스 (선택)
}

export interface SeasonalDecomposeVariables {
  dependent: string // 시계열 변수
  time?: string // 시간 인덱스 (선택)
}

// ============================================================================
// 생존분석 (Survival Analysis)
// ============================================================================
export interface KaplanMeierVariables {
  time: string // 시간 변수
  event: string // 사건 변수 (0/1)
  group?: string // 그룹 변수 (선택)
}

export interface CoxRegressionVariables {
  time: string // 시간 변수
  event: string // 사건 변수 (0/1)
  covariates: string[] // 공변량들
}

// ============================================================================
// 분석 결과 타입
// ============================================================================

/**
 * 사후검정 비교 결과 (ANOVA, Kruskal-Wallis, Friedman 등)
 * - Section 18 규정: 타입 중앙 정의 (페이지별 재정의 금지)
 */
export interface PostHocComparison {
  /** 첫 번째 그룹명 */
  group1: string
  /** 두 번째 그룹명 */
  group2: string
  /** 평균 차이 (또는 순위 차이) */
  meanDiff: number
  /** p-값 */
  pValue: number
  /** 신뢰구간 하한 (선택적) */
  ciLower?: number
  /** 신뢰구간 상한 (선택적) */
  ciUpper?: number
  /** 검정 통계량 (선택적) */
  statistic?: number
  /** 유의성 여부 */
  significant: boolean
}

/**
 * 사후검정 결과
 */
export interface PostHocResult {
  /** 사후검정 방법명 (예: 'Tukey HSD', 'Dunn') */
  method: string
  /** 비교 결과 배열 */
  comparisons: PostHocComparison[]
  /** 조정된 유의수준 (선택적) */
  adjustedAlpha?: number
}

/**
 * Two-Way ANOVA 요인 효과 (Factor Effect)
 */
export interface FactorEffect {
  /** F-통계량 */
  fStatistic: number
  /** p-값 */
  pValue: number
  /** 자유도 */
  df: number
}

/**
 * Two-Way ANOVA 분석 결과
 * - Python Worker: worker3-nonparametric-anova.py - two_way_anova()
 */
export interface TwoWayANOVAResult {
  /** Factor 1 주효과 */
  factor1: FactorEffect
  /** Factor 2 주효과 */
  factor2: FactorEffect
  /** 상호작용 효과 */
  interaction: FactorEffect
  /** 잔차 자유도 */
  residual: {
    df: number
  }
  /** ANOVA Table (statsmodels 원본) */
  anovaTable: Record<string, unknown>
}

/**
 * Three-Way ANOVA 분석 결과
 */
export interface ThreeWayANOVAResult {
  /** Factor 1 주효과 */
  factor1: FactorEffect
  /** Factor 2 주효과 */
  factor2: FactorEffect
  /** Factor 3 주효과 */
  factor3: FactorEffect
  /** Factor 1 x Factor 2 상호작용 */
  interaction12: FactorEffect
  /** Factor 1 x Factor 3 상호작용 */
  interaction13: FactorEffect
  /** Factor 2 x Factor 3 상호작용 */
  interaction23: FactorEffect
  /** Factor 1 x Factor 2 x Factor 3 상호작용 */
  interaction123: FactorEffect
  /** 잔차 자유도 */
  residual: {
    df: number
  }
  /** ANOVA Table */
  anovaTable: Record<string, unknown>
}

/**
 * Repeated Measures ANOVA 분석 결과
 * - Python Worker: worker3-nonparametric-anova.py - repeated_measures_anova()
 */
export interface RepeatedMeasuresANOVAResult {
  /** F-통계량 */
  fStatistic: number
  /** p-값 */
  pValue: number
  /** 자유도 */
  df: {
    numerator: number
    denominator: number
  }
  /** 구형성 보정 계수 (Epsilon) */
  sphericityEpsilon: number
  /** ANOVA Table */
  anovaTable: Record<string, unknown>
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
export type ChiSquareOptions = CommonStatisticsOptions

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

// ============================================================================
// 표준 Result 타입 (R broom 패턴 기반)
// ============================================================================
// 참조: docs/COMPONENT_STANDARDIZATION_PLAN.md
// 목적: 48개 통계 페이지의 Result 타입 표준화
// 날짜: 2026-01-23

/**
 * 효과크기 타입
 * - 공통 컴포넌트: EffectSizeCard
 */
export type EffectSizeType =
  | 'cohensD'       // Cohen's d (t-test)
  | 'hedgesG'       // Hedges' g (소표본 보정)
  | 'glassDelta'    // Glass's Δ (통제집단 기준)
  | 'etaSquared'    // η² (ANOVA)
  | 'partialEtaSquared' // Partial η² (부분 에타제곱)
  | 'omegaSquared'  // ω² (ANOVA, 편향 보정)
  | 'epsilonSquared' // ε² (Kruskal-Wallis)
  | 'r'              // Pearson r (상관)
  | 'rSquared'      // R² (결정계수)
  | 'phi'            // φ (2x2 카이제곱)
  | 'cramersV'      // Cramér's V (카이제곱)
  | 'w'              // Kendall's W (일치도)

/**
 * 효과크기 해석 수준
 */
export type EffectSizeInterpretation = 'negligible' | 'small' | 'medium' | 'large' | 'very_large'

/**
 * 효과크기 인터페이스
 * - R broom: estimate 필드에 해당
 */
export interface EffectSize {
  /** 효과크기 값 */
  value: number
  /** 효과크기 유형 */
  type: EffectSizeType
  /** 해석 (small/medium/large 등) */
  interpretation: EffectSizeInterpretation
  /** 신뢰구간 (선택적) */
  ci?: {
    lower: number
    upper: number
    level: number
  }
}

/**
 * 신뢰구간 인터페이스
 * - R broom: conf.low, conf.high 필드에 해당
 * - 공통 컴포넌트: ConfidenceIntervalDisplay
 */
export interface ConfidenceInterval {
  /** 하한 */
  lower: number
  /** 상한 */
  upper: number
  /** 신뢰수준 (95, 99 등 - 백분율) */
  level: number
}

/**
 * 가정 검정 결과 인터페이스
 * - 공통 컴포넌트: AssumptionTestCard
 */
export interface AssumptionTest {
  /** 가정 이름 (예: '정규성', '등분산성') */
  name: string
  /** 검정 방법 (예: 'Shapiro-Wilk', 'Levene') */
  testName: string
  /** 검정 통계량 */
  statistic?: number
  /** p-값 */
  pValue: number
  /** 가정 충족 여부 */
  passed: boolean
  /** 유의수준 (기본값: 0.05) */
  alpha?: number
  /** 상세 설명 */
  details?: string
  /** 권장 조치 */
  recommendation?: string
  /** 심각도 (낮음/중간/높음) */
  severity?: 'low' | 'medium' | 'high'
}

/**
 * 결과 해석 인터페이스
 * - 공통 컴포넌트: ResultInterpretation
 */
export interface Interpretation {
  /** 한 줄 요약 */
  summary: string
  /** 상세 설명 */
  details?: string
  /** 권장 사항 */
  recommendation?: string
  /** 주의 사항 */
  caution?: string
}

// ============================================================================
// 기본 검정 결과 타입
// ============================================================================

/**
 * 기본 검정 결과 (모든 통계 검정의 공통 필드)
 * - R broom: statistic, p.value 필드에 해당
 */
export interface BaseTestResult {
  /** p-값 */
  pValue: number
  /** 검정 통계량 */
  statistic: number
  /** 유의성 여부 (alpha 기준) */
  significant: boolean
}

// ============================================================================
// Mixin 타입 (조합용)
// ============================================================================

/** 자유도 포함 */
export interface WithDf {
  /** 자유도 */
  df: number | { numerator: number; denominator: number }
}

/** 효과크기 포함 */
export interface WithEffectSize {
  /** 효과크기 */
  effectSize: EffectSize
}

/** 신뢰구간 포함 */
export interface WithCI {
  /** 신뢰구간 */
  confidenceInterval: ConfidenceInterval
}

/** 가정 검정 포함 */
export interface WithAssumptions {
  /** 가정 검정 결과 배열 */
  assumptions: AssumptionTest[]
}

/** 결과 해석 포함 */
export interface WithInterpretation {
  /** 결과 해석 */
  interpretation: Interpretation
}

/** 표본 크기 포함 */
export interface WithSampleSize {
  /** 표본 크기 */
  n: number | { group1: number; group2: number; total: number }
}

/** 사후 검정 포함 */
export interface WithPostHoc {
  /** 사후 검정 결과 */
  postHoc?: PostHocResult
}

// ============================================================================
// 조합된 Result 타입 예시 (페이지별 확장 가능)
// ============================================================================

/**
 * T-검정 표준 결과 타입
 */
export type StandardTTestResult = BaseTestResult
  & WithDf
  & WithEffectSize
  & WithCI
  & WithAssumptions
  & WithInterpretation
  & WithSampleSize

/**
 * ANOVA 표준 결과 타입
 */
export type StandardANOVAResult = BaseTestResult
  & WithDf
  & WithEffectSize
  & WithAssumptions
  & WithInterpretation
  & WithPostHoc

/**
 * 상관분석 표준 결과 타입
 */
export type StandardCorrelationResult = BaseTestResult
  & WithCI
  & WithAssumptions
  & WithInterpretation
  & WithSampleSize
