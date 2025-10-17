/**
 * Phase 6 Critical Bug Fixes Verification Tests
 *
 * These tests verify that the 7 critical bugs fixed in advanced.ts
 * do not regress. Each test validates the specific fix.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

// Mock PyodideCore
const mockCallWorkerMethod = jest.fn()
const mockPyodideCore = {
  callWorkerMethod: mockCallWorkerMethod,
  isInitialized: jest.fn().mockReturnValue(true),
} as unknown as PyodideCoreService

describe('Critical Bug Fixes - Data Alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Bug #1: Kaplan-Meier Row Alignment', () => {
    it('should maintain row-level alignment between times and events', async () => {
      // Import the handler
      const { kaplanMeierSurvival } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { patient_id: '1', time: 10, event: 1, age: 50 },
        { patient_id: '2', time: 'invalid', event: 0, age: 45 },  // This row should be filtered out
        { patient_id: '3', time: 20, event: 1, age: 60 },
        { patient_id: '4', time: 15, event: 'invalid', age: 55 }, // This row should be filtered out
        { patient_id: '5', time: 25, event: 0, age: 65 },
      ]

      mockCallWorkerMethod.mockResolvedValue({
        survivalFunction: [1.0, 0.75, 0.5],
        times: [10, 20, 25],
        events: [1, 1, 0],
        nRisk: [3, 2, 1],
      })

      const result = await kaplanMeierSurvival({
        data: testData,
        timeColumn: 'time',
        eventColumn: 'event',
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(true)

      // Verify that the data passed to worker is row-aligned
      const workerCall = mockCallWorkerMethod.mock.calls[0]
      const params = workerCall[2] as { times: number[]; events: number[] }

      // Should only have 3 valid rows (patient 1, 3, 5)
      expect(params.times).toEqual([10, 20, 25])
      expect(params.events).toEqual([1, 1, 0])
      // times[0] and events[0] are from the same patient (patient 1)
      // times[1] and events[1] are from the same patient (patient 3)
      // times[2] and events[2] are from the same patient (patient 5)
    })
  })

  describe('Bug #2: Cox Regression Multi-array Alignment', () => {
    it('should maintain alignment across times, events, and all covariates', async () => {
      const { coxRegression } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { time: 10, event: 1, age: 50, treatment: 1 },
        { time: 15, event: 'invalid', age: 55, treatment: 0 }, // Filter out
        { time: 20, event: 1, age: 60, treatment: 1 },
        { time: 25, event: 0, age: 'invalid', treatment: 0 },  // Filter out
        { time: 30, event: 0, age: 65, treatment: 1 },
      ]

      mockCallWorkerMethod.mockResolvedValue({
        coefficients: [0.5, 0.3],
        hazardRatios: [1.65, 1.35],
        pValues: [0.01, 0.05],
      })

      const result = await coxRegression({
        data: testData,
        timeColumn: 'time',
        eventColumn: 'event',
        covariates: ['age', 'treatment'],
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(true)

      const workerCall = mockCallWorkerMethod.mock.calls[0]
      const params = workerCall[2] as { times: number[]; events: number[]; covariates: number[][] }

      // Should have 3 valid rows
      expect(params.times).toEqual([10, 20, 30])
      expect(params.events).toEqual([1, 1, 0])
      expect(params.covariates).toEqual([
        [50, 60, 65],      // age values
        [1, 1, 1],         // treatment values
      ])
      // All arrays maintain row alignment
    })
  })

  describe('Bug #3: VAR Model Matrix Structure', () => {
    it('should construct row-based matrix, not column-based', async () => {
      const { varModel } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { time: 1, x: 1.0, y: 2.0, z: 3.0 },
        { time: 2, x: 1.5, y: 'invalid', z: 3.5 }, // Filter out
        { time: 3, x: 2.0, y: 2.5, z: 4.0 },
        { time: 4, x: 2.5, y: 3.0, z: 4.5 },
      ]

      mockCallWorkerMethod.mockResolvedValue({
        coefficients: [[[0.5, 0.3], [0.2, 0.4]]],
        residuals: [[0.1, 0.2], [0.15, 0.25]],
        aic: 100,
        bic: 110,
      })

      const result = await varModel({
        data: testData,
        columns: ['x', 'y', 'z'],
        lag: 1,
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(true)

      const workerCall = mockCallWorkerMethod.mock.calls[0]
      const params = workerCall[2] as { data_matrix: number[][] }

      // Should be row-based: [[row1], [row2], [row3]]
      expect(params.data_matrix).toEqual([
        [1.0, 2.0, 3.0],   // Row 1
        [2.0, 2.5, 4.0],   // Row 3
        [2.5, 3.0, 4.5],   // Row 4
      ])
      // NOT column-based: [[x1,x2,x3], [y1,y2,y3], [z1,z2,z3]]
    })
  })
})

describe('Critical Bug Fixes - Input Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Bug #4: K-means Validation', () => {
    it('should reject when n_samples < k', async () => {
      const { kMeansClustering } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
      ]

      const result = await kMeansClustering({
        data: testData,
        columns: ['x', 'y'],
        k: 5,  // k=5 but only 2 valid samples
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('유효한 데이터 수')
      expect(result.error).toContain('군집 수')
      expect(mockCallWorkerMethod).not.toHaveBeenCalled()
    })

    it('should accept when n_samples >= k', async () => {
      const { kMeansClustering } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 4 },
      ]

      mockCallWorkerMethod.mockResolvedValue({
        labels: [0, 1, 0],
        centers: [[1.5, 2.5], [2, 3]],
        inertia: 0.5,
      })

      const result = await kMeansClustering({
        data: testData,
        columns: ['x', 'y'],
        k: 2,
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(true)
      expect(mockCallWorkerMethod).toHaveBeenCalled()
    })
  })

  describe('Bug #5: Hierarchical Clustering Validation', () => {
    it('should reject when fewer than 2 rows', async () => {
      const { hierarchicalClustering } = await import('@/lib/statistics/calculator-handlers/advanced')

      const result = await hierarchicalClustering({
        data: [{ x: 1, y: 2 }],
        columns: ['x', 'y'],
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소')
      expect(mockCallWorkerMethod).not.toHaveBeenCalled()
    })
  })

  describe('Bug #6: ARIMA Data Length Validation', () => {
    it('should reject when insufficient data for ARIMA order', async () => {
      const { arimaForecast } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { value: 100 },
        { value: 105 },
        { value: 110 },
      ]

      const result = await arimaForecast({
        data: testData,
        valueColumn: 'value',
        order: [2, 1, 2],  // p+d+q+1 = 6, but only 3 data points
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('ARIMA')
      expect(result.error).toContain('최소')
      expect(mockCallWorkerMethod).not.toHaveBeenCalled()
    })
  })

  describe('Bug #7: SARIMA Data Length Validation', () => {
    it('should reject when insufficient data for SARIMA parameters', async () => {
      const { sarimaForecast } = await import('@/lib/statistics/calculator-handlers/advanced')

      const testData = [
        { value: 100 },
        { value: 105 },
      ]

      const result = await sarimaForecast({
        data: testData,
        valueColumn: 'value',
        order: [1, 1, 1],
        seasonalOrder: [1, 1, 1, 12],  // Total min length = 18
        pyodideCore: mockPyodideCore,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('SARIMA')
      expect(result.error).toContain('최소')
      expect(mockCallWorkerMethod).not.toHaveBeenCalled()
    })
  })
})
