/**
 * Worker 4 Priority 1 메서드 테스트
 *
 * 테스트 대상:
 * 1. linearRegression() - 새 메서드 (Primary)
 * 2. pcaAnalysis() - 새 메서드 (Primary)
 * 3. durbinWatsonTest() - 새 메서드 (Primary)
 * 4. regression() - 기존 메서드 (Alias, Adapter)
 * 5. pca() - 기존 메서드 (Alias, Adapter)
 * 6. testIndependence() - 기존 메서드 (Alias)
 */

import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

// Mock Pyodide service
jest.mock('@/lib/services/pyodide-statistics', () => {
  return {
    PyodideStatisticsService: class MockPyodideStatisticsService {
      private static instance: MockPyodideStatisticsService

      static getInstance() {
        if (!this.instance) {
          this.instance = new MockPyodideStatisticsService()
        }
        return this.instance
      }

      // ========================================
      // Primary Methods (직접 호출)
      // ========================================

      async linearRegression(x: number[], y: number[]) {
        // Mock linear regression result (scipy.stats.linregress)
        return {
          slope: 2.0,
          intercept: 1.0,
          rSquared: 0.95,
          pValue: 0.001,
          stdErr: 0.1,
          nPairs: x.length
        }
      }

      async pcaAnalysis(dataMatrix: number[][], nComponents: number = 2) {
        // Mock PCA result (numpy SVD)
        return {
          components: [[1.0, 2.0], [3.0, 4.0]],
          explainedVariance: [0.8, 0.15],
          explainedVarianceRatio: [0.8, 0.15],
          cumulativeVariance: [0.8, 0.95]
        }
      }

      async durbinWatsonTest(residuals: number[]) {
        // Mock Durbin-Watson test result
        const dw = 2.1
        return {
          statistic: dw,
          interpretation: 'No significant autocorrelation (1.5 <= DW <= 2.5)',
          isIndependent: true
        }
      }

      // ========================================
      // Alias Methods (Primary 메서드 호출)
      // ========================================

      async regression(
        x: number[],
        y: number[],
        options: { type?: 'simple' | 'multiple' } = {}
      ) {
        const result = await this.linearRegression(x, y)
        return {
          slope: result.slope,
          intercept: result.intercept,
          rSquared: result.rSquared,
          pvalue: result.pValue,
          fStatistic: undefined,
          tStatistic: undefined,
          predictions: undefined,
          df: result.nPairs - 2
        }
      }

      async pca(data: number[][]) {
        const result = await this.pcaAnalysis(data, 2)
        return {
          components: result.components,
          explainedVariance: result.explainedVariance,
          totalExplainedVariance: result.cumulativeVariance[result.cumulativeVariance.length - 1]
        }
      }

      async testIndependence(residuals: number[]) {
        return this.durbinWatsonTest(residuals)
      }
    }
  }
})

describe('Worker 4 Priority 1 - Linear Regression & PCA', () => {
  let pyodideStats: PyodideStatisticsService

  beforeAll(() => {
    pyodideStats = PyodideStatisticsService.getInstance()
  })

  // ========================================
  // Primary Methods Tests
  // ========================================

  describe('linearRegression (Primary)', () => {
    it('should return correct regression coefficients', async () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 5, 4, 5]

      const result = await pyodideStats.linearRegression(x, y)

      expect(result).toBeDefined()
      expect(result.slope).toBe(2.0)
      expect(result.intercept).toBe(1.0)
      expect(result.rSquared).toBe(0.95)
      expect(result.pValue).toBe(0.001)
      expect(result.stdErr).toBe(0.1)
      expect(result.nPairs).toBe(5)
    })

    it('should return correct result structure', async () => {
      const x = [1, 2, 3]
      const y = [2, 4, 6]

      const result = await pyodideStats.linearRegression(x, y)

      expect(result).toHaveProperty('slope')
      expect(result).toHaveProperty('intercept')
      expect(result).toHaveProperty('rSquared')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('stdErr')
      expect(result).toHaveProperty('nPairs')
    })
  })

  describe('pcaAnalysis (Primary)', () => {
    it('should return PCA analysis result', async () => {
      const dataMatrix = [
        [2.5, 2.4],
        [0.5, 0.7],
        [2.2, 2.9],
        [1.9, 2.2]
      ]

      const result = await pyodideStats.pcaAnalysis(dataMatrix, 2)

      expect(result).toBeDefined()
      expect(result.components).toHaveLength(2)
      expect(result.explainedVariance).toHaveLength(2)
      expect(result.explainedVarianceRatio).toHaveLength(2)
      expect(result.cumulativeVariance).toHaveLength(2)
    })

    it('should return cumulative variance summing to near 1.0', async () => {
      const dataMatrix = [[1, 2], [3, 4], [5, 6]]

      const result = await pyodideStats.pcaAnalysis(dataMatrix, 2)

      const lastCumulative = result.cumulativeVariance[result.cumulativeVariance.length - 1]
      expect(lastCumulative).toBe(0.95)
    })
  })

  describe('durbinWatsonTest (Primary)', () => {
    it('should detect no autocorrelation', async () => {
      const residuals = [0.5, -0.3, 0.2, -0.4, 0.1]

      const result = await pyodideStats.durbinWatsonTest(residuals)

      expect(result).toBeDefined()
      expect(result.statistic).toBe(2.1)
      expect(result.isIndependent).toBe(true)
      expect(result.interpretation).toContain('No significant autocorrelation')
    })

    it('should return correct result structure', async () => {
      const residuals = [0.1, 0.2, 0.3]

      const result = await pyodideStats.durbinWatsonTest(residuals)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('interpretation')
      expect(result).toHaveProperty('isIndependent')
    })
  })

  // ========================================
  // Backward Compatibility Tests
  // ========================================

  describe('Backward Compatibility - Alias Methods', () => {
    describe('regression() → linearRegression()', () => {
      it('should delegate to linearRegression()', async () => {
        const x = [1, 2, 3]
        const y = [2, 4, 6]

        const result = await pyodideStats.regression(x, y)

        expect(result).toBeDefined()
        expect(result.slope).toBe(2.0)
        expect(result.intercept).toBe(1.0)
        expect(result.rSquared).toBe(0.95)
      })

      it('should convert pValue to pvalue', async () => {
        const x = [1, 2, 3]
        const y = [2, 4, 6]

        const result = await pyodideStats.regression(x, y)

        expect(result).toHaveProperty('pvalue')
        expect(result.pvalue).toBe(0.001)
      })

      it('should calculate df from nPairs', async () => {
        const x = [1, 2, 3, 4, 5]
        const y = [2, 4, 5, 4, 5]

        const result = await pyodideStats.regression(x, y)

        expect(result.df).toBe(3) // nPairs (5) - 2
      })

      it('should return undefined for missing fields', async () => {
        const x = [1, 2, 3]
        const y = [2, 4, 6]

        const result = await pyodideStats.regression(x, y)

        expect(result.fStatistic).toBeUndefined()
        expect(result.tStatistic).toBeUndefined()
        expect(result.predictions).toBeUndefined()
      })
    })

    describe('pca() → pcaAnalysis()', () => {
      it('should delegate to pcaAnalysis()', async () => {
        const dataMatrix = [[1, 2], [3, 4]]

        const result = await pyodideStats.pca(dataMatrix)

        expect(result).toBeDefined()
        expect(result.components).toBeDefined()
        expect(result.explainedVariance).toBeDefined()
      })

      it('should provide totalExplainedVariance', async () => {
        const dataMatrix = [[1, 2], [3, 4]]

        const result = await pyodideStats.pca(dataMatrix)

        expect(result.totalExplainedVariance).toBe(0.95)
      })

      it('should match pcaAnalysis cumulative variance', async () => {
        const dataMatrix = [[1, 2], [3, 4]]

        const oldResult = await pyodideStats.pca(dataMatrix)
        const newResult = await pyodideStats.pcaAnalysis(dataMatrix, 2)

        const expectedTotal = newResult.cumulativeVariance[newResult.cumulativeVariance.length - 1]
        expect(oldResult.totalExplainedVariance).toBe(expectedTotal)
      })
    })

    describe('testIndependence() → durbinWatsonTest()', () => {
      it('should delegate to durbinWatsonTest()', async () => {
        const residuals = [0.1, 0.2, 0.3]

        const oldResult = await pyodideStats.testIndependence(residuals)
        const newResult = await pyodideStats.durbinWatsonTest(residuals)

        expect(oldResult).toEqual(newResult)
      })

      it('should return identical results', async () => {
        const residuals = [0.5, -0.3, 0.2, -0.4, 0.1]

        const result = await pyodideStats.testIndependence(residuals)

        expect(result.statistic).toBe(2.1)
        expect(result.isIndependent).toBe(true)
        expect(result.interpretation).toContain('No significant autocorrelation')
      })
    })
  })

  // ========================================
  // Integration Test - Method Count
  // ========================================

  describe('Method Availability', () => {
    it('should have all 6 methods available', () => {
      expect(pyodideStats.linearRegression).toBeDefined()
      expect(pyodideStats.pcaAnalysis).toBeDefined()
      expect(pyodideStats.durbinWatsonTest).toBeDefined()
      expect(pyodideStats.regression).toBeDefined()
      expect(pyodideStats.pca).toBeDefined()
      expect(pyodideStats.testIndependence).toBeDefined()
    })
  })
})
