import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { interpretCohensD } from './shared-helpers'

export async function handleDesign(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  switch (method.id) {
    case 'power-analysis': {
      // pyodideStats 래퍼 사용
      const testType = (data.variables?.testType as string) || 't-test'
      const analysisType = (data.variables?.analysisType as string) || 'a-priori'
      const alpha = (data.variables?.alpha as number) || 0.05
      const power = (data.variables?.power as number) || 0.8
      const effectSize = (data.variables?.effectSize as number) || 0.5
      const sampleSize = data.totalN || 30
      const sides = (data.variables?.sides as string) || 'two-sided'

      const result = await pyodideStats.powerAnalysis(
        testType as 't-test' | 'anova' | 'correlation' | 'chi-square' | 'regression',
        analysisType as 'a-priori' | 'post-hoc' | 'compromise' | 'criterion',
        { alpha, power, effectSize, sampleSize, sides: sides as 'two-sided' | 'one-sided' }
      )

      const sampleSizeResult = result.results.sampleSize ?? result.results.criticalEffect ?? 0
      const powerResult = result.results.power ?? 0
      const inputEffect = result.inputParameters.effectSize ?? 0

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: sampleSize,
            missingRemoved: 0
          }
        },
        mainResults: {
          statistic: powerResult || sampleSizeResult,
          pvalue: result.inputParameters.alpha ?? 0.05,
          significant: powerResult >= 0.8,
          interpretation: result.interpretation
        },
        additionalInfo: {
          effectSize: inputEffect ? {
            type: "Cohen's d",
            value: inputEffect,
            interpretation: interpretCohensD(inputEffect)
          } : undefined
        },
        rawResults: result
      }
    }
    default:
      throw new Error(`지원되지 않는 실험 설계 분석: ${method.id}`)
  }
}
