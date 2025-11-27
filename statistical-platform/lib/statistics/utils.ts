/**
 * 통계 분석 공통 유틸리티 함수
 */

import { getPyodideInstance, isPyodideReady } from '../pyodide-runtime-loader'

/**
 * 숫자 배열 유효성 검사
 */
export function validateNumericArray(data: number[], minLength: number = 1, name: string = 'Data'): void {
  if (!Array.isArray(data)) {
    throw new Error(`${name} must be an array`)
  }
  if (data.length < minLength) {
    throw new Error(`${name} must contain at least ${minLength} elements`)
  }
  if (data.some(val => !Number.isFinite(val))) {
    throw new Error(`${name} contains non-numeric or invalid values`)
  }
}

/**
 * 2D 숫자 배열 유효성 검사
 */
export function validateNumericMatrix(data: number[][], minRows: number = 1, name: string = 'Data'): void {
  if (!Array.isArray(data)) {
    throw new Error(`${name} must be an array`)
  }
  if (data.length < minRows) {
    throw new Error(`${name} must contain at least ${minRows} rows`)
  }
  data.forEach((row, index) => {
    if (!Array.isArray(row)) {
      throw new Error(`${name} row ${index} is not an array`)
    }
    if (row.some(val => !Number.isFinite(val))) {
      throw new Error(`${name} row ${index} contains non-numeric values`)
    }
  })
}

/**
 * Pyodide 준비 상태 확인
 */
export async function ensurePyodideReady(): Promise<any> {
  if (!isPyodideReady()) {
    throw new Error('Pyodide is not ready. Please wait for it to load.')
  }
  return getPyodideInstance()
}

// ============================================================================
// 해석 함수들은 formatters.ts에서 re-export (단일 소스 원칙)
// ============================================================================
export {
  interpretEffectSizeEn as interpretEffectSize,
  interpretPValueEn as interpretPValue,
  interpretCorrelationEn as interpretCorrelation,
  interpretNormality,
  interpretHomogeneity
} from './formatters'

/**
 * 신뢰구간 계산
 */
export function calculateConfidenceInterval(
  mean: number,
  std: number,
  n: number,
  confidence: number = 0.95
): [number, number] {
  // t-분포를 사용한 신뢰구간 (작은 표본에도 적용 가능)
  const alpha = 1 - confidence
  const tValue = getTValue(n - 1, alpha / 2)
  const marginOfError = tValue * (std / Math.sqrt(n))
  
  return [mean - marginOfError, mean + marginOfError]
}

/**
 * t-값 근사 계산 (정확한 값은 Pyodide에서 계산)
 */
function getTValue(df: number, alpha: number): number {
  // 근사값 사용 (실제로는 scipy.stats.t.ppf 사용 권장)
  if (df >= 30) {
    // 큰 자유도에서는 정규분포 근사
    return alpha <= 0.025 ? 1.96 : 1.645
  }
  // 작은 자유도에 대한 근사값
  const tTable: { [key: number]: { [key: number]: number } } = {
    1: { 0.025: 12.706, 0.05: 6.314 },
    2: { 0.025: 4.303, 0.05: 2.920 },
    3: { 0.025: 3.182, 0.05: 2.353 },
    4: { 0.025: 2.776, 0.05: 2.132 },
    5: { 0.025: 2.571, 0.05: 2.015 },
    10: { 0.025: 2.228, 0.05: 1.812 },
    20: { 0.025: 2.086, 0.05: 1.725 },
  }
  
  const closestDf = Object.keys(tTable)
    .map(Number)
    .reduce((prev, curr) => 
      Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev
    )
  
  return tTable[closestDf][alpha] || 1.96
}