/**
 * Phase 6: Groups API Integration Tests
 *
 * Tests for key statistical methods through Groups API.
 * These tests verify the complete flow: Groups → PyodideCore → Python Workers
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

const mockCallWorkerMethod = jest.fn()
const mockPyodideCore = {
  callWorkerMethod: mockCallWorkerMethod,
  isInitialized: jest.fn().mockReturnValue(true),
} as unknown as PyodideCoreService

describe('Groups API Integration - Descriptive Statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should calculate descriptive statistics', async () => {
    const { descriptiveStats } = await import('@/lib/statistics/calculator-handlers/descriptive')

    mockCallWorkerMethod.mockResolvedValue({
      mean: 50,
      median: 48,
      std: 15,
      min: 20,
      max: 80,
      q1: 35,
      q3: 65,
    })

    const result = await descriptiveStats({
      data: [
        { score: 45 },
        { score: 55 },
        { score: 50 },
      ],
      column: 'score',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.statistics.mean).toBe(50)
  })

  it('should handle frequency analysis', async () => {
    const { frequencyAnalysis } = await import('@/lib/statistics/calculator-handlers/descriptive')

    mockCallWorkerMethod.mockResolvedValue({
      frequencies: {
        A: { count: 5, percentage: 50, cumulative: 50 },
        B: { count: 3, percentage: 30, cumulative: 80 },
        C: { count: 2, percentage: 20, cumulative: 100 },
      },
      totalCount: 10,
    })

    const result = await frequencyAnalysis({
      data: [
        { grade: 'A' },
        { grade: 'B' },
        { grade: 'A' },
      ],
      column: 'grade',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.totalCount).toBe(10)
  })
})

describe('Groups API Integration - Hypothesis Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should perform independent t-test', async () => {
    const { independentTTest } = await import('@/lib/statistics/calculator-handlers/hypothesis-tests')

    mockCallWorkerMethod.mockResolvedValue({
      statistic: 2.5,
      pValue: 0.02,
      degreesOfFreedom: 18,
      mean1: 50,
      mean2: 45,
      reject: true,
    })

    const result = await independentTTest({
      data: [
        { group: 'A', score: 50 },
        { group: 'B', score: 45 },
      ],
      groupColumn: 'group',
      valueColumn: 'score',
      group1: 'A',
      group2: 'B',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.statistic).toBe(2.5)
    expect(result.data?.pValue).toBe(0.02)
  })

  it('should perform paired t-test', async () => {
    const { pairedTTest } = await import('@/lib/statistics/calculator-handlers/hypothesis-tests')

    mockCallWorkerMethod.mockResolvedValue({
      statistic: 3.2,
      pValue: 0.005,
      degreesOfFreedom: 9,
      meanDifference: 5,
      reject: true,
    })

    const result = await pairedTTest({
      data: [
        { before: 100, after: 105 },
        { before: 95, after: 100 },
      ],
      beforeColumn: 'before',
      afterColumn: 'after',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.meanDifference).toBe(5)
  })
})

describe('Groups API Integration - ANOVA', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should perform one-way ANOVA', async () => {
    const { oneWayAnova } = await import('@/lib/statistics/calculator-handlers/anova')

    mockCallWorkerMethod.mockResolvedValue({
      fStatistic: 8.5,
      pValue: 0.001,
      degreesOfFreedomBetween: 2,
      degreesOfFreedomWithin: 27,
      reject: true,
    })

    const result = await oneWayAnova({
      data: [
        { group: 'A', value: 10 },
        { group: 'B', value: 15 },
        { group: 'C', value: 20 },
      ],
      groupColumn: 'group',
      valueColumn: 'value',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.fStatistic).toBe(8.5)
  })

  it('should perform two-way ANOVA', async () => {
    const { twoWayAnova } = await import('@/lib/statistics/calculator-handlers/anova')

    mockCallWorkerMethod.mockResolvedValue({
      mainEffect1: { fStatistic: 5.5, pValue: 0.01 },
      mainEffect2: { fStatistic: 3.2, pValue: 0.05 },
      interaction: { fStatistic: 2.1, pValue: 0.15 },
    })

    const result = await twoWayAnova({
      data: [
        { factor1: 'A', factor2: 'X', value: 10 },
      ],
      factor1Column: 'factor1',
      factor2Column: 'factor2',
      valueColumn: 'value',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.mainEffect1.fStatistic).toBe(5.5)
  })
})

describe('Groups API Integration - Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should perform simple linear regression', async () => {
    const { simpleLinearRegression } = await import('@/lib/statistics/calculator-handlers/regression')

    mockCallWorkerMethod.mockResolvedValue({
      slope: 2.5,
      intercept: 10,
      rSquared: 0.85,
      pValue: 0.001,
      residuals: [0.1, -0.2, 0.3],
    })

    const result = await simpleLinearRegression({
      data: [
        { x: 1, y: 12 },
        { x: 2, y: 15 },
        { x: 3, y: 17 },
      ],
      xColumn: 'x',
      yColumn: 'y',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.rSquared).toBe(0.85)
  })

  it('should perform multiple regression', async () => {
    const { multipleRegression } = await import('@/lib/statistics/calculator-handlers/regression')

    mockCallWorkerMethod.mockResolvedValue({
      coefficients: [1.5, 2.0, -0.5],
      intercept: 5,
      rSquared: 0.92,
      adjustedRSquared: 0.90,
      pValues: [0.01, 0.001, 0.05],
    })

    const result = await multipleRegression({
      data: [
        { x1: 1, x2: 2, y: 10 },
      ],
      xColumns: ['x1', 'x2'],
      yColumn: 'y',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.rSquared).toBe(0.92)
  })
})

describe('Groups API Integration - Nonparametric', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should perform Mann-Whitney U test', async () => {
    const { mannWhitneyU } = await import('@/lib/statistics/calculator-handlers/nonparametric')

    mockCallWorkerMethod.mockResolvedValue({
      statistic: 45,
      pValue: 0.03,
      reject: true,
    })

    const result = await mannWhitneyU({
      data: [
        { group: 'A', value: 10 },
        { group: 'B', value: 15 },
      ],
      groupColumn: 'group',
      valueColumn: 'value',
      group1: 'A',
      group2: 'B',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.pValue).toBe(0.03)
  })

  it('should perform Kruskal-Wallis test', async () => {
    const { kruskalWallis } = await import('@/lib/statistics/calculator-handlers/nonparametric')

    mockCallWorkerMethod.mockResolvedValue({
      statistic: 12.5,
      pValue: 0.002,
      degreesOfFreedom: 2,
      reject: true,
    })

    const result = await kruskalWallis({
      data: [
        { group: 'A', value: 10 },
        { group: 'B', value: 15 },
        { group: 'C', value: 20 },
      ],
      groupColumn: 'group',
      valueColumn: 'value',
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.statistic).toBe(12.5)
  })
})

describe('Groups API Integration - Advanced Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should perform PCA analysis', async () => {
    const { pcaAnalysis } = await import('@/lib/statistics/calculator-handlers/advanced')

    mockCallWorkerMethod.mockResolvedValue({
      explainedVariance: [0.6, 0.3, 0.1],
      totalExplainedVariance: 1.0,
      components: [[0.5, 0.5], [0.7, 0.3]],
    })

    const result = await pcaAnalysis({
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
      ],
      columns: ['x', 'y'],
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.totalExplainedVariance).toBe(1.0)
  })

  it('should perform time series decomposition', async () => {
    const { timeSeriesDecomposition } = await import('@/lib/statistics/calculator-handlers/advanced')

    mockCallWorkerMethod.mockResolvedValue({
      trend: [100, 105, 110],
      seasonal: [5, -5, 0],
      residual: [1, -1, 0],
      observed: [106, 99, 110],
    })

    const result = await timeSeriesDecomposition({
      data: [
        { value: 106 },
        { value: 99 },
        { value: 110 },
      ],
      valueColumn: 'value',
      period: 12,
      pyodideCore: mockPyodideCore,
    })

    expect(result.success).toBe(true)
    expect(result.data?.trend).toEqual([100, 105, 110])
  })
})
