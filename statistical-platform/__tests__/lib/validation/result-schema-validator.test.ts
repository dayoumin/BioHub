/**
 * Result Schema Validator Tests
 *
 * 43개 통계 방법의 결과 일관성을 검증하는 유틸리티 테스트
 */

import { describe, it, expect } from '@jest/globals'
import {
  validateResultSchema,
  getCategoryForMethod,
  validateBatch,
  logResultValidation,
  REQUIRED_FIELDS,
  RECOMMENDED_FIELDS,
  METHOD_TO_CATEGORY,
  type StatisticsCategory
} from '@/lib/validation/result-schema-validator'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Result Schema Validator', () => {
  describe('METHOD_TO_CATEGORY mapping', () => {
    it('should have mapping for all major statistics methods', () => {
      const majorMethods = [
        't-test', 'anova', 'regression', 'correlation',
        'chi-square', 'mann-whitney', 'pca', 'reliability'
      ]

      majorMethods.forEach(method => {
        expect(METHOD_TO_CATEGORY[method]).toBeDefined()
      })
    })

    it('should map t-test variants to comparison category', () => {
      expect(getCategoryForMethod('t-test')).toBe('comparison')
      expect(getCategoryForMethod('independent-t')).toBe('comparison')
      expect(getCategoryForMethod('paired-t')).toBe('comparison')
      expect(getCategoryForMethod('welch-t')).toBe('comparison')
    })

    it('should map regression variants to regression category', () => {
      expect(getCategoryForMethod('regression')).toBe('regression')
      expect(getCategoryForMethod('simple-regression')).toBe('regression')
      expect(getCategoryForMethod('multiple-regression')).toBe('regression')
      expect(getCategoryForMethod('logistic-regression')).toBe('regression')
    })

    it('should map executor-facing IDs to regression category', () => {
      // executor에서 사용하는 method ID들
      expect(getCategoryForMethod('simple')).toBe('regression')
      expect(getCategoryForMethod('multiple')).toBe('regression')
      expect(getCategoryForMethod('logistic')).toBe('regression')
      expect(getCategoryForMethod('polynomial')).toBe('regression')
    })

    it('should default to comparison for unknown methods', () => {
      expect(getCategoryForMethod('unknown-method')).toBe('comparison')
    })
  })

  describe('validateResultSchema', () => {
    describe('Comparison category (t-test, ANOVA)', () => {
      it('should pass when all required fields exist', () => {
        const result: AnalysisResult = {
          method: 'Independent t-test',
          statistic: 2.5,
          pValue: 0.05,
          interpretation: 'Significant difference found'
        }

        const validation = validateResultSchema(result, 't-test')

        expect(validation.valid).toBe(true)
        expect(validation.missing).toHaveLength(0)
        expect(validation.category).toBe('comparison')
      })

      it('should fail when interpretation is missing', () => {
        const result = {
          method: 'Independent t-test',
          statistic: 2.5,
          pValue: 0.05
          // missing interpretation
        } as AnalysisResult

        const validation = validateResultSchema(result, 't-test')

        expect(validation.valid).toBe(false)
        expect(validation.missing).toContain('interpretation')
      })

      it('should report missing recommended fields', () => {
        const result: AnalysisResult = {
          method: 'Independent t-test',
          statistic: 2.5,
          pValue: 0.05,
          interpretation: 'Significant'
          // missing effectSize, df, groupStats, confidence
        }

        const validation = validateResultSchema(result, 't-test')

        expect(validation.valid).toBe(true) // required fields present
        expect(validation.missingRecommended.length).toBeGreaterThan(0)
        expect(validation.missingRecommended).toContain('effectSize')
      })

      it('should calculate score correctly', () => {
        // Minimal result (only required)
        const minResult: AnalysisResult = {
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
          interpretation: 'Test'
        }
        const minValidation = validateResultSchema(minResult, 't-test')
        expect(minValidation.score).toBe(70) // 100% required, 0% recommended

        // Complete result
        const fullResult: AnalysisResult = {
          method: 't-test',
          statistic: 2.5,
          pValue: 0.05,
          interpretation: 'Test',
          effectSize: 0.5,
          df: 98,
          groupStats: [{ mean: 50, std: 10, n: 50 }],
          confidence: { lower: 0.1, upper: 0.9 }
        }
        const fullValidation = validateResultSchema(fullResult, 't-test')
        expect(fullValidation.score).toBe(100)
      })
    })

    describe('Regression category', () => {
      it('should require rSquared in additional', () => {
        const result: AnalysisResult = {
          method: 'Linear Regression',
          statistic: 15.3,
          pValue: 0.001,
          interpretation: 'Model is significant'
          // missing additional.rSquared
        }

        const validation = validateResultSchema(result, 'regression')

        expect(validation.valid).toBe(false)
        expect(validation.missing).toContain('additional.rSquared')
      })

      it('should pass with rSquared present', () => {
        const result: AnalysisResult = {
          method: 'Linear Regression',
          statistic: 15.3,
          pValue: 0.001,
          interpretation: 'Model is significant',
          additional: {
            rSquared: 0.75
          }
        }

        const validation = validateResultSchema(result, 'regression')

        expect(validation.valid).toBe(true)
        expect(validation.category).toBe('regression')
      })

      it('should recommend rmse, intercept, coefficients', () => {
        const result: AnalysisResult = {
          method: 'Linear Regression',
          statistic: 15.3,
          pValue: 0.001,
          interpretation: 'Model is significant',
          additional: { rSquared: 0.75 }
        }

        const validation = validateResultSchema(result, 'regression')

        expect(validation.missingRecommended).toContain('additional.rmse')
        expect(validation.missingRecommended).toContain('additional.intercept')
      })
    })

    describe('Dimension Reduction category (PCA, Factor)', () => {
      it('should require explainedVarianceRatio', () => {
        const result: AnalysisResult = {
          method: 'PCA',
          statistic: 0,
          pValue: 1,
          interpretation: 'PCA completed'
          // missing additional.explainedVarianceRatio
        }

        const validation = validateResultSchema(result, 'pca')

        expect(validation.valid).toBe(false)
        expect(validation.missing).toContain('additional.explainedVarianceRatio')
      })

      it('should pass with explainedVarianceRatio', () => {
        const result: AnalysisResult = {
          method: 'PCA',
          statistic: 0,
          pValue: 1,
          interpretation: 'PCA completed',
          additional: {
            explainedVarianceRatio: [0.4, 0.3, 0.2, 0.1]
          }
        }

        const validation = validateResultSchema(result, 'pca')

        expect(validation.valid).toBe(true)
      })
    })

    describe('Reliability category', () => {
      it('should require alpha in additional', () => {
        const result: AnalysisResult = {
          method: "Cronbach's Alpha",
          statistic: 0.85,
          pValue: 0,
          interpretation: 'Good reliability'
          // missing additional.alpha
        }

        const validation = validateResultSchema(result, 'reliability')

        expect(validation.valid).toBe(false)
        expect(validation.missing).toContain('additional.alpha')
      })
    })

    describe('Power Analysis category', () => {
      it('should require power in additional', () => {
        const result: AnalysisResult = {
          method: 'Power Analysis',
          statistic: 0,
          pValue: 1,
          interpretation: 'Power analysis completed'
          // missing additional.power
        }

        const validation = validateResultSchema(result, 'power-analysis')

        expect(validation.valid).toBe(false)
        expect(validation.missing).toContain('additional.power')
      })
    })
  })

  describe('validateBatch', () => {
    it('should validate multiple results at once', () => {
      const results = [
        {
          methodId: 't-test',
          result: {
            method: 't-test',
            statistic: 2.5,
            pValue: 0.05,
            interpretation: 'Significant'
          } as AnalysisResult
        },
        {
          methodId: 'regression',
          result: {
            method: 'regression',
            statistic: 15.3,
            pValue: 0.001,
            interpretation: 'Model fit'
            // missing rSquared
          } as AnalysisResult
        }
      ]

      const batch = validateBatch(results)

      expect(batch.allValid).toBe(false)
      expect(batch.failedMethods).toContain('regression')
      expect(batch.failedMethods).not.toContain('t-test')
    })

    it('should return allValid true when all pass', () => {
      const results = [
        {
          methodId: 't-test',
          result: {
            method: 't-test',
            statistic: 2.5,
            pValue: 0.05,
            interpretation: 'Significant'
          } as AnalysisResult
        },
        {
          methodId: 'chi-square',
          result: {
            method: 'chi-square',
            statistic: 10.5,
            pValue: 0.01,
            interpretation: 'Significant association'
          } as AnalysisResult
        }
      ]

      const batch = validateBatch(results)

      expect(batch.allValid).toBe(true)
      expect(batch.failedMethods).toHaveLength(0)
    })
  })

  describe('REQUIRED_FIELDS configuration', () => {
    it('should have required fields for all categories', () => {
      const categories: StatisticsCategory[] = [
        'comparison', 'regression', 'correlation',
        'dimensionReduction', 'goodnessOfFit',
        'reliability', 'powerAnalysis', 'descriptive'
      ]

      categories.forEach(category => {
        expect(REQUIRED_FIELDS[category]).toBeDefined()
        expect(REQUIRED_FIELDS[category].length).toBeGreaterThan(0)
      })
    })

    it('should have recommended fields for all categories', () => {
      const categories: StatisticsCategory[] = [
        'comparison', 'regression', 'correlation',
        'dimensionReduction', 'goodnessOfFit',
        'reliability', 'powerAnalysis', 'descriptive'
      ]

      categories.forEach(category => {
        expect(RECOMMENDED_FIELDS[category]).toBeDefined()
      })
    })
  })

  describe('Suggestions generation', () => {
    it('should suggest fixing missing required fields', () => {
      const result: AnalysisResult = {
        method: 'regression',
        statistic: 15.3,
        pValue: 0.001,
        interpretation: 'Test'
        // missing rSquared
      }

      const validation = validateResultSchema(result, 'regression')

      expect(validation.suggestions.length).toBeGreaterThan(0)
      expect(validation.suggestions[0]).toContain('rSquared')
    })

    it('should suggest adding recommended fields when score < 100', () => {
      const result: AnalysisResult = {
        method: 't-test',
        statistic: 2.5,
        pValue: 0.05,
        interpretation: 'Significant'
        // all required present, but no recommended
      }

      const validation = validateResultSchema(result, 't-test')

      expect(validation.valid).toBe(true)
      expect(validation.score).toBeLessThan(100)
      // Should have suggestion about recommended fields
      const hasRecommendedSuggestion = validation.suggestions.some(
        s => s.includes('effectSize') || s.includes('df')
      )
      expect(hasRecommendedSuggestion).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle null/undefined gracefully', () => {
      const result = {
        method: 't-test',
        statistic: null,
        pValue: undefined,
        interpretation: ''
      } as unknown as AnalysisResult

      // Should not throw
      expect(() => validateResultSchema(result, 't-test')).not.toThrow()

      const validation = validateResultSchema(result, 't-test')
      expect(validation.valid).toBe(false)
    })

    it('should normalize method IDs with spaces', () => {
      expect(getCategoryForMethod('t test')).toBe('comparison')
      expect(getCategoryForMethod('chi square')).toBe('goodnessOfFit')
    })

    it('should handle case insensitive method IDs', () => {
      expect(getCategoryForMethod('T-TEST')).toBe('comparison')
      expect(getCategoryForMethod('ANOVA')).toBe('comparison')
      expect(getCategoryForMethod('Regression')).toBe('regression')
    })
  })
})

describe('Integration: Executor Result Validation', () => {
  describe('RegressionExecutor results', () => {
    it('should validate simple linear regression result', () => {
      // Simulating result from RegressionExecutor.executeSimpleLinear
      const result: AnalysisResult = {
        method: 'Linear Regression',
        statistic: 0.9848,
        pValue: 0.0001,
        interpretation: 'R² = 0.9848, significant',
        effectSize: { value: 0.9848, type: 'R-squared', interpretation: 'Large' },
        coefficients: [
          { name: 'Intercept', value: 0.5, stdError: 0.1, tValue: 5, pvalue: 0.001 },
          { name: 'Slope', value: 0.985, stdError: 0.02, tValue: 49, pvalue: 0.0001 }
        ],
        additional: {
          rSquared: 0.9848,
          adjustedRSquared: 0.9848,
          rmse: 2.5,
          intercept: 0.5
        }
      }

      const validation = validateResultSchema(result, 'simple-regression')

      expect(validation.valid).toBe(true)
      expect(validation.score).toBeGreaterThanOrEqual(90) // Most required + recommended
      expect(validation.category).toBe('regression')
    })
  })
})
