/**
 * 통계 결과 포맷팅 유틸리티
 *
 * P-값, 유의성, 통계량 등의 포맷팅을 중앙화하여 일관성 유지
 * 모든 통계 페이지에서 이 함수들을 사용해야 합니다.
 *
 * @module statistics-formatters
 */

// ============================================================================
// P-값 포맷팅
// ============================================================================

/**
 * P-값을 표준 형식으로 포맷팅
 *
 * 규칙:
 * - p < 0.001: "< 0.001" 표시
 * - p < 0.01: 소수점 3자리
 * - 그 외: 소수점 3자리
 *
 * @example
 * formatPValue(0.0001)  // "< 0.001"
 * formatPValue(0.0234)  // "0.023"
 * formatPValue(0.1234)  // "0.123"
 */
export function formatPValue(pValue: number | null | undefined): string {
  if (pValue === null || pValue === undefined || isNaN(pValue)) {
    return '-'
  }

  if (pValue < 0.001) {
    return '< 0.001'
  }

  return pValue.toFixed(3)
}

/**
 * P-값을 숫자로 포맷팅 (표/차트용)
 * "< 0.001" 대신 숫자만 반환
 *
 * @param decimals 소수점 자릿수 (기본: 3)
 */
export function formatPValueNumeric(
  pValue: number | null | undefined,
  decimals: number = 3
): string {
  if (pValue === null || pValue === undefined || isNaN(pValue)) {
    return '-'
  }

  return pValue.toFixed(decimals)
}

// ============================================================================
// 유의성 판정
// ============================================================================

/** 유의성 수준 */
export type SignificanceLevel =
  | 'highly-significant'  // p < 0.001
  | 'very-significant'    // p < 0.01
  | 'significant'         // p < 0.05
  | 'marginally'          // p < 0.10
  | 'not-significant'     // p >= 0.10

/**
 * P-값이 유의한지 판정
 *
 * @param alpha 유의수준 (기본: 0.05)
 *
 * @example
 * isSignificant(0.03)       // true
 * isSignificant(0.06)       // false
 * isSignificant(0.06, 0.10) // true
 */
export function isSignificant(
  pValue: number | null | undefined,
  alpha: number = 0.05
): boolean {
  if (pValue === null || pValue === undefined || isNaN(pValue)) {
    return false
  }

  return pValue < alpha
}

/**
 * 유의성 수준 반환
 *
 * @example
 * getSignificanceLevel(0.0001)  // 'highly-significant'
 * getSignificanceLevel(0.005)   // 'very-significant'
 * getSignificanceLevel(0.03)    // 'significant'
 * getSignificanceLevel(0.07)    // 'marginally'
 * getSignificanceLevel(0.15)    // 'not-significant'
 */
export function getSignificanceLevel(
  pValue: number | null | undefined
): SignificanceLevel {
  if (pValue === null || pValue === undefined || isNaN(pValue)) {
    return 'not-significant'
  }

  if (pValue < 0.001) return 'highly-significant'
  if (pValue < 0.01) return 'very-significant'
  if (pValue < 0.05) return 'significant'
  if (pValue < 0.10) return 'marginally'
  return 'not-significant'
}

/**
 * 유의성 수준 한글 레이블
 */
export function getSignificanceLabelKo(
  pValue: number | null | undefined
): string {
  const level = getSignificanceLevel(pValue)

  switch (level) {
    case 'highly-significant':
      return '매우 유의함 (p < 0.001)'
    case 'very-significant':
      return '유의함 (p < 0.01)'
    case 'significant':
      return '유의함 (p < 0.05)'
    case 'marginally':
      return '경계선 (p < 0.10)'
    case 'not-significant':
      return '유의하지 않음'
  }
}

/**
 * 유의성 결과 텍스트 생성
 *
 * @example
 * getSignificanceText(0.03, 0.05)
 * // "통계적으로 유의합니다 (p = 0.030 < 0.05)"
 *
 * getSignificanceText(0.12, 0.05)
 * // "통계적으로 유의하지 않습니다 (p = 0.120 >= 0.05)"
 */
export function getSignificanceText(
  pValue: number | null | undefined,
  alpha: number = 0.05
): string {
  if (pValue === null || pValue === undefined || isNaN(pValue)) {
    return 'P-값을 계산할 수 없습니다'
  }

  const formattedP = formatPValue(pValue)
  const sig = isSignificant(pValue, alpha)

  if (sig) {
    // "< 0.001"인 경우 "p < 0.001"로, 아니면 "p = 0.023 < 0.05"로
    if (formattedP.startsWith('<')) {
      return `통계적으로 유의합니다 (p ${formattedP})`
    }
    return `통계적으로 유의합니다 (p = ${formattedP} < ${alpha})`
  } else {
    return `통계적으로 유의하지 않습니다 (p = ${formattedP} >= ${alpha})`
  }
}

// ============================================================================
// 통계량 포맷팅
// ============================================================================

/**
 * 통계량 포맷팅 (t, F, chi-square 등)
 *
 * @param decimals 소수점 자릿수 (기본: 2)
 *
 * @example
 * formatStatistic(2.345)     // "2.35"
 * formatStatistic(2.345, 3)  // "2.345"
 */
export function formatStatistic(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  return value.toFixed(decimals)
}

/**
 * 백분율 포맷팅
 *
 * @param decimals 소수점 자릿수 (기본: 1)
 * @param includeSymbol % 기호 포함 여부 (기본: true)
 *
 * @example
 * formatPercent(0.1234)        // "12.3%"
 * formatPercent(0.1234, 2)     // "12.34%"
 * formatPercent(0.1234, 1, false) // "12.3"
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 1,
  includeSymbol: boolean = true
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  const percent = (value * 100).toFixed(decimals)
  return includeSymbol ? `${percent}%` : percent
}

/**
 * 상관계수 포맷팅 (r, rho 등)
 *
 * @param decimals 소수점 자릿수 (기본: 3)
 *
 * @example
 * formatCorrelation(0.7834)  // "0.783"
 * formatCorrelation(-0.456)  // "-0.456"
 */
export function formatCorrelation(
  value: number | null | undefined,
  decimals: number = 3
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  return value.toFixed(decimals)
}

/**
 * 효과 크기 포맷팅 (Cohen's d, eta-squared 등)
 *
 * @param decimals 소수점 자릿수 (기본: 3)
 */
export function formatEffectSize(
  value: number | null | undefined,
  decimals: number = 3
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  return value.toFixed(decimals)
}

/**
 * 자유도 포맷팅
 * 정수면 정수로, 소수면 소수점 2자리로
 */
export function formatDF(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  if (Number.isInteger(value)) {
    return value.toString()
  }

  return value.toFixed(2)
}

// ============================================================================
// 신뢰구간 포맷팅
// ============================================================================

/**
 * 신뢰구간 포맷팅
 *
 * @example
 * formatCI(1.23, 4.56)       // "[1.23, 4.56]"
 * formatCI(1.23, 4.56, 3)    // "[1.230, 4.560]"
 */
export function formatCI(
  lower: number | null | undefined,
  upper: number | null | undefined,
  decimals: number = 2
): string {
  if (
    lower === null ||
    lower === undefined ||
    isNaN(lower) ||
    upper === null ||
    upper === undefined ||
    isNaN(upper)
  ) {
    return '-'
  }

  return `[${lower.toFixed(decimals)}, ${upper.toFixed(decimals)}]`
}

// ============================================================================
// 복합 포맷팅 (결과 요약용)
// ============================================================================

/**
 * t-검정 결과 요약 문자열
 *
 * @example
 * formatTTestResult(2.34, 28, 0.026)
 * // "t(28) = 2.34, p = 0.026"
 */
export function formatTTestResult(
  t: number,
  df: number,
  pValue: number
): string {
  const formattedP = formatPValue(pValue)
  const pStr = formattedP.startsWith('<') ? `p ${formattedP}` : `p = ${formattedP}`
  return `t(${formatDF(df)}) = ${formatStatistic(t)}, ${pStr}`
}

/**
 * ANOVA F-검정 결과 요약 문자열
 *
 * @example
 * formatFTestResult(4.56, 2, 45, 0.016)
 * // "F(2, 45) = 4.56, p = 0.016"
 */
export function formatFTestResult(
  f: number,
  df1: number,
  df2: number,
  pValue: number
): string {
  const formattedP = formatPValue(pValue)
  const pStr = formattedP.startsWith('<') ? `p ${formattedP}` : `p = ${formattedP}`
  return `F(${formatDF(df1)}, ${formatDF(df2)}) = ${formatStatistic(f)}, ${pStr}`
}

/**
 * 카이제곱 검정 결과 요약 문자열
 *
 * @example
 * formatChiSquareResult(12.34, 3, 0.006)
 * // "χ²(3) = 12.34, p = 0.006"
 */
export function formatChiSquareResult(
  chiSquare: number,
  df: number,
  pValue: number
): string {
  const formattedP = formatPValue(pValue)
  const pStr = formattedP.startsWith('<') ? `p ${formattedP}` : `p = ${formattedP}`
  return `χ²(${formatDF(df)}) = ${formatStatistic(chiSquare)}, ${pStr}`
}

/**
 * 상관분석 결과 요약 문자열
 *
 * @example
 * formatCorrelationResult(0.78, 0.001, 'pearson')
 * // "r = 0.780, p < 0.001"
 */
export function formatCorrelationResult(
  r: number,
  pValue: number,
  type: 'pearson' | 'spearman' | 'kendall' = 'pearson'
): string {
  const symbol = type === 'pearson' ? 'r' : type === 'spearman' ? 'ρ' : 'τ'
  const formattedP = formatPValue(pValue)
  const pStr = formattedP.startsWith('<') ? `p ${formattedP}` : `p = ${formattedP}`
  return `${symbol} = ${formatCorrelation(r)}, ${pStr}`
}

// ============================================================================
// 유의성 상수 (하드코딩 방지용)
// ============================================================================

/** 표준 유의수준 */
export const ALPHA = {
  /** 0.001 - 매우 엄격 */
  VERY_STRICT: 0.001,
  /** 0.01 - 엄격 */
  STRICT: 0.01,
  /** 0.05 - 표준 (기본값) */
  STANDARD: 0.05,
  /** 0.10 - 관대 */
  LENIENT: 0.10,
} as const

/** 신뢰수준 */
export const CONFIDENCE_LEVEL = {
  /** 99.9% */
  VERY_HIGH: 0.999,
  /** 99% */
  HIGH: 0.99,
  /** 95% - 표준 (기본값) */
  STANDARD: 0.95,
  /** 90% */
  LOW: 0.90,
} as const
