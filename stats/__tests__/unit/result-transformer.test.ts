/**
 * result-transformer.ts 단위 테스트
 */

import {
  transformExecutorResult,
  getEffectSizeValue,
  getEffectSizeInfo
} from '@/lib/utils/result-transformer'
import { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'
import { EffectSizeInfo } from '@/types/smart-flow'

describe('result-transformer', () => {
  describe('transformExecutorResult', () => {
    it('should transform basic executor result to smart-flow result', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'Independent t-test',
          timestamp: new Date().toISOString(),
          duration: 150,
          dataSize: 30
        },
        mainResults: {
          statistic: 2.45,
          pvalue: 0.021,
          interpretation: '두 그룹 간 유의한 차이가 있습니다.'
        },
        additionalInfo: {}
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
          timestamp: new Date().toISOString(),
          duration: 100,
          dataSize: 50
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
          timestamp: new Date().toISOString(),
          duration: 120,
          dataSize: 40
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
        },
        additionalInfo: {}
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
          timestamp: new Date().toISOString(),
          duration: 200,
          dataSize: 90
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
              significant: true
            },
            {
              group1: 'A',
              group2: 'C',
              meanDiff: 1.2,
              pvalue: 0.234,
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

    it('should normalize post-hoc alias fields (pValue, adjusted_p)', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'ANOVA',
          timestamp: new Date().toISOString(),
          duration: 120,
          dataSize: 45
        },
        mainResults: {
          statistic: 4.2,
          pvalue: 0.01,
          interpretation: '유의함'
        },
        additionalInfo: {
          postHoc: [
            {
              group1: 'A',
              group2: 'B',
              meanDiff: 1.1,
              pValue: 0.01,
              adjusted_p: 0.03,
              significant: true
            }
          ]
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.postHoc).toBeDefined()
      expect(result.postHoc).toHaveLength(1)
      expect(result.postHoc?.[0].pvalue).toBe(0.01)
      expect(result.postHoc?.[0].pvalueAdjusted).toBe(0.03)
      expect(result.postHoc?.[0].meanDiff).toBe(1.1)
    })

    it('should transform object-style postHoc.comparisons payload', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'ANOVA',
          timestamp: new Date().toISOString(),
          duration: 140,
          dataSize: 60
        },
        mainResults: {
          statistic: 6.1,
          pvalue: 0.004,
          interpretation: '유의함'
        },
        additionalInfo: {
          postHoc: {
            method: 'Tukey',
            comparisons: [
              {
                group1: 'A',
                group2: 'C',
                meanDiff: 2.2,
                pValue: 0.02,
                significant: true
              }
            ]
          }
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.postHoc).toBeDefined()
      expect(result.postHoc).toHaveLength(1)
      expect(result.postHoc?.[0].group1).toBe('A')
      expect(result.postHoc?.[0].group2).toBe('C')
      expect(result.postHoc?.[0].pvalue).toBe(0.02)
      expect(result.postHoc?.[0].significant).toBe(true)
    })

    it('should transform regression coefficients correctly', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'Linear Regression',
          timestamp: new Date().toISOString(),
          duration: 250,
          dataSize: 100
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
          timestamp: new Date().toISOString(),
          duration: 100,
          dataSize: 60
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
          timestamp: new Date().toISOString(),
          duration: 80,
          dataSize: 40
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
          timestamp: new Date().toISOString(),
          duration: 150,
          dataSize: 60
        },
        mainResults: {
          statistic: 4.5,
          pvalue: 0.015,
          interpretation: 'Test'
        },
        additionalInfo: {},
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
          timestamp: new Date().toISOString(),
          duration: 300,
          dataSize: 200
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

    it('should map isNormal from additionalInfo to UI additional', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'normality-test',
          timestamp: new Date().toISOString(),
          duration: 50,
          dataSize: 30
        },
        mainResults: {
          statistic: 0.98,
          pvalue: 0.12,
          interpretation: '정규성 가정 유지'
        },
        additionalInfo: {
          isNormal: true
        }
      }

      const result = transformExecutorResult(executorResult)
      expect(result.additional?.isNormal).toBe(true)
    })

    it('should preserve cluster contract fields in additional', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'cluster-analysis',
          timestamp: new Date().toISOString(),
          duration: 120,
          dataSize: 40
        },
        mainResults: {
          statistic: 0.67,
          pvalue: 1,
          interpretation: '군집 분석 완료'
        },
        additionalInfo: {
          clusters: [0, 1, 0, 1],
          centers: [[1, 2], [3, 4]],
          silhouetteScore: 0.67
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.additional?.clusters).toEqual([0, 1, 0, 1])
      expect(result.additional?.centers).toEqual([[1, 2], [3, 4]])
      expect(result.additional?.silhouetteScore).toBe(0.67)
    })

    it('should preserve PCA contract fields in additional', () => {
      const executorResult: ExecutorResult = {
        metadata: {
          method: 'pca',
          timestamp: new Date().toISOString(),
          duration: 140,
          dataSize: 80
        },
        mainResults: {
          statistic: 0.6,
          pvalue: 1,
          interpretation: 'PCA 완료'
        },
        additionalInfo: {
          explainedVarianceRatio: [0.6, 0.3],
          eigenvalues: [2.4, 1.2],
          loadings: [[0.8, 0.2], [0.1, 0.9]]
        }
      }

      const result = transformExecutorResult(executorResult)

      expect(result.additional?.explainedVarianceRatio).toEqual([0.6, 0.3])
      expect(result.additional?.eigenvalues).toEqual([2.4, 1.2])
      expect(result.additional?.loadings).toEqual([[0.8, 0.2], [0.1, 0.9]])
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
