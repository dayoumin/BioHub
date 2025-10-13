/**
 * 비모수 검정 핸들러
 *
 * Mann-Whitney U, Wilcoxon, Kruskal-Wallis, Dunn, Chi-Square 검정
 */

import type { CalculatorContext, HandlerMap, CalculationResult } from '../calculator-types'
import {
  extractNumericColumn,
  extractGroupedData,
  formatPValue,
  interpretSignificance,
  ERROR_MESSAGES
} from './common-utils'

export const createNonparametricHandlers = (context: CalculatorContext): HandlerMap => ({
  mannWhitneyU: (data, parameters) => mannWhitneyU(context, data, parameters),
  wilcoxonSignedRank: (data, parameters) => wilcoxonSignedRank(context, data, parameters),
  kruskalWallis: (data, parameters) => kruskalWallis(context, data, parameters),
  dunnTest: (data, parameters) => dunnTest(context, data, parameters),
  chiSquareTest: (data, parameters) => chiSquareTest(context, data, parameters)
})

/**
 * Mann-Whitney U 검정 (독립표본 비모수 검정)
 */
const mannWhitneyU = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const groupColumn = parameters.groupColumn
  const valueColumn = parameters.valueColumn
  const alpha = parameters.alpha || 0.05
  const alternative = parameters.alternative || 'two-sided'

  if (!groupColumn || !valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['그룹', '측정값']) }
  }

  // 그룹별 데이터 추출
  const groups = extractGroupedData(data, groupColumn, valueColumn)
  const groupNames = Object.keys(groups)

  if (groupNames.length !== 2) {
    return { success: false, error: ERROR_MESSAGES.INVALID_GROUP_COUNT(2) }
  }

  const group1 = groups[groupNames[0]]
  const group2 = groups[groupNames[1]]

  if (group1.length < 2 || group2.length < 2) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(2) }
  }

  const result = await context.pyodideService.mannWhitneyU(group1, group2, alternative)

  const { isSignificant, comparison, conclusion } = interpretSignificance(result.pValue, alpha)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'U 통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) },
        { name: '유의수준 (α)', value: alpha.toString() }
      ],
      tables: [
        {
          name: '검정 결과',
          data: [
            { 항목: 'U 통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '대립가설', 값: alternative === 'two-sided' ? '양측' : alternative === 'greater' ? '큼' : '작음' },
            { 항목: '유의성', 값: conclusion }
          ]
        },
        {
          name: '기술통계',
          data: [
            {
              그룹: groupNames[0],
              'N': group1.length,
              '중앙값': calculateMedian(group1).toFixed(4),
              '평균 순위': result.meanRank1?.toFixed(2) ?? '-'
            },
            {
              그룹: groupNames[1],
              'N': group2.length,
              '중앙값': calculateMedian(group2).toFixed(4),
              '평균 순위': result.meanRank2?.toFixed(2) ?? '-'
            }
          ]
        }
      ],
      interpretation: interpretMannWhitney(result, groupNames, isSignificant, alpha)
    }
  }
}

/**
 * Wilcoxon 부호순위 검정 (대응표본 비모수 검정)
 */
const wilcoxonSignedRank = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const column1 = parameters.column1
  const column2 = parameters.column2
  const alpha = parameters.alpha || 0.05
  const alternative = parameters.alternative || 'two-sided'

  if (!column1 || !column2) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['측정값1', '측정값2']) }
  }

  const values1 = extractNumericColumn(data, column1)
  const values2 = extractNumericColumn(data, column2)

  if (values1.length !== values2.length || values1.length < 3) {
    return {
      success: false,
      error: '두 변수의 관측값 개수가 같아야 하며 최소 3개 이상이어야 합니다'
    }
  }

  const result = await context.pyodideService.wilcoxonSignedRank(values1, values2, alternative)

  const { isSignificant, comparison, conclusion } = interpretSignificance(result.pValue, alpha)

  // 차이 계산
  const differences = values1.map((v1, i) => v1 - values2[i])
  const medianDiff = calculateMedian(differences)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'W 통계량', value: result.statistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) },
        { name: '중앙값 차이', value: medianDiff.toFixed(4) }
      ],
      tables: [
        {
          name: '검정 결과',
          data: [
            { 항목: 'W 통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '대립가설', 값: alternative === 'two-sided' ? '양측' : alternative === 'greater' ? '큼' : '작음' },
            { 항목: '유의성', 값: conclusion }
          ]
        },
        {
          name: '기술통계',
          data: [
            { 변수: column1, 'N': values1.length, '중앙값': calculateMedian(values1).toFixed(4) },
            { 변수: column2, 'N': values2.length, '중앙값': calculateMedian(values2).toFixed(4) },
            { 변수: '차이 (1-2)', 'N': differences.length, '중앙값': medianDiff.toFixed(4) }
          ]
        }
      ],
      interpretation: interpretWilcoxon(result, column1, column2, medianDiff, isSignificant, alpha)
    }
  }
}

/**
 * Kruskal-Wallis 검정 (다집단 비모수 검정)
 */
const kruskalWallis = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const groupColumn = parameters.groupColumn
  const valueColumn = parameters.valueColumn
  const alpha = parameters.alpha || 0.05

  if (!groupColumn || !valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['그룹', '측정값']) }
  }

  // 그룹별 데이터 추출
  const groups = extractGroupedData(data, groupColumn, valueColumn)
  const groupNames = Object.keys(groups)

  if (groupNames.length < 3) {
    return { success: false, error: '최소 3개 이상의 그룹이 필요합니다' }
  }

  // 각 그룹이 최소 2개 이상 데이터 필요
  for (const groupName of groupNames) {
    if (groups[groupName].length < 2) {
      return { success: false, error: `그룹 '${groupName}'에 최소 2개 이상의 데이터가 필요합니다` }
    }
  }

  const groupArrays = groupNames.map(name => groups[name])
  const result = await context.pyodideService.kruskalWallis(groupArrays, groupNames)

  const { isSignificant, comparison, conclusion } = interpretSignificance(result.pValue, alpha)

  // 그룹별 기술통계
  const descriptiveTable = groupNames.map(name => ({
    그룹: name,
    'N': groups[name].length,
    '중앙값': calculateMedian(groups[name]).toFixed(4),
    '평균 순위': result.meanRanks?.[name]?.toFixed(2) ?? '-'
  }))

  return {
    success: true,
    data: {
      metrics: [
        { name: 'H 통계량', value: result.statistic.toFixed(4) },
        { name: '자유도', value: result.df?.toString() ?? (groupNames.length - 1).toString() },
        { name: 'p-value', value: formatPValue(result.pValue) }
      ],
      tables: [
        {
          name: '검정 결과',
          data: [
            { 항목: 'H 통계량', 값: result.statistic.toFixed(4) },
            { 항목: '자유도', 값: result.df?.toString() ?? (groupNames.length - 1).toString() },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '유의성', 값: conclusion }
          ]
        },
        {
          name: '그룹별 통계',
          data: descriptiveTable
        }
      ],
      interpretation: interpretKruskalWallis(result, groupNames, isSignificant, alpha)
    }
  }
}

/**
 * Dunn 사후검정 (Kruskal-Wallis 후속)
 */
const dunnTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const groupColumn = parameters.groupColumn
  const valueColumn = parameters.valueColumn
  const alpha = parameters.alpha || 0.05
  const correction = parameters.correction || 'bonferroni'

  if (!groupColumn || !valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['그룹', '측정값']) }
  }

  // 그룹별 데이터 추출
  const groups = extractGroupedData(data, groupColumn, valueColumn)
  const groupNames = Object.keys(groups)

  if (groupNames.length < 3) {
    return { success: false, error: '최소 3개 이상의 그룹이 필요합니다' }
  }

  const groupArrays = groupNames.map(name => groups[name])
  const result = await context.pyodideService.dunnTest(groupArrays, groupNames, correction)

  // 쌍별 비교 테이블
  const pairwiseTable = result.comparisons.map((comp: any) => ({
    비교: `${comp.group1} vs ${comp.group2}`,
    'Z 통계량': comp.zStatistic.toFixed(4),
    'p-value': formatPValue(comp.pValue),
    '보정 p-value': formatPValue(comp.pAdjusted ?? comp.pValue),
    유의성: comp.pAdjusted < alpha ? '유의' : '비유의'
  }))

  const significantCount = result.comparisons.filter((c: any) => (c.pAdjusted ?? c.pValue) < alpha).length

  return {
    success: true,
    data: {
      metrics: [
        { name: '총 비교 횟수', value: result.comparisons.length.toString() },
        { name: '유의한 차이', value: `${significantCount}개` },
        { name: '다중비교 보정', value: correction }
      ],
      tables: [
        {
          name: '쌍별 비교 결과',
          data: pairwiseTable
        }
      ],
      interpretation: interpretDunn(result, groupNames, significantCount, alpha, correction)
    }
  }
}

/**
 * Chi-Square 검정 (카이제곱 검정)
 */
const chiSquareTest = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const observed = parameters.observed
  const expected = parameters.expected
  const alpha = parameters.alpha || 0.05

  if (!observed || !Array.isArray(observed)) {
    return { success: false, error: '관찰빈도(observed)를 입력하세요' }
  }

  const result = await context.pyodideService.chiSquareTest(observed, expected)

  const { isSignificant, comparison, conclusion } = interpretSignificance(result.pValue, alpha)

  // 관찰빈도 vs 기대빈도 테이블
  const frequencyTable = observed.map((obs: number, idx: number) => ({
    '범주': `범주 ${idx + 1}`,
    '관찰빈도': obs,
    '기대빈도': result.expected?.[idx]?.toFixed(2) ?? expected?.[idx]?.toFixed(2) ?? '-',
    '잔차': result.residuals?.[idx]?.toFixed(4) ?? '-'
  }))

  return {
    success: true,
    data: {
      metrics: [
        { name: 'χ² 통계량', value: result.statistic.toFixed(4) },
        { name: '자유도', value: result.df.toString() },
        { name: 'p-value', value: formatPValue(result.pValue) }
      ],
      tables: [
        {
          name: '검정 결과',
          data: [
            { 항목: 'χ² 통계량', 값: result.statistic.toFixed(4) },
            { 항목: '자유도', 값: result.df.toString() },
            { 항목: 'p-value', 값: formatPValue(result.pValue) },
            { 항목: '유의성', 값: conclusion }
          ]
        },
        {
          name: '빈도표',
          data: frequencyTable
        }
      ],
      interpretation: interpretChiSquare(result, isSignificant, alpha)
    }
  }
}

// ============================================================================
// 해석 함수들
// ============================================================================

const interpretMannWhitney = (
  result: any,
  groupNames: string[],
  isSignificant: boolean,
  alpha: number
): string => {
  return (
    `Mann-Whitney U 검정 결과, ${groupNames[0]}와 ${groupNames[1]} 간 중앙값 차이는 ` +
    `통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(U = ${result.statistic.toFixed(2)}, p = ${formatPValue(result.pValue)}, α = ${alpha}). ` +
    `이 검정은 정규성 가정이 필요없는 비모수 방법입니다.`
  )
}

const interpretWilcoxon = (
  result: any,
  column1: string,
  column2: string,
  medianDiff: number,
  isSignificant: boolean,
  alpha: number
): string => {
  return (
    `Wilcoxon 부호순위 검정 결과, ${column1}과 ${column2} 간 중앙값 차이(${medianDiff.toFixed(4)})는 ` +
    `통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(W = ${result.statistic.toFixed(2)}, p = ${formatPValue(result.pValue)}, α = ${alpha}). ` +
    `이 검정은 대응표본의 비모수 분석에 적합합니다.`
  )
}

const interpretKruskalWallis = (
  result: any,
  groupNames: string[],
  isSignificant: boolean,
  alpha: number
): string => {
  return (
    `Kruskal-Wallis 검정 결과, ${groupNames.length}개 그룹 간 중앙값 차이는 ` +
    `통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(H = ${result.statistic.toFixed(2)}, p = ${formatPValue(result.pValue)}, α = ${alpha}). ` +
    `${isSignificant ? 'Dunn 사후검정으로 어느 그룹 간 차이가 있는지 확인하세요.' : ''}`
  )
}

const interpretDunn = (
  result: any,
  groupNames: string[],
  significantCount: number,
  alpha: number,
  correction: string
): string => {
  const correctionName = correction === 'bonferroni' ? 'Bonferroni' :
                         correction === 'holm' ? 'Holm' :
                         correction === 'fdr' ? 'FDR' : correction

  return (
    `Dunn 사후검정 결과 (${correctionName} 보정), ` +
    `총 ${result.comparisons.length}개 쌍별 비교 중 ${significantCount}개에서 ` +
    `통계적으로 유의한 차이가 발견되었습니다 (α = ${alpha}). ` +
    `다중비교 보정으로 1종 오류를 통제했습니다.`
  )
}

const interpretChiSquare = (
  result: any,
  isSignificant: boolean,
  alpha: number
): string => {
  return (
    `카이제곱 검정 결과, 관찰빈도와 기대빈도 간 차이는 ` +
    `통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(χ² = ${result.statistic.toFixed(2)}, df = ${result.df}, p = ${formatPValue(result.pValue)}, α = ${alpha}). ` +
    `${isSignificant ? '범주 간 빈도 분포가 기대값과 다릅니다.' : '범주 간 빈도 분포가 기대값과 일치합니다.'}`
  )
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 중앙값 계산
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}
