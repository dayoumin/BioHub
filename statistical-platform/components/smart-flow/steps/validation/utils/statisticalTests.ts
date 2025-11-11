/**
 * 통계 계산 유틸리티
 *
 * @description
 * 데이터 검증에 필요한 통계 계산 함수 모음
 * - 역 오차 함수 (Q-Q Plot용)
 * - 데이터 추출
 * - 기초 통계 계산
 */

import type { DataRow } from '@/types/smart-flow'

/**
 * 역 오차 함수 근사 (Q-Q Plot용)
 *
 * @param x - 입력값 (-1 < x < 1)
 * @returns 역 오차 함수 값
 *
 * @description
 * Q-Q Plot에서 이론적 분위수를 계산하기 위해 사용
 * Abramowitz and Stegun approximation 기반
 */
export function inverseErf(x: number): number {
  // 경계값 체크
  if (Math.abs(x) >= 1) {
    return x > 0 ? Infinity : -Infinity
  }

  const a = 0.147
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)

  const ln1MinusX2 = Math.log(1 - x * x)
  const part1 = 2 / (Math.PI * a) + ln1MinusX2 / 2
  const part2 = ln1MinusX2 / a

  return sign * Math.sqrt(Math.sqrt(part1 * part1 - part2) - part1)
}

/**
 * 컬럼 데이터를 숫자 배열로 변환
 *
 * @param data - 전체 데이터
 * @param columnName - 추출할 컬럼명
 * @returns 숫자 배열 (NaN 제외)
 *
 * @description
 * - 문자열 숫자는 parseFloat로 변환
 * - NaN 값은 필터링
 * - 결측값은 자동 제외
 */
export function extractNumericData(data: DataRow[], columnName: string): number[] {
  return data
    .map(row => {
      const value = row[columnName]
      return typeof value === 'number' ? value : parseFloat(String(value))
    })
    .filter(v => !isNaN(v))
}

/**
 * 기초 통계량 계산
 *
 * @param values - 숫자 배열
 * @returns 평균, 표준편차, 최솟값, 최댓값
 */
export function calculateBasicStats(values: number[]): {
  mean: number
  std: number
  min: number
  max: number
} {
  if (values.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0 }
  }

  const n = values.length
  const mean = values.reduce((sum, val) => sum + val, 0) / n
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  const std = Math.sqrt(variance)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return { mean, std, min, max }
}

/**
 * 표준정규분포 분위수 계산
 *
 * @param p - 확률 (0 < p < 1)
 * @returns 표준정규분포 분위수
 *
 * @description
 * Q-Q Plot에서 이론적 분위수를 계산하기 위해 사용
 */
export function normalQuantile(p: number): number {
  // Quantile function for standard normal distribution
  // Using inverse error function
  return Math.SQRT2 * inverseErf(2 * p - 1)
}

/**
 * Q-Q Plot용 이론적 분위수 생성
 *
 * @param n - 데이터 개수
 * @returns 이론적 분위수 배열
 */
export function generateTheoreticalQuantiles(n: number): number[] {
  const quantiles: number[] = []

  for (let i = 1; i <= n; i++) {
    const p = (i - 0.5) / n
    quantiles.push(normalQuantile(p))
  }

  return quantiles
}
