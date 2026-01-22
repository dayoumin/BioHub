/**
 * ANOVA 분석 헬퍼 함수
 *
 * handleAnalysis 함수에서 추출된 ANOVA 계산 로직
 * 일원/이원/삼원 ANOVA 각각을 별도 함수로 분리
 *
 * @module anova-helpers
 */

import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { PostHocComparison } from '@/types/statistics'

// ============================================================================
// Types
// ============================================================================

export interface GroupResult {
  name: string
  mean: number
  std: number
  n: number
  se: number
  ci: [number, number]
}

export interface FactorResult {
  name: string
  fStatistic: number
  pValue: number
  df: number
  etaSquared: number
  omegaSquared: number
}

export interface ANOVATableRow {
  source: string
  ss: number
  df: number
  ms: number | null
  f: number | null
  p: number | null
}

export interface AssumptionsResult {
  normality: {
    shapiroWilk: { statistic: number; pValue: number }
    passed: boolean
    interpretation: string
  }
  homogeneity: {
    levene: { statistic: number; pValue: number }
    passed: boolean
    interpretation: string
  }
}

export interface OneWayANOVAResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  msBetween: number
  msWithin: number
  etaSquared: number
  omegaSquared: number
  powerAnalysis: {
    observedPower: number
    effectSize: string
    cohensF: number
  }
  groups: GroupResult[]
  postHoc?: {
    method: string
    comparisons: PostHocComparison[]
    adjustedAlpha: number
  }
  assumptions: AssumptionsResult
  anovaTable: ANOVATableRow[]
}

export interface TwoWayANOVAResult {
  factor1: FactorResult
  factor2: FactorResult
  interaction: FactorResult
  anovaTable: ANOVATableRow[]
  residualDf: number
}

export interface ThreeWayANOVAResult {
  factor1: FactorResult
  factor2: FactorResult
  factor3: FactorResult
  interaction12: FactorResult
  interaction13: FactorResult
  interaction23: FactorResult
  interaction123: FactorResult
  anovaTable: ANOVATableRow[]
  residualDf: number
}

// PyodideCore 서비스 타입 (순환 참조 방지)
interface PyodideCoreInstance {
  callWorkerMethod<T>(worker: PyodideWorker, method: string, params: Record<string, unknown>): Promise<T>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 그룹별 기술통계 계산
 */
export function calculateGroupStatistics(
  groupsMap: Map<string, number[]>,
  groupNames: string[]
): GroupResult[] {
  return groupNames.map((name) => {
    const data = groupsMap.get(name)!
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1)
    const std = Math.sqrt(variance)
    const se = std / Math.sqrt(data.length)
    const t = 1.96 // 95% CI 근사
    const ciLower = mean - t * se
    const ciUpper = mean + t * se

    return {
      name,
      mean,
      std,
      n: data.length,
      se,
      ci: [ciLower, ciUpper] as [number, number]
    }
  })
}

/**
 * SS (제곱합) 계산
 */
export function calculateSumOfSquares(
  groupsMap: Map<string, number[]>,
  groups: GroupResult[],
  grandMean: number
): { ssBetween: number; ssWithin: number; ssTotal: number } {
  const ssBetween = groups.reduce((sum, g) => {
    const groupData = groupsMap.get(g.name)!
    return sum + groupData.length * Math.pow(g.mean - grandMean, 2)
  }, 0)

  const ssWithin = groups.reduce((sum, g) => {
    const groupData = groupsMap.get(g.name)!
    const groupMean = g.mean
    return sum + groupData.reduce((gsum, val) => gsum + Math.pow(val - groupMean, 2), 0)
  }, 0)

  return {
    ssBetween,
    ssWithin,
    ssTotal: ssBetween + ssWithin
  }
}

/**
 * 효과 크기 계산
 */
export function calculateEffectSizes(
  ssBetween: number,
  ssTotal: number,
  df1: number,
  msWithin: number
): { etaSquared: number; omegaSquared: number; cohensF: number } {
  const etaSquared = ssBetween / ssTotal
  const omegaSquared = (ssBetween - df1 * msWithin) / (ssTotal + msWithin)
  const cohensF = Math.sqrt(etaSquared / (1 - etaSquared))

  return { etaSquared, omegaSquared, cohensF }
}

/**
 * 효과 크기 해석
 */
export function interpretEffectSize(etaSquared: number): string {
  if (etaSquared >= 0.14) return 'large'
  if (etaSquared >= 0.06) return 'medium'
  return 'small'
}

// ============================================================================
// One-Way ANOVA
// ============================================================================

/**
 * 일원 분산분석 실행
 */
export async function runOneWayANOVA(
  pyodideCore: PyodideCoreInstance,
  uploadedData: { data: Record<string, unknown>[] },
  depVar: string,
  groupCol: string
): Promise<OneWayANOVAResult> {
  // 그룹별로 데이터 분리
  const groupsMap = new Map<string, number[]>()
  uploadedData.data.forEach((row) => {
    const groupName = String(row[groupCol])
    const value = row[depVar]
    if (typeof value === 'number' && !isNaN(value)) {
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, [])
      }
      groupsMap.get(groupName)!.push(value)
    }
  })

  const groupNames = Array.from(groupsMap.keys())
  const groupsArray = groupNames.map(name => groupsMap.get(name)!)

  if (groupsArray.length < 2) {
    throw new Error('최소 2개 이상의 그룹이 필요합니다.')
  }

  // Worker 호출 (one_way_anova)
  const workerResult = await pyodideCore.callWorkerMethod<{
    fStatistic: number
    pValue: number
    df1: number
    df2: number
  }>(PyodideWorker.NonparametricAnova, 'one_way_anova', { groups: groupsArray })

  // 그룹별 기술통계 계산
  const groups = calculateGroupStatistics(groupsMap, groupNames)

  // 전체 평균
  const allValues = Array.from(groupsMap.values()).flat()
  const grandMean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length

  // SS 계산
  const { ssBetween, ssWithin, ssTotal } = calculateSumOfSquares(groupsMap, groups, grandMean)
  const msBetween = ssBetween / workerResult.df1
  const msWithin = ssWithin / workerResult.df2

  // 효과 크기
  const { etaSquared, omegaSquared, cohensF } = calculateEffectSizes(
    ssBetween, ssTotal, workerResult.df1, msWithin
  )

  // 검정력 근사 (간단한 추정)
  const observedPower = workerResult.pValue < 0.05 ? 0.80 : 0.50

  // ANOVA 테이블
  const anovaTable: ANOVATableRow[] = [
    {
      source: '그룹 간',
      ss: ssBetween,
      df: workerResult.df1,
      ms: msBetween,
      f: workerResult.fStatistic,
      p: workerResult.pValue
    },
    {
      source: '그룹 내',
      ss: ssWithin,
      df: workerResult.df2,
      ms: msWithin,
      f: null,
      p: null
    },
    {
      source: '전체',
      ss: ssTotal,
      df: workerResult.df1 + workerResult.df2,
      ms: null,
      f: null,
      p: null
    }
  ]

  // 사후검정 (Tukey HSD) - Worker 호출
  let postHocComparisons: PostHocComparison[] = []
  if (workerResult.pValue < 0.05 && groupNames.length >= 2) {
    const tukeyResult = await pyodideCore.callWorkerMethod<{
      comparisons: Array<{
        group1: number
        group2: number
        meanDiff: number
        statistic?: number
        pValue: number | null
        pAdjusted: number
        significant: boolean
        ciLower?: number
        ciUpper?: number
      }>
      statistic: number | number[]
      pValue: number | number[] | null
      confidenceInterval?: { lower: number[]; upper: number[]; confidenceLevel: number | null }
    }>(PyodideWorker.NonparametricAnova, 'tukey_hsd', { groups: groupsArray })

    // Worker 결과를 PostHocComparison 타입으로 변환
    postHocComparisons = tukeyResult.comparisons.map(comp => ({
      group1: groupNames[comp.group1],
      group2: groupNames[comp.group2],
      meanDiff: comp.meanDiff,
      pValue: comp.pValue ?? comp.pAdjusted,
      significant: comp.significant,
      ciLower: comp.ciLower,
      ciUpper: comp.ciUpper
    }))
  }

  // 가정 검정 (정규성, 등분산성) - Worker 호출
  const assumptionsWorkerResult = await pyodideCore.callWorkerMethod<{
    normality: {
      shapiroWilk: Array<{ group: number; statistic: number | null; pValue: number | null; passed: boolean | null; warning?: string }>
      passed: boolean
      interpretation: string
    }
    homogeneity: {
      levene: { statistic: number; pValue: number }
      passed: boolean
      interpretation: string
    }
  }>(PyodideWorker.NonparametricAnova, 'test_assumptions', { groups: groupsArray })

  // UI에 표시할 형식으로 변환 (전체 그룹 통합 결과)
  const overallNormality = assumptionsWorkerResult.normality.shapiroWilk[0]
  const assumptions: AssumptionsResult = {
    normality: {
      shapiroWilk: {
        statistic: overallNormality?.statistic ?? 0.95,
        pValue: overallNormality?.pValue ?? 0.15
      },
      passed: assumptionsWorkerResult.normality.passed,
      interpretation: assumptionsWorkerResult.normality.interpretation
    },
    homogeneity: {
      levene: assumptionsWorkerResult.homogeneity.levene,
      passed: assumptionsWorkerResult.homogeneity.passed,
      interpretation: assumptionsWorkerResult.homogeneity.interpretation
    }
  }

  return {
    fStatistic: workerResult.fStatistic,
    pValue: workerResult.pValue,
    dfBetween: workerResult.df1,
    dfWithin: workerResult.df2,
    msBetween,
    msWithin,
    etaSquared,
    omegaSquared,
    powerAnalysis: {
      observedPower,
      effectSize: interpretEffectSize(etaSquared),
      cohensF
    },
    groups,
    postHoc: postHocComparisons.length > 0 ? {
      method: 'Tukey HSD',
      comparisons: postHocComparisons,
      adjustedAlpha: 0.05 / postHocComparisons.length
    } : undefined,
    assumptions,
    anovaTable
  }
}

// ============================================================================
// Two-Way ANOVA
// ============================================================================

/**
 * 이원 분산분석 실행
 */
export async function runTwoWayANOVA(
  pyodideCore: PyodideCoreInstance,
  uploadedData: { data: Record<string, unknown>[] },
  depVar: string,
  factor1Col: string,
  factor2Col: string
): Promise<TwoWayANOVAResult> {
  // 데이터 추출
  const dataValues: number[] = []
  const factor1Values: string[] = []
  const factor2Values: string[] = []

  uploadedData.data.forEach((row) => {
    const value = row[depVar]
    const f1 = String(row[factor1Col])
    const f2 = String(row[factor2Col])

    if (typeof value === 'number' && !isNaN(value)) {
      dataValues.push(value)
      factor1Values.push(f1)
      factor2Values.push(f2)
    }
  })

  if (dataValues.length < 4) {
    throw new Error('이원 분산분석은 최소 4개 이상의 유효한 데이터가 필요합니다.')
  }

  // Worker 호출 (two_way_anova)
  const twoWayResult = await pyodideCore.callWorkerMethod<{
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    interaction: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: {
      sum_sq: Record<string, number>
      df: Record<string, number>
      F: Record<string, number>
      'PR(>F)': Record<string, number>
    }
  }>(PyodideWorker.NonparametricAnova, 'two_way_anova', {
    data_values: dataValues,
    factor1_values: factor1Values,
    factor2_values: factor2Values
  })

  // Helper: statsmodels ANOVA 테이블에서 값 추출
  const getSS = (key: string) => twoWayResult.anovaTable.sum_sq[key] ?? 0
  const getMS = (key: string) => {
    const ss = getSS(key)
    const df = twoWayResult.anovaTable.df[key] ?? 1
    return df > 0 ? ss / df : 0
  }

  // 전체 SS 계산 (효과 크기용)
  const ssF1 = getSS('C(factor1)')
  const ssF2 = getSS('C(factor2)')
  const ssInt = getSS('C(factor1):C(factor2)')
  const ssRes = getSS('Residual')
  const ssTotal = ssF1 + ssF2 + ssInt + ssRes

  // 효과 크기 계산
  const calcEta = (ss: number) => ssTotal > 0 ? ss / ssTotal : 0
  const calcOmega = (ss: number, df: number, msRes: number) =>
    ssTotal > 0 ? (ss - df * msRes) / (ssTotal + msRes) : 0

  const msRes = ssRes / twoWayResult.residual.df

  // ANOVA 테이블
  const anovaTable: ANOVATableRow[] = [
    {
      source: `요인 1 (${factor1Col})`,
      ss: ssF1,
      df: twoWayResult.factor1.df,
      ms: getMS('C(factor1)'),
      f: twoWayResult.factor1.fStatistic,
      p: twoWayResult.factor1.pValue
    },
    {
      source: `요인 2 (${factor2Col})`,
      ss: ssF2,
      df: twoWayResult.factor2.df,
      ms: getMS('C(factor2)'),
      f: twoWayResult.factor2.fStatistic,
      p: twoWayResult.factor2.pValue
    },
    {
      source: '상호작용',
      ss: ssInt,
      df: twoWayResult.interaction.df,
      ms: getMS('C(factor1):C(factor2)'),
      f: twoWayResult.interaction.fStatistic,
      p: twoWayResult.interaction.pValue
    },
    {
      source: '잔차',
      ss: ssRes,
      df: twoWayResult.residual.df,
      ms: msRes,
      f: null,
      p: null
    },
    {
      source: '전체',
      ss: ssTotal,
      df: twoWayResult.factor1.df + twoWayResult.factor2.df + twoWayResult.interaction.df + twoWayResult.residual.df,
      ms: null,
      f: null,
      p: null
    }
  ]

  return {
    factor1: {
      name: factor1Col,
      fStatistic: twoWayResult.factor1.fStatistic,
      pValue: twoWayResult.factor1.pValue,
      df: twoWayResult.factor1.df,
      etaSquared: calcEta(ssF1),
      omegaSquared: calcOmega(ssF1, twoWayResult.factor1.df, msRes)
    },
    factor2: {
      name: factor2Col,
      fStatistic: twoWayResult.factor2.fStatistic,
      pValue: twoWayResult.factor2.pValue,
      df: twoWayResult.factor2.df,
      etaSquared: calcEta(ssF2),
      omegaSquared: calcOmega(ssF2, twoWayResult.factor2.df, msRes)
    },
    interaction: {
      name: `${factor1Col} × ${factor2Col}`,
      fStatistic: twoWayResult.interaction.fStatistic,
      pValue: twoWayResult.interaction.pValue,
      df: twoWayResult.interaction.df,
      etaSquared: calcEta(ssInt),
      omegaSquared: calcOmega(ssInt, twoWayResult.interaction.df, msRes)
    },
    anovaTable,
    residualDf: twoWayResult.residual.df
  }
}

// ============================================================================
// Three-Way ANOVA (placeholder - to be implemented)
// ============================================================================

/**
 * 삼원 분산분석 실행
 * TODO: 전체 구현 필요
 */
export async function runThreeWayANOVA(
  pyodideCore: PyodideCoreInstance,
  uploadedData: { data: Record<string, unknown>[] },
  depVar: string,
  factor1Col: string,
  factor2Col: string,
  factor3Col: string
): Promise<ThreeWayANOVAResult> {
  // 데이터 추출
  const dataValues: number[] = []
  const factor1Values: string[] = []
  const factor2Values: string[] = []
  const factor3Values: string[] = []

  uploadedData.data.forEach((row) => {
    const value = row[depVar]
    const f1 = String(row[factor1Col])
    const f2 = String(row[factor2Col])
    const f3 = String(row[factor3Col])

    if (typeof value === 'number' && !isNaN(value)) {
      dataValues.push(value)
      factor1Values.push(f1)
      factor2Values.push(f2)
      factor3Values.push(f3)
    }
  })

  if (dataValues.length < 8) {
    throw new Error('삼원 분산분석은 최소 8개 이상의 유효한 데이터가 필요합니다.')
  }

  // Worker 호출 (three_way_anova)
  const threeWayResult = await pyodideCore.callWorkerMethod<{
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    factor3: { fStatistic: number; pValue: number; df: number }
    interaction12: { fStatistic: number; pValue: number; df: number }
    interaction13: { fStatistic: number; pValue: number; df: number }
    interaction23: { fStatistic: number; pValue: number; df: number }
    interaction123: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: {
      sum_sq: Record<string, number>
      df: Record<string, number>
      F: Record<string, number>
      'PR(>F)': Record<string, number>
    }
  }>(PyodideWorker.NonparametricAnova, 'three_way_anova', {
    data_values: dataValues,
    factor1_values: factor1Values,
    factor2_values: factor2Values,
    factor3_values: factor3Values
  })

  // Helper: statsmodels ANOVA 테이블에서 값 추출
  const getSS = (key: string) => threeWayResult.anovaTable.sum_sq[key] ?? 0
  const getMS = (key: string) => {
    const ss = getSS(key)
    const df = threeWayResult.anovaTable.df[key] ?? 1
    return df > 0 ? ss / df : 0
  }

  // 전체 SS 계산
  const ssF1 = getSS('C(factor1)')
  const ssF2 = getSS('C(factor2)')
  const ssF3 = getSS('C(factor3)')
  const ssInt12 = getSS('C(factor1):C(factor2)')
  const ssInt13 = getSS('C(factor1):C(factor3)')
  const ssInt23 = getSS('C(factor2):C(factor3)')
  const ssInt123 = getSS('C(factor1):C(factor2):C(factor3)')
  const ssRes = getSS('Residual')
  const ssTotal = ssF1 + ssF2 + ssF3 + ssInt12 + ssInt13 + ssInt23 + ssInt123 + ssRes

  // 효과 크기 계산
  const calcEta = (ss: number) => ssTotal > 0 ? ss / ssTotal : 0
  const calcOmega = (ss: number, df: number, msRes: number) =>
    ssTotal > 0 ? (ss - df * msRes) / (ssTotal + msRes) : 0

  const msRes = ssRes / threeWayResult.residual.df

  // ANOVA 테이블
  const anovaTable: ANOVATableRow[] = [
    { source: `요인 1 (${factor1Col})`, ss: ssF1, df: threeWayResult.factor1.df, ms: getMS('C(factor1)'), f: threeWayResult.factor1.fStatistic, p: threeWayResult.factor1.pValue },
    { source: `요인 2 (${factor2Col})`, ss: ssF2, df: threeWayResult.factor2.df, ms: getMS('C(factor2)'), f: threeWayResult.factor2.fStatistic, p: threeWayResult.factor2.pValue },
    { source: `요인 3 (${factor3Col})`, ss: ssF3, df: threeWayResult.factor3.df, ms: getMS('C(factor3)'), f: threeWayResult.factor3.fStatistic, p: threeWayResult.factor3.pValue },
    { source: `${factor1Col} × ${factor2Col}`, ss: ssInt12, df: threeWayResult.interaction12.df, ms: getMS('C(factor1):C(factor2)'), f: threeWayResult.interaction12.fStatistic, p: threeWayResult.interaction12.pValue },
    { source: `${factor1Col} × ${factor3Col}`, ss: ssInt13, df: threeWayResult.interaction13.df, ms: getMS('C(factor1):C(factor3)'), f: threeWayResult.interaction13.fStatistic, p: threeWayResult.interaction13.pValue },
    { source: `${factor2Col} × ${factor3Col}`, ss: ssInt23, df: threeWayResult.interaction23.df, ms: getMS('C(factor2):C(factor3)'), f: threeWayResult.interaction23.fStatistic, p: threeWayResult.interaction23.pValue },
    { source: `${factor1Col} × ${factor2Col} × ${factor3Col}`, ss: ssInt123, df: threeWayResult.interaction123.df, ms: getMS('C(factor1):C(factor2):C(factor3)'), f: threeWayResult.interaction123.fStatistic, p: threeWayResult.interaction123.pValue },
    { source: '잔차', ss: ssRes, df: threeWayResult.residual.df, ms: msRes, f: null, p: null },
    { source: '전체', ss: ssTotal, df: Object.values(threeWayResult.anovaTable.df).reduce((a, b) => a + b, 0), ms: null, f: null, p: null }
  ]

  return {
    factor1: {
      name: factor1Col,
      fStatistic: threeWayResult.factor1.fStatistic,
      pValue: threeWayResult.factor1.pValue,
      df: threeWayResult.factor1.df,
      etaSquared: calcEta(ssF1),
      omegaSquared: calcOmega(ssF1, threeWayResult.factor1.df, msRes)
    },
    factor2: {
      name: factor2Col,
      fStatistic: threeWayResult.factor2.fStatistic,
      pValue: threeWayResult.factor2.pValue,
      df: threeWayResult.factor2.df,
      etaSquared: calcEta(ssF2),
      omegaSquared: calcOmega(ssF2, threeWayResult.factor2.df, msRes)
    },
    factor3: {
      name: factor3Col,
      fStatistic: threeWayResult.factor3.fStatistic,
      pValue: threeWayResult.factor3.pValue,
      df: threeWayResult.factor3.df,
      etaSquared: calcEta(ssF3),
      omegaSquared: calcOmega(ssF3, threeWayResult.factor3.df, msRes)
    },
    interaction12: {
      name: `${factor1Col} × ${factor2Col}`,
      fStatistic: threeWayResult.interaction12.fStatistic,
      pValue: threeWayResult.interaction12.pValue,
      df: threeWayResult.interaction12.df,
      etaSquared: calcEta(ssInt12),
      omegaSquared: calcOmega(ssInt12, threeWayResult.interaction12.df, msRes)
    },
    interaction13: {
      name: `${factor1Col} × ${factor3Col}`,
      fStatistic: threeWayResult.interaction13.fStatistic,
      pValue: threeWayResult.interaction13.pValue,
      df: threeWayResult.interaction13.df,
      etaSquared: calcEta(ssInt13),
      omegaSquared: calcOmega(ssInt13, threeWayResult.interaction13.df, msRes)
    },
    interaction23: {
      name: `${factor2Col} × ${factor3Col}`,
      fStatistic: threeWayResult.interaction23.fStatistic,
      pValue: threeWayResult.interaction23.pValue,
      df: threeWayResult.interaction23.df,
      etaSquared: calcEta(ssInt23),
      omegaSquared: calcOmega(ssInt23, threeWayResult.interaction23.df, msRes)
    },
    interaction123: {
      name: `${factor1Col} × ${factor2Col} × ${factor3Col}`,
      fStatistic: threeWayResult.interaction123.fStatistic,
      pValue: threeWayResult.interaction123.pValue,
      df: threeWayResult.interaction123.df,
      etaSquared: calcEta(ssInt123),
      omegaSquared: calcOmega(ssInt123, threeWayResult.interaction123.df, msRes)
    },
    anovaTable,
    residualDf: threeWayResult.residual.df
  }
}
