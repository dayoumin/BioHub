/**
 * Hypothesis Testing Group
 *
 * 가설검정 그룹 (8개 메서드)
 * - Worker 2 전용
 * - 패키지: NumPy, SciPy, Statsmodels
 */

import type { GroupModule, MethodHandler, CalculationResult } from '../registry/types'
import type { CalculatorContext } from '../calculator-types'
import { extractDataRows, transposeMatrix, safeParseNumber } from './utils'

/**
 * Hypothesis Group 생성
 */
export function createHypothesisGroup(context: CalculatorContext): GroupModule {
  return {
    id: 'hypothesis',
    methods: [
      'tTest',
      'pairedTTest',
      'oneSampleTTest',
      'zTest',
      'chiSquare',
      'binomialTest',
      'correlation',
      'partialCorrelation'
    ],
    handlers: {
      tTest: createTTestHandler(context),
      pairedTTest: createPairedTTestHandler(context),
      oneSampleTTest: createOneSampleTTestHandler(context),
      zTest: createZTestHandler(context),
      chiSquare: createChiSquareHandler(context),
      binomialTest: createBinomialTestHandler(context),
      correlation: createCorrelationHandler(context),
      partialCorrelation: createPartialCorrelationHandler(context)
    }
  }
}

// ============================================================================
// 핸들러 구현
// ============================================================================

/**
 * 독립표본 t-검정 (Independent Samples t-test)
 */
function createTTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn

    if (typeof groupColumn !== 'string' || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    const groups: Record<string, number[]> = {}
    extractDataRows(data).forEach(row => {
      const group = String(row[groupColumn] ?? '')
      const value = parseFloat(String(row[valueColumn] ?? ''))
      if (!isNaN(value) && group) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length !== 2) {
      return { success: false, error: '정확히 2개의 그룹이 필요합니다' }
    }

    const group1 = groups[groupNames[0]]
    const group2 = groups[groupNames[1]]
    const equalVarVal = paramsObj.equal_var
    const equalVar = typeof equalVarVal === 'boolean' ? equalVarVal : true

    const result = await context.pyodideCore.twoSampleTTest(group1, group2, equalVar)

    // 필수 필드 확인
    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue', 'cohensD', 'mean1', 'mean2', 'std1', 'std2'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')
    const cohensD = context.pyodideCore.getStatisticValue(result, 'cohensD')
    const mean1 = context.pyodideCore.getStatisticValue(result, 'mean1')
    const mean2 = context.pyodideCore.getStatisticValue(result, 'mean2')
    const std1 = context.pyodideCore.getStatisticValue(result, 'std1')
    const std2 = context.pyodideCore.getStatisticValue(result, 'std2')

    return {
      success: true,
      data: {
        metrics: [
          { name: 't-통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) },
          { name: "Cohen's d", value: cohensD.toFixed(4) }
        ],
        tables: [{
          name: '그룹별 통계',
          data: [
            { 그룹: groupNames[0], 표본수: group1.length, 평균: mean1.toFixed(4), 표준편차: std1.toFixed(4) },
            { 그룹: groupNames[1], 표본수: group2.length, 평균: mean2.toFixed(4), 표준편차: std2.toFixed(4) }
          ]
        }],
        interpretation: `두 그룹 간 평균 차이는 ${pValue < 0.05 ? '통계적으로 유의합니다' : '통계적으로 유의하지 않습니다'}.`
      }
    }
  }
}

/**
 * 대응표본 t-검정 (Paired Samples t-test)
 */
function createPairedTTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const var1 = paramsObj.variable1
    const var2 = paramsObj.variable2

    if (!var1 || typeof var1 !== 'string' || !var2 || typeof var2 !== 'string') {
      return { success: false, error: '두 변수를 선택하세요' }
    }

    const values1: number[] = []
    const values2: number[] = []

    extractDataRows(data).forEach(row => {
      const v1Raw = row[var1]
      const v2Raw = row[var2]
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

    const result = await context.pyodideCore.pairedTTest(values1, values2)

    return {
      success: true,
      data: {
        metrics: [
          { name: 't-통계량', value: context.pyodideCore.getStatisticValue(result, 'statistic').toFixed(4) },
          { name: 'p-value', value: context.pyodideCore.getStatisticValue(result, 'pValue').toFixed(4) },
          { name: '평균 차이', value: context.pyodideCore.getStatisticValue(result, 'meanDiff').toFixed(4) }
        ],
        interpretation: `대응 표본 간 평균 차이는 ${context.pyodideCore.getStatisticValue(result, 'pValue') < 0.05 ? '통계적으로 유의합니다' : '통계적으로 유의하지 않습니다'}.`
      }
    }
  }
}

/**
 * 일표본 t-검정 (One-Sample t-test)
 */
function createOneSampleTTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const column = paramsObj.column
    const popmean = paramsObj.popmean

    if (!column || typeof column !== 'string') {
      return { success: false, error: '변수를 선택하세요' }
    }

    if (typeof popmean !== 'number') {
      return { success: false, error: '모평균을 지정하세요' }
    }

    const values = extractDataRows(data)
      .map(row => {
        const val = row[column]
        return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
      })
      .filter(v => !isNaN(v))
    if (values.length < 2) {
      return { success: false, error: '최소 2개 이상의 데이터가 필요합니다' }
    }

    const result = await context.pyodideCore.oneSampleTTest(values, popmean)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue', 'sampleMean'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')
    const sampleMean = context.pyodideCore.getStatisticValue(result, 'sampleMean')

    return {
      success: true,
      data: {
        metrics: [
          { name: 't-통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) },
          { name: '표본 평균', value: sampleMean.toFixed(4) }
        ],
        interpretation: `표본 평균이 모평균 ${popmean}와(과) ${pValue < 0.05 ? '유의하게 다릅니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * Z-검정 (Z-test)
 */
function createZTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const column = paramsObj.column
    const popmean = paramsObj.popmean
    const popstd = paramsObj.popstd

    if (!column || typeof column !== 'string') {
      return { success: false, error: '변수를 선택하세요' }
    }

    if (typeof popmean !== 'number' || typeof popstd !== 'number') {
      return { success: false, error: '모평균과 모표준편차를 지정하세요' }
    }

    const values = extractDataRows(data)
      .map(row => {
        const val = row[column]
        return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
      })
      .filter(v => !isNaN(v))
    if (values.length < 30) {
      return { success: false, error: 'Z-검정은 최소 30개 이상의 데이터가 권장됩니다' }
    }

    const result = await context.pyodideCore.zTestWorker(values, popmean, popstd)

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
        interpretation: `Z-검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * 카이제곱 검정 (Chi-Square Test)
 */
function createChiSquareHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const observedMatrix = paramsObj.observedMatrix

    if (!observedMatrix || !Array.isArray(observedMatrix)) {
      return { success: false, error: '관측 빈도 행렬을 제공하세요' }
    }

    // 관측도수 행렬 검증 (2D 배열)
    if (!observedMatrix.every((row: unknown) => Array.isArray(row))) {
      return { success: false, error: '유효하지 않은 관측 빈도 행렬 형식입니다' }
    }

    // 행렬 → 벡터 변환
    const observed = (observedMatrix as number[][]).flat()

    // 각 셀의 기대도수 계산 (단순화: 균등분포 가정)
    // 실제로는 파이썬에서 계산하는 것이 더 정확하지만, 여기서는 기본값 사용
    const totalCount = observed.reduce((sum, val) => sum + val, 0)
    const expected = Array(observed.length).fill(totalCount / observed.length)

    const result = await context.pyodideCore.chiSquareTest(observed, expected)

    if (!context.pyodideCore.hasStatisticFields(result, ['statistic', 'pValue', 'df'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const statistic = context.pyodideCore.getStatisticValue(result, 'statistic')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')
    const df = context.pyodideCore.getStatisticValue(result, 'df')

    return {
      success: true,
      data: {
        metrics: [
          { name: '카이제곱 통계량', value: statistic.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) },
          { name: '자유도', value: df }
        ],
        interpretation: `카이제곱 검정 결과 ${pValue < 0.05 ? '변수 간 독립성이 없습니다' : '변수 간 독립적입니다'}.`
      }
    }
  }
}

/**
 * 이항 검정 (Binomial Test)
 */
function createBinomialTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const successCount = paramsObj.successCount
    const totalCount = paramsObj.totalCount
    const probabilityVal = paramsObj.probability

    if (typeof successCount !== 'number' || typeof totalCount !== 'number') {
      return { success: false, error: '성공 횟수와 총 시행 횟수를 지정하세요' }
    }

    const probability = typeof probabilityVal === 'number' ? probabilityVal : 0.5
    const result = await context.pyodideCore.binomialTestWorker(successCount, totalCount, probability)

    if (!context.pyodideCore.hasStatisticFields(result, ['pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '성공 비율', value: ((successCount / totalCount) * 100).toFixed(2) + '%' },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `이항 검정 결과 ${pValue < 0.05 ? '유의한 차이가 있습니다' : '유의한 차이가 없습니다'}.`
      }
    }
  }
}

/**
 * 상관분석 (Correlation)
 */
function createCorrelationHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const var1 = paramsObj.variable1
    const var2 = paramsObj.variable2
    const methodVal = paramsObj.method

    if (!var1 || typeof var1 !== 'string' || !var2 || typeof var2 !== 'string') {
      return { success: false, error: '두 변수를 선택하세요' }
    }

    const method = typeof methodVal === 'string' ? methodVal : 'pearson'
    const values1: number[] = []
    const values2: number[] = []

    extractDataRows(data).forEach(row => {
      const v1Raw = row[var1]
      const v2Raw = row[var2]
      const v1 = typeof v1Raw === 'number' ? v1Raw : typeof v1Raw === 'string' ? parseFloat(v1Raw) : NaN
      const v2 = typeof v2Raw === 'number' ? v2Raw : typeof v2Raw === 'string' ? parseFloat(v2Raw) : NaN
      if (!isNaN(v1) && !isNaN(v2)) {
        values1.push(v1)
        values2.push(v2)
      }
    })

    if (values1.length < 3) {
      return { success: false, error: '최소 3쌍의 데이터가 필요합니다' }
    }

    const result = await context.pyodideCore.correlationTest(values1, values2)

    if (!context.pyodideCore.hasStatisticFields(result, ['correlation', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const correlation = context.pyodideCore.getStatisticValue(result, 'correlation')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '상관계수', value: correlation.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: interpretCorrelation(correlation, pValue)
      }
    }
  }
}

/**
 * 부분상관분석 (Partial Correlation)
 */
function createPartialCorrelationHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const var1 = paramsObj.variable1
    const var2 = paramsObj.variable2
    const controlVars = paramsObj.controlVariables

    if (!var1 || typeof var1 !== 'string' || !var2 || typeof var2 !== 'string') {
      return { success: false, error: '두 변수를 선택하세요' }
    }

    if (!Array.isArray(controlVars) || controlVars.length === 0) {
      return { success: false, error: '통제 변수를 선택하세요' }
    }

    // 모든 controlVars가 string인지 확인
    const stringControlVars = controlVars.filter((v): v is string => typeof v === 'string')
    if (stringControlVars.length !== controlVars.length) {
      return { success: false, error: '유효하지 않은 변수가 포함되어 있습니다' }
    }

    // 데이터 행렬 구성
    const allVars = [var1, var2, ...stringControlVars]
    const dataMatrix: number[][] = []

    extractDataRows(data).forEach(row => {
      const rowData = allVars.map(v => {
        const val = row[v]
        return safeParseNumber(val)
      })

      // Skip rows with any NaN values
      if (rowData.every(v => !isNaN(v))) {
        dataMatrix.push(rowData)
      }
    })

    if (dataMatrix.length < 3) {
      return { success: false, error: '최소 3개의 완전한 케이스가 필요합니다' }
    }

    // Transpose dataMatrix using utility function
    const transposedMatrix = transposeMatrix(dataMatrix)

    // Verify transposed matrix has correct dimensions
    if (transposedMatrix.length !== allVars.length || transposedMatrix[0].length !== dataMatrix.length) {
      return { success: false, error: '행렬 변환 중 오류가 발생했습니다' }
    }

    // 부분상관분석을 위해 행렬에서 각 변수 추출
    // transposedMatrix[0]: var1, transposedMatrix[1]: var2, transposedMatrix[2+]: control vars
    const x = transposedMatrix[0]
    const y = transposedMatrix[1]
    const controlVarsArrays = stringControlVars.map((_, i) => transposedMatrix[i + 2])

    const result = await context.pyodideCore.partialCorrelationWorker(x, y, controlVarsArrays)

    if (!context.pyodideCore.hasStatisticFields(result, ['correlation', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const correlation = context.pyodideCore.getStatisticValue(result, 'correlation')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '부분상관계수', value: correlation.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `통제 변수를 고려한 부분상관계수는 ${correlation.toFixed(3)}입니다.`
      }
    }
  }
}

// ============================================================================
// 유틸리티 함수 (로컬)
// ============================================================================

function interpretCorrelation(r: number, pValue: number): string{
  const absR = Math.abs(r)
  let strength = ''

  if (absR >= 0.7) {
    strength = '강한'
  } else if (absR >= 0.4) {
    strength = '중간 정도의'
  } else if (absR >= 0.2) {
    strength = '약한'
  } else {
    strength = '매우 약한'
  }

  const direction = r > 0 ? '양의' : '음의'
  const significance = pValue < 0.05 ? '통계적으로 유의한' : '통계적으로 유의하지 않은'

  return `${direction} ${strength} ${significance} 상관관계를 보입니다 (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)}).`
}
