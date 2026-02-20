/**
 * Phase 0.5: Executor Data Extraction Tests
 *
 * Purpose: Verify that executors correctly extract data from raw datasets
 * using variableMapping (groupVar, dependentVar, independentVar, variables)
 *
 * This fills the gap between:
 * - VariableMapping type tests (variable-mapping.test.ts)
 * - Interpretation engine tests (engine-review.test.ts)
 *
 * Created: 2025-11-26
 * Related fix: Mann-Whitney U group1 undefined error
 */

import { describe, it, beforeAll } from 'vitest'

import { vi } from 'vitest'
// Mock Pyodide for unit testing (avoid actual Python execution)
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: vi.fn().mockResolvedValue(undefined),
    mannWhitneyU: vi.fn().mockResolvedValue({ statistic: 45.0, pvalue: 0.023 }),
    wilcoxon: vi.fn().mockResolvedValue({ statistic: 12.0, pvalue: 0.034 }),
    kruskalWallis: vi.fn().mockResolvedValue({ statistic: 8.5, pvalue: 0.014, df: 2 }),
    oneSampleTTest: vi.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, df: 29, confidenceInterval: { lower: 1.2, upper: 3.8 } }),
    independentTTest: vi.fn().mockResolvedValue({ statistic: 2.8, pValue: 0.008, df: 58, confidenceInterval: { lower: 0.5, upper: 2.1 } }),
    pairedTTest: vi.fn().mockResolvedValue({ statistic: 3.2, pValue: 0.003, df: 29, confidenceInterval: { lower: 0.8, upper: 2.4 } }),
    welchTTest: vi.fn().mockResolvedValue({ statistic: 2.6, pValue: 0.012, df: 45.3, confidenceInterval: { lower: 0.4, upper: 2.0 } }),
    simpleLinearRegression: vi.fn().mockResolvedValue({ slope: 1.5, intercept: 2.0, rSquared: 0.85, pValue: 0.001, residuals: [], predictions: [] }),
    multipleRegression: vi.fn().mockResolvedValue({ coefficients: [1.2, 0.8], intercept: 1.5, rSquared: 0.92, pValue: 0.0001, residuals: [], predictions: [] }),
    calculateDescriptiveStats: vi.fn().mockResolvedValue({ mean: 15, std: 5, min: 5, max: 25, median: 15, n: 30 }),
  }
}))

// Import executors after mock
import { NonparametricExecutor } from '@/lib/services/executors/nonparametric-executor'
import { TTestExecutor } from '@/lib/services/executors/t-test-executor'
import { RegressionExecutor } from '@/lib/services/executors/regression-executor'
import { AnovaExecutor } from '@/lib/services/executors/anova-executor'

describe('Phase 0.5: Executor Data Extraction Tests', () => {
  // Common test data simulating CSV upload
  const mockGroupComparisonData = [
    { id: 1, group: 'Control', score: 45, pre: 40, post: 48 },
    { id: 2, group: 'Control', score: 52, pre: 45, post: 55 },
    { id: 3, group: 'Control', score: 48, pre: 42, post: 50 },
    { id: 4, group: 'Control', score: 51, pre: 44, post: 53 },
    { id: 5, group: 'Control', score: 47, pre: 41, post: 49 },
    { id: 6, group: 'Treatment', score: 58, pre: 43, post: 60 },
    { id: 7, group: 'Treatment', score: 62, pre: 46, post: 65 },
    { id: 8, group: 'Treatment', score: 55, pre: 40, post: 58 },
    { id: 9, group: 'Treatment', score: 60, pre: 45, post: 63 },
    { id: 10, group: 'Treatment', score: 57, pre: 42, post: 59 },
  ]

  const mockThreeGroupData = [
    { id: 1, condition: 'Low', response: 10 },
    { id: 2, condition: 'Low', response: 12 },
    { id: 3, condition: 'Low', response: 11 },
    { id: 4, condition: 'Medium', response: 18 },
    { id: 5, condition: 'Medium', response: 20 },
    { id: 6, condition: 'Medium', response: 19 },
    { id: 7, condition: 'High', response: 28 },
    { id: 8, condition: 'High', response: 30 },
    { id: 9, condition: 'High', response: 29 },
  ]

  const mockRegressionData = [
    { x1: 1, x2: 2, y: 5 },
    { x1: 2, x2: 3, y: 8 },
    { x1: 3, x2: 4, y: 11 },
    { x1: 4, x2: 5, y: 14 },
    { x1: 5, x2: 6, y: 17 },
    { x1: 6, x2: 7, y: 20 },
    { x1: 7, x2: 8, y: 23 },
    { x1: 8, x2: 9, y: 26 },
  ]

  // ============================================
  // NonparametricExecutor Tests
  // ============================================
  describe('NonparametricExecutor', () => {
    let executor: NonparametricExecutor

    beforeAll(() => {
      executor = new NonparametricExecutor()
    })

    describe('Mann-Whitney U Test', () => {
      it('should extract groups using groupVar and dependentVar', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'mann-whitney',
          groupVar: 'group',
          dependentVar: 'score'
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
        // pvalue should be defined and valid (mock returns pvalue key)
        expect(result.mainResults.pvalue).toBeDefined()
        if (typeof result.mainResults.pvalue === 'number' && !isNaN(result.mainResults.pvalue)) {
          expect(result.mainResults.pvalue).toBeLessThanOrEqual(1)
          expect(result.mainResults.pvalue).toBeGreaterThanOrEqual(0)
        }
        expect(result.metadata.method).toContain('Mann-Whitney')
      })

      it('should throw error when groupVar is missing', async () => {
        await expect(
          executor.execute(mockGroupComparisonData, {
            method: 'mann-whitney',
            dependentVar: 'score'
            // groupVar missing
          })
        ).rejects.toThrow()
      })

      it('should throw error when dependentVar is missing', async () => {
        await expect(
          executor.execute(mockGroupComparisonData, {
            method: 'mann-whitney',
            groupVar: 'group'
            // dependentVar missing
          })
        ).rejects.toThrow()
      })

      it('should warn when more than 2 groups found (uses first 2)', async () => {
        // 3 groups: Low, Medium, High
        const result = await executor.execute(mockThreeGroupData, {
          method: 'mann-whitney',
          groupVar: 'condition',
          dependentVar: 'response'
        })

        // Should still work, using first 2 groups alphabetically
        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
      })

      it('should work with legacy group1/group2 format (backward compatible)', async () => {
        const result = await executor.execute([], {
          method: 'mann-whitney',
          group1: [45, 52, 48, 51, 47],
          group2: [58, 62, 55, 60, 57]
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
      })
    })

    describe('Kruskal-Wallis Test', () => {
      it('should extract multiple groups using groupVar and dependentVar', async () => {
        const result = await executor.execute(mockThreeGroupData, {
          method: 'kruskal-wallis',
          groupVar: 'condition',
          dependentVar: 'response'
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
        expect(result.metadata.method).toContain('Kruskal-Wallis')
      })
    })
  })

  // ============================================
  // TTestExecutor Tests
  // ============================================
  describe('TTestExecutor', () => {
    let executor: TTestExecutor

    beforeAll(() => {
      executor = new TTestExecutor()
    })

    describe('Independent t-test', () => {
      it('should extract groups using groupVar and dependentVar', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'independent',
          groupVar: 'group',
          dependentVar: 'score'
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
        // pvalue should be defined
        expect(result.mainResults.pvalue).toBeDefined()
        expect(result.metadata.method).toContain('t-검정')
      })

      it('should work with method alias "independent-t-test"', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'independent-t-test',
          groupVar: 'group',
          dependentVar: 'score'
        })

        expect(result).toBeDefined()
      })

      it('should work with method alias "two-sample-t"', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'two-sample-t',
          groupVar: 'group',
          dependentVar: 'score'
        })

        expect(result).toBeDefined()
      })

      it('should throw error when less than 2 groups', async () => {
        const singleGroupData = mockGroupComparisonData.filter(d => d.group === 'Control')

        await expect(
          executor.execute(singleGroupData, {
            method: 'independent',
            groupVar: 'group',
            dependentVar: 'score'
          })
        ).rejects.toThrow(/2개 그룹/)
      })
    })

    describe('Paired t-test', () => {
      it('should extract paired data using variables array', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'paired',
          variables: ['pre', 'post']
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
        expect(result.metadata.method).toContain('대응표본')
      })

      it('should work with method alias "paired-t-test"', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'paired-t-test',
          variables: ['pre', 'post']
        })

        expect(result).toBeDefined()
      })

      it('should work with legacy before/after format', async () => {
        const result = await executor.execute([], {
          method: 'paired',
          before: [40, 45, 42, 44, 41],
          after: [48, 55, 50, 53, 49]
        })

        expect(result).toBeDefined()
      })

      it('should throw error when variables array is incomplete', async () => {
        await expect(
          executor.execute(mockGroupComparisonData, {
            method: 'paired',
            variables: ['pre'] // Only 1 variable
          })
        ).rejects.toThrow()
      })
    })

    describe("Welch's t-test", () => {
      it('should extract groups using groupVar and dependentVar', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'welch',
          groupVar: 'group',
          dependentVar: 'score'
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
        expect(result.metadata.method).toContain("Welch")
      })
    })

    describe('One-sample t-test', () => {
      it('should extract numeric series using dependentVar', async () => {
        const result = await executor.execute(mockGroupComparisonData, {
          method: 'one-sample',
          dependentVar: 'score',
          populationMean: 50
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined()
      })
    })
  })

  // ============================================
  // RegressionExecutor Tests
  // ============================================
  describe('RegressionExecutor', () => {
    let executor: RegressionExecutor

    beforeAll(() => {
      executor = new RegressionExecutor()
    })

    describe('Simple Linear Regression', () => {
      it('should extract x, y using dependentVar and independentVar', async () => {
        const result = await executor.execute(mockRegressionData, {
          method: 'simple',
          dependentVar: 'y',
          independentVar: 'x1'
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined() // R²
        expect(result.metadata.method).toContain('회귀')
      })

      it('should work with method alias "simple-regression"', async () => {
        const result = await executor.execute(mockRegressionData, {
          method: 'simple-regression',
          dependentVar: 'y',
          independentVar: 'x1'
        })

        expect(result).toBeDefined()
      })

      it('should work with legacy x/y format', async () => {
        const result = await executor.execute([], {
          method: 'simple',
          x: [1, 2, 3, 4, 5],
          y: [5, 8, 11, 14, 17]
        })

        expect(result).toBeDefined()
      })

      it('should throw error when independentVar is missing', async () => {
        await expect(
          executor.execute(mockRegressionData, {
            method: 'simple',
            dependentVar: 'y'
            // independentVar missing
          })
        ).rejects.toThrow()
      })
    })

    describe('Multiple Regression', () => {
      it('should extract X matrix using multiple independentVar', async () => {
        const result = await executor.execute(mockRegressionData, {
          method: 'multiple',
          dependentVar: 'y',
          independentVar: ['x1', 'x2']
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined() // R²
      })

      it('should handle comma-separated independentVar string', async () => {
        const result = await executor.execute(mockRegressionData, {
          method: 'multiple',
          dependentVar: 'y',
          independentVar: 'x1, x2' // String format
        })

        expect(result).toBeDefined()
      })

      it('should work with method alias "multiple-regression"', async () => {
        const result = await executor.execute(mockRegressionData, {
          method: 'multiple-regression',
          dependentVar: 'y',
          independentVar: ['x1', 'x2']
        })

        expect(result).toBeDefined()
      })
    })
  })

  // ============================================
  // AnovaExecutor Tests (already supports groupVar/dependentVar)
  // ============================================
  describe('AnovaExecutor', () => {
    let executor: AnovaExecutor

    beforeAll(() => {
      executor = new AnovaExecutor()
    })

    describe('One-way ANOVA', () => {
      it('should extract groups using groupVar and dependentVar', async () => {
        // AnovaExecutor already has this functionality via prepareGroups
        // This test verifies the existing implementation works
        const result = await executor.execute(mockThreeGroupData, {
          method: 'one-way',
          groupVar: 'condition',
          dependentVar: 'response'
        })

        expect(result).toBeDefined()
        expect(result.mainResults.statistic).toBeDefined() // F-statistic
      })
    })
  })

  // ============================================
  // Edge Cases & Error Handling
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty data array', async () => {
      const executor = new NonparametricExecutor()

      await expect(
        executor.execute([], {
          method: 'mann-whitney',
          groupVar: 'group',
          dependentVar: 'score'
        })
      ).rejects.toThrow()
    })

    it('should handle data with missing values', async () => {
      const executor = new NonparametricExecutor()
      const dataWithMissing = [
        { group: 'A', score: 10 },
        { group: 'A', score: null }, // Missing
        { group: 'A', score: 12 },
        { group: 'B', score: 20 },
        { group: 'B', score: undefined }, // Missing
        { group: 'B', score: 22 },
      ]

      // Should filter out missing values and still work
      const result = await executor.execute(dataWithMissing, {
        method: 'mann-whitney',
        groupVar: 'group',
        dependentVar: 'score'
      })

      expect(result).toBeDefined()
    })

    it('should handle non-existent column names', async () => {
      const executor = new TTestExecutor()

      await expect(
        executor.execute(mockGroupComparisonData, {
          method: 'independent',
          groupVar: 'nonexistent_group',
          dependentVar: 'nonexistent_score'
        })
      ).rejects.toThrow()
    })

    it('should handle numeric strings in data', async () => {
      const executor = new NonparametricExecutor()
      const dataWithStrings = [
        { group: 'A', score: '10' }, // String number
        { group: 'A', score: '12' },
        { group: 'B', score: '20' },
        { group: 'B', score: '22' },
      ]

      // Current implementation expects actual numbers
      // This test documents expected behavior
      await expect(
        executor.execute(dataWithStrings, {
          method: 'mann-whitney',
          groupVar: 'group',
          dependentVar: 'score'
        })
      ).rejects.toThrow()
    })
  })

  // ============================================
  // Integration: Smart Flow Variable Mapping
  // ============================================
  describe('Smart Flow Integration', () => {
    it('should match GroupComparisonSelector output format', async () => {
      // GroupComparisonSelector returns: { groupVar: 'group', dependentVar: 'score' }
      const selectorOutput = {
        groupVar: 'group',
        dependentVar: 'score'
      }

      const executor = new NonparametricExecutor()
      const result = await executor.execute(mockGroupComparisonData, {
        method: 'mann-whitney',
        ...selectorOutput
      })

      expect(result).toBeDefined()
    })

    it('should match PairedSelector output format', async () => {
      // PairedSelector returns: { variables: ['pre', 'post'] }
      const selectorOutput = {
        variables: ['pre', 'post']
      }

      const executor = new TTestExecutor()
      const result = await executor.execute(mockGroupComparisonData, {
        method: 'paired',
        ...selectorOutput
      })

      expect(result).toBeDefined()
    })

    it('should match MultipleRegressionSelector output format', async () => {
      // MultipleRegressionSelector returns: { dependentVar: 'y', independentVar: ['x1', 'x2'] }
      const selectorOutput = {
        dependentVar: 'y',
        independentVar: ['x1', 'x2']
      }

      const executor = new RegressionExecutor()
      const result = await executor.execute(mockRegressionData, {
        method: 'multiple',
        ...selectorOutput
      })

      expect(result).toBeDefined()
    })
  })
})
