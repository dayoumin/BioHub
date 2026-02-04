/**
 * result-converter.ts 단위 테스트
 *
 * AnalysisResult -> StatisticalResult 변환 함수 테스트
 */

import { convertToStatisticalResult } from '../result-converter'
import { AnalysisResult, EffectSizeInfo, StatisticalAssumptions } from '@/types/smart-flow'

describe('convertToStatisticalResult', () => {
  describe('Basic conversion', () => {
    it('should convert minimal AnalysisResult correctly', () => {
      const input: AnalysisResult = {
        method: '독립표본 t-검정',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: '두 그룹 간 유의한 차이가 있습니다.'
      }

      const result = convertToStatisticalResult(input)

      expect(result.testName).toBe('독립표본 t-검정')
      expect(result.testType).toBe('Independent Samples t-test')
      expect(result.description).toBe('두 독립 집단의 평균 비교')
      expect(result.statistic).toBe(2.5)
      expect(result.statisticName).toBe('t')
      expect(result.pValue).toBe(0.015)
      expect(result.alpha).toBe(0.05)
      expect(result.interpretation).toBe('두 그룹 간 유의한 차이가 있습니다.')
    })

    it('should include df when provided', () => {
      const input: AnalysisResult = {
        method: 'Independent t-test',
        statistic: 2.5,
        pValue: 0.015,
        df: 48,
        interpretation: 'Significant difference'
      }

      const result = convertToStatisticalResult(input)
      expect(result.df).toBe(48)
    })
  })

  describe('Effect size conversion', () => {
    it('should convert numeric effect size with default type', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.5,
        pValue: 0.015,
        effectSize: 0.72,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.effectSize).toEqual({
        value: 0.72,
        type: 'cohensD'
      })
    })

    it('should convert EffectSizeInfo object with cohensD type', () => {
      const effectSizeInfo: EffectSizeInfo = {
        value: 0.8,
        type: "Cohen's d",
        interpretation: 'Large effect'
      }

      const input: AnalysisResult = {
        method: 't-test',
        statistic: 3.0,
        pValue: 0.005,
        effectSize: effectSizeInfo,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.effectSize).toEqual({
        value: 0.8,
        type: 'cohensD'
      })
    })

    it('should convert eta-squared type correctly', () => {
      const effectSizeInfo: EffectSizeInfo = {
        value: 0.14,
        type: 'eta-squared',
        interpretation: 'Large effect'
      }

      const input: AnalysisResult = {
        method: 'ANOVA',
        statistic: 5.2,
        pValue: 0.01,
        effectSize: effectSizeInfo,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.effectSize?.type).toBe('etaSquared')
    })

    it('should handle undefined effect size type gracefully', () => {
      const effectSizeInfo = {
        value: 0.5,
        type: undefined as unknown as string,
        interpretation: 'Medium effect'
      } as EffectSizeInfo

      const input: AnalysisResult = {
        method: 't-test',
        statistic: 2.0,
        pValue: 0.05,
        effectSize: effectSizeInfo,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.effectSize).toEqual({
        value: 0.5,
        type: 'cohensD' // default fallback
      })
    })

    it('should handle unknown effect size type with default', () => {
      const effectSizeInfo: EffectSizeInfo = {
        value: 0.3,
        type: 'unknown_type',
        interpretation: 'Some effect'
      }

      const input: AnalysisResult = {
        method: 't-test',
        statistic: 1.5,
        pValue: 0.1,
        effectSize: effectSizeInfo,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.effectSize?.type).toBe('cohensD')
    })
  })

  describe('Confidence interval conversion', () => {
    it('should convert confidence interval correctly', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.5,
        pValue: 0.015,
        confidence: {
          lower: 1.2,
          upper: 3.8,
          level: 0.95
        },
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.confidenceInterval).toEqual({
        estimate: 2.5, // (1.2 + 3.8) / 2
        lower: 1.2,
        upper: 3.8,
        level: 0.95
      })
    })

    it('should use default level 0.95 when not provided', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        confidence: {
          lower: 0.5,
          upper: 3.5
        },
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.confidenceInterval?.level).toBe(0.95)
    })
  })

  describe('Assumptions conversion', () => {
    it('should convert normality group tests', () => {
      const assumptions: StatisticalAssumptions = {
        normality: {
          group1: {
            statistic: 0.95,
            pValue: 0.3,
            isNormal: true
          },
          group2: {
            statistic: 0.88,
            pValue: 0.02,
            isNormal: false
          }
        }
      }

      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        assumptions,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.assumptions).toHaveLength(2)
      expect(result.assumptions?.[0]).toMatchObject({
        name: '정규성 (그룹 1)',
        passed: true
      })
      expect(result.assumptions?.[1]).toMatchObject({
        name: '정규성 (그룹 2)',
        passed: false,
        recommendation: '비모수 검정 사용을 고려하세요'
      })
    })

    it('should convert Levene test for homogeneity', () => {
      const assumptions: StatisticalAssumptions = {
        homogeneity: {
          levene: {
            statistic: 2.5,
            pValue: 0.12,
            equalVariance: true
          }
        }
      }

      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        assumptions,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.assumptions?.[0]).toMatchObject({
        name: '등분산성',
        description: "Levene's 검정",
        testStatistic: 2.5,
        pValue: 0.12,
        passed: true
      })
    })

    it('should return undefined for empty assumptions', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.assumptions).toBeUndefined()
    })
  })

  describe('Method name mapping', () => {
    const testCases = [
      { method: '독립표본 t-검정', expectedStat: 't', expectedType: 'Independent Samples t-test' },
      { method: '대응표본 t-검정', expectedStat: 't', expectedType: 'Paired Samples t-test' },
      { method: '일표본 t-검정', expectedStat: 't', expectedType: 'One-Sample t-test' },
      { method: '일원분산분석 (ANOVA)', expectedStat: 'F', expectedType: 'One-Way ANOVA' },
      { method: '이원 ANOVA', expectedStat: 'F', expectedType: 'Two-Way ANOVA' },
      { method: 'Pearson 상관분석', expectedStat: 'r', expectedType: 'Pearson Correlation' },
      { method: 'Spearman 상관', expectedStat: 'r', expectedType: 'Spearman Correlation' },
      { method: 'Mann-Whitney U 검정', expectedStat: 'U', expectedType: 'Mann-Whitney U Test' },
      { method: 'Wilcoxon 부호순위 검정', expectedStat: 'W', expectedType: 'Wilcoxon Signed-Rank Test' },
      { method: 'Kruskal-Wallis 검정', expectedStat: 'H', expectedType: 'Kruskal-Wallis H Test' },
      { method: '카이제곱 검정', expectedStat: 'χ²', expectedType: 'Chi-Square Test' },
      { method: '단순회귀분석', expectedStat: 'β', expectedType: 'Simple Linear Regression' },
      { method: '다중회귀분석', expectedStat: 'β', expectedType: 'Multiple Linear Regression' },
    ]

    testCases.forEach(({ method, expectedStat, expectedType }) => {
      it(`should map "${method}" correctly`, () => {
        const input: AnalysisResult = {
          method,
          statistic: 1.0,
          pValue: 0.05,
          interpretation: 'test'
        }

        const result = convertToStatisticalResult(input)

        expect(result.statisticName).toBe(expectedStat)
        expect(result.testType).toBe(expectedType)
      })
    })
  })

  describe('Recommendations generation', () => {
    it('should add effect size recommendation when effect size exists', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.5,
        pValue: 0.015,
        effectSize: 0.5,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.recommendations).toContain('효과크기를 함께 보고하여 실질적 유의성을 평가하세요')
    })

    it('should add sample size recommendations for non-significant results', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 1.0,
        pValue: 0.3, // non-significant
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.recommendations).toContain('표본 크기가 충분한지 검토하세요 (통계적 검정력 분석)')
      expect(result.recommendations).toContain('효과크기가 작은 경우 더 큰 표본이 필요할 수 있습니다')
    })

    it('should add Type I error warning for post-hoc tests', () => {
      const input: AnalysisResult = {
        method: 'ANOVA',
        statistic: 5.0,
        pValue: 0.01,
        postHoc: [
          { group1: 'A', group2: 'B', pvalue: 0.01, significant: true }
        ],
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.recommendations).toContain('다중비교에 따른 Type I 오류 증가에 유의하세요')
    })
  })

  describe('Options parameter', () => {
    it('should include sample size from options', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input, { sampleSize: 100 })

      expect(result.sampleSize).toBe(100)
    })

    it('should include variables from options', () => {
      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input, {
        variables: ['height', 'weight']
      })

      expect(result.variables).toEqual(['height', 'weight'])
    })

    it('should use groupStats length when groups not provided', () => {
      const input: AnalysisResult = {
        method: 'ANOVA',
        statistic: 5.0,
        pValue: 0.01,
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 15, std: 3, n: 25 },
          { name: 'C', mean: 12, std: 2.5, n: 22 }
        ],
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input)

      expect(result.groups).toBe(3)
    })

    it('should override groupStats length with explicit groups option', () => {
      const input: AnalysisResult = {
        method: 'ANOVA',
        statistic: 5.0,
        pValue: 0.01,
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 15, std: 3, n: 25 }
        ],
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input, { groups: 5 })

      expect(result.groups).toBe(5)
    })

    it('should use provided timestamp', () => {
      const customDate = new Date('2025-01-15T10:30:00Z')

      const input: AnalysisResult = {
        method: 't-검정',
        statistic: 2.0,
        pValue: 0.05,
        interpretation: 'test'
      }

      const result = convertToStatisticalResult(input, { timestamp: customDate })

      expect(result.timestamp).toEqual(customDate)
    })
  })
})