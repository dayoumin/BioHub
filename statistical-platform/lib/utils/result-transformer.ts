/**
 * Executor 결과를 Smart Flow UI 타입으로 변환하는 유틸리티
 */

import {
  AnalysisResult as SmartFlowResult,
  EffectSizeInfo,
  PostHocResult,
  CoefficientResult,
  GroupStats,
  StatisticalAssumptions
} from '@/types/smart-flow'
import { ExecutorAnalysisResult as ExecutorResult } from '@/lib/services/executors/types'

/**
 * Executor의 ExecutorAnalysisResult를 Smart Flow UI의 AnalysisResult로 변환
 */
export function transformExecutorResult(executorResult: ExecutorResult): SmartFlowResult {
  // 효과크기 변환 (eta-squared)
  let effectSize: number | EffectSizeInfo | undefined
  if (executorResult.additionalInfo?.effectSize) {
    const es = executorResult.additionalInfo.effectSize
    effectSize = {
      value: es.value,
      type: es.type,
      interpretation: es.interpretation
    }
  }

  // omega-squared 효과크기 변환
  let omegaSquared: EffectSizeInfo | undefined
  if (executorResult.additionalInfo?.omegaSquared) {
    const os = executorResult.additionalInfo.omegaSquared
    omegaSquared = {
      value: os.value,
      type: os.type,
      interpretation: os.interpretation
    }
  }

  // 제곱합 값 추출
  const ssBetween = executorResult.additionalInfo?.ssBetween as number | undefined
  const ssWithin = executorResult.additionalInfo?.ssWithin as number | undefined
  const ssTotal = executorResult.additionalInfo?.ssTotal as number | undefined

  // 사후검정 결과 변환
  let postHoc: PostHocResult[] | undefined
  if (executorResult.additionalInfo?.postHoc) {
    postHoc = executorResult.additionalInfo.postHoc.map((item: {
      group1: string | number
      group2: string | number
      meanDiff?: number
      zStatistic?: number
      pvalue: number
      pvalueAdjusted?: number
      significant: boolean
    }) => ({
      group1: item.group1,
      group2: item.group2,
      meanDiff: item.meanDiff,
      zStatistic: item.zStatistic,
      pvalue: item.pvalue,
      pvalueAdjusted: item.pvalueAdjusted,
      significant: item.significant
    }))
  }

  // 회귀계수 변환
  let coefficients: CoefficientResult[] | undefined
  if (executorResult.additionalInfo?.coefficients) {
    coefficients = executorResult.additionalInfo.coefficients.map((coef: {
      name: string
      value: number
      stdError: number
      tValue: number
      pvalue: number
    }) => ({
      name: coef.name,
      value: coef.value,
      stdError: coef.stdError,
      tValue: coef.tValue,
      pvalue: coef.pvalue
    }))
  }

  // 그룹 통계 변환
  let groupStats: GroupStats[] | undefined
  if (executorResult.additionalInfo?.groupStats) {
    groupStats = executorResult.additionalInfo.groupStats.map((stat: {
      name?: string
      mean: number
      std: number
      n: number
      median?: number
    }, index: number) => ({
      name: stat.name || `그룹 ${index + 1}`,
      mean: stat.mean,
      std: stat.std,
      n: stat.n,
      median: stat.median
    }))
  } else if (executorResult.additionalInfo?.group1Stats && executorResult.additionalInfo?.group2Stats) {
    // t-test의 경우 group1Stats, group2Stats로 분리되어 있음
    const g1 = executorResult.additionalInfo.group1Stats
    const g2 = executorResult.additionalInfo.group2Stats
    groupStats = [
      { name: '그룹 1', mean: g1.mean, std: g1.std, n: g1.n },
      { name: '그룹 2', mean: g2.mean, std: g2.std, n: g2.n }
    ]
  }

  // 가정 검정 변환
  let assumptions: StatisticalAssumptions | undefined
  if (executorResult.metadata?.assumptions) {
    const metaAssump = executorResult.metadata.assumptions
    assumptions = {
      normality: metaAssump.normality ? {
        group1: {
          statistic: metaAssump.normality.statistic || 0,
          pValue: metaAssump.normality.pvalue || 0,
          isNormal: metaAssump.normality.passed
        }
      } : undefined,
      homogeneity: metaAssump.homogeneity ? {
        levene: {
          statistic: metaAssump.homogeneity.statistic || 0,
          pValue: metaAssump.homogeneity.pvalue || 0,
          equalVariance: metaAssump.homogeneity.passed
        }
      } : undefined
    }
  }

  // 신뢰구간 변환
  const confidence = executorResult.mainResults.confidenceInterval ? {
    lower: executorResult.mainResults.confidenceInterval.lower,
    upper: executorResult.mainResults.confidenceInterval.upper,
    level: executorResult.mainResults.confidenceInterval.level
  } : undefined

  // additional 정보 구성
  const additional: SmartFlowResult['additional'] = {
    intercept: executorResult.additionalInfo?.intercept,
    rmse: executorResult.additionalInfo?.rmse,
    rSquared: executorResult.additionalInfo?.rSquared,
    adjustedRSquared: executorResult.additionalInfo?.adjustedRSquared,
    adjRSquared: executorResult.additionalInfo?.adjustedRSquared,  // Alias for backward compatibility
    vif: executorResult.additionalInfo?.vif,
    residuals: executorResult.additionalInfo?.residuals,
    predictions: executorResult.additionalInfo?.predictions,
    confusionMatrix: executorResult.additionalInfo?.confusionMatrix,
    accuracy: executorResult.additionalInfo?.accuracy,
    precision: executorResult.additionalInfo?.precision,
    recall: executorResult.additionalInfo?.recall,
    f1Score: executorResult.additionalInfo?.f1Score,
    rocAuc: executorResult.additionalInfo?.rocAuc,
    silhouetteScore: executorResult.additionalInfo?.silhouetteScore,
    clusters: executorResult.additionalInfo?.clusters,
    centers: executorResult.additionalInfo?.centers,
    explainedVarianceRatio: executorResult.additionalInfo?.explainedVarianceRatio,
    loadings: executorResult.additionalInfo?.loadings,
    communalities: executorResult.additionalInfo?.communalities,
    eigenvalues: executorResult.additionalInfo?.eigenvalues,
    rankings: executorResult.additionalInfo?.rankings,
    itemTotalCorrelations: executorResult.additionalInfo?.itemTotalCorrelations,
    alpha: executorResult.additionalInfo?.alpha,
    power: executorResult.additionalInfo?.power,
    requiredSampleSize: executorResult.additionalInfo?.requiredSampleSize,
    // Regression-specific metrics (Phase 3 fix)
    aic: executorResult.additionalInfo?.aic,
    bic: executorResult.additionalInfo?.bic,
    pseudo_r_squared_mcfadden: executorResult.additionalInfo?.pseudo_r_squared_mcfadden,
    pseudo_r_squared_nagelkerke: executorResult.additionalInfo?.pseudo_r_squared_nagelkerke,
    pseudo_r_squared_cox_snell: executorResult.additionalInfo?.pseudo_r_squared_cox_snell,
    pseudo_r_squared: executorResult.additionalInfo?.pseudo_r_squared,
    finalVariables: executorResult.additionalInfo?.finalVariables,
    deviance: executorResult.additionalInfo?.deviance,
    log_likelihood: executorResult.additionalInfo?.log_likelihood
  }

  // 시각화 데이터 변환
  const visualizationData = executorResult.visualizationData ? {
    type: executorResult.visualizationData.type,
    data: executorResult.visualizationData.data as Record<string, unknown>,
    options: executorResult.visualizationData.options as Record<string, unknown> | undefined
  } : undefined

  return {
    method: executorResult.metadata.method,
    statistic: executorResult.mainResults.statistic,
    pValue: executorResult.mainResults.pvalue,
    df: executorResult.mainResults.df,
    effectSize,
    omegaSquared,
    ssBetween,
    ssWithin,
    ssTotal,
    confidence,
    interpretation: executorResult.mainResults.interpretation,
    assumptions,
    postHoc,
    coefficients,
    groupStats,
    additional,
    visualizationData
  }
}

/**
 * 효과크기 값만 추출 (숫자)
 */
export function getEffectSizeValue(effectSize: number | EffectSizeInfo | undefined): number | undefined {
  if (effectSize === undefined) return undefined
  if (typeof effectSize === 'number') return effectSize
  return effectSize.value
}

/**
 * 효과크기 정보 추출 (전체)
 */
export function getEffectSizeInfo(effectSize: number | EffectSizeInfo | undefined): EffectSizeInfo | undefined {
  if (effectSize === undefined) return undefined
  if (typeof effectSize === 'number') {
    return {
      value: effectSize,
      type: 'unknown',
      interpretation: interpretEffectSize(effectSize)
    }
  }
  return effectSize
}

/**
 * 효과크기 해석 (기본)
 */
function interpretEffectSize(value: number): string {
  const absValue = Math.abs(value)
  if (absValue < 0.2) return '작은 효과'
  if (absValue < 0.5) return '중간 효과'
  if (absValue < 0.8) return '큰 효과'
  return '매우 큰 효과'
}
