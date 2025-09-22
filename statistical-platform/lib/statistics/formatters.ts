/**
 * 통계 결과 포맷팅 유틸리티
 */

import { PRECISION } from './constants'

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
export function formatPValue(value: number): string {
  if (value < 0.001) return '<0.001'
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
  lower: number,
  upper: number,
  precision = PRECISION.STATISTIC
): string {
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