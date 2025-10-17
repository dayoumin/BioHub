/**
 * 분산분석(ANOVA) 핸들러
 *
 * One-Way/Two-Way ANOVA, MANOVA, Tukey HSD, Bonferroni, Games-Howell
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow, MethodParameters } from '../calculator-types'
import type {
  OneWayANOVAParams,
  TwoWayANOVAParams,
  MANOVAParams,
  TukeyHSDParams,
  BonferroniParams,
  GamesHowellParams
} from '../method-parameter-types'
import {
  extractNumericColumn,
  extractGroupedData,
  formatPValue,
  interpretSignificance,
  interpretEffectSize,
  ERROR_MESSAGES
} from './common-utils'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type {
  OneWayAnovaResult,
  TwoWayAnovaResult,
  PostHocTestResult
} from '@/types/pyodide-results'

export const createAnovaHandlers = (context: CalculatorContext): HandlerMap => ({
  oneWayANOVA: (data: DataRow[], parameters: MethodParameters) => oneWayANOVA(context, data, parameters),
  twoWayANOVA: (data: DataRow[], parameters: MethodParameters) => twoWayANOVA(context, data, parameters),
  manova: (data: DataRow[], parameters: MethodParameters) => manova(context, data, parameters),
  tukeyHSD: (data: DataRow[], parameters: MethodParameters) => tukeyHSD(context, data, parameters),
  bonferroni: (data: DataRow[], parameters: MethodParameters) => bonferroni(context, data, parameters),
  gamesHowell: (data: DataRow[], parameters: MethodParameters) => gamesHowell(context, data, parameters)
})

/**
 * 일원 분산분석 (One-Way ANOVA)
 */
const oneWayANOVA = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { groupColumn, valueColumn, alpha = 0.05 } = parameters as OneWayANOVAParams

  if (!groupColumn || !valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['그룹', '측정값']) }
  }

  // 그룹별 데이터 추출
  const groups = extractGroupedData(data, groupColumn, valueColumn)
  const groupNames = Object.keys(groups)

  if (groupNames.length < 2) {
    return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
  }

  // 각 그룹 최소 2개 데이터 필요
  for (const name of groupNames) {
    if (groups[name].length < 2) {
      return { success: false, error: `그룹 '${name}'에 최소 2개 이상의 데이터가 필요합니다` }
    }
  }

  const groupArrays = groupNames.map(name => groups[name])
  const result = await context.pyodideCore.callWorkerMethod<OneWayAnovaResult>(
    PyodideWorker.NonparametricAnova,
    'one_way_anova',
    { groups: groupArrays }
  )

  const { isSignificant, comparison, conclusion } = interpretSignificance(result.pValue, alpha)

  // 효과크기 (eta-squared) 계산
  const etaSquared = result.sumSquaresBetween / (result.sumSquaresBetween + result.sumSquaresWithin)
  const effectLabel = interpretEffectSize(Math.sqrt(etaSquared)) // Cohen's f 근사

  // ANOVA 테이블
  const anovaTable = [
    {
      '변동원': '그룹 간 (Between)',
      '제곱합': result.sumSquaresBetween.toFixed(4),
      '자유도': result.dfBetween.toString(),
      '평균제곱': result.meanSquaresBetween.toFixed(4),
      'F': result.fStatistic.toFixed(4),
      'p-value': formatPValue(result.pValue)
    },
    {
      '변동원': '그룹 내 (Within)',
      '제곱합': result.sumSquaresWithin.toFixed(4),
      '자유도': result.dfWithin.toString(),
      '평균제곱': result.meanSquaresWithin.toFixed(4),
      'F': '-',
      'p-value': '-'
    },
    {
      '변동원': '전체 (Total)',
      '제곱합': (result.sumSquaresBetween + result.sumSquaresWithin).toFixed(4),
      '자유도': (result.dfBetween + result.dfWithin).toString(),
      '평균제곱': '-',
      'F': '-',
      'p-value': '-'
    }
  ]

  // 그룹별 기술통계
  const descriptiveTable = groupNames.map(name => {
    const groupData = groups[name]
    const mean = groupData.reduce((a, b) => a + b, 0) / groupData.length
    const variance = groupData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (groupData.length - 1)
    const std = Math.sqrt(variance)

    return {
      그룹: name,
      'N': groupData.length,
      '평균': mean.toFixed(4),
      '표준편차': std.toFixed(4)
    }
  })

  return {
    success: true,
    data: {
      metrics: [
        { name: 'F 통계량', value: result.fStatistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) },
        { name: 'η² (Eta-squared)', value: etaSquared.toFixed(4) },
        { name: '효과크기', value: effectLabel }
      ],
      tables: [
        {
          name: 'ANOVA 분산분석표',
          data: anovaTable
        },
        {
          name: '그룹별 기술통계',
          data: descriptiveTable
        }
      ],
      interpretation: interpretOneWayANOVA(result, groupNames, isSignificant, etaSquared, alpha)
    }
  }
}

/**
 * 이원 분산분석 (Two-Way ANOVA)
 */
const twoWayANOVA = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { factor1Column, factor2Column, valueColumn, alpha = 0.05 } = parameters as TwoWayANOVAParams

  if (!factor1Column || !factor2Column || !valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['요인1', '요인2', '측정값']) }
  }

  // 요인별 수준 추출
  const factor1Levels = [...new Set(data.map(row => row[factor1Column]))]
  const factor2Levels = [...new Set(data.map(row => row[factor2Column]))]

  if (factor1Levels.length < 2 || factor2Levels.length < 2) {
    return { success: false, error: '각 요인은 최소 2개 이상의 수준이 필요합니다' }
  }

  // 데이터 변환: { factor1, factor2, value } 형식으로
  const formattedData = data.map(row => ({
    factor1: String(row[factor1Column]),
    factor2: String(row[factor2Column]),
    value: Number(row[valueColumn])
  }))

  const result = await context.pyodideCore.callWorkerMethod<TwoWayAnovaResult>(
    PyodideWorker.NonparametricAnova,
    'two_way_anova',
    {
      data_values: formattedData.map(d => d.value),
      factor1_values: formattedData.map(d => d.factor1),
      factor2_values: formattedData.map(d => d.factor2)
    }
  )

  // ANOVA 테이블 (주효과 + 상호작용)
  const anovaTable = [
    {
      '변동원': factor1Column,
      '제곱합': '-',
      '자유도': '-',
      'F': result.mainEffect1.fStatistic.toFixed(4),
      'p-value': formatPValue(result.mainEffect1.pValue)
    },
    {
      '변동원': factor2Column,
      '제곱합': '-',
      '자유도': '-',
      'F': result.mainEffect2.fStatistic.toFixed(4),
      'p-value': formatPValue(result.mainEffect2.pValue)
    },
    {
      '변동원': `${factor1Column} × ${factor2Column}`,
      '제곱합': '-',
      '자유도': '-',
      'F': result.interaction.fStatistic.toFixed(4),
      'p-value': formatPValue(result.interaction.pValue)
    },
    {
      '변동원': '오차 (Error)',
      '제곱합': '-',
      '자유도': '-',
      'F': '-',
      'p-value': '-'
    }
  ]

  const { isSignificant: sig1 } = interpretSignificance(result.mainEffect1.pValue, alpha)
  const { isSignificant: sig2 } = interpretSignificance(result.mainEffect2.pValue, alpha)
  const { isSignificant: sigInt } = interpretSignificance(result.interaction.pValue, alpha)

  return {
    success: true,
    data: {
      metrics: [
        { name: `${factor1Column} F`, value: result.mainEffect1.fStatistic.toFixed(4) },
        { name: `${factor2Column} F`, value: result.mainEffect2.fStatistic.toFixed(4) },
        { name: '상호작용 F', value: result.interaction.fStatistic.toFixed(4) }
      ],
      tables: [
        {
          name: 'ANOVA 분산분석표',
          data: anovaTable
        }
      ],
      interpretation: interpretTwoWayANOVA(
        result,
        factor1Column,
        factor2Column,
        sig1,
        sig2,
        sigInt,
        alpha
      )
    }
  }
}

/**
 * 다변량 분산분석 (MANOVA)
 */
const manova = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { groupColumn, dependentColumns, alpha = 0.05 } = parameters as MANOVAParams

  if (!groupColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('그룹') }
  }

  if (!dependentColumns || dependentColumns.length < 2) {
    return { success: false, error: '최소 2개 이상의 종속변수가 필요합니다' }
  }

  // 그룹별 데이터 추출
  const groups = [...new Set(data.map(row => row[groupColumn]))]

  if (groups.length < 2) {
    return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
  }

  // 종속변수별 데이터 행렬 구성
  const dependentData = dependentColumns.map((col: string) => extractNumericColumn(data, col))
  const groupLabels = data.map(row => String(row[groupColumn] ?? ''))

  const result = await context.pyodideCore.callWorkerMethod<{
    wilksLambda: number
    fStatistic: number
    pValue: number
    df1: number
    df2: number
  }>(
    PyodideWorker.NonparametricAnova,
    'manova',
    {
      data_matrix: dependentData,
      group_values: groupLabels,
      var_names: dependentColumns
    }
  )

  const { isSignificant, comparison, conclusion } = interpretSignificance(result.pValue, alpha)

  // Wilks' Lambda 결과 테이블
  const resultsTable = [
    {
      '검정통계량': "Wilks' Lambda",
      '값': result.wilksLambda?.toFixed(4) ?? '-',
      'F': result.fStatistic?.toFixed(4) ?? '-',
      '자유도': `${result.df1 ?? '-'}, ${result.df2 ?? '-'}`,
      'p-value': formatPValue(result.pValue)
    }
  ]

  return {
    success: true,
    data: {
      metrics: [
        { name: "Wilks' Lambda", value: result.wilksLambda?.toFixed(4) ?? '-' },
        { name: 'F 통계량', value: result.fStatistic?.toFixed(4) ?? '-' },
        { name: 'p-value', value: formatPValue(result.pValue) }
      ],
      tables: [
        {
          name: 'MANOVA 검정 결과',
          data: resultsTable
        }
      ],
      interpretation: interpretMANOVA(result, groups.length, dependentColumns.length, isSignificant, alpha)
    }
  }
}

/**
 * Tukey HSD 사후검정
 */
const tukeyHSD = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { groupColumn, valueColumn, alpha = 0.05 } = parameters as TukeyHSDParams

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
  const result = await context.pyodideCore.callWorkerMethod<PostHocTestResult>(
    PyodideWorker.NonparametricAnova,
    'tukey_hsd',
    { groups: groupArrays }
  )

  // 쌍별 비교 테이블
  const pairwiseTable = result.comparisons.map((comp: any) => ({
    비교: `${comp.group1} vs ${comp.group2}`,
    '평균차': comp.meanDiff.toFixed(4),
    '하한': comp.lower?.toFixed(4) ?? '-',
    '상한': comp.upper?.toFixed(4) ?? '-',
    'p-value': formatPValue(comp.pValue ?? comp.pAdjusted),
    유의성: (comp.pValue ?? comp.pAdjusted) < alpha ? '유의' : '비유의'
  }))

  const significantCount = result.comparisons.filter((c: any) => (c.pValue ?? c.pAdjusted) < alpha).length

  return {
    success: true,
    data: {
      metrics: [
        { name: '총 비교 횟수', value: result.comparisons.length.toString() },
        { name: '유의한 차이', value: `${significantCount}개` },
        { name: '유의수준 (α)', value: alpha.toString() }
      ],
      tables: [
        {
          name: 'Tukey HSD 쌍별 비교',
          data: pairwiseTable
        }
      ],
      interpretation: interpretPostHoc('Tukey HSD', result, groupNames, significantCount, alpha)
    }
  }
}

/**
 * Bonferroni 사후검정
 */
const bonferroni = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { groupColumn, valueColumn, alpha = 0.05 } = parameters as BonferroniParams

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
  const result = await context.pyodideCore.callWorkerMethod<PostHocTestResult>(
    PyodideWorker.NonparametricAnova,
    'bonferroni_post_hoc',
    { groups: groupArrays }
  )

  // 쌍별 비교 테이블
  const pairwiseTable = result.comparisons.map((comp: any) => ({
    비교: `${comp.group1} vs ${comp.group2}`,
    '평균차': comp.meanDiff.toFixed(4),
    't 통계량': comp.tStatistic?.toFixed(4) ?? '-',
    'p-value': formatPValue(comp.pValue),
    '보정 p-value': formatPValue(comp.pAdjusted),
    유의성: comp.pAdjusted < alpha ? '유의' : '비유의'
  }))

  const significantCount = result.comparisons.filter((c: any) => c.pAdjusted < alpha).length

  return {
    success: true,
    data: {
      metrics: [
        { name: '총 비교 횟수', value: result.comparisons.length.toString() },
        { name: '유의한 차이', value: `${significantCount}개` },
        { name: '보정 계수', value: result.comparisons.length.toString() }
      ],
      tables: [
        {
          name: 'Bonferroni 쌍별 비교',
          data: pairwiseTable
        }
      ],
      interpretation: interpretPostHoc('Bonferroni', result, groupNames, significantCount, alpha)
    }
  }
}

/**
 * Games-Howell 사후검정 (등분산 가정 불필요)
 */
const gamesHowell = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { groupColumn, valueColumn, alpha = 0.05 } = parameters as GamesHowellParams

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
  const result = await context.pyodideCore.callWorkerMethod<PostHocTestResult>(
    PyodideWorker.NonparametricAnova,
    'games_howell_test',
    { groups: groupArrays }
  )

  // 쌍별 비교 테이블
  const pairwiseTable = result.comparisons.map((comp: any) => ({
    비교: `${comp.group1} vs ${comp.group2}`,
    '평균차': comp.meanDiff.toFixed(4),
    't 통계량': comp.tStatistic?.toFixed(4) ?? '-',
    '자유도': comp.df?.toFixed(2) ?? '-',
    'p-value': formatPValue(comp.pValue ?? comp.pAdjusted),
    유의성: (comp.pValue ?? comp.pAdjusted) < alpha ? '유의' : '비유의'
  }))

  const significantCount = result.comparisons.filter((c: any) => (c.pValue ?? c.pAdjusted) < alpha).length

  return {
    success: true,
    data: {
      metrics: [
        { name: '총 비교 횟수', value: result.comparisons.length.toString() },
        { name: '유의한 차이', value: `${significantCount}개` },
        { name: '등분산 가정', value: '불필요' }
      ],
      tables: [
        {
          name: 'Games-Howell 쌍별 비교',
          data: pairwiseTable
        }
      ],
      interpretation: interpretPostHoc('Games-Howell', result, groupNames, significantCount, alpha)
    }
  }
}

// ============================================================================
// 해석 함수들
// ============================================================================

const interpretOneWayANOVA = (
  result: any,
  groupNames: string[],
  isSignificant: boolean,
  etaSquared: number,
  alpha: number
): string => {
  const effectPercent = (etaSquared * 100).toFixed(2)

  return (
    `일원 분산분석 결과, ${groupNames.length}개 그룹 간 평균 차이는 ` +
    `통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(F = ${result.fStatistic.toFixed(2)}, p = ${formatPValue(result.pValue)}, α = ${alpha}). ` +
    `그룹 요인은 종속변수 분산의 ${effectPercent}%를 설명합니다 (η² = ${etaSquared.toFixed(4)}). ` +
    `${isSignificant ? '사후검정(Tukey HSD, Bonferroni 등)으로 어느 그룹 간 차이가 있는지 확인하세요.' : ''}`
  )
}

const interpretTwoWayANOVA = (
  result: any,
  factor1: string,
  factor2: string,
  sig1: boolean,
  sig2: boolean,
  sigInt: boolean,
  alpha: number
): string => {
  const effects = []
  if (sig1) effects.push(`${factor1} 주효과`)
  if (sig2) effects.push(`${factor2} 주효과`)
  if (sigInt) effects.push(`${factor1}×${factor2} 상호작용`)

  if (effects.length === 0) {
    return `이원 분산분석 결과, 모든 효과가 통계적으로 유의하지 않습니다 (α = ${alpha}).`
  }

  return (
    `이원 분산분석 결과, ${effects.join(', ')}이(가) 통계적으로 유의합니다 (α = ${alpha}). ` +
    `${sigInt ? '상호작용 효과가 유의하므로 단순 주효과 분석을 권장합니다.' : ''}`
  )
}

const interpretMANOVA = (
  result: any,
  numGroups: number,
  numDepVars: number,
  isSignificant: boolean,
  alpha: number
): string => {
  return (
    `다변량 분산분석(MANOVA) 결과, ${numGroups}개 그룹 간 ${numDepVars}개 종속변수의 선형결합 차이는 ` +
    `통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(Wilks' Λ = ${result.wilksLambda?.toFixed(4) ?? '-'}, F = ${result.fStatistic?.toFixed(2) ?? '-'}, ` +
    `p = ${formatPValue(result.pValue)}, α = ${alpha}). ` +
    `${isSignificant ? '개별 종속변수에 대한 일원 ANOVA를 통해 어느 변수에서 차이가 있는지 확인하세요.' : ''}`
  )
}

const interpretPostHoc = (
  method: string,
  result: any,
  groupNames: string[],
  significantCount: number,
  alpha: number
): string => {
  const totalComparisons = result.comparisons.length

  return (
    `${method} 사후검정 결과, ` +
    `총 ${totalComparisons}개 쌍별 비교 중 ${significantCount}개에서 ` +
    `통계적으로 유의한 평균 차이가 발견되었습니다 (α = ${alpha}). ` +
    `${method === 'Games-Howell' ? '이 검정은 등분산 가정이 필요없어 분산이 다른 그룹 비교에 적합합니다.' : ''}`
  )
}
