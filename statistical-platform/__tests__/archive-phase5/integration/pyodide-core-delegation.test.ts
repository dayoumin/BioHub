/**
 * PyodideCore Delegation 통합 테스트
 *
 * 테스트 목적:
 * - PyodideStatisticsService → PyodideCoreService delegation 검증
 * - 모든 Worker 메서드가 올바르게 delegation되는지 확인
 * - 타입 안전성 및 하위 호환성 검증
 *
 * 테스트 전략:
 * - Worker 1-4의 대표 메서드 각 2-3개씩 테스트
 * - 실제 Python 실행 환경에서 통합 테스트
 */

import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('PyodideCore Delegation Integration', () => {
  beforeAll(async () => {
    // Pyodide 초기화 (최초 1회)
    await pyodideStats.initialize()
  }, 60000) // 초기화 타임아웃 60초

  // ========================================
  // 1. 초기화 검증
  // ========================================

  describe('Initialization Delegation', () => {
    it('should delegate initialize() to core', async () => {
      const core = PyodideCoreService.getInstance()

      expect(pyodideStats.isInitialized()).toBe(true)
      expect(core.isInitialized()).toBe(true)
    })

    it('should delegate isInitialized() to core', () => {
      const core = PyodideCoreService.getInstance()

      expect(pyodideStats.isInitialized()).toBe(core.isInitialized())
    })
  })

  // ========================================
  // 2. Worker 1 (Descriptive) Delegation 테스트
  // ========================================

  describe('Worker 1 - Descriptive Stats Delegation', () => {
    it('should delegate descriptiveStats() to core', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      const result = await pyodideStats.descriptiveStats(data)

      expect(result).toHaveProperty('mean')
      expect(result).toHaveProperty('median')
      expect(result).toHaveProperty('std')
      expect(result.mean).toBeCloseTo(5.5, 1)
      expect(result.median).toBe(5.5)
    }, 10000)

    it('should delegate normalityTest() to core', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      const result = await pyodideStats.normalityTest(data)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('isNormal')
      expect(typeof result.statistic).toBe('number')
      expect(typeof result.pValue).toBe('number')
    }, 10000)

    it('should delegate frequencyAnalysis() to core', async () => {
      const values = ['A', 'B', 'A', 'C', 'B', 'A']

      const result = await pyodideStats.frequencyAnalysis(values)

      expect(result).toHaveProperty('categories')
      expect(result).toHaveProperty('frequencies')
      expect(result).toHaveProperty('total')
      expect(result.total).toBe(6)
      expect(result.uniqueCount).toBe(3)
    }, 10000)
  })

  // ========================================
  // 3. Worker 2 (Hypothesis) Delegation 테스트
  // ========================================

  describe('Worker 2 - Hypothesis Tests Delegation', () => {
    it('should delegate correlationTest() to core', async () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10]

      const result = await pyodideStats.correlationTest(x, y, 'pearson')

      expect(result).toHaveProperty('correlation')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('method')
      expect(result.correlation).toBeCloseTo(1.0, 1)
      expect(result.method).toBe('pearson')
    }, 10000)

    it('should delegate tTestTwoSample() to core', async () => {
      const group1 = [1, 2, 3, 4, 5]
      const group2 = [6, 7, 8, 9, 10]

      const result = await pyodideStats.tTestTwoSample(group1, group2)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('df')
      expect(result).toHaveProperty('mean1')
      expect(result).toHaveProperty('mean2')
      expect(result.mean1).toBe(3)
      expect(result.mean2).toBe(8)
    }, 10000)

    it('should delegate leveneTest() to core', async () => {
      const groups = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]]

      const result = await pyodideStats.leveneTest(groups)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('equalVariance')
      expect(typeof result.statistic).toBe('number')
      expect(typeof result.pValue).toBe('number')
    }, 10000)
  })

  // ========================================
  // 4. Worker 3 (Nonparametric/ANOVA) Delegation 테스트
  // ========================================

  describe('Worker 3 - Nonparametric/ANOVA Delegation', () => {
    it('should delegate mannWhitneyTestWorker() to core', async () => {
      const group1 = [1, 2, 3, 4, 5]
      const group2 = [6, 7, 8, 9, 10]

      const result = await pyodideStats.mannWhitneyTestWorker(group1, group2)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('uStatistic')
      expect(typeof result.statistic).toBe('number')
      expect(typeof result.pValue).toBe('number')
    }, 10000)

    it('should delegate oneWayAnovaWorker() to core', async () => {
      const groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

      const result = await pyodideStats.oneWayAnovaWorker(groups)

      expect(result).toHaveProperty('fStatistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('dfBetween')
      expect(result).toHaveProperty('dfWithin')
      expect(result.dfBetween).toBe(2)
      expect(result.dfWithin).toBe(6)
    }, 10000)

    it('should delegate kruskalWallisTestWorker() to core', async () => {
      const groups = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

      const result = await pyodideStats.kruskalWallisTestWorker(groups)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('df')
      expect(result.df).toBe(2)
    }, 10000)
  })

  // ========================================
  // 5. Worker 4 (Regression/Advanced) Delegation 테스트
  // ========================================

  describe('Worker 4 - Regression/Advanced Delegation', () => {
    it('should delegate linearRegression() to core', async () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10]

      const result = await pyodideStats.linearRegression(x, y)

      expect(result).toHaveProperty('slope')
      expect(result).toHaveProperty('intercept')
      expect(result).toHaveProperty('rSquared')
      expect(result).toHaveProperty('pValue')
      expect(result.slope).toBeCloseTo(2.0, 1)
      expect(result.intercept).toBeCloseTo(0, 1)
      expect(result.rSquared).toBeCloseTo(1.0, 2)
    }, 10000)

    it('should delegate pcaAnalysis() to core', async () => {
      const data = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12]
      ]

      const result = await pyodideStats.pcaAnalysis(data, 2)

      expect(result).toHaveProperty('components')
      expect(result).toHaveProperty('explainedVariance')
      expect(result).toHaveProperty('explainedVarianceRatio')
      expect(result).toHaveProperty('cumulativeVariance')
      expect(result.components.length).toBeGreaterThan(0)
    }, 10000)

    it('should delegate durbinWatsonTest() to core', async () => {
      const residuals = [0.1, -0.2, 0.15, -0.1, 0.05]

      const result = await pyodideStats.durbinWatsonTest(residuals)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('interpretation')
      expect(result).toHaveProperty('isIndependent')
      expect(typeof result.statistic).toBe('number')
      expect(result.statistic).toBeGreaterThan(0)
      expect(result.statistic).toBeLessThan(4)
    }, 10000)
  })

  // ========================================
  // 6. 하위 호환성 검증 (레거시 API)
  // ========================================

  describe('Backward Compatibility', () => {
    it('should maintain regression() alias', async () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10]

      const result = await pyodideStats.regression(x, y)

      expect(result).toHaveProperty('slope')
      expect(result).toHaveProperty('intercept')
      expect(result).toHaveProperty('rSquared')
      expect(result).toHaveProperty('pvalue') // 소문자 'p'
      expect(result).toHaveProperty('df')
    }, 10000)

    it('should maintain mannWhitneyU() alias', async () => {
      const group1 = [1, 2, 3, 4, 5]
      const group2 = [6, 7, 8, 9, 10]

      const result = await pyodideStats.mannWhitneyU(group1, group2)

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pvalue') // 소문자 'p'
    }, 10000)

    it('should maintain pca() alias', async () => {
      const data = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12]
      ]

      const result = await pyodideStats.pca(data)

      expect(result).toHaveProperty('components')
      expect(result).toHaveProperty('explainedVariance')
      expect(result).toHaveProperty('totalExplainedVariance')
    }, 10000)
  })

  // ========================================
  // 7. 타입 안전성 검증
  // ========================================

  describe('Type Safety', () => {
    it('should preserve generic types through delegation', async () => {
      // TypeScript 컴파일 타임 타입 체크
      const data = [1, 2, 3, 4, 5]

      const result = await pyodideStats.descriptiveStats(data)

      // TypeScript가 result 타입을 정확히 추론하는지 확인
      const mean: number = result.mean
      const median: number = result.median
      const std: number = result.std

      expect(mean).toBeDefined()
      expect(median).toBeDefined()
      expect(std).toBeDefined()
    }, 10000)

    it('should handle async/await correctly', async () => {
      const data = [1, 2, 3, 4, 5]

      // await 없이 호출하면 Promise 반환
      const promise = pyodideStats.descriptiveStats(data)
      expect(promise).toBeInstanceOf(Promise)

      // await 사용 시 결과 반환
      const result = await promise
      expect(typeof result.mean).toBe('number')
    }, 10000)
  })

  // ========================================
  // 8. 에러 처리 검증
  // ========================================

  describe('Error Handling', () => {
    it('should throw error for invalid data', async () => {
      const invalidData: number[] = []

      await expect(async () => {
        await pyodideStats.descriptiveStats(invalidData)
      }).rejects.toThrow()
    }, 10000)

    it('should throw error for mismatched array lengths', async () => {
      const x = [1, 2, 3]
      const y = [1, 2] // 길이 불일치

      await expect(async () => {
        await pyodideStats.correlationTest(x, y, 'pearson')
      }).rejects.toThrow()
    }, 10000)
  })

  // ========================================
  // 9. 성능 검증
  // ========================================

  describe('Performance', () => {
    it('should complete descriptiveStats in < 1 second', async () => {
      const data = Array.from({ length: 1000 }, (_, i) => i + 1)

      const startTime = performance.now()
      await pyodideStats.descriptiveStats(data)
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(1000) // 1초 미만
    }, 10000)

    it('should reuse initialized Pyodide instance', async () => {
      // 두 번째 호출은 빨라야 함 (캐시 사용)
      const startTime = performance.now()
      await pyodideStats.descriptiveStats([1, 2, 3, 4, 5])
      const endTime = performance.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(500) // 0.5초 미만
    }, 10000)
  })
})
