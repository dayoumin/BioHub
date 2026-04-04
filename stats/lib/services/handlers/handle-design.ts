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
          statistic: result.achievedPower || result.requiredSampleSize || 0,
          pvalue: typeof result.alpha === 'number' ? result.alpha : 0.05,
          significant: (result.achievedPower || 0) >= 0.8,
          interpretation: `${analysisType} 분석 완료: ${result.requiredSampleSize ? `필요 표본 크기 ${result.requiredSampleSize}` : `검정력 ${(result.achievedPower || 0).toFixed(3)}`}`
        },
        additionalInfo: {
          effectSize: result.effectSize ? {
            type: "Cohen's d",
            value: result.effectSize,
            interpretation: interpretCohensD(result.effectSize)
          } : undefined
        },
        rawResults: result
      }
    }
    default:
      throw new Error(`지원되지 않는 실험 설계 분석: ${method.id}`)
  }
}
