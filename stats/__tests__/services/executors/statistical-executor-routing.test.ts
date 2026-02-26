/**
 * StatisticalExecutor Routing Tests
 *
 * Purpose: Verify that StatisticalExecutor correctly routes methods to appropriate executors
 * This tests the fix for the correlation routing bug (was falling to descriptive stats)
 *
 * Created: 2025-11-27
 * Related fix: Smart Flow - Pearson correlation was showing descriptive stats result
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { vi } from 'vitest'
// Mock Pyodide for unit testing
// Method names must match actual pyodideStats methods in lib/services/pyodide-statistics.ts
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    isReady: true,
    initialize: vi.fn().mockResolvedValue(undefined),
    // Correlation methods (actual names from pyodide-statistics.ts)
    correlationTest: vi.fn().mockResolvedValue({ correlation: 0.85, pValue: 0.001 }),
    correlation: vi.fn().mockResolvedValue({
      pearson: { r: 0.85, pValue: 0.001 },
      spearman: { r: 0.82, pValue: 0.002 },
      kendall: { tau: 0.72, pValue: 0.005 }
    }),
    partialCorrelationWorker: vi.fn().mockResolvedValue({ correlation: 0.65, pValue: 0.01, df: 7 }),
    // T-test methods (actual names)
    tTest: vi.fn().mockResolvedValue({ statistic: 2.8, pvalue: 0.008, df: 58, confidenceInterval: { lower: 0.5, upper: 2.1 } }),
    oneSampleTTest: vi.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, df: 29, confidenceInterval: { lower: 1.2, upper: 3.8 } }),
    tTestTwoSample: vi.fn().mockResolvedValue({ statistic: 2.8, pvalue: 0.008, df: 58 }),
    tTestPaired: vi.fn().mockResolvedValue({ statistic: 3.2, pvalue: 0.003, df: 29 }),
    tTestOneSample: vi.fn().mockResolvedValue({ statistic: 2.5, pvalue: 0.02, df: 29 }),
    // ANOVA methods (actual names)
    anova: vi.fn().mockResolvedValue({ fStatistic: 4.5, pValue: 0.02, df: [2, 27], etaSquared: 0.25 }),
    oneWayANOVA: vi.fn().mockResolvedValue({ fStatistic: 4.5, pValue: 0.02, df: [2, 27] }),
    gamesHowellTest: vi.fn().mockResolvedValue({ comparisons: [], significant_count: 0 }),
    tukeyHSD: vi.fn().mockResolvedValue([]),
    performBonferroni: vi.fn().mockResolvedValue({
      comparisons: [],
      num_comparisons: 0,
      original_alpha: 0.05,
      adjusted_alpha: 0.05,
      significant_count: 0
    }),
    // Nonparametric methods (actual names)
    mannWhitneyU: vi.fn().mockResolvedValue({ statistic: 45.0, pvalue: 0.023 }),
    kruskalWallis: vi.fn().mockResolvedValue({ statistic: 8.5, pvalue: 0.014, df: 2 }),
    wilcoxon: vi.fn().mockResolvedValue({ statistic: 12.0, pvalue: 0.034 }),
    friedman: vi.fn().mockResolvedValue({ statistic: 10.0, pvalue: 0.02 }),
    signTestWorker: vi.fn().mockResolvedValue({ statistic: 5, pValue: 0.05, nPositive: 8, nNegative: 2 }),
    mcnemarTestWorker: vi.fn().mockResolvedValue({ statistic: 4.5, pValue: 0.03 }),
    cochranQTestWorker: vi.fn().mockResolvedValue({ qStatistic: 8.0, pValue: 0.02, df: 2 }),
    binomialTestWorker: vi.fn().mockResolvedValue({ pValue: 0.05, successCount: 7, totalCount: 10 }),
    runsTestWorker: vi.fn().mockResolvedValue({ zStatistic: 1.5, pValue: 0.13, nRuns: 5, expectedRuns: 6 }),
    ksTestOneSample: vi.fn().mockResolvedValue({ statistic: 0.15, pValue: 0.2, n: 20, significant: false, interpretation: 'ok' }),
    ksTestTwoSample: vi.fn().mockResolvedValue({ statistic: 0.2, pValue: 0.1, n1: 20, n2: 25, significant: false }),
    moodMedianTestWorker: vi.fn().mockResolvedValue({ statistic: 3.5, pValue: 0.06, grandMedian: 15 }),
    oneSampleProportionTest: vi.fn().mockResolvedValue({ zStatistic: 1.8, pValueExact: 0.07, sampleProportion: 0.6 }),
    // Chi-square methods (actual name)
    chiSquare: vi.fn().mockResolvedValue({ statistic: 12.5, pvalue: 0.002, df: 4, cramersV: 0.3 }),
    chiSquareTest: vi.fn().mockResolvedValue({ statistic: 12.5, pValue: 0.002, df: 4 }),
    chiSquareIndependenceTest: vi.fn().mockResolvedValue({ statistic: 12.5, pValue: 0.002, df: 4, cramersV: 0.3 }),
    // Regression methods (actual name)
    regression: vi.fn().mockResolvedValue({ rSquared: 0.85, pvalue: 0.001, fStatistic: 45.2, df: 28, predictions: [] }),
    simpleLinearRegression: vi.fn().mockResolvedValue({ slope: 1.5, intercept: 2.0, rSquared: 0.85, pValue: 0.001 }),
    // Descriptive methods (actual name)
    descriptiveStats: vi.fn().mockResolvedValue({ mean: 15, std: 5, min: 5, max: 25, median: 15, n: 30 }),
    calculateDescriptiveStatistics: vi.fn().mockResolvedValue({ mean: 15, std: 5, min: 5, max: 25 }),
    // Multivariate methods
    pca: vi.fn().mockResolvedValue({ explainedVariance: [0.6, 0.3], totalExplainedVariance: 0.9 }),
    pcaAnalysis: vi.fn().mockResolvedValue({
      components: [],
      totalVariance: 1,
      selectedComponents: 2,
      rotationMatrix: [[1, 0], [0, 1]],
      transformedData: [],
      variableContributions: {},
      qualityMetrics: {
        kmo: null,
        bartlett: { statistic: null, pValue: null, significant: null }
      },
      screeData: [
        { component: 1, eigenvalue: 1.5, varianceExplained: 60 },
        { component: 2, eigenvalue: 1.0, varianceExplained: 30 }
      ],
      interpretation: 'ok'
    }),
    factorAnalysis: vi.fn().mockResolvedValue({
      loadings: [[0.8, 0.2], [0.1, 0.9]],
      communalities: [0.68, 0.82],
      explainedVariance: [1.4, 0.9],
      explainedVarianceRatio: [0.5, 0.3],
      totalVarianceExplained: 0.8,
      nFactors: 2,
      eigenvalues: [1.4, 0.9]
    }),
    clusterAnalysis: vi.fn().mockResolvedValue({
      nClusters: 2,
      clusterAssignments: [0, 1, 0, 1],
      centroids: [[1, 2], [3, 4]],
      clusters: [0, 1, 0, 1],
      centers: [[1, 2], [3, 4]],
      silhouetteScore: 0.5,
      inertia: 1.2,
      clusterSizes: [2, 2]
    }),
    discriminantAnalysis: vi.fn().mockResolvedValue({ accuracy: 0.85, functions: [{ varianceExplained: 0.9 }], totalVariance: 0.95 }),
    // Time series methods
    timeSeriesAnalysis: vi.fn().mockResolvedValue({ trend: [1, 2, 3], seasonal: [0.1, 0.2, 0.1] }),
    // Reliability methods
    cronbachAlpha: vi.fn().mockResolvedValue({ alpha: 0.85, itemTotalCorrelations: [0.7, 0.8, 0.75] }),
    // Survival methods
    kaplanMeierSurvival: vi.fn().mockResolvedValue({ times: [1, 2, 3], survivalFunction: [1, 0.9, 0.8], medianSurvival: 5 }),
    coxRegression: vi.fn().mockResolvedValue({ hazardRatios: [1.5], pValues: [0.02], confidenceIntervals: [[1.1, 2.0]], concordance: 0.75 }),
    // Power analysis
    powerAnalysis: vi.fn().mockResolvedValue({ requiredSampleSize: 64, achievedPower: 0.8, effectSize: 0.5, alpha: 0.05 }),
  }
}))

// Import after mock
import { StatisticalExecutor } from '@/lib/services/statistical-executor'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
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
    vi.clearAllMocks()
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

    it('should normalize games-howell postHoc fields for direct games-howell method', async () => {
      const mockedStats = vi.mocked(pyodideStats)
      mockedStats.gamesHowellTest.mockResolvedValueOnce({
        comparisons: [
          { group1: 'A', group2: 'B', meanDiff: 1.2, pValue: 0.01, significant: true }
        ],
        alpha: 0.05,
        significant_count: 1
      })

      const result = await executor.executeMethod(
        createMethod('games-howell', 'Games-Howell', 'anova'),
        mockData,
        { groupVar: 'group', dependentVar: 'score' }
      )

      const postHoc = result.additionalInfo.postHoc as unknown as Array<Record<string, unknown>>
      expect(Array.isArray(postHoc)).toBe(true)
      expect(postHoc).toHaveLength(1)
      expect(postHoc[0].pvalue).toBe(0.01)
      expect(postHoc[0]).not.toHaveProperty('pValue')
    })

    it('should fallback to bonferroni when games-howell and tukey fail', async () => {
      const mockedStats = vi.mocked(pyodideStats)
      mockedStats.gamesHowellTest.mockRejectedValueOnce(new Error('gh failed'))
      mockedStats.tukeyHSD.mockRejectedValueOnce(new Error('tukey failed'))
      mockedStats.performBonferroni.mockResolvedValueOnce({
        comparisons: [
          {
            group1: 'A',
            group2: 'B',
            mean_diff: 1.1,
            tStatistic: 2.7,
            pValue: 0.01,
            adjusted_p: 0.03,
            significant: true
          }
        ],
        num_comparisons: 3,
        original_alpha: 0.05,
        adjusted_alpha: 0.0167,
        significant_count: 1
      })

      const result = await executor.executeMethod(
        createMethod('one-way-anova', 'One-way ANOVA', 'anova'),
        mockData,
        { groupVar: 'group', dependentVar: 'score' }
      )

      expect(mockedStats.performBonferroni).toHaveBeenCalled()
      const postHoc = result.additionalInfo.postHoc as unknown as Array<Record<string, unknown>>
      expect(postHoc).toHaveLength(1)
      expect(postHoc[0].pvalue).toBe(0.01)
      expect(postHoc[0].pvalueAdjusted).toBe(0.03)
      expect(postHoc[0].meanDiff).toBe(1.1)
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

    it('should preserve explicit successCount=0 for proportion-test', async () => {
      const mockedStats = vi.mocked(pyodideStats)
      const binaryData = [
        { outcome: 'No' },
        { outcome: 'No' },
        { outcome: 'No' },
        { outcome: 'No' }
      ]

      await executor.executeMethod(
        createMethod('proportion-test', 'Proportion Test', 'nonparametric'),
        binaryData,
        { dependentVar: 'outcome', successCount: 0, nullProportion: '0.3' }
      )

      expect(mockedStats.oneSampleProportionTest).toHaveBeenCalledWith(0, 4, 0.3)
    })

    it('should auto-detect positive label for proportion-test and expose successLabel', async () => {
      const mockedStats = vi.mocked(pyodideStats)
      const binaryData = [
        { outcome: 'Yes' },
        { outcome: 'No' },
        { outcome: 'Yes' },
        { outcome: 'Yes' }
      ]

      const result = await executor.executeMethod(
        createMethod('proportion-test', 'Proportion Test', 'nonparametric'),
        binaryData,
        { dependentVar: 'outcome' }
      )

      expect(mockedStats.oneSampleProportionTest).toHaveBeenCalledWith(3, 4, 0.5)
      expect((result.rawResults as { successLabel?: string }).successLabel).toBe('Yes')
    })

    it('should build 2x2 contingency table automatically for mcnemar', async () => {
      const mockedStats = vi.mocked(pyodideStats)
      const pairedBinaryData = [
        { before: 0, after: 0 },
        { before: 0, after: 1 },
        { before: 1, after: 0 },
        { before: 1, after: 1 }
      ]

      await executor.executeMethod(
        createMethod('mcnemar', 'McNemar', 'nonparametric'),
        pairedBinaryData,
        { independentVar: 'before', dependentVar: 'after' }
      )

      expect(mockedStats.mcnemarTestWorker).toHaveBeenCalledWith([[1, 1], [1, 1]])
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
  // Category: pca / multivariate
  // ============================================
  describe('Category: pca', () => {
    it('should route "pca" through pcaAnalysis (not legacy pca)', async () => {
      const mockedStats = vi.mocked(pyodideStats)

      const result = await executor.executeMethod(
        createMethod('pca', 'PCA', 'pca'),
        mockData,
        { independentVar: ['x', 'y'] }
      )

      expect(result).toBeDefined()
      expect(mockedStats.pcaAnalysis).toHaveBeenCalled()
      expect(mockedStats.pca).not.toHaveBeenCalled()
      expect(result.mainResults.statistic).toBeCloseTo(0.6, 8)
      expect(result.mainResults.interpretation).toContain('60.0%')
      expect(result.additionalInfo.effectSize?.value).toBeCloseTo(0.9, 8)
      expect(result.additionalInfo.explainedVarianceRatio).toEqual([0.6, 0.3])
    })

    it('should expose standardized factor-analysis additional fields', async () => {
      const result = await executor.executeMethod(
        createMethod('factor-analysis', 'Factor Analysis', 'advanced'),
        mockData,
        { independentVar: ['x', 'y'] }
      )

      expect(result).toBeDefined()
      expect(result.mainResults.statistic).toBeCloseTo(0.5, 8)
      expect(result.additionalInfo.explainedVarianceRatio).toEqual([0.5, 0.3])
      expect(result.additionalInfo.eigenvalues).toEqual([1.4, 0.9])
      expect(result.additionalInfo.loadings).toEqual([[0.8, 0.2], [0.1, 0.9]])
      expect(result.additionalInfo.communalities).toEqual([0.68, 0.82])
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
