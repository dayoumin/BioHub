/**
 * 통계 계산 관련 상수 정의
 */

// 최소 샘플 크기 요구사항
export const MIN_SAMPLES = {
  // 기본 통계
  BASIC: 1,
  VARIANCE: 2,
  NORMALITY_TEST: 3,
  CORRELATION: 4,

  // T-검정
  T_TEST_ONE_SAMPLE: 2,
  T_TEST_TWO_SAMPLE: 2,
  T_TEST_PAIRED: 2,

  // ANOVA
  ANOVA_MIN_GROUPS: 2,
  ANOVA_MIN_PER_GROUP: 2,

  // 회귀분석
  REGRESSION_SIMPLE: 3,
  REGRESSION_MULTIPLE: 10,

  // 시계열
  TIME_SERIES_BASIC: 12,
  TIME_SERIES_SEASONAL: 24,
  ARIMA_MIN: 50,
  SARIMA_MIN: 24,
  VAR_PER_VARIABLE: 20,

  // 고급분석
  PCA_MIN: 3,
  CLUSTERING_MIN: 10,
  SURVIVAL_MIN: 2
} as const

// 소수점 정밀도
export const PRECISION = {
  // 일반 통계량
  STATISTIC: 4,      // t-값, F-값, χ² 등
  P_VALUE: 4,        // p-value
  CORRELATION: 4,    // 상관계수

  // 백분율/비율
  PERCENTAGE: 2,     // 백분율
  PROPORTION: 3,     // 비율, 확률

  // 모델 평가
  AIC_BIC: 2,        // AIC, BIC
  R_SQUARED: 4,      // R²

  // 기타
  COUNT: 0,          // 정수 카운트
  CURRENCY: 2,       // 화폐 단위
  INDEX: 0           // 인덱스
} as const

// 유의수준
export const SIGNIFICANCE_LEVELS = {
  VERY_STRICT: 0.001,
  STRICT: 0.01,
  STANDARD: 0.05,
  LENIENT: 0.10
} as const

// 신뢰수준
export const CONFIDENCE_LEVELS = {
  NINETY: 0.90,
  NINETY_FIVE: 0.95,
  NINETY_NINE: 0.99
} as const

// 효과크기 해석 기준 (Cohen's d)
export const EFFECT_SIZE = {
  SMALL: 0.2,
  MEDIUM: 0.5,
  LARGE: 0.8,
  VERY_LARGE: 1.2
} as const

// 상관계수 해석 기준
export const CORRELATION_STRENGTH = {
  VERY_WEAK: 0.2,
  WEAK: 0.4,
  MODERATE: 0.6,
  STRONG: 0.8,
  VERY_STRONG: 0.9
} as const

// 에러 메시지
export const ERROR_MESSAGES = {
  INSUFFICIENT_DATA: (required: number, actual: number) =>
    `최소 ${required}개의 데이터가 필요합니다. (현재: ${actual}개)`,
  MISSING_COLUMN: (column: string) =>
    `'${column}' 열을 찾을 수 없습니다`,
  INVALID_VALUE: (value: any) =>
    `유효하지 않은 값입니다: ${value}`,
  NO_NUMERIC_DATA: '유효한 숫자 데이터가 없습니다',
  GROUPS_REQUIRED: (min: number) =>
    `최소 ${min}개 이상의 그룹이 필요합니다`,
  CALCULATION_FAILED: '계산 중 오류가 발생했습니다'
} as const

export type MinSamples = typeof MIN_SAMPLES[keyof typeof MIN_SAMPLES]
export type Precision = typeof PRECISION[keyof typeof PRECISION]
export type SignificanceLevel = typeof SIGNIFICANCE_LEVELS[keyof typeof SIGNIFICANCE_LEVELS]