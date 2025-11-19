/**
 * result-transformer.ts 단위 테스트
 */

import {
  transformExecutorResult,
  getEffectSizeValue,
  getEffectSizeInfo
} from '@/lib/utils/result-transformer'
import { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'
import { AnalysisResult as SmartFlowResult, EffectSizeInfo } from '@/types/smart-flow'

describe('result-transformer', () => {
  describe('transformExecutorResult', () => {
    it('should transform basic executor result to smart-flow result', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'Independent t-test',
          sampleSize: 30,
          executionTime: 150
        },
        mainResults: {
          statistic: 2.45,
          pvalue: 0.021,
          interpretation: '두 그룹 간 유의한 차이가 있습니다.'
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.method).toBe('Independent t-test')
      expect(result.statistic).toBe(2.45)
      expect(result.pValue).toBe(0.021)
      expect(result.interpretation).toBe('두 그룹 간 유의한 차이가 있습니다.')
    })

    it('should transform effect size info correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 't-test',
          sampleSize: 50,
          executionTime: 100
        },
        mainResults: {
          statistic: 3.2,
          pvalue: 0.003,
          interpretation: 'Test'
        },
        additionalInfo: {
          effectSize: {
            value: 0.75,
            type: "Cohen's d",
            interpretation: '중간 효과'
          }
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.effectSize).toBeDefined()
      expect(typeof result.effectSize).toBe('object')

      const effectSize = result.effectSize as EffectSizeInfo
      expect(effectSize.value).toBe(0.75)
      expect(effectSize.type).toBe("Cohen's d")
      expect(effectSize.interpretation).toBe('중간 효과')
    })

    it('should transform confidence interval correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 't-test',
          sampleSize: 40,
          executionTime: 120
        },
        mainResults: {
          statistic: 2.1,
          pvalue: 0.042,
          confidenceInterval: {
            lower: 0.15,
            upper: 3.85,
            level: 0.95
          },
          interpretation: 'Test'
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.confidence).toBeDefined()
      expect(result.confidence?.lower).toBe(0.15)
      expect(result.confidence?.upper).toBe(3.85)
      expect(result.confidence?.level).toBe(0.95)
    })

    it('should transform post-hoc results correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'ANOVA',
          sampleSize: 90,
          executionTime: 200
        },
        mainResults: {
          statistic: 5.67,
          pvalue: 0.005,
          df: 2,
          interpretation: '그룹 간 차이 있음'
        },
        additionalInfo: {
          postHoc: [
            {
              group1: 'A',
              group2: 'B',
              meanDiff: 2.5,
              pvalue: 0.012,
              pvalueAdjusted: 0.036,
              significant: true
            },
            {
              group1: 'A',
              group2: 'C',
              meanDiff: 1.2,
              pvalue: 0.234,
              pvalueAdjusted: 0.702,
              significant: false
            }
          ]
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.postHoc).toBeDefined()
      expect(result.postHoc).toHaveLength(2)
      expect(result.postHoc?.[0].group1).toBe('A')
      expect(result.postHoc?.[0].group2).toBe('B')
      expect(result.postHoc?.[0].significant).toBe(true)
      expect(result.postHoc?.[1].significant).toBe(false)
    })

    it('should transform regression coefficients correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'Linear Regression',
          sampleSize: 100,
          executionTime: 250
        },
        mainResults: {
          statistic: 45.3,
          pvalue: 0.0001,
          interpretation: '회귀모형 유의'
        },
        additionalInfo: {
          intercept: 12.5,
          rSquared: 0.78,
          adjustedRSquared: 0.76,
          rmse: 2.3,
          coefficients: [
            { name: '(Intercept)', value: 12.5, stdError: 1.2, tValue: 10.4, pvalue: 0.0001 },
            { name: 'X1', value: 3.2, stdError: 0.4, tValue: 8.0, pvalue: 0.0001 },
            { name: 'X2', value: -1.5, stdError: 0.3, tValue: -5.0, pvalue: 0.001 }
          ]
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.coefficients).toBeDefined()
      expect(result.coefficients).toHaveLength(3)
      expect(result.coefficients?.[0].name).toBe('(Intercept)')
      expect(result.coefficients?.[1].value).toBe(3.2)
      expect(result.additional?.rSquared).toBe(0.78)
      expect(result.additional?.rmse).toBe(2.3)
    })

    it('should transform group stats correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 't-test',
          sampleSize: 60,
          executionTime: 100
        },
        mainResults: {
          statistic: 2.8,
          pvalue: 0.007,
          interpretation: 'Test'
        },
        additionalInfo: {
          groupStats: [
            { name: '대조군', mean: 25.3, std: 4.2, n: 30, median: 24.5 },
            { name: '실험군', mean: 32.1, std: 5.1, n: 30, median: 31.8 }
          ]
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.groupStats).toBeDefined()
      expect(result.groupStats).toHaveLength(2)
      expect(result.groupStats?.[0].name).toBe('대조군')
      expect(result.groupStats?.[0].mean).toBe(25.3)
      expect(result.groupStats?.[1].median).toBe(31.8)
    })

    it('should handle group1Stats and group2Stats format', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 't-test',
          sampleSize: 40,
          executionTime: 80
        },
        mainResults: {
          statistic: 2.0,
          pvalue: 0.05,
          interpretation: 'Test'
        },
        additionalInfo: {
          group1Stats: { mean: 10.5, std: 2.3, n: 20 },
          group2Stats: { mean: 15.2, std: 3.1, n: 20 }
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.groupStats).toBeDefined()
      expect(result.groupStats).toHaveLength(2)
      expect(result.groupStats?.[0].name).toBe('그룹 1')
      expect(result.groupStats?.[0].mean).toBe(10.5)
      expect(result.groupStats?.[1].name).toBe('그룹 2')
      expect(result.groupStats?.[1].mean).toBe(15.2)
    })

    it('should transform visualization data correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'ANOVA',
          sampleSize: 60,
          executionTime: 150
        },
        mainResults: {
          statistic: 4.5,
          pvalue: 0.015,
          interpretation: 'Test'
        },
        visualizationData: {
          type: 'boxplot',
          data: {
            groups: ['A', 'B', 'C'],
            values: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
          },
          options: { showOutliers: true }
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.visualizationData).toBeDefined()
      expect(result.visualizationData?.type).toBe('boxplot')
      expect(result.visualizationData?.data).toBeDefined()
    })

    it('should transform additional fields for advanced analyses', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'Logistic Regression',
          sampleSize: 200,
          executionTime: 300
        },
        mainResults: {
          statistic: 25.4,
          pvalue: 0.0001,
          interpretation: 'Test'
        },
        additionalInfo: {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.78,
          f1Score: 0.80,
          rocAuc: 0.88,
          confusionMatrix: [[80, 10], [15, 95]]
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.additional?.accuracy).toBe(0.85)
      expect(result.additional?.precision).toBe(0.82)
      expect(result.additional?.recall).toBe(0.78)
      expect(result.additional?.f1Score).toBe(0.80)
      expect(result.additional?.rocAuc).toBe(0.88)
      expect(result.additional?.confusionMatrix).toEqual([[80, 10], [15, 95]])
    })
  })

  describe('getEffectSizeValue', () => {
    it('should return undefined for undefined input', () => {
      expect(getEffectSizeValue(undefined)).toBeUndefined()
    })

    it('should return the number directly for number input', () => {
      expect(getEffectSizeValue(0.5)).toBe(0.5)
      expect(getEffectSizeValue(0)).toBe(0)
      expect(getEffectSizeValue(-0.3)).toBe(-0.3)
    })

    it('should extract value from EffectSizeInfo object', () => {
      const effectSizeInfo: EffectSizeInfo = {
        value: 0.75,
        type: "Cohen's d",
        interpretation: '중간 효과'
      }
      expect(getEffectSizeValue(effectSizeInfo)).toBe(0.75)
    })
  })

  describe('getEffectSizeInfo', () => {
    it('should return undefined for undefined input', () => {
      expect(getEffectSizeInfo(undefined)).toBeUndefined()
    })

    it('should convert number to EffectSizeInfo object', () => {
      const result = getEffectSizeInfo(0.15)

      expect(result).toBeDefined()
      expect(result?.value).toBe(0.15)
      expect(result?.type).toBe('unknown')
      expect(result?.interpretation).toBe('작은 효과')
    })

    it('should return EffectSizeInfo object as-is', () => {
      const effectSizeInfo: EffectSizeInfo = {
        value: 0.85,
        type: 'eta-squared',
        interpretation: '큰 효과'
      }

      const result = getEffectSizeInfo(effectSizeInfo)

      expect(result).toBe(effectSizeInfo)
      expect(result?.value).toBe(0.85)
      expect(result?.type).toBe('eta-squared')
    })

    it('should interpret effect sizes correctly', () => {
      // 작은 효과 (< 0.2)
      expect(getEffectSizeInfo(0.1)?.interpretation).toBe('작은 효과')

      // 중간 효과 (0.2 - 0.5)
      expect(getEffectSizeInfo(0.35)?.interpretation).toBe('중간 효과')

      // 큰 효과 (0.5 - 0.8)
      expect(getEffectSizeInfo(0.65)?.interpretation).toBe('큰 효과')

      // 매우 큰 효과 (>= 0.8)
      expect(getEffectSizeInfo(0.9)?.interpretation).toBe('매우 큰 효과')
    })
  })
})
