/**
 * 데이터 업로드 후 형태 검증 유틸리티
 *
 * 통계 방법별로 업로드된 데이터가 기대 형태와 맞는지 확인합니다.
 * 엄격한 에러가 아닌, 사용자에게 도움이 되는 경고(warning)를 반환합니다.
 */

import { getNumericColumns } from '@/lib/data-validation'

export interface FormatValidationResult {
  /** 데이터 형태가 적합한지 여부 */
  isCompatible: boolean
  /** 사용자에게 표시할 경고 메시지 (한국어) */
  warnings: string[]
  /** 감지된 열 정보 */
  detected: {
    totalColumns: number
    numericColumns: string[]
    categoricalColumns: string[]
    rowCount: number
  }
}

type DataRow = Record<string, unknown>

/**
 * 범주형(categorical) 열을 감지합니다.
 * 숫자가 아닌 고유값이 주로 포함된 열입니다.
 */
function getCategoricalColumns(data: DataRow[]): string[] {
  if (!data || data.length === 0) return []

  const columns = Object.keys(data[0])
  const numericCols = new Set(getNumericColumns(data))
  return columns.filter(col => !numericCols.has(col))
}

/**
 * 이진형(binary) 열을 감지합니다.
 * 고유값이 정확히 2개인 열입니다.
 */
function getBinaryColumns(data: DataRow[]): string[] {
  if (!data || data.length === 0) return []

  const columns = Object.keys(data[0])
  return columns.filter(col => {
    const uniqueValues = new Set(
      data
        .map(row => row[col])
        .filter(v => v !== null && v !== undefined && v !== '')
    )
    return uniqueValues.size === 2
  })
}

// ============================================================================
// 통계 방법별 검증 규칙
// ============================================================================

interface MethodFormatRule {
  /** 최소 필요 열 수 */
  minColumns: number
  /** 최소 필요 숫자 열 수 */
  minNumericColumns: number
  /** 최소 필요 범주 열 수 */
  minCategoricalColumns: number
  /** 최소 필요 행 수 */
  minRows: number
  /** 방법별 추가 검증 로직 */
  customCheck?: (data: DataRow[], numericCols: string[], categoricalCols: string[]) => string[]
}

const METHOD_FORMAT_RULES: Record<string, MethodFormatRule> = {
  // t-검정
  'one-sample-t': {
    minColumns: 1,
    minNumericColumns: 1,
    minCategoricalColumns: 0,
    minRows: 3,
  },
  't-test': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 1,
    minRows: 6,
    customCheck: (_data, _numCols, catCols) => {
      const warnings: string[] = []
      if (catCols.length === 0) {
        warnings.push('그룹을 구분하는 열(범주형)이 필요합니다. 예: "실험군/대조군"')
      }
      return warnings
    },
  },
  'paired-t': {
    minColumns: 2,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 3,
    customCheck: (_data, numCols) => {
      const warnings: string[] = []
      if (numCols.length < 2) {
        warnings.push('전/후 측정값이 각각 별도 열에 있어야 합니다 (숫자 열 2개 이상)')
      }
      return warnings
    },
  },
  'welch-t': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 1,
    minRows: 6,
  },

  // ANOVA
  'anova': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 1,
    minRows: 9,
    customCheck: (data, _numCols, catCols) => {
      const warnings: string[] = []
      if (catCols.length > 0) {
        const firstCatCol = catCols[0]
        const groups = new Set(data.map(row => row[firstCatCol]).filter(v => v != null))
        if (groups.size < 3) {
          warnings.push(`일원분산분석에는 3개 이상의 그룹이 필요합니다 (현재 ${groups.size}개)`)
        }
      }
      return warnings
    },
  },
  'two-way-anova': {
    minColumns: 3,
    minNumericColumns: 1,
    minCategoricalColumns: 2,
    minRows: 8,
  },
  'repeated-measures-anova': {
    minColumns: 3,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 3,
    customCheck: (_data, numCols) => {
      const warnings: string[] = []
      if (numCols.length < 3) {
        warnings.push('반복 측정 시점이 3개 이상이어야 합니다 (숫자 열 3개 이상)')
      }
      return warnings
    },
  },
  'ancova': {
    minColumns: 3,
    minNumericColumns: 2,
    minCategoricalColumns: 1,
    minRows: 6,
  },
  'manova': {
    minColumns: 3,
    minNumericColumns: 2,
    minCategoricalColumns: 1,
    minRows: 6,
  },

  // 비모수
  'mann-whitney': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 1,
    minRows: 6,
  },
  'wilcoxon': {
    minColumns: 2,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 3,
  },
  'kruskal-wallis': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 1,
    minRows: 9,
  },
  'friedman': {
    minColumns: 3,
    minNumericColumns: 3,
    minCategoricalColumns: 0,
    minRows: 3,
  },
  'sign-test': {
    minColumns: 2,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 3,
  },
  'mcnemar': {
    minColumns: 2,
    minNumericColumns: 0,
    minCategoricalColumns: 2,
    minRows: 10,
  },
  'binomial-test': {
    minColumns: 1,
    minNumericColumns: 0,
    minCategoricalColumns: 0,
    minRows: 3,
  },

  // 상관분석
  'correlation': {
    minColumns: 2,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 5,
  },
  'partial-correlation': {
    minColumns: 3,
    minNumericColumns: 3,
    minCategoricalColumns: 0,
    minRows: 5,
  },

  // 회귀분석
  'regression': {
    minColumns: 2,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 5,
  },
  'stepwise': {
    minColumns: 3,
    minNumericColumns: 3,
    minCategoricalColumns: 0,
    minRows: 10,
  },

  // 범주형
  'chi-square': {
    minColumns: 2,
    minNumericColumns: 0,
    minCategoricalColumns: 2,
    minRows: 5,
  },
  'chi-square-goodness': {
    minColumns: 1,
    minNumericColumns: 0,
    minCategoricalColumns: 1,
    minRows: 5,
  },

  // 기술통계
  'descriptive': {
    minColumns: 1,
    minNumericColumns: 0,
    minCategoricalColumns: 0,
    minRows: 1,
  },
  'normality-test': {
    minColumns: 1,
    minNumericColumns: 1,
    minCategoricalColumns: 0,
    minRows: 3,
  },

  // 시계열
  'arima': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 0,
    minRows: 10,
  },
  'seasonal-decompose': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 0,
    minRows: 24,
  },

  // 생존분석
  'kaplan-meier': {
    minColumns: 2,
    minNumericColumns: 1,
    minCategoricalColumns: 0,
    minRows: 5,
  },
  'cox-regression': {
    minColumns: 3,
    minNumericColumns: 1,
    minCategoricalColumns: 0,
    minRows: 10,
  },

  // 다변량
  'pca': {
    minColumns: 3,
    minNumericColumns: 3,
    minCategoricalColumns: 0,
    minRows: 5,
  },
  'factor-analysis': {
    minColumns: 3,
    minNumericColumns: 3,
    minCategoricalColumns: 0,
    minRows: 10,
  },
  'cluster': {
    minColumns: 2,
    minNumericColumns: 2,
    minCategoricalColumns: 0,
    minRows: 5,
  },
  'discriminant': {
    minColumns: 3,
    minNumericColumns: 2,
    minCategoricalColumns: 1,
    minRows: 10,
  },
  'reliability': {
    minColumns: 3,
    minNumericColumns: 3,
    minCategoricalColumns: 0,
    minRows: 5,
  },
}

/**
 * 업로드된 데이터가 통계 방법의 기대 형태와 맞는지 검증합니다.
 *
 * @param methodId - 통계 방법 ID
 * @param data - 업로드된 데이터 (parsed rows)
 * @returns 검증 결과 (경고 메시지 포함)
 *
 * @example
 * const result = validateDataFormat('t-test', uploadedData)
 * if (!result.isCompatible) {
 *   // result.warnings를 표시
 * }
 */
export function validateDataFormat(
  methodId: string,
  data: DataRow[]
): FormatValidationResult {
  const warnings: string[] = []

  if (!data || data.length === 0) {
    return {
      isCompatible: false,
      warnings: ['데이터가 비어 있습니다'],
      detected: { totalColumns: 0, numericColumns: [], categoricalColumns: [], rowCount: 0 },
    }
  }

  const columns = Object.keys(data[0])
  const numericColumns = getNumericColumns(data)
  const categoricalColumns = getCategoricalColumns(data)
  const binaryColumns = getBinaryColumns(data)

  const detected = {
    totalColumns: columns.length,
    numericColumns,
    categoricalColumns,
    rowCount: data.length,
  }

  const rule = METHOD_FORMAT_RULES[methodId]
  if (!rule) {
    // 규칙이 없는 메서드는 기본 검증만
    return { isCompatible: true, warnings: [], detected }
  }

  // 행 수 검증
  if (data.length < rule.minRows) {
    warnings.push(`최소 ${rule.minRows}개의 행이 필요합니다 (현재 ${data.length}개)`)
  }

  // 열 수 검증
  if (columns.length < rule.minColumns) {
    warnings.push(`최소 ${rule.minColumns}개의 열이 필요합니다 (현재 ${columns.length}개)`)
  }

  // 숫자 열 검증
  if (numericColumns.length < rule.minNumericColumns) {
    warnings.push(
      `숫자(수치형) 열이 ${rule.minNumericColumns}개 이상 필요합니다 (현재 ${numericColumns.length}개)`
    )
  }

  // 범주 열 검증
  if (categoricalColumns.length < rule.minCategoricalColumns) {
    warnings.push(
      `범주형(문자) 열이 ${rule.minCategoricalColumns}개 이상 필요합니다 (현재 ${categoricalColumns.length}개)`
    )
  }

  // 방법별 커스텀 검증
  if (rule.customCheck) {
    const customWarnings = rule.customCheck(data, numericColumns, categoricalColumns)
    warnings.push(...customWarnings)
  }

  // 이진형 검정에서 이진 열 확인
  if (methodId === 'mcnemar' && binaryColumns.length < 2) {
    warnings.push('이진값(2가지 값) 열이 2개 이상 필요합니다')
  }

  return {
    isCompatible: warnings.length === 0,
    warnings,
    detected,
  }
}