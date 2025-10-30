/**
 * Phase 6: PyodideCore Service Tests
 *
 * Tests for the core Pyodide functionality that Phase 6 relies on.
 * These tests verify worker loading, method calling, and error handling.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

describe('PyodideCore Service', () => {
  let mockPyodide: any
  let pyodideCore: PyodideCoreService

  beforeEach(() => {
    // Mock Pyodide instance
    mockPyodide = {
      runPythonAsync: jest.fn(),
      globals: {
        get: jest.fn(),
      },
    }

    // Mock loadPyodide
    global.loadPyodide = jest.fn().mockResolvedValue(mockPyodide)
  })

  describe('Worker Loading', () => {
    it('should load workers lazily on first use', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      // Mock worker loading
      mockPyodide.runPythonAsync.mockResolvedValueOnce(undefined) // Worker 1 load
      mockPyodide.globals.get.mockReturnValueOnce({
        toJs: () => ({ result: 'test' }),
      })

      // First call should load the worker
      await pyodideCore.callWorkerMethod(PyodideWorker.Descriptive, 'test_method', {})

      // Verify worker was loaded
      expect(mockPyodide.runPythonAsync).toHaveBeenCalled()
    })

    it('should not reload already loaded workers', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      mockPyodide.runPythonAsync.mockResolvedValue(undefined)
      mockPyodide.globals.get.mockReturnValue({
        toJs: () => ({ result: 'test' }),
      })

      // Call same worker twice
      await pyodideCore.callWorkerMethod(PyodideWorker.Descriptive, 'method1', {})
      const callCount1 = mockPyodide.runPythonAsync.mock.calls.length

      await pyodideCore.callWorkerMethod(PyodideWorker.Descriptive, 'method2', {})
      const callCount2 = mockPyodide.runPythonAsync.mock.calls.length

      // Second call should not reload worker (only call method)
      expect(callCount2).toBe(callCount1 + 1) // Only 1 additional call for method
    })
  })

  describe('Method Calling', () => {
    it('should call worker methods with correct parameters', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      const testParams = { data: [1, 2, 3], column: 'test' }
      const expectedResult = { mean: 2, std: 0.816 }

      mockPyodide.globals.get.mockReturnValue({
        toJs: () => expectedResult,
      })

      const result = await pyodideCore.callWorkerMethod(
        PyodideWorker.Descriptive,
        'descriptive_stats',
        testParams
      )

      expect(result).toEqual(expectedResult)
    })

    it('should handle different worker types', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      mockPyodide.globals.get.mockReturnValue({
        toJs: () => ({ success: true }),
      })

      // Test different workers
      await pyodideCore.callWorkerMethod(PyodideWorker.Descriptive, 'method', {})
      await pyodideCore.callWorkerMethod(PyodideWorker.Hypothesis, 'method', {})
      await pyodideCore.callWorkerMethod(PyodideWorker.NonparametricAnova, 'method', {})
      await pyodideCore.callWorkerMethod(PyodideWorker.RegressionAdvanced, 'method', {})

      // All should succeed
      expect(mockPyodide.globals.get).toHaveBeenCalledTimes(4)
    })
  })

  describe('Error Handling', () => {
    it('should handle Python execution errors gracefully', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      mockPyodide.runPythonAsync.mockRejectedValue(new Error('Python error'))

      await expect(
        pyodideCore.callWorkerMethod(PyodideWorker.Descriptive, 'method', {})
      ).rejects.toThrow('Python error')
    })

    it('should handle missing method errors', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      mockPyodide.globals.get.mockReturnValue(undefined)

      await expect(
        pyodideCore.callWorkerMethod(PyodideWorker.Descriptive, 'nonexistent_method', {})
      ).rejects.toThrow()
    })
  })

  describe('Type Safety', () => {
    it('should preserve type information with generics', async () => {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      pyodideCore = PyodideCoreService.getInstance()

      interface TestResult {
        mean: number
        std: number
      }

      mockPyodide.globals.get.mockReturnValue({
        toJs: () => ({ mean: 5, std: 1.5 }),
      })

      const result = await pyodideCore.callWorkerMethod<TestResult>(
        PyodideWorker.Descriptive,
        'test_method',
        {}
      )

      // TypeScript should enforce type
      expect(result.mean).toBe(5)
      expect(result.std).toBe(1.5)
    })
  })
})
