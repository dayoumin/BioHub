/**
 * 가설검정 핸들러
 *
 * t-검정, 비율검정 등 가설검정 관련 핸들러
 */

import type { CalculatorContext, HandlerMap, CalculationResult } from '../calculator-types'
import {
  extractNumericColumn,
  extractGroupedData,
  formatPValue,
  formatConfidenceInterval,
  interpretEffectSize,
  interpretSignificance,
  ERROR_MESSAGES
} from './common-utils'

export const createHypothesisHandlers = (context: CalculatorContext): HandlerMap => ({
  oneSampleTTest: (data, parameters) => oneSampleTTest(context, data, parameters),
  twoSampleTTest: (data, parameters) => twoSampleTTest(context, data, parameters),
  pairedTTest: (data, parameters) => pairedTTest(context, data, parameters),
  welchTTest: (data, parameters) => welchTTest(context, data, parameters)
  // TODO: oneSampleProportionTest - Pyodide 서비스에 메서드 추가 필요
})

/**
 * 일표본 t-검정
 */
const oneSampleTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column = parameters.column
  const popmean = parameters.popmean

  if (!column || popmean === undefined) {
    return { success: false, error: ERROR_MESSAGES.MISSING_REQUIRED_PARAMS }
  }

  const values = extractNumericColumn(data, column)
  if (values.length < 2) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(2) }
  }

  const result = await context.pyodideService.oneSampleTTest(values, popmean)

  return {
    success: true,
    data: {
      metrics: [
        { name: 't-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: "Cohen's d", value: result.cohensD.toFixed(4) }
      ],
      tables: [
        {
          name: '표본 통계',
          data: [
            { 항목: '표본 크기', 값: values.length },
            { 항목: '표본 평균', 값: result.sampleMean.toFixed(4) },
            { 항목: '표준편차', 값: result.std.toFixed(4) },
            { 항목: '모평균 (귀무가설)', 값: popmean.toFixed(4) }
          ]
        },
        {
          name: '검정 결과',
          data: [
            { 항목: '평균 차이', 값: (result.sampleMean - popmean).toFixed(4) },
            { 항목: '자유도', 값: result.df },
            { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            {
              항목: '신뢰구간',
              값: formatConfidenceInterval(result.ci_lower, result.ci_upper)
            },
            { 항목: "Cohen's d", 값: result.cohensD.toFixed(4) }
          ]
        }
      ],
      interpretation: interpretOneSampleTTest(result, popmean)
    }
  }
}

/**
 * 독립표본 t-검정
 */
const twoSampleTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const groupColumn = parameters.groupColumn
  const valueColumn = parameters.valueColumn

  if (!groupColumn || !valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['그룹 열', '값 열']) }
  }

  // 공통 유틸리티 사용
  const groups = extractGroupedData(data, groupColumn, valueColumn)
  const groupNames = Object.keys(groups)

  if (groupNames.length !== 2) {
    return { success: false, error: ERROR_MESSAGES.INVALID_GROUP_COUNT(2) }
  }

  const group1 = groups[groupNames[0]]
  const group2 = groups[groupNames[1]]
  const equalVar = parameters.equal_var ?? true

  const result = await context.pyodideService.twoSampleTTest(group1, group2, equalVar)

  return {
    success: true,
    data: {
      metrics: [
        { name: 't-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: "Cohen's d", value: result.cohensD.toFixed(4) }
      ],
      tables: [
        {
          name: '그룹별 통계',
          data: [
            {
              그룹: groupNames[0],
              표본수: group1.length,
              평균: result.mean1.toFixed(4),
              표준편차: result.std1.toFixed(4)
            },
            {
              그룹: groupNames[1],
              표본수: group2.length,
              평균: result.mean2.toFixed(4),
              표준편차: result.std2.toFixed(4)
            }
          ]
        },
        {
          name: '검정 결과',
          data: [
            { 항목: '평균 차이', 값: (result.mean1 - result.mean2).toFixed(4) },
            { 항목: '자유도', 값: result.df.toFixed(2) },
            { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            {
              항목: '신뢰구간',
              값: formatConfidenceInterval(result.ci_lower, result.ci_upper)
            },
            { 항목: "Cohen's d", 값: result.cohensD.toFixed(4) },
            { 항목: '등분산 가정', 값: equalVar ? '가정함' : '가정하지 않음 (Welch)' }
          ]
        }
      ],
      interpretation: interpretTwoSampleTTest(result)
    }
  }
}

/**
 * 대응표본 t-검정
 */
const pairedTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column1 = parameters.column1
  const column2 = parameters.column2

  if (!column1 || !column2) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['첫 번째 열', '두 번째 열']) }
  }

  const values1 = extractNumericColumn(data, column1)
  const values2 = extractNumericColumn(data, column2)

  if (values1.length !== values2.length) {
    return { success: false, error: '두 변수의 데이터 개수가 일치해야 합니다' }
  }

  if (values1.length < 2) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(2) }
  }

  const result = await context.pyodideService.pairedTTest(values1, values2)

  return {
    success: true,
    data: {
      metrics: [
        { name: 't-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) },
        { name: "Cohen's d", value: result.cohensD.toFixed(4) }
      ],
      tables: [
        {
          name: '기술통계',
          data: [
            { 변수: column1, 평균: result.mean1.toFixed(4), 표준편차: result.std1.toFixed(4) },
            { 변수: column2, 평균: result.mean2.toFixed(4), 표준편차: result.std2.toFixed(4) },
            { 변수: '차이 (1-2)', 평균: result.meanDiff.toFixed(4), 표준편차: result.stdDiff.toFixed(4) }
          ]
        },
        {
          name: '검정 결과',
          data: [
            { 항목: '평균 차이', 값: result.meanDiff.toFixed(4) },
            { 항목: '자유도', 값: result.df },
            { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            {
              항목: '신뢰구간',
              값: formatConfidenceInterval(result.ci_lower, result.ci_upper)
            },
            { 항목: "Cohen's d", 값: result.cohensD.toFixed(4) }
          ]
        }
      ],
      interpretation: interpretPairedTTest(result)
    }
  }
}

/**
 * Welch t-검정 (등분산 가정하지 않음)
 */
const welchTTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  // Welch t-test는 독립표본 t-검정과 동일하지만 equal_var=False
  return twoSampleTTest(context, data, { ...parameters, equal_var: false })
}

/**
 * 일표본 비율 검정
 */
const oneSampleProportionTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column = parameters.column
  const value = parameters.value
  const p0 = parameters.p0

  if (!column || value === undefined || p0 === undefined) {
    return { success: false, error: '필수 파라미터를 입력하세요' }
  }

  const values = data.map(row => row[column])
  const successes = values.filter(v => v === value).length
  const total = values.length

  if (total < 10) {
    return { success: false, error: '최소 10개 이상의 데이터가 필요합니다' }
  }

  const result = await context.pyodideService.oneSampleProportionTest(successes, total, p0)

  return {
    success: true,
    data: {
      metrics: [
        { name: '표본 비율', value: result.proportion.toFixed(4) },
        { name: 'z-통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: result.pValue.toFixed(4) }
      ],
      tables: [
        {
          name: '검정 결과',
          data: [
            { 항목: '성공 횟수', 값: successes },
            { 항목: '전체 시행', 값: total },
            { 항목: '표본 비율', 값: result.proportion.toFixed(4) },
            { 항목: '귀무가설 비율', 값: p0.toFixed(4) },
            { 항목: 'z-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            {
              항목: '신뢰구간',
              값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]`
            }
          ]
        }
      ],
      interpretation: interpretProportionTest(result, p0)
    }
  }
}

// ============================================================================
// 해석 함수들
// ============================================================================

const interpretOneSampleTTest = (result: any, popmean: number): string => {
  const alpha = 0.05
  const { comparison, conclusion } = interpretSignificance(result.pValue, alpha)
  const effectSizeLabel = interpretEffectSize(result.cohensD)

  return (
    `p-value (${formatPValue(result.pValue)})가 유의수준 (${alpha})${comparison} ` +
    `표본 평균 (${result.sampleMean.toFixed(2)})과 모평균 (${popmean.toFixed(2)})의 차이가 ` +
    `통계적으로 ${conclusion}. ` +
    `Cohen's d = ${result.cohensD.toFixed(4)}는 ${effectSizeLabel} 효과 크기를 나타냅니다.`
  )
}

const interpretTwoSampleTTest = (result: any): string => {
  const alpha = 0.05
  const { comparison, conclusion } = interpretSignificance(result.pValue, alpha)
  const effectSizeLabel = interpretEffectSize(result.cohensD)

  return (
    `p-value (${formatPValue(result.pValue)})가 유의수준 (${alpha})${comparison} ` +
    `두 그룹 간 평균의 차이가 통계적으로 ${conclusion}. ` +
    `Cohen's d = ${result.cohensD.toFixed(4)}는 ${effectSizeLabel} 효과 크기를 나타냅니다.`
  )
}

const interpretPairedTTest = (result: any): string => {
  const alpha = 0.05
  const { comparison, conclusion } = interpretSignificance(result.pValue, alpha)
  const effectSizeLabel = interpretEffectSize(result.cohensD)

  return (
    `p-value (${formatPValue(result.pValue)})가 유의수준 (${alpha})${comparison} ` +
    `두 조건 간 평균 차이 (${result.meanDiff.toFixed(4)})가 ` +
    `통계적으로 ${conclusion}. ` +
    `Cohen's d = ${result.cohensD.toFixed(4)}는 ${effectSizeLabel} 효과 크기를 나타냅니다.`
  )
}

const interpretProportionTest = (result: any, p0: number): string => {
  const significant = result.pValue < 0.05

  return (
    `p-value (${result.pValue.toFixed(4)})가 0.05${significant ? '보다 작으므로' : '보다 크므로'} ` +
    `표본 비율 (${result.proportion.toFixed(4)})과 귀무가설 비율 (${p0.toFixed(4)})의 차이가 ` +
    `통계적으로 ${significant ? '유의합니다' : '유의하지 않습니다'}.`
  )
}
