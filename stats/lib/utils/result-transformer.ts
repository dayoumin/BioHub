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
import { ExecutorAnalysisResult } from '@/lib/services/executors/types'
import type { StatisticalExecutorResult } from '@/lib/services/statistical-executor'

/**
 * additionalInfo의 안전한 접근을 위한 헬퍼 타입
 * 두 Executor 결과 타입 모두에서 additionalInfo에 동적 프로퍼티 접근 가능
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdditionalInfoAccessor = Record<string, any>

/**
 * Storage에서 복원한 JSON 데이터가 Executor 결과 형식인지 판별하는 타입 가드
 *
 * Executor 형식 구분자: metadata (object with method) + mainResults (object) 존재
 */
export function isExecutorResult(
  data: Record<string, unknown>
): data is Record<string, unknown> & { metadata: Record<string, unknown>; mainResults: Record<string, unknown> } {
  if (!data.metadata || typeof data.metadata !== 'object') return false
  if (!data.mainResults || typeof data.mainResults !== 'object') return false
  const meta = data.metadata as Record<string, unknown>
  return typeof meta.method === 'string'
}

/**
 * Executor의 ExecutorAnalysisResult를 Smart Flow UI의 AnalysisResult로 변환
 * ExecutorAnalysisResult와 StatisticalExecutorResult 모두 지원
 */
export function transformExecutorResult(
  executorResult: ExecutorAnalysisResult | StatisticalExecutorResult
): SmartFlowResult {
  // additionalInfo를 안전하게 접근하기 위해 타입 캐스팅
  const additionalInfo = executorResult.additionalInfo as AdditionalInfoAccessor

  // 효과크기 변환 (eta-squared)
  let effectSize: number | EffectSizeInfo | undefined
  if (additionalInfo?.effectSize) {
    const es = additionalInfo.effectSize
    effectSize = {
      value: es.value,
      type: es.type,
      interpretation: es.interpretation
    }
  }

  // omega-squared 효과크기 변환
  let omegaSquared: EffectSizeInfo | undefined
  if (additionalInfo?.omegaSquared) {
    const os = additionalInfo.omegaSquared
    omegaSquared = {
      value: os.value,
      type: os.type,
      interpretation: os.interpretation
    }
  }

  // 제곱합 값 추출
  const ssBetween = additionalInfo?.ssBetween as number | undefined
  const ssWithin = additionalInfo?.ssWithin as number | undefined
  const ssTotal = additionalInfo?.ssTotal as number | undefined

  // 사후검정 결과 변환
  let postHoc: PostHocResult[] | undefined
  const rawPostHoc = additionalInfo?.postHoc
  const postHocItems = Array.isArray(rawPostHoc)
    ? rawPostHoc
    : rawPostHoc && typeof rawPostHoc === 'object' && Array.isArray((rawPostHoc as Record<string, unknown>).comparisons)
      ? ((rawPostHoc as Record<string, unknown>).comparisons as unknown[])
      : undefined

  if (postHocItems) {
    const postHocResults: PostHocResult[] = []
    for (const item of postHocItems) {
      const rec = item as Record<string, unknown>
      const pvalue =
        typeof rec.pvalue === 'number'
          ? rec.pvalue
          : typeof rec.pValue === 'number'
            ? rec.pValue
            : undefined

      if (typeof pvalue !== 'number') continue

      postHocResults.push({
        group1: rec.group1 as string | number,
        group2: rec.group2 as string | number,
        meanDiff: rec.meanDiff as number | undefined,
        zStatistic: rec.zStatistic as number | undefined,
        pvalue,
        pvalueAdjusted:
          (rec.pvalueAdjusted as number | undefined) ??
          (rec.pValueAdjusted as number | undefined) ??
          (rec.adjusted_p as number | undefined),
        significant:
          typeof rec.significant === 'boolean'
            ? rec.significant
            : pvalue < 0.05
      })
    }
    postHoc = postHocResults
  }

  // 회귀계수 변환
  let coefficients: CoefficientResult[] | undefined
  if (additionalInfo?.coefficients) {
    coefficients = additionalInfo.coefficients.map((coef: {
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
  if (additionalInfo?.groupStats) {
    groupStats = additionalInfo.groupStats.map((stat: {
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
  } else if (additionalInfo?.group1Stats && additionalInfo?.group2Stats) {
    // t-test의 경우 group1Stats, group2Stats로 분리되어 있음
    const g1 = additionalInfo.group1Stats
    const g2 = additionalInfo.group2Stats
    groupStats = [
      { name: '그룹 1', mean: g1.mean, std: g1.std, n: g1.n },
      { name: '그룹 2', mean: g2.mean, std: g2.std, n: g2.n }
    ]
  }

  // 가정 검정 변환
  let assumptions: StatisticalAssumptions | undefined
  // metadata를 any로 캐스팅하여 assumptions 접근 (두 타입의 메타데이터 구조가 다름)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = executorResult.metadata as any
  if (metadata?.assumptions) {
    const metaAssump = metadata.assumptions
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

  // mainResults를 안전하게 접근
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainResults = executorResult.mainResults as any

  // 신뢰구간 변환
  const confidence = mainResults.confidenceInterval ? {
    lower: mainResults.confidenceInterval.lower,
    upper: mainResults.confidenceInterval.upper,
    level: mainResults.confidenceInterval.level
  } : undefined

  // additional 정보 구성
  const additional: SmartFlowResult['additional'] = {
    isNormal: additionalInfo?.isNormal,
    intercept: additionalInfo?.intercept,
    rmse: additionalInfo?.rmse,
    rSquared: additionalInfo?.rSquared,
    adjustedRSquared: additionalInfo?.adjustedRSquared,
    adjRSquared: additionalInfo?.adjustedRSquared,  // Alias for backward compatibility
    vif: additionalInfo?.vif,
    residuals: additionalInfo?.residuals,
    predictions: additionalInfo?.predictions,
    confusionMatrix: additionalInfo?.confusionMatrix,
    accuracy: additionalInfo?.accuracy,
    precision: additionalInfo?.precision,
    recall: additionalInfo?.recall,
    f1Score: additionalInfo?.f1Score,
    rocAuc: additionalInfo?.rocAuc,
    silhouetteScore: additionalInfo?.silhouetteScore,
    clusters: additionalInfo?.clusters,
    centers: additionalInfo?.centers,
    explainedVarianceRatio: additionalInfo?.explainedVarianceRatio,
    loadings: additionalInfo?.loadings,
    communalities: additionalInfo?.communalities,
    eigenvalues: additionalInfo?.eigenvalues,
    rankings: additionalInfo?.rankings,
    itemTotalCorrelations: additionalInfo?.itemTotalCorrelations,
    alpha: additionalInfo?.alpha,
    power: additionalInfo?.power,
    requiredSampleSize: additionalInfo?.requiredSampleSize,
    // Regression-specific metrics (Phase 3 fix)
    aic: additionalInfo?.aic,
    bic: additionalInfo?.bic,
    pseudoRSquaredMcfadden: additionalInfo?.pseudoRSquaredMcfadden,
    pseudoRSquaredNagelkerke: additionalInfo?.pseudoRSquaredNagelkerke,
    pseudoRSquaredCoxSnell: additionalInfo?.pseudoRSquaredCoxSnell,
    pseudoRSquared: additionalInfo?.pseudoRSquared,
    finalVariables: additionalInfo?.finalVariables,
    deviance: additionalInfo?.deviance,
    logLikelihood: additionalInfo?.logLikelihood
  }

  // 시각화 데이터 변환
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vizData = executorResult.visualizationData as any
  const visualizationData = vizData ? {
    type: vizData.type,
    data: vizData.data as Record<string, unknown>,
    options: vizData.options as Record<string, unknown> | undefined
  } : undefined

  return {
    method: executorResult.metadata.method,
    statistic: mainResults.statistic,
    pValue: mainResults.pvalue,
    df: mainResults.df,
    effectSize,
    omegaSquared,
    ssBetween,
    ssWithin,
    ssTotal,
    confidence,
    interpretation: mainResults.interpretation || '',
    assumptions,
    postHoc,
    postHocMethod: typeof additionalInfo?.postHocMethod === 'string'
      ? additionalInfo.postHocMethod : undefined,
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
