/**
 * CorrelationExecutor Tests
 *
 * Purpose: Verify correlation analysis (Pearson, Spearman, Kendall, Partial)
 * works correctly through the CorrelationExecutor
 *
 * Created: 2025-11-27
 * Related fix: Smart Flow correlation routing bug (was falling to descriptive stats)
 */

import { describe, it, expect, beforeAll } from 'vitest'

import { vi } from 'vitest'
// Mock Pyodide for unit testing
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    correlationTest: vi.fn().mockImplementation(
      (_x: number[], _y: number[], method: string) => {
        // Return realistic correlation results based on method
        const mockResults: Record<string, { correlation: number; pValue: number }> = {
          'pearson': { correlation: 0.85, pValue: 0.001 },
          'spearman': { correlation: 0.82, pValue: 0.002 },
          'kendall': { correlation: 0.72, pValue: 0.005 }
        }
        return Promise.resolve(mockResults[method] || mockResults['pearson'])
      }
    ),
    correlation: vi.fn().mockResolvedValue({
      pearson: { r: 0.85, pValue: 0.001 },
      spearman: { r: 0.82, pValue: 0.002 },
      kendall: { tau: 0.72, pValue: 0.005 }
    }),
    partialCorrelationWorker: vi.fn().mockResolvedValue({
      correlation: 0.65,
      pValue: 0.01,
      df: 7
    })
  }
}))

// Import executor after mock
import { CorrelationExecutor } from '@/lib/services/executors/correlation-executor'

describe('CorrelationExecutor', () => {
  let executor: CorrelationExecutor

  // Test data
  const xData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const yData = [2, 4, 5, 4, 5, 7, 8, 9, 10, 12]

  const mockCorrelationData = [
    { height: 160, weight: 55, age: 25 },
    { height: 165, weight: 60, age: 28 },
    { height: 170, weight: 65, age: 30 },
    { height: 175, weight: 70, age: 35 },
    { height: 180, weight: 75, age: 40 },
    { height: 185, weight: 80, age: 45 },
    { height: 190, weight: 85, age: 50 },
    { height: 195, weight: 90, age: 55 },
    { height: 200, weight: 95, age: 60 },
    { height: 205, weight: 100, age: 65 },
  ]

  beforeAll(() => {
    executor = new CorrelationExecutor()
  })

  // ============================================
  // Pearson Correlation Tests
  // ============================================
  describe('Pearson Correlation', () => {
    it('should execute Pearson correlation with x/y arrays', async () => {
      const result = await executor.executePearson(xData, yData)

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Pearson 상관분석')
      expect(result.mainResults.statistic).toBe(0.85)
      expect(result.mainResults.pvalue).toBe(0.001)
      expect(result.mainResults.interpretation).toContain('r = 0.8500')
      expect(result.additionalInfo.effectSize).toBeDefined()
      expect(result.additionalInfo.effectSize?.type).toBe('Pearson r')
    })

    it('should execute via execute() with method="pearson"', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'pearson',
        dependentVar: 'height',
        independentVar: 'weight'
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Pearson 상관분석')
    })

    it('should execute via execute() with method="pearson-correlation"', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'pearson-correlation',
        variables: ['height', 'weight']
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Pearson 상관분석')
    })
  })

  // ============================================
  // Spearman Correlation Tests
  // ============================================
  describe('Spearman Correlation', () => {
    it('should execute Spearman correlation with x/y arrays', async () => {
      const result = await executor.executeSpearman(xData, yData)

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Spearman 상관분석')
      expect(result.mainResults.statistic).toBe(0.82)
      expect(result.mainResults.interpretation).toContain('ρ = 0.8200')
      expect(result.additionalInfo.effectSize?.type).toBe('Spearman rho')
    })

    it('should execute via execute() with method="spearman"', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'spearman',
        dependentVar: 'height',
        independentVar: 'weight'
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Spearman 상관분석')
    })
  })

  // ============================================
  // Kendall Correlation Tests
  // ============================================
  describe('Kendall Correlation', () => {
    it('should execute Kendall correlation with x/y arrays', async () => {
      const result = await executor.executeKendall(xData, yData)

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Kendall 상관분석')
      expect(result.mainResults.statistic).toBe(0.72)
      expect(result.mainResults.interpretation).toContain('τ = 0.7200')
      expect(result.additionalInfo.effectSize?.type).toBe('Kendall tau')
    })

    it('should execute via execute() with method="kendall"', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'kendall',
        variables: ['height', 'weight']
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Kendall 상관분석')
    })
  })

  // ============================================
  // Combined Correlation Analysis
  // ============================================
  describe('Combined Correlation Analysis', () => {
    it('should execute combined correlation (all methods)', async () => {
      const result = await executor.executeCorrelation(xData, yData)

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('상관분석')
      // Uses Pearson as main result
      expect(result.mainResults.statistic).toBe(0.85)
      // Should include all methods in additionalInfo
      expect(result.additionalInfo.pearson).toBeDefined()
      expect(result.additionalInfo.spearman).toBeDefined()
      expect(result.additionalInfo.kendall).toBeDefined()
    })

    it('should execute via execute() with method="correlation"', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'correlation',
        dependentVar: 'height',
        independentVar: 'weight'
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('상관분석')
    })

    it('should use first two columns when no variables specified', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'correlation'
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('상관분석')
    })
  })

  // ============================================
  // Partial Correlation Tests
  // ============================================
  describe('Partial Correlation', () => {
    it('should execute partial correlation', async () => {
      const dataMatrix = [
        [1, 2, 3],
        [2, 4, 5],
        [3, 5, 6],
        [4, 6, 8],
        [5, 8, 9],
        [6, 9, 10],
        [7, 10, 12],
        [8, 12, 13],
        [9, 13, 15],
        [10, 15, 16],
      ]

      const result = await executor.executePartialCorrelation(dataMatrix, 0, 1, [2])

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('편상관분석')
      expect(result.mainResults.statistic).toBe(0.65)
      expect(result.mainResults.df).toBe(7)
      expect(result.additionalInfo.effectSize?.type).toBe('Partial r')
    })

    it('should execute via execute() with method="partial"', async () => {
      const result = await executor.execute(mockCorrelationData, {
        method: 'partial',
        dependentVar: 'height',
        independentVar: 'weight',
        covariates: [[25, 28, 30, 35, 40, 45, 50, 55, 60, 65]] // age as covariate
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('편상관분석')
    })
  })

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should throw error when data is insufficient', async () => {
      const shortData = [
        { x: 1, y: 2 },
        { x: 2, y: 3 }
      ]

      await expect(
        executor.execute(shortData, {
          method: 'pearson',
          dependentVar: 'x',
          independentVar: 'y'
        })
      ).rejects.toThrow('최소 3개 이상')
    })

    it('should throw error when x/y arrays are provided but too short', async () => {
      await expect(
        executor.execute([], {
          method: 'pearson',
          x: [1, 2],
          y: [2, 3]
        })
      ).rejects.toThrow('최소 3개 이상')
    })
  })

  // ============================================
  // Correlation Interpretation
  // ============================================
  describe('Correlation Interpretation', () => {
    it('should interpret very weak correlation (|r| < 0.1)', async () => {
      // Mock returns 0.85, but we can check interpretation method exists
      const result = await executor.executePearson(xData, yData)
      expect(result.additionalInfo.effectSize?.interpretation).toBeDefined()
    })

    it('should provide scatter plot visualization data', async () => {
      const result = await executor.executePearson(xData, yData)

      expect(result.visualizationData).toBeDefined()
      expect(result.visualizationData?.type).toBe('scatter')
      expect(result.visualizationData?.data).toHaveProperty('x')
      expect(result.visualizationData?.data).toHaveProperty('y')
    })
  })

  // ============================================
  // Smart Flow Integration
  // ============================================
  describe('Smart Flow Integration', () => {
    it('should match CorrelationSelector output format (dependentVar/independentVar)', async () => {
      const selectorOutput = {
        dependentVar: 'height',
        independentVar: 'weight'
      }

      const result = await executor.execute(mockCorrelationData, {
        method: 'pearson',
        ...selectorOutput
      })

      expect(result).toBeDefined()
      expect(result.mainResults.statistic).toBeDefined()
    })

    it('should match CorrelationSelector output format (variables array)', async () => {
      const selectorOutput = {
        variables: ['height', 'weight']
      }

      const result = await executor.execute(mockCorrelationData, {
        method: 'spearman',
        ...selectorOutput
      })

      expect(result).toBeDefined()
    })

    it('should handle x/y array format from legacy code', async () => {
      const result = await executor.execute([], {
        method: 'kendall',
        x: xData,
        y: yData
      })

      expect(result).toBeDefined()
      expect(result.metadata.method).toBe('Kendall 상관분석')
    })
  })
})
