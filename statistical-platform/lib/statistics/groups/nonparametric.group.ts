/**
 * Nonparametric Statistics Group
 *
 * 비모수 통계 그룹 (9개 메서드)
 * - Worker 3 전용 (ANOVA와 함께)
 * - 패키지: SciPy, Statsmodels
 */

import type { GroupModule, MethodHandler, CalculationResult } from '../registry/types'
import type { CalculatorContext } from '../calculator-types'
import { extractDataRows, validateNumberArray, validateNumberMatrix, safeParseNumber, extractGroupedValues } from './utils'

export function createNonparametricGroup(context: CalculatorContext): GroupModule {
  return {
    id: 'nonparametric',
    methods: [
      'mannWhitney',
      'wilcoxon',
      'kruskalWallis',
      'friedman',
      'signTest',
      'runsTest',
      'mcNemar',
      'cochranQ',
      'moodMedian'
    ],
    handlers: {
      mannWhitney: createMannWhitneyHandler(context),
      wilcoxon: createWilcoxonHandler(context),
      kruskalWallis: createKruskalWallisHandler(context),
      friedman: createFriedmanHandler(context),
      signTest: createSignTestHandler(context),
      runsTest: createRunsTestHandler(context),
      mcNemar: createMcNemarHandler(context),
      cochranQ: createCochranQHandler(context),
      moodMedian: createMoodMedianHandler(context)
    }
  }
}

// ============================================================================
// 핸들러 구현
// ============================================================================

/**
 * Mann-Whitney U 검정
 */
function createMannWhitneyHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn

    if (!groupColumn || typeof groupColumn !== 'string' || !valueColumn || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    const groups: Record<string, number[]> = {}
    extractDataRows(data).forEach(row => {
      const g = String(row[groupColumn] ?? '')
      const v = parseFloat(String(row[valueColumn] ?? ''))
      if (!isNaN(v) && g) {
        if (!groups[g]) groups[g] = []
        groups[g].push(v)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length !== 2) {
      return { success: false, error: '정확히 2개의 그룹이 필요합니다' }
    }

    const result = await context.pyodideCore.mannWhitneyTestWorker(groups[groupNames[0]], groups[groupNames[1]])

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'U-통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Mann-Whitney U 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Wilcoxon 부호순위 검정
 */
function createWilcoxonHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const variable1 = paramsObj.variable1
    const variable2 = paramsObj.variable2

    if (!variable1 || typeof variable1 !== 'string' || !variable2 || typeof variable2 !== 'string') {
      return { success: false, error: '두 변수를 선택하세요' }
    }

    const values1: number[] = []
    const values2: number[] = []

    extractDataRows(data).forEach(row => {
      const v1Raw = row[variable1]
      const v2Raw = row[variable2]
      const v1 = typeof v1Raw === 'number' ? v1Raw : typeof v1Raw === 'string' ? parseFloat(v1Raw) : NaN
      const v2 = typeof v2Raw === 'number' ? v2Raw : typeof v2Raw === 'string' ? parseFloat(v2Raw) : NaN
      if (!isNaN(v1) && !isNaN(v2)) {
        values1.push(v1)
        values2.push(v2)
      }
    })

    if (values1.length < 2) {
      return { success: false, error: '최소 2쌍의 데이터가 필요합니다' }
    }

    const result = await context.pyodideCore.wilcoxonTestWorker(values1, values2)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'W-통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Wilcoxon 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Kruskal-Wallis 검정
 */
function createKruskalWallisHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn

    if (!groupColumn || typeof groupColumn !== 'string' || !valueColumn || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    const groups: Record<string, number[]> = {}
    extractDataRows(data).forEach(row => {
      const g = String(row[groupColumn] ?? '')
      const v = parseFloat(String(row[valueColumn] ?? ''))
      if (!isNaN(v) && g) {
        if (!groups[g]) groups[g] = []
        groups[g].push(v)
      }
    })

    const groupArrays = Object.values(groups)
    if (groupArrays.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const result = await context.pyodideCore.kruskalWallisTestWorker(groupArrays)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'H-통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Kruskal-Wallis 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Friedman 검정
 */
function createFriedmanHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix

    // Validate and convert dataMatrix to number[][]
    const validatedMatrix = validateNumberMatrix(dataMatrix, 2, 2)
    if (!validatedMatrix) {
      return { success: false, error: '최소 2x2 숫자 행렬이 필요합니다 (NaN 제거됨)' }
    }

    const result = await context.pyodideCore.friedmanTestWorker(validatedMatrix)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '카이제곱 통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Friedman 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Sign 검정 (부호 검정)
 */
function createSignTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const before = paramsObj.before
    const after = paramsObj.after

    // Validate and convert to number arrays
    const validatedBefore = validateNumberArray(before, 2)
    const validatedAfter = validateNumberArray(after, 2)

    if (!validatedBefore || !validatedAfter) {
      return { success: false, error: 'before와 after는 각각 최소 2개의 숫자가 필요합니다 (NaN 제거됨)' }
    }

    if (validatedBefore.length !== validatedAfter.length) {
      return { success: false, error: 'before와 after의 길이가 같아야 합니다' }
    }

    const result = await context.pyodideCore.signTestWorker(validatedBefore, validatedAfter)

    if (!context.pyodideCore.hasStatisticFields(result, ['pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Sign 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Runs 검정 (연속성 검정)
 */
function createRunsTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const sequence = paramsObj.sequence

    if (!Array.isArray(sequence) || sequence.length < 2) {
      return { success: false, error: '최소 2개 이상의 시퀀스 데이터가 필요합니다' }
    }

    // Filter out null/undefined values and convert to numbers
    const validSequence = sequence
      .filter((v): v is number | string => v !== null && v !== undefined)
      .map(v => typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN)
      .filter(v => !isNaN(v))

    if (validSequence.length < 2) {
      return { success: false, error: '유효한 시퀀스 데이터가 부족합니다' }
    }

    const result = await context.pyodideCore.runsTestWorker(validSequence)

    if (!context.pyodideCore.hasStatisticFields(result, ['zStatistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const zStatistic = context.pyodideCore.getStatisticValue(result, 'zStatistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'Z-통계량', value: zStatistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Runs 검정 결과 ${pValue < 0.05 ? '무작위성이 없습니다' : '무작위성이 있습니다'}.`
      }
    }
  }
}

/**
 * McNemar 검정
 */
function createMcNemarHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const contingencyTable = paramsObj.contingencyTable

    // Validate 2x2 contingency table
    const validatedTable = validateNumberMatrix(contingencyTable, 2, 2)
    if (!validatedTable || validatedTable.length !== 2 || validatedTable[0].length !== 2) {
      return { success: false, error: '2x2 분할표가 필요합니다' }
    }

    const result = await context.pyodideCore.mcnemarTestWorker(validatedTable)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '카이제곱 통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `McNemar 검정 결과 ${pValue < 0.05 ? '유의한 변화가 있습니다' : '유의한 변화가 없습니다'}.`
      }
    }
  }
}

/**
 * Cochran Q 검정
 */
function createCochranQHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix

    // Validate binary data matrix
    const validatedMatrix = validateNumberMatrix(dataMatrix, 2, 2)
    if (!validatedMatrix) {
      return { success: false, error: '최소 2x2 이진 데이터 행렬이 필요합니다' }
    }

    // Verify all values are 0 or 1
    const isBinary = validatedMatrix.every(row =>
      row.every(val => val === 0 || val === 1)
    )

    if (!isBinary) {
      return { success: false, error: 'Cochran Q 검정은 이진 데이터 (0 또는 1)가 필요합니다' }
    }

    const result = await context.pyodideCore.cochranQTestWorker(validatedMatrix)

    if (!context.pyodideCore.hasStatisticFields(result, ['qStatistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const qStatistic = context.pyodideCore.getStatisticValue(result, 'qStatistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'Q-통계량', value: qStatistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Cochran Q 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Mood Median 검정 (중앙값 검정)
 */
function createMoodMedianHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groups = paramsObj.groups

    // Validate groups as array of number arrays
    const validatedGroups = validateNumberMatrix(groups, 2, 1)
    if (!validatedGroups || validatedGroups.length < 2) {
      return { success: false, error: '최소 2개의 그룹이 필요합니다' }
    }

    const result = await context.pyodideCore.moodMedianTestWorker(validatedGroups)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '카이제곱 통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `Mood Median 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

// Note: All utility functions are now imported from './utils'
// extractDataRows, validateNumberArray, validateNumberMatrix, safeParseNumber, extractGroupedValues
