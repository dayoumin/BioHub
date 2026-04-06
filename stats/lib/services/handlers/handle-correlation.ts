import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { pyodideStats } from '../pyodide/pyodide-statistics'
import { interpretCorrelation } from './shared-helpers'
import { interpretPValueKo } from '@/lib/statistics/formatters'

export async function handleCorrelation(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  const var1 = data.arrays.dependent || data.arrays.independent?.[0]
  const var2 = data.arrays.independent?.[1] || data.arrays.independent?.[0]

  if (!var1 || !var2) {
    throw new Error('상관분석을 위한 두 변수가 필요합니다')
  }

  const methodId = method.id.toLowerCase()

  if (methodId === 'partial-correlation') {
    const covariates = data.arrays.covariate || []
    const dataMatrix = [var1, var2, ...covariates]
    const controlIndices = covariates.length > 0
      ? Array.from({ length: covariates.length }, (_, i) => i + 2)
      : []
    const result = await pyodideStats.partialCorrelationWorker(dataMatrix, 0, 1, controlIndices)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: { totalN: var1.length, missingRemoved: 0 }
      },
      mainResults: {
        statistic: result.correlation,
        pvalue: result.pValue,
        significant: result.pValue < 0.05,
        interpretation: `편상관계수 = ${result.correlation.toFixed(4)} (${interpretCorrelation(result.correlation)}), ${interpretPValueKo(result.pValue)}`
      },
      additionalInfo: {
        effectSize: { value: result.correlation, type: 'Partial r', interpretation: interpretCorrelation(result.correlation) },
        controlledVariables: controlIndices.length,
        df: result.df
      },
      visualizationData: { type: 'scatter', data: { x: var1, y: var2 } },
      rawResults: result
    }
  }

  // 단일 상관분석 (pearson, spearman, kendall)
  if (methodId === 'spearman-correlation' || methodId.includes('spearman') ||
      methodId === 'kendall-correlation' || methodId.includes('kendall') ||
      methodId === 'pearson-correlation' || methodId === 'pearson') {
    const corrMethod = methodId.includes('spearman') ? 'spearman' as const
      : methodId.includes('kendall') ? 'kendall' as const
      : 'pearson' as const

    const symbolMap = { pearson: 'r', spearman: 'ρ', kendall: 'τ' } as const
    const result = await pyodideStats.correlationTest(var1, var2, corrMethod)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: { totalN: var1.length, missingRemoved: 0 }
      },
      mainResults: {
        statistic: result.correlation,
        pvalue: result.pValue,
        significant: result.pValue < 0.05,
        interpretation: `${symbolMap[corrMethod]} = ${result.correlation.toFixed(4)} (${interpretCorrelation(result.correlation)}), ${interpretPValueKo(result.pValue)}`
      },
      additionalInfo: {
        effectSize: { value: result.correlation, type: `${corrMethod === 'pearson' ? 'Pearson r' : corrMethod === 'spearman' ? 'Spearman rho' : 'Kendall tau'}`, interpretation: interpretCorrelation(result.correlation) },
        rSquared: corrMethod === 'pearson' ? result.correlation ** 2 : undefined,
        method: corrMethod
      },
      visualizationData: { type: 'scatter', data: { x: var1, y: var2 } },
      rawResults: result
    }
  }

  // 기본: 종합 상관분석 (pearson + spearman + kendall)
  const result = await pyodideStats.correlation(var1, var2)
  const pearson = result.pearson

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: { totalN: var1.length, missingRemoved: 0 }
    },
    mainResults: {
      statistic: pearson.r,
      pvalue: pearson.pValue,
      significant: pearson.pValue < 0.05,
      interpretation: `Pearson r = ${pearson.r.toFixed(4)} (${interpretCorrelation(pearson.r)}), ${interpretPValueKo(pearson.pValue)}`
    },
    additionalInfo: {
      effectSize: { value: pearson.r, type: 'Pearson r', interpretation: interpretCorrelation(pearson.r) },
      rSquared: pearson.r ** 2,
      pearson: result.pearson,
      spearman: result.spearman,
      kendall: result.kendall
    },
    visualizationData: { type: 'scatter', data: { x: var1, y: var2 } },
    rawResults: result
  }
}
