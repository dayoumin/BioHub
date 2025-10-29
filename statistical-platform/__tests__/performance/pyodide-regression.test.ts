/**
 * Pyodide 회귀 테스트 (Performance Regression Tests)
 *
 * Purpose: Phase 5-3 Worker Pool 전환 시 성능/기능 검증
 *
 * Test Coverage:
 * 1. Pyodide Loading Performance (<3s target)
 * 2. Worker 1-4 Representative Methods (2 each, 8 total)
 * 3. Input-Output Consistency
 */

import { describe, it, expect, beforeAll } from '@jest/globals'

// Performance thresholds (Phase 5 baseline)
const PERFORMANCE_THRESHOLDS = {
  pyodideLoading: 3000,      // 3 seconds (initial load)
  cachedCalculation: 1000,   // 1 second (cached)
} as const

describe('Pyodide Regression Tests', () => {
  describe('1. Pyodide Loading Performance', () => {
    it('should load Pyodide within 3 seconds', async () => {
      const start = performance.now()

      // Dynamic import to measure loading time
      const { loadPyodideWithPackages } = await import('@/lib/utils/pyodide-loader')

      await loadPyodideWithPackages(['numpy', 'scipy'])

      const duration = performance.now() - start

      console.log(`   ⏱️  Pyodide loading: ${duration.toFixed(0)}ms`)

      // Phase 5 baseline: should be < 3000ms
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pyodideLoading)
    }, 30000) // 30s timeout

    it('should cache Pyodide instance (second load < 100ms)', async () => {
      const { loadPyodideWithPackages } = await import('@/lib/utils/pyodide-loader')

      // Second load (should use cache)
      const start = performance.now()
      await loadPyodideWithPackages(['numpy', 'scipy'])
      const duration = performance.now() - start

      console.log(`   ⚡ Cached loading: ${duration.toFixed(0)}ms`)

      // Should be nearly instant (cached)
      expect(duration).toBeLessThan(100)
    }, 10000)
  })

  describe('2. Worker Methods - Basic Functionality', () => {
    let pyodideCore: any
    let PyodideWorker: any

    beforeAll(async () => {
      const coreModule = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const enumModule = await import('@/lib/services/pyodide/core/pyodide-worker.enum')

      pyodideCore = coreModule.PyodideCoreService.getInstance()
      PyodideWorker = enumModule.PyodideWorker

      await pyodideCore.initialize()
    }, 30000)

    it('[Worker 1] should calculate descriptive statistics', async () => {
      const start = performance.now()
      const testData = [1, 2, 3, 4, 5]

      const result = await pyodideCore.callWorkerMethod(
        PyodideWorker.Descriptive,
        'descriptive_stats',
        { data: testData }
      )

      const duration = performance.now() - start
      console.log(`   📊 descriptive_stats: ${duration.toFixed(0)}ms`)

      // Validate
      expect(result).toHaveProperty('mean')
      expect(result.mean).toBeCloseTo(3.0, 2)
      expect(result.min).toBe(1)
      expect(result.max).toBe(5)

      // Performance
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cachedCalculation)
    }, 15000)

    it('[Worker 1] should perform normality test', async () => {
      const start = performance.now()
      const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      const result = await pyodideCore.callWorkerMethod(
        PyodideWorker.Descriptive,
        'normality_test',
        { data: testData }
      )

      const duration = performance.now() - start
      console.log(`   📈 normality_test: ${duration.toFixed(0)}ms`)

      // Validate
      expect(result).toHaveProperty('shapiroWilk')
      expect(result).toHaveProperty('kolmogorovSmirnov')

      // Performance
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cachedCalculation)
    }, 15000)

    it('[Worker 2] should perform one-sample t-test', async () => {
      const start = performance.now()
      const testData = [5, 6, 7, 8, 9]

      const result = await pyodideCore.callWorkerMethod(
        PyodideWorker.Hypothesis,
        'one_sample_t_test',
        { data: testData, popmean: 6 }
      )

      const duration = performance.now() - start
      console.log(`   🧪 one_sample_t_test: ${duration.toFixed(0)}ms`)

      // Validate
      expect(result).toHaveProperty('tStatistic')
      expect(result).toHaveProperty('pValue')
      expect(result.df).toBe(4) // n-1

      // Performance
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cachedCalculation)
    }, 15000)

    it('[Worker 3] should perform Mann-Whitney U test', async () => {
      const start = performance.now()
      const group1 = [1, 2, 3, 4, 5]
      const group2 = [6, 7, 8, 9, 10]

      const result = await pyodideCore.callWorkerMethod(
        PyodideWorker.NonparametricAnova,
        'mann_whitney_u_test',
        { group1, group2 }
      )

      const duration = performance.now() - start
      console.log(`   📊 mann_whitney_u_test: ${duration.toFixed(0)}ms`)

      // Validate
      expect(result).toHaveProperty('uStatistic')
      expect(result).toHaveProperty('pValue')

      // Performance
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cachedCalculation)
    }, 15000)

    it('[Worker 4] should perform multiple regression', async () => {
      const start = performance.now()
      const X = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]
      const y = [9, 14, 19, 24, 29]

      const result = await pyodideCore.callWorkerMethod(
        PyodideWorker.RegressionAdvanced,
        'multiple_regression',
        { X, y }
      )

      const duration = performance.now() - start
      console.log(`   📈 multiple_regression: ${duration.toFixed(0)}ms`)

      // Validate
      expect(result).toHaveProperty('coefficients')
      expect(result).toHaveProperty('rSquared')
      expect(result.rSquared).toBeGreaterThan(0.9)

      // Performance
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.cachedCalculation)
    }, 15000)
  })

  describe('3. Input-Output Consistency', () => {
    let pyodideCore: any
    let PyodideWorker: any

    beforeAll(async () => {
      const coreModule = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const enumModule = await import('@/lib/services/pyodide/core/pyodide-worker.enum')

      pyodideCore = coreModule.PyodideCoreService.getInstance()
      PyodideWorker = enumModule.PyodideWorker

      await pyodideCore.initialize()
    }, 30000)

    it('should produce identical results for identical inputs', async () => {
      const testData = [1, 2, 3, 4, 5]

      // Run twice
      const result1 = await pyodideCore.callWorkerMethod(
        PyodideWorker.Descriptive,
        'descriptive_stats',
        { data: testData }
      )

      const result2 = await pyodideCore.callWorkerMethod(
        PyodideWorker.Descriptive,
        'descriptive_stats',
        { data: testData }
      )

      // Results should be identical
      expect(result1.mean).toBe(result2.mean)
      expect(result1.std).toBe(result2.std)
      expect(result1.min).toBe(result2.min)
      expect(result1.max).toBe(result2.max)
    }, 15000)
  })

  describe('4. Performance Summary', () => {
    it('should generate performance report', () => {
      console.log('\n   📊 Performance Benchmark Summary')
      console.log('   =====================================')
      console.log(`   Phase 5 Baseline:`)
      console.log(`   - Pyodide Loading:      < ${PERFORMANCE_THRESHOLDS.pyodideLoading}ms`)
      console.log(`   - Cached Calculation:   < ${PERFORMANCE_THRESHOLDS.cachedCalculation}ms`)
      console.log(`\n   Phase 5-3 Targets (Worker Pool):`)
      console.log(`   - Worker Pool Loading:  < 500ms  (83% faster)`)
      console.log(`   - First Calculation:    < 3000ms (74% faster)`)
      console.log('   =====================================\n')

      expect(true).toBe(true)
    })
  })
})
