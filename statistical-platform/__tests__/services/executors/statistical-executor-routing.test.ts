/**
 * StatisticalExecutor Routing Tests
 *
 * Purpose: Verify that StatisticalExecutor correctly routes methods to appropriate executors
 * This tests the fix for the correlation routing bug (was falling to descriptive stats)
 *
 * Created: 2025-11-27
 * Related fix: Smart Flow - Pearson correlation was showing descriptive stats result
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock Pyodide for unit testing
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    isReady: true,
    initialize: jest.fn().mockResolvedValue(undefined),
    // Correlation methods
    correlationTest: jest.fn().mockResolvedValue({ correlation: 0.85, pValue: 0.001 }),
    correlation: jest.fn().mockResolvedValue({
      pearson: { r: 0.85, pValue: 0.001 },
      spearman: { r: 0.82, pValue: 0.002 },
      kendall: { tau: 0.72, pValue: 0.005 }
    }),
    partialCorrelationWorker: jest.fn().mockResolvedValue({ correlation: 0.65, pValue: 0.01, df: 7 }),
    // T-test methods
    oneSampleTTest: jest.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, df: 29, confidenceInterval: { lower: 1.2, upper: 3.8 } }),
    independentTTest: jest.fn().mockResolvedValue({ statistic: 2.8, pValue: 0.008, df: 58, confidenceInterval: { lower: 0.5, upper: 2.1 }, cohensD: 0.73 }),
    pairedTTest: jest.fn().mockResolvedValue({ statistic: 3.2, pValue: 0.003, df: 29, confidenceInterval: { lower: 0.8, upper: 2.4 } }),
    welchTTest: jest.fn().mockResolvedValue({ statistic: 2.6, pValue: 0.012, df: 45.3, confidenceInterval: { lower: 0.4, upper: 2.0 } }),
    // ANOVA methods
    oneWayAnova: jest.fn().mockResolvedValue({ fStatistic: 4.5, pValue: 0.02, df: [2, 27], dfBetween: 2, dfWithin: 27 }),
    tukeyHSD: jest.fn().mockResolvedValue([]),
    // Nonparametric methods
    mannWhitneyU: jest.fn().mockResolvedValue({ statistic: 45.0, pvalue: 0.023 }),
    kruskalWallis: jest.fn().mockResolvedValue({ statistic: 8.5, pvalue: 0.014, df: 2 }),
    wilcoxon: jest.fn().mockResolvedValue({ statistic: 12.0, pvalue: 0.034 }),
    // Chi-square methods
    chiSquareTest: jest.fn().mockResolvedValue({ statistic: 12.5, pValue: 0.002, df: 4, expectedFreq: [], residuals: [] }),
    // Regression methods
    simpleLinearRegression: jest.fn().mockResolvedValue({ slope: 1.5, intercept: 2.0, rSquared: 0.85, pValue: 0.001, residuals: [], predictions: [] }),
    multipleRegression: jest.fn().mockResolvedValue({ coefficients: [1.2, 0.8], intercept: 1.5, rSquared: 0.92, pValue: 0.0001, residuals: [], predictions: [] }),
    // Descriptive methods
    calculateDescriptiveStats: jest.fn().mockResolvedValue({ mean: 15, std: 5, min: 5, max: 25, median: 15, n: 30 }),
    calculateFrequency: jest.fn().mockResolvedValue({ counts: { 'A': 10, 'B': 15, 'C': 5 }, percentages: { 'A': 33.3, 'B': 50, 'C': 16.7 } }),
  }
}))

// Import after mock
import { StatisticalExecutor } from '@/lib/services/statistical-executor'
import type { StatisticalMethod } from '@/types/smart-flow'

// Helper to create minimal StatisticalMethod for testing
const createMethod = (id: string, name: string, category: StatisticalMethod['category']): StatisticalMethod => ({
  id,
  name,
  description: `Test ${name}`,
  category,
  requirements: { minSampleSize: 3, variableTypes: ['numeric'] }
})

describe('StatisticalExecutor Routing', () => {
  let executor: StatisticalExecutor

  // Test data
  const mockData = [
    { x: 1, y: 2, group: 'A', score: 10 },
    { x: 2, y: 4, group: 'A', score: 12 },
    { x: 3, y: 5, group: 'A', score: 15 },
    { x: 4, y: 8, group: 'B', score: 20 },
    { x: 5, y: 10, group: 'B', score: 22 },
    { x: 6, y: 12, group: 'B', score: 25 },
    { x: 7, y: 14, group: 'C', score: 30 },
    { x: 8, y: 16, group: 'C', score: 32 },
    { x: 9, y: 18, group: 'C', score: 35 },
    { x: 10, y: 20, group: 'C', score: 40 },
  ]

  beforeEach(() => {
    executor = StatisticalExecutor.getInstance()
  })

  // ============================================
  // Category: correlation (THE BUG FIX TEST)
  // ============================================
  describe('Category: correlation', () => {
    it('should route "pearson-correlation" to CorrelationExecutor', async () => {
      const result = await executor.executeMethod(
        createMethod('pearson-correlation', 'Pearson', 'correlation'),
        mockData,
        { dependentVar: 'x', independentVar: 'y' }
      )

      expect(result).toBeDefined()
      // Correlation methods return methodName with their specific type
      expect(result.metadata.method).toBeDefined()
      expect(result.metadata.method).not.toContain('기술통계') // NOT descriptive!
    })

    it('should route "spearman-correlation" to CorrelationExecutor', async () => {
      const result = await executor.executeMethod(
        createMethod('spearman-correlation', 'Spearman', 'correlation'),
        mockData,
        { dependentVar: 'x', independentVar: 'y' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })

    it('should route "kendall-correlation" to CorrelationExecutor', async () => {
      const result = await executor.executeMethod(
        createMethod('kendall-correlation', 'Kendall', 'correlation'),
        mockData,
        { dependentVar: 'x', independentVar: 'y' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })

    it('should route "partial-correlation" to CorrelationExecutor', async () => {
      const result = await executor.executeMethod(
        createMethod('partial-correlation', 'Partial', 'correlation'),
        mockData,
        { dependentVar: 'x', independentVar: 'y' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Category: t-test
  // ============================================
  describe('Category: t-test', () => {
    it('should route "independent-t-test" correctly', async () => {
      const twoGroupData = mockData.filter(d => d.group === 'A' || d.group === 'B')

      const result = await executor.executeMethod(
        createMethod('independent-t-test', 'Independent t-test', 't-test'),
        twoGroupData,
        { groupVar: 'group', dependentVar: 'score' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })

    it('should route "paired-t-test" correctly', async () => {
      const result = await executor.executeMethod(
        createMethod('paired-t-test', 'Paired t-test', 't-test'),
        mockData,
        { variables: ['x', 'y'] }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Category: anova
  // ============================================
  describe('Category: anova', () => {
    it('should route "one-way-anova" correctly', async () => {
      const result = await executor.executeMethod(
        createMethod('one-way-anova', 'One-way ANOVA', 'anova'),
        mockData,
        { groupVar: 'group', dependentVar: 'score' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Category: nonparametric
  // ============================================
  describe('Category: nonparametric', () => {
    it('should route "mann-whitney-u" correctly', async () => {
      const twoGroupData = mockData.filter(d => d.group === 'A' || d.group === 'B')

      const result = await executor.executeMethod(
        createMethod('mann-whitney-u', 'Mann-Whitney U', 'nonparametric'),
        twoGroupData,
        { groupVar: 'group', dependentVar: 'score' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })

    it('should route "kruskal-wallis" correctly', async () => {
      const result = await executor.executeMethod(
        createMethod('kruskal-wallis', 'Kruskal-Wallis', 'nonparametric'),
        mockData,
        { groupVar: 'group', dependentVar: 'score' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Category: regression
  // ============================================
  describe('Category: regression', () => {
    it('should route "simple-regression" correctly', async () => {
      const result = await executor.executeMethod(
        createMethod('simple-regression', 'Simple Regression', 'regression'),
        mockData,
        { dependentVar: 'y', independentVar: 'x' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })

    it('should route "multiple-regression" correctly', async () => {
      const result = await executor.executeMethod(
        createMethod('multiple-regression', 'Multiple Regression', 'regression'),
        mockData,
        { dependentVar: 'score', independentVar: ['x', 'y'] }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Category: descriptive
  // ============================================
  describe('Category: descriptive', () => {
    it('should route "descriptive-statistics" correctly', async () => {
      const result = await executor.executeMethod(
        createMethod('descriptive-statistics', 'Descriptive Statistics', 'descriptive'),
        mockData,
        { variables: ['x', 'y', 'score'] }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Category: chi-square
  // ============================================
  describe('Category: chi-square', () => {
    it('should route "chi-square-test" correctly', async () => {
      const categoricalData = [
        { row: 'A', col: 'X' },
        { row: 'A', col: 'Y' },
        { row: 'A', col: 'X' },
        { row: 'B', col: 'Y' },
        { row: 'B', col: 'Y' },
        { row: 'B', col: 'X' },
      ]

      const result = await executor.executeMethod(
        createMethod('chi-square-test', 'Chi-square', 'chi-square'),
        categoricalData,
        { groupVar: 'row', dependentVar: 'col' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.method).toBeDefined()
    })
  })

  // ============================================
  // Unsupported category handling
  // ============================================
  describe('Unsupported Category Handling', () => {
    it('should throw error for unknown category', async () => {
      // Using 'as any' to bypass TypeScript for testing invalid category
      const invalidMethod = {
        id: 'unknown-method',
        name: 'Unknown',
        description: 'Test',
        category: 'unknown-category',
        requirements: { minSampleSize: 3, variableTypes: ['numeric'] }
      } as unknown as StatisticalMethod

      await expect(
        executor.executeMethod(invalidMethod, mockData, {})
      ).rejects.toThrow()
    })
  })

  // ============================================
  // Variable Mapping Compatibility
  // ============================================
  describe('Variable Mapping Compatibility', () => {
    it('should accept dependentVar format', async () => {
      const result = await executor.executeMethod(
        createMethod('pearson-correlation', 'Pearson', 'correlation'),
        mockData,
        { dependentVar: 'x', independentVar: 'y' }
      )

      expect(result).toBeDefined()
    })

    it('should accept dependent format (alias)', async () => {
      const result = await executor.executeMethod(
        createMethod('pearson-correlation', 'Pearson', 'correlation'),
        mockData,
        { dependent: 'x', independent: 'y' }
      )

      expect(result).toBeDefined()
    })

    it('should accept variables array format', async () => {
      const result = await executor.executeMethod(
        createMethod('pearson-correlation', 'Pearson', 'correlation'),
        mockData,
        { variables: ['x', 'y'] }
      )

      expect(result).toBeDefined()
    })
  })
})
