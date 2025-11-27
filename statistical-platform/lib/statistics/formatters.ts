/**
 * 통계 결과 포맷팅 유틸리티
 */

import { PRECISION, SIGNIFICANCE_LEVELS, EFFECT_SIZE, CORRELATION_STRENGTH } from './constants'

/**
 * 숫자를 지정된 정밀도로 포맷팅
 */
export function formatNumber(
  value: number | null | undefined,
  precision: number = PRECISION.STATISTIC
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }
  return value.toFixed(precision)
}

/**
 * p-value 포맷팅 (0.001 미만은 <0.001로 표시)
 */
export function formatPValue(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }
  if (value < 0.001) return '< 0.001'
  return formatNumber(value, PRECISION.P_VALUE)
}

/**
 * 백분율 포맷팅
 */
export function formatPercentage(value: number, includeSign = true): string {
  const formatted = formatNumber(value * 100, PRECISION.PERCENTAGE)
  return includeSign ? `${formatted}%` : formatted
}

/**
 * 상관계수 포맷팅 (강도 표시 포함)
 */
export function formatCorrelation(value: number, showStrength = false): string {
  const formatted = formatNumber(value, PRECISION.CORRELATION)
  if (!showStrength) return formatted

  const abs = Math.abs(value)
  let strength = ''
  if (abs < 0.2) strength = ' (매우 약함)'
  else if (abs < 0.4) strength = ' (약함)'
  else if (abs < 0.6) strength = ' (보통)'
  else if (abs < 0.8) strength = ' (강함)'
  else strength = ' (매우 강함)'

  return formatted + strength
}

/**
 * 신뢰구간 포맷팅
 */
export function formatConfidenceInterval(
  lower: number | null | undefined,
  upper: number | null | undefined,
  precision: number = PRECISION.STATISTIC
): string {
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return '[N/A, N/A]'
  }
  return `[${formatNumber(lower, precision)}, ${formatNumber(upper, precision)}]`
}

/**
 * 효과크기 포맷팅 (Cohen's d)
 */
export function formatEffectSize(value: number, showInterpretation = false): string {
  const formatted = formatNumber(value, PRECISION.CORRELATION)
  if (!showInterpretation) return formatted

  const abs = Math.abs(value)
  let interpretation = ''
  if (abs < 0.2) interpretation = ' (무시할 만함)'
  else if (abs < 0.5) interpretation = ' (작음)'
  else if (abs < 0.8) interpretation = ' (중간)'
  else if (abs < 1.2) interpretation = ' (큼)'
  else interpretation = ' (매우 큼)'

  return formatted + interpretation
}

/**
 * 큰 숫자 포맷팅 (천 단위 구분)
 */
export function formatLargeNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}

/**
 * 과학적 표기법 포맷팅
 */
export function formatScientific(value: number, precision = 2): string {
  return value.toExponential(precision)
}

/**
 * 테이블 데이터 포맷팅
 */
export interface TableRow {
  [key: string]: string | number
}

export function formatTableData(
  data: any[],
  formatters: Record<string, (value: any) => string>
): TableRow[] {
  return data.map(row => {
    const formatted: TableRow = {}
    for (const [key, value] of Object.entries(row)) {
      const formatter = formatters[key]
      formatted[key] = formatter ? formatter(value) : String(value)
    }
    return formatted
  })
}

/**
 * 메트릭 포맷팅 헬퍼
 */
export function formatMetric(
  name: string,
  value: number | null | undefined,
  type: 'statistic' | 'pvalue' | 'percentage' | 'count' = 'statistic'
): { name: string; value: string } {
  let formatted: string

  switch (type) {
    case 'pvalue':
      formatted = formatPValue(value as number)
      break
    case 'percentage':
      formatted = formatPercentage(value as number)
      break
    case 'count':
      formatted = formatNumber(value, PRECISION.COUNT)
      break
    default:
      formatted = formatNumber(value, PRECISION.STATISTIC)
  }

  return { name, value: formatted }
}

/**
 * p-value 유의성 판정 (boolean)
 * @param pValue p-value
 * @param alpha 유의수준 (기본값: 0.05)
 * @returns 통계적 유의성 여부
 */
export function interpretPValue(pValue: number, alpha: number = SIGNIFICANCE_LEVELS.STANDARD): boolean {
  return pValue < alpha
}

/**
 * p-value 해석 (한글, 문자열 반환)
 * UI 표시 및 해석 텍스트 생성용
 * @param pValue p-value
 * @returns 해석 문자열
 */
export function interpretPValueKo(pValue: number): string {
  if (pValue < 0.001) return '매우 강한 통계적 유의성 (p < 0.001)'
  if (pValue < 0.01) return '강한 통계적 유의성 (p < 0.01)'
  if (pValue < 0.05) return '통계적으로 유의 (p < 0.05)'
  if (pValue < 0.1) return '경계선 수준 (p < 0.1)'
  return '통계적으로 유의하지 않음 (p >= 0.1)'
}

/**
 * 통계 결과 요약 텍스트 생성
 * @param statistic 통계량 이름 (예: 't', 'F', 'χ²')
 * @param statisticValue 통계량 값
 * @param df 자유도
 * @param pValue p-value
 * @returns 포맷된 결과 요약 문자열
 */
export function formatStatisticalResult(
  statistic: string,
  statisticValue: number,
  df: number | number[],
  pValue: number
): string {
  const formattedDf = Array.isArray(df) ? `(${df.join(', ')})` : `(${df})`
  const formattedP = formatPValue(pValue)
  const formattedValue = formatNumber(statisticValue, PRECISION.STATISTIC)

  return `${statistic}${formattedDf} = ${formattedValue}, p = ${formattedP}`
}

/**
 * 효과크기 해석 (확장)
 * @param effectSize 효과크기 값
 * @param effectType 효과크기 유형
 * @returns 해석 문자열
 */
export function interpretEffectSize(
  effectSize: number,
  effectType: 'cohen_d' | 'eta_squared' | 'omega_squared' | 'r' | 'phi' | 'cramers_v' = 'cohen_d'
): string {
  const absValue = Math.abs(effectSize)

  switch (effectType) {
    case 'cohen_d':
      if (absValue < EFFECT_SIZE.SMALL) return '매우 작음'
      if (absValue < EFFECT_SIZE.MEDIUM) return '작음'
      if (absValue < EFFECT_SIZE.LARGE) return '중간'
      if (absValue < EFFECT_SIZE.VERY_LARGE) return '큼'
      return '매우 큼'
    case 'eta_squared':
    case 'omega_squared':
      if (absValue < 0.01) return '매우 작음'
      if (absValue < 0.06) return '작음'
      if (absValue < 0.14) return '중간'
      return '큼'
    case 'r':
      if (absValue < 0.1) return '무시할 수준'
      if (absValue < 0.3) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
    case 'phi':
    case 'cramers_v':
      if (absValue < 0.1) return '무시할 수준'
      if (absValue < 0.3) return '작음'
      if (absValue < 0.5) return '중간'
      return '큼'
    default:
      return '해석 불가'
  }
}

/**
 * 상관계수 해석 (확장)
 * @param r 상관계수
 * @returns 해석 문자열
 */
export function interpretCorrelation(r: number): string {
  const absR = Math.abs(r)
  const direction = r >= 0 ? '양' : '음'

  if (absR < CORRELATION_STRENGTH.VERY_WEAK) {
    return `매우 약한 ${direction}의 상관관계`
  } else if (absR < CORRELATION_STRENGTH.WEAK) {
    return `약한 ${direction}의 상관관계`
  } else if (absR < CORRELATION_STRENGTH.MODERATE) {
    return `중간 정도의 ${direction}의 상관관계`
  } else if (absR < CORRELATION_STRENGTH.STRONG) {
    return `강한 ${direction}의 상관관계`
  } else if (absR < CORRELATION_STRENGTH.VERY_STRONG) {
    return `매우 강한 ${direction}의 상관관계`
  } else {
    return `거의 완벽한 ${direction}의 상관관계`
  }
}

// ============================================================================
// 영어 버전 해석 함수 (내부 계산/로깅용)
// ============================================================================

/**
 * p-value 해석 (영어, 문자열 반환)
 * @param pValue p-value
 * @param alpha 유의수준 (기본값: 0.05)
 * @returns 해석 문자열
 */
export function interpretPValueEn(pValue: number, alpha: number = 0.05): string {
  if (pValue < 0.001) return 'highly significant (p < 0.001)'
  if (pValue < 0.01) return 'very significant (p < 0.01)'
  if (pValue < alpha) return `significant (p < ${alpha})`
  return `not significant (p >= ${alpha})`
}

/**
 * 효과크기 해석 (영어)
 * @param effectSize 효과크기 값
 * @param type 효과크기 유형
 * @returns 해석 문자열
 */
export function interpretEffectSizeEn(
  effectSize: number,
  type: 'cohens_d' | 'eta_squared' | 'r' = 'cohens_d'
): string {
  const absValue = Math.abs(effectSize)

  switch (type) {
    case 'cohens_d':
      if (absValue < 0.2) return 'negligible'
      if (absValue < 0.5) return 'small'
      if (absValue < 0.8) return 'medium'
      return 'large'
    case 'eta_squared':
      if (absValue < 0.01) return 'negligible'
      if (absValue < 0.06) return 'small'
      if (absValue < 0.14) return 'medium'
      return 'large'
    case 'r':
      if (absValue < 0.1) return 'negligible'
      if (absValue < 0.3) return 'small'
      if (absValue < 0.5) return 'medium'
      if (absValue < 0.7) return 'large'
      return 'very large'
    default:
      return 'unknown'
  }
}

/**
 * 상관계수 강도 해석 (영어)
 * @param r 상관계수
 * @returns 해석 문자열
 */
export function interpretCorrelationEn(r: number): string {
  const absR = Math.abs(r)
  if (absR < 0.1) return 'negligible'
  if (absR < 0.3) return 'weak'
  if (absR < 0.5) return 'moderate'
  if (absR < 0.7) return 'strong'
  return 'very strong'
}

/**
 * 상관계수 강도만 해석 (한글, 방향 없이)
 * @param correlation 상관계수
 * @returns 강도 문자열 (예: "강한", "약한")
 */
export function interpretCorrelationStrength(correlation: number): string {
  const absCorr = Math.abs(correlation)
  // CORRELATION_STRENGTH constants 기준 (경계값은 상위 범주에 포함)
  if (absCorr >= CORRELATION_STRENGTH.STRONG) return '강한'        // >= 0.8
  if (absCorr >= CORRELATION_STRENGTH.MODERATE) return '중간'     // >= 0.6
  if (absCorr >= CORRELATION_STRENGTH.WEAK) return '약간'         // >= 0.4
  return '약한'                                                    // < 0.4
}

/**
 * 정규성 검정 해석
 * @param pValue p-value
 * @param alpha 유의수준 (기본값: 0.05)
 * @returns 정규성 여부와 해석 문자열
 */
export function interpretNormality(pValue: number, alpha: number = 0.05): {
  isNormal: boolean
  interpretation: string
} {
  const isNormal = pValue >= alpha
  const interpretation = isNormal
    ? `Data appears to be normally distributed (p = ${formatPValue(pValue)} >= ${alpha})`
    : `Data deviates from normal distribution (p = ${formatPValue(pValue)} < ${alpha})`

  return { isNormal, interpretation }
}

/**
 * 등분산성 검정 해석
 * @param pValue p-value
 * @param alpha 유의수준 (기본값: 0.05)
 * @returns 등분산성 여부와 해석 문자열
 */
export function interpretHomogeneity(pValue: number, alpha: number = 0.05): {
  isHomogeneous: boolean
  interpretation: string
} {
  const isHomogeneous = pValue >= alpha
  const interpretation = isHomogeneous
    ? `Variances appear to be equal (p = ${formatPValue(pValue)} >= ${alpha})`
    : `Variances are not equal (p = ${formatPValue(pValue)} < ${alpha})`

  return { isHomogeneous, interpretation }
}