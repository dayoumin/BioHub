/**
 * 핸들러 공통 유틸리티 함수
 *
 * 중복 코드를 제거하고 재사용성을 높이기 위한 유틸리티 모음
 */

/**
 * 데이터에서 숫자형 열 추출
 */
export function extractNumericColumn(data: any[], column: string): number[] {
  return data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
}

/**
 * 그룹별로 데이터 분리
 */
export function extractGroupedData(
  data: any[],
  groupColumn: string,
  valueColumn: string
): Record<string, number[]> {
  const groups: Record<string, number[]> = {}

  data.forEach(row => {
    const group = row[groupColumn]
    const value = parseFloat(row[valueColumn])

    if (!isNaN(value)) {
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(value)
    }
  })

  return groups
}

/**
 * 최소 데이터 크기 검증
 */
export function validateMinimumSize(
  values: number[],
  minSize: number,
  errorMessage?: string
): { valid: true } | { valid: false; error: string } {
  if (values.length < minSize) {
    return {
      valid: false,
      error: errorMessage || `최소 ${minSize}개 이상의 데이터가 필요합니다`
    }
  }
  return { valid: true }
}

/**
 * 필수 파라미터 존재 여부 검증
 */
export function validateParameterExists(
  parameters: Record<string, any>,
  requiredParams: string[]
): { valid: true } | { valid: false; error: string; missing: string[] } {
  const missing = requiredParams.filter(param => parameters[param] === undefined)

  if (missing.length > 0) {
    return {
      valid: false,
      error: `필수 파라미터가 누락되었습니다: ${missing.join(', ')}`,
      missing
    }
  }

  return { valid: true }
}

/**
 * p-value 포맷팅
 */
export function formatPValue(pValue: number, decimals: number = 4): string {
  if (pValue < 0.0001) {
    return '< 0.0001'
  }
  return pValue.toFixed(decimals)
}

/**
 * 신뢰구간 포맷팅
 */
export function formatConfidenceInterval(
  lower: number,
  upper: number,
  decimals: number = 4
): string {
  return `[${lower.toFixed(decimals)}, ${upper.toFixed(decimals)}]`
}

/**
 * 효과크기 해석
 */
export function interpretEffectSize(effectSize: number): string {
  const absEffect = Math.abs(effectSize)

  if (absEffect < 0.2) return '매우 작은'
  if (absEffect < 0.5) return '작은'
  if (absEffect < 0.8) return '중간'
  return '큰'
}

/**
 * 통계적 유의성 해석
 */
export function interpretSignificance(
  pValue: number,
  alpha: number = 0.05
): {
  isSignificant: boolean
  comparison: string
  conclusion: string
} {
  const isSignificant = pValue < alpha

  return {
    isSignificant,
    comparison: isSignificant ? '보다 작으므로' : '보다 크므로',
    conclusion: isSignificant ? '유의합니다' : '유의하지 않습니다'
  }
}

/**
 * 다변량 데이터 행렬 추출 (회귀분석용)
 */
export function extractMatrixData(
  data: any[],
  independentColumns: string[],
  dependentColumn: string
): {
  xMatrix: number[][]
  yValues: number[]
  validCount: number
} {
  const xMatrix: number[][] = []
  const yValues: number[] = []

  data.forEach(row => {
    const xRow: number[] = []
    let valid = true

    independentColumns.forEach((col: string) => {
      const value = parseFloat(row[col])
      if (isNaN(value)) {
        valid = false
      } else {
        xRow.push(value)
      }
    })

    const yValue = parseFloat(row[dependentColumn])
    if (valid && !isNaN(yValue)) {
      xMatrix.push(xRow)
      yValues.push(yValue)
    }
  })

  return {
    xMatrix,
    yValues,
    validCount: xMatrix.length
  }
}

/**
 * AUC 품질 평가
 */
export function interpretAUC(auc: number): string {
  if (auc > 0.9) return '매우 우수한'
  if (auc > 0.8) return '우수한'
  if (auc > 0.7) return '양호한'
  if (auc > 0.6) return '보통인'
  return '낮은'
}

/**
 * 상관계수 강도 해석
 */
export function interpretCorrelationStrength(correlation: number): string {
  const absCorr = Math.abs(correlation)
  if (absCorr > 0.7) return '강한'
  if (absCorr > 0.5) return '중간'
  if (absCorr > 0.3) return '약간'
  return '약한'
}

/**
 * 회귀분석 최소 샘플 크기 계산
 */
export function getMinimumRegressionSampleSize(numPredictors: number): number {
  // 일반적으로 예측변수 개수 + 2 이상 필요 (자유도 확보)
  return numPredictors + 2
}

/**
 * 에러 메시지 상수
 */
export const ERROR_MESSAGES = {
  MISSING_REQUIRED_PARAMS: '필수 파라미터를 입력하세요',
  MISSING_COLUMN: (column: string) => `${column} 열을 선택하세요`,
  MISSING_COLUMNS: (columns: string[]) => `${columns.join(', ')} 열을 선택하세요`,
  INSUFFICIENT_DATA: (min: number) => `최소 ${min}개 이상의 데이터가 필요합니다`,
  INVALID_GROUP_COUNT: (expected: number) =>
    `정확히 ${expected}개의 그룹이 필요합니다`,
  NO_VALID_DATA: '유효한 숫자 데이터가 없습니다'
} as const
