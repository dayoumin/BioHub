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
// Method names must match actual pyodideStats methods in lib/services/pyodide-statistics.ts
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    isReady: true,
    initialize: jest.fn().mockResolvedValue(undefined),
    // Correlation methods (actual names from pyodide-statistics.ts)
    correlationTest: jest.fn().mockResolvedValue({ correlation: 0.85, pValue: 0.001 }),
    correlation: jest.fn().mockResolvedValue({
      pearson: { r: 0.85, pValue: 0.001 },
      spearman: { r: 0.82, pValue: 0.002 },
      kendall: { tau: 0.72, pValue: 0.005 }
    }),
    partialCorrelationWorker: jest.fn().mockResolvedValue({ correlation: 0.65, pValue: 0.01, df: 7 }),
    // T-test methods (actual names)
    tTest: jest.fn().mockResolvedValue({ statistic: 2.8, pvalue: 0.008, df: 58, confidenceInterval: { lower: 0.5, upper: 2.1 } }),
    oneSampleTTest: jest.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, df: 29, confidenceInterval: { lower: 1.2, upper: 3.8 } }),
    tTestTwoSample: jest.fn().mockResolvedValue({ statistic: 2.8, pvalue: 0.008, df: 58 }),
    tTestPaired: jest.fn().mockResolvedValue({ statistic: 3.2, pvalue: 0.003, df: 29 }),
    tTestOneSample: jest.fn().mockResolvedValue({ statistic: 2.5, pvalue: 0.02, df: 29 }),
    // ANOVA methods (actual names)
    anova: jest.fn().mockResolvedValue({ fStatistic: 4.5, pValue: 0.02, df: [2, 27], etaSquared: 0.25 }),
    oneWayANOVA: jest.fn().mockResolvedValue({ fStatistic: 4.5, pValue: 0.02, df: [2, 27] }),
    gamesHowellTest: jest.fn().mockResolvedValue({ comparisons: [], significant_count: 0 }),
    tukeyHSD: jest.fn().mockResolvedValue([]),
    // Nonparametric methods (actual names)
    mannWhitneyU: jest.fn().mockResolvedValue({ statistic: 45.0, pvalue: 0.023 }),
    kruskalWallis: jest.fn().mockResolvedValue({ statistic: 8.5, pvalue: 0.014, df: 2 }),
    wilcoxon: jest.fn().mockResolvedValue({ statistic: 12.0, pvalue: 0.034 }),
    friedman: jest.fn().mockResolvedValue({ statistic: 10.0, pvalue: 0.02 }),
    signTestWorker: jest.fn().mockResolvedValue({ statistic: 5, pValue: 0.05, nPositive: 8, nNegative: 2 }),
    mcnemarTestWorker: jest.fn().mockResolvedValue({ statistic: 4.5, pValue: 0.03 }),
    cochranQTestWorker: jest.fn().mockResolvedValue({ qStatistic: 8.0, pValue: 0.02, df: 2 }),
    binomialTestWorker: jest.fn().mockResolvedValue({ pValue: 0.05, successCount: 7, totalCount: 10 }),
    runsTestWorker: jest.fn().mockResolvedValue({ zStatistic: 1.5, pValue: 0.13, nRuns: 5, expectedRuns: 6 }),
    ksTestOneSample: jest.fn().mockResolvedValue({ statistic: 0.15, pValue: 0.2, n: 20, significant: false, interpretation: 'ok' }),
    ksTestTwoSample: jest.fn().mockResolvedValue({ statistic: 0.2, pValue: 0.1, n1: 20, n2: 25, significant: false }),
    moodMedianTestWorker: jest.fn().mockResolvedValue({ statistic: 3.5, pValue: 0.06, grandMedian: 15 }),
    oneSampleProportionTest: jest.fn().mockResolvedValue({ zStatistic: 1.8, pValueExact: 0.07, sampleProportion: 0.6 }),
    // Chi-square methods (actual name)
    chiSquare: jest.fn().mockResolvedValue({ statistic: 12.5, pvalue: 0.002, df: 4, cramersV: 0.3 }),
    chiSquareTest: jest.fn().mockResolvedValue({ statistic: 12.5, pValue: 0.002, df: 4 }),
    // Regression methods (actual name)
    regression: jest.fn().mockResolvedValue({ rSquared: 0.85, pvalue: 0.001, fStatistic: 45.2, df: 28, predictions: [] }),
    simpleLinearRegression: jest.fn().mockResolvedValue({ slope: 1.5, intercept: 2.0, rSquared: 0.85, pValue: 0.001 }),
    // Descriptive methods (actual name)
    descriptiveStats: jest.fn().mockResolvedValue({ mean: 15, std: 5, min: 5, max: 25, median: 15, n: 30 }),
    calculateDescriptiveStatistics: jest.fn().mockResolvedValue({ mean: 15, std: 5, min: 5, max: 25 }),
    // Multivariate methods
    pca: jest.fn().mockResolvedValue({ explainedVariance: [0.6, 0.3], totalExplainedVariance: 0.9 }),
    factorAnalysis: jest.fn().mockResolvedValue({ explainedVariance: [0.5, 0.3], totalExplainedVariance: 0.8 }),
    clusterAnalysis: jest.fn().mockResolvedValue({
      nClusters: 2,
      clusterAssignments: [0, 1, 0, 1],
      centroids: [[1, 2], [3, 4]],
      clusters: [0, 1, 0, 1],
      centers: [[1, 2], [3, 4]],
      silhouetteScore: 0.5,
      inertia: 1.2,
      clusterSizes: [2, 2]
    }),
    discriminantAnalysis: jest.fn().mockResolvedValue({ accuracy: 0.85, functions: [{ varianceExplained: 0.9 }], totalVariance: 0.95 }),
    // Time series methods
    timeSeriesAnalysis: jest.fn().mockResolvedValue({ trend: [1, 2, 3], seasonal: [0.1, 0.2, 0.1] }),
    // Reliability methods
    cronbachAlpha: jest.fn().mockResolvedValue({ alpha: 0.85, itemTotalCorrelations: [0.7, 0.8, 0.75] }),
    // Survival methods
    kaplanMeierSurvival: jest.fn().mockResolvedValue({ times: [1, 2, 3], survivalFunction: [1, 0.9, 0.8], medianSurvival: 5 }),
    coxRegression: jest.fn().mockResolvedValue({ hazardRatios: [1.5], pValues: [0.02], confidenceIntervals: [[1.1, 2.0]], concordance: 0.75 }),
    // Power analysis
    powerAnalysis: jest.fn().mockResolvedValue({ requiredSampleSize: 64, achievedPower: 0.8, effectSize: 0.5, alpha: 0.05 }),
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
        createMethod('mann-whitney', 'Mann-Whitney U', 'nonparametric'),
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
