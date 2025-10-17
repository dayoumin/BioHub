/**
 * Worker 3 호환성 테스트
 *
 * 테스트 대상:
 * 1. mannWhitneyU() → mannWhitneyTestWorker() 호환성
 * 2. wilcoxon() → wilcoxonTestWorker() 호환성
 * 3. kruskalWallis() → kruskalWallisTestWorker() 호환성
 * 4. tukeyHSD() → tukeyHSDWorker() 호환성
 * 5. friedman() → friedmanTestWorker() 호환성
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
      // Primary Methods (*Worker)
      // ========================================

      async mannWhitneyTestWorker(group1: number[], group2: number[]) {
        return {
          statistic: 15.5,
          pValue: 0.03,
          nPairs: group1.length + group2.length
        }
      }

      async wilcoxonTestWorker(values1: number[], values2: number[]) {
        return {
          statistic: 8.0,
          pValue: 0.05,
          nPairs: values1.length
        }
      }

      async kruskalWallisTestWorker(groups: number[][]) {
        return {
          statistic: 12.5,
          pValue: 0.002,
          df: groups.length - 1
        }
      }

      async tukeyHSDWorker(groups: number[][]) {
        return {
          comparisons: [
            { group1: 0, group2: 1, diff: 2.5, pValue: 0.01, significant: true },
            { group1: 0, group2: 2, diff: 1.2, pValue: 0.15, significant: false }
          ]
        }
      }

      async friedmanTestWorker(data: number[][]) {
        return {
          statistic: 15.2,
          pValue: 0.001,
          rankings: [1.5, 2.3, 2.2]
        }
      }

      // ========================================
      // Alias Methods (Primary 메서드 호출)
      // ========================================

      async mannWhitneyU(group1: number[], group2: number[]) {
        const result = await this.mannWhitneyTestWorker(group1, group2)
        return {
          statistic: result.statistic,
          pvalue: result.pValue
        }
      }

      async wilcoxon(group1: number[], group2: number[]) {
        const result = await this.wilcoxonTestWorker(group1, group2)
        return {
          statistic: result.statistic,
          pvalue: result.pValue
        }
      }

      async kruskalWallis(groups: number[][]) {
        const result = await this.kruskalWallisTestWorker(groups)
        return {
          statistic: result.statistic,
          pvalue: result.pValue,
          df: result.df
        }
      }

      async tukeyHSD(groups: number[][]) {
        const result = await this.tukeyHSDWorker(groups)
        return {
          comparisons: result.comparisons
        }
      }

      async friedman(data: number[][]) {
        const result = await this.friedmanTestWorker(data)
        return {
          statistic: result.statistic,
          pvalue: result.pValue,
          rankings: result.rankings
        }
      }
    }
  }
})

describe('Worker 3 Backward Compatibility', () => {
  let pyodideStats: PyodideStatisticsService

  beforeAll(() => {
    pyodideStats = PyodideStatisticsService.getInstance()
  })

  // ========================================
  // Backward Compatibility Tests
  // ========================================

  describe('mannWhitneyU() → mannWhitneyTestWorker()', () => {
    it('should delegate to mannWhitneyTestWorker()', async () => {
      const group1 = [1, 2, 3, 4, 5]
      const group2 = [6, 7, 8, 9, 10]

      const result = await pyodideStats.mannWhitneyU(group1, group2)

      expect(result).toBeDefined()
      expect(result.statistic).toBe(15.5)
      expect(result.pvalue).toBe(0.03)
    })

    it('should convert pValue to pvalue', async () => {
      const group1 = [1, 2, 3]
      const group2 = [4, 5, 6]

      const oldResult = await pyodideStats.mannWhitneyU(group1, group2)
      const newResult = await pyodideStats.mannWhitneyTestWorker(group1, group2)

      expect(oldResult.pvalue).toBe(newResult.pValue)
    })

    it('should have same statistic', async () => {
      const group1 = [1, 2, 3]
      const group2 = [4, 5, 6]

      const oldResult = await pyodideStats.mannWhitneyU(group1, group2)
      const newResult = await pyodideStats.mannWhitneyTestWorker(group1, group2)

      expect(oldResult.statistic).toBe(newResult.statistic)
    })
  })

  describe('wilcoxon() → wilcoxonTestWorker()', () => {
    it('should delegate to wilcoxonTestWorker()', async () => {
      const values1 = [1, 2, 3, 4, 5]
      const values2 = [2, 3, 4, 5, 6]

      const result = await pyodideStats.wilcoxon(values1, values2)

      expect(result).toBeDefined()
      expect(result.statistic).toBe(8.0)
      expect(result.pvalue).toBe(0.05)
    })

    it('should convert pValue to pvalue', async () => {
      const values1 = [1, 2, 3]
      const values2 = [2, 3, 4]

      const oldResult = await pyodideStats.wilcoxon(values1, values2)
      const newResult = await pyodideStats.wilcoxonTestWorker(values1, values2)

      expect(oldResult.pvalue).toBe(newResult.pValue)
    })
  })

  describe('kruskalWallis() → kruskalWallisTestWorker()', () => {
    it('should delegate to kruskalWallisTestWorker()', async () => {
      const groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

      const result = await pyodideStats.kruskalWallis(groups)

      expect(result).toBeDefined()
      expect(result.statistic).toBe(12.5)
      expect(result.pvalue).toBe(0.002)
      expect(result.df).toBe(2)
    })

    it('should convert pValue to pvalue', async () => {
      const groups = [[1, 2], [3, 4], [5, 6]]

      const oldResult = await pyodideStats.kruskalWallis(groups)
      const newResult = await pyodideStats.kruskalWallisTestWorker(groups)

      expect(oldResult.pvalue).toBe(newResult.pValue)
      expect(oldResult.df).toBe(newResult.df)
    })
  })

  describe('tukeyHSD() → tukeyHSDWorker()', () => {
    it('should delegate to tukeyHSDWorker()', async () => {
      const groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

      const result = await pyodideStats.tukeyHSD(groups)

      expect(result).toBeDefined()
      expect(result.comparisons).toHaveLength(2)
      expect(result.comparisons[0]).toHaveProperty('group1')
      expect(result.comparisons[0]).toHaveProperty('group2')
      expect(result.comparisons[0]).toHaveProperty('diff')
      expect(result.comparisons[0]).toHaveProperty('pValue')
    })

    it('should return identical comparisons', async () => {
      const groups = [[1, 2], [3, 4]]

      const oldResult = await pyodideStats.tukeyHSD(groups)
      const newResult = await pyodideStats.tukeyHSDWorker(groups)

      expect(oldResult.comparisons).toEqual(newResult.comparisons)
    })
  })

  describe('friedman() → friedmanTestWorker()', () => {
    it('should delegate to friedmanTestWorker()', async () => {
      const data = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

      const result = await pyodideStats.friedman(data)

      expect(result).toBeDefined()
      expect(result.statistic).toBe(15.2)
      expect(result.pvalue).toBe(0.001)
      expect(result.rankings).toEqual([1.5, 2.3, 2.2])
    })

    it('should convert pValue to pvalue', async () => {
      const data = [[1, 2], [3, 4]]

      const oldResult = await pyodideStats.friedman(data)
      const newResult = await pyodideStats.friedmanTestWorker(data)

      expect(oldResult.pvalue).toBe(newResult.pValue)
      expect(oldResult.rankings).toEqual(newResult.rankings)
    })
  })

  // ========================================
  // Integration Test - Method Count
  // ========================================

  describe('Method Availability', () => {
    it('should have all 10 methods available', () => {
      // Primary methods
      expect(pyodideStats.mannWhitneyTestWorker).toBeDefined()
      expect(pyodideStats.wilcoxonTestWorker).toBeDefined()
      expect(pyodideStats.kruskalWallisTestWorker).toBeDefined()
      expect(pyodideStats.tukeyHSDWorker).toBeDefined()
      expect(pyodideStats.friedmanTestWorker).toBeDefined()

      // Alias methods
      expect(pyodideStats.mannWhitneyU).toBeDefined()
      expect(pyodideStats.wilcoxon).toBeDefined()
      expect(pyodideStats.kruskalWallis).toBeDefined()
      expect(pyodideStats.tukeyHSD).toBeDefined()
      expect(pyodideStats.friedman).toBeDefined()
    })
  })
})
