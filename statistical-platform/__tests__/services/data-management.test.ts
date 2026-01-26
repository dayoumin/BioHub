/**
 * Data Management Service Tests
 *
 * @jest-environment jsdom
 */

import {
  clearAllAppData,
  startNewAnalysis,
  loadNewData,
  fullReset,
  getMemoryInfo,
  ClearDataOptions
} from '@/lib/services/data-management'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { vi, Mock } from 'vitest'
import { useAnalysisCacheStore } from '@/lib/stores/analysis-cache-store'
import * as indexeddb from '@/lib/utils/indexeddb'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

// Mock dependencies
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: {
    getState: vi.fn(() => ({
      reset: vi.fn(),
      resetSession: vi.fn()
    }))
  }
}))

vi.mock('@/lib/stores/analysis-cache-store', () => ({
  useAnalysisCacheStore: {
    getState: vi.fn(() => ({
      clearCache: vi.fn()
    }))
  }
}))

vi.mock('@/lib/utils/indexeddb', () => ({
  clearAllHistory: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: vi.fn(() => ({
      dispose: vi.fn()
    }))
  }
}))

describe('Data Management Service', () => {
  let mockReset: jest.Mock
  let mockResetSession: jest.Mock
  let mockClearCache: jest.Mock
  let mockClearAllHistory: jest.Mock
  let mockDispose: jest.Mock

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks
    mockReset = vi.fn()
    mockResetSession = vi.fn()
    mockClearCache = vi.fn()
    mockClearAllHistory = indexeddb.clearAllHistory as Mock
    mockDispose = vi.fn()

    ;(useSmartFlowStore.getState as Mock).mockReturnValue({
      reset: mockReset,
      resetSession: mockResetSession
    })
    ;(useAnalysisCacheStore.getState as Mock).mockReturnValue({
      clearCache: mockClearCache
    })
    ;(PyodideCoreService.getInstance as Mock).mockReturnValue({
      dispose: mockDispose
    })
  })

  describe('clearAllAppData', () => {
    it('should use resetSession (not reset) by default to preserve history', async () => {
      await clearAllAppData()

      // CRITICAL: resetSession preserves analysisHistory in memory
      expect(mockResetSession).toHaveBeenCalledTimes(1)
      expect(mockReset).not.toHaveBeenCalled() // reset() would clear history
      expect(mockClearCache).toHaveBeenCalledTimes(1)
      expect(mockClearAllHistory).not.toHaveBeenCalled()
      expect(mockDispose).not.toHaveBeenCalled()
    })

    it('should use full reset when clearHistory is true', async () => {
      await clearAllAppData({ clearHistory: true })

      // When clearing history, use full reset()
      expect(mockReset).toHaveBeenCalledTimes(1)
      expect(mockResetSession).not.toHaveBeenCalled()
      expect(mockClearAllHistory).toHaveBeenCalledTimes(1)
    })

    it('should reset Pyodide when option is true', async () => {
      await clearAllAppData({ resetPyodide: true })

      expect(mockDispose).toHaveBeenCalledTimes(1)
    })

    it('should respect all options', async () => {
      const options: ClearDataOptions = {
        clearSession: false,
        clearCache: false,
        clearHistory: true,
        resetPyodide: true
      }

      await clearAllAppData(options)

      expect(mockReset).not.toHaveBeenCalled()
      expect(mockResetSession).not.toHaveBeenCalled()
      expect(mockClearCache).not.toHaveBeenCalled()
      expect(mockClearAllHistory).toHaveBeenCalledTimes(1)
      expect(mockDispose).toHaveBeenCalledTimes(1)
    })

    it('should handle IndexedDB errors gracefully', async () => {
      mockClearAllHistory.mockRejectedValueOnce(new Error('IndexedDB error'))

      // Should not throw
      await expect(clearAllAppData({ clearHistory: true })).resolves.not.toThrow()
    })

    it('should handle Pyodide errors gracefully', async () => {
      mockDispose.mockImplementationOnce(() => {
        throw new Error('Pyodide error')
      })

      // Should not throw
      await expect(clearAllAppData({ resetPyodide: true })).resolves.not.toThrow()
    })
  })

  describe('startNewAnalysis', () => {
    it('should use resetSession to preserve history in memory', async () => {
      await startNewAnalysis()

      // REGRESSION TEST: Must use resetSession, not reset
      // reset() would clear analysisHistory from state
      expect(mockResetSession).toHaveBeenCalledTimes(1)
      expect(mockReset).not.toHaveBeenCalled()
      expect(mockClearCache).toHaveBeenCalledTimes(1)
      expect(mockClearAllHistory).not.toHaveBeenCalled()
      expect(mockDispose).not.toHaveBeenCalled()
    })
  })

  describe('loadNewData', () => {
    it('should use resetSession to preserve history', async () => {
      await loadNewData()

      // Should preserve history
      expect(mockResetSession).toHaveBeenCalledTimes(1)
      expect(mockReset).not.toHaveBeenCalled()
      expect(mockClearCache).not.toHaveBeenCalled()
      expect(mockClearAllHistory).not.toHaveBeenCalled()
      expect(mockDispose).not.toHaveBeenCalled()
    })
  })

  describe('fullReset', () => {
    it('should use full reset to clear everything including history', async () => {
      await fullReset()

      // Full reset uses reset() which clears everything
      expect(mockReset).toHaveBeenCalledTimes(1)
      expect(mockResetSession).not.toHaveBeenCalled()
      expect(mockClearCache).toHaveBeenCalledTimes(1)
      expect(mockClearAllHistory).toHaveBeenCalledTimes(1)
      expect(mockDispose).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMemoryInfo', () => {
    it('should return null when performance.memory is not available', () => {
      const result = getMemoryInfo()

      // In jsdom, performance.memory is not available
      expect(result).toBeNull()
    })

    it('should return memory info when available', () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024 // 200MB
      }

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      })

      const result = getMemoryInfo()

      expect(result).toEqual({
        used: 50,
        total: 200,
        percentage: 25
      })

      // Cleanup
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        configurable: true
      })
    })
  })
})

describe('Integration with UI Components', () => {
  let mockResetSession: jest.Mock
  let mockClearCache: jest.Mock

  beforeEach(() => {
    vi.clearAllMocks()

    mockResetSession = vi.fn()
    mockClearCache = vi.fn()

    ;(useSmartFlowStore.getState as Mock).mockReturnValue({
      reset: vi.fn(),
      resetSession: mockResetSession
    })
    ;(useAnalysisCacheStore.getState as Mock).mockReturnValue({
      clearCache: mockClearCache
    })
  })

  it('should be callable from ResultsActionStep handleNewAnalysis', async () => {
    // Simulate what ResultsActionStep does
    await startNewAnalysis()

    // Verify resetSession is used (not reset) to preserve history
    expect(mockResetSession).toHaveBeenCalledTimes(1)
    expect(useSmartFlowStore.getState).toHaveBeenCalled()
  })

  it('should be callable from AnalysisHistoryPanel handleNewAnalysis', async () => {
    // Simulate what AnalysisHistoryPanel does
    await startNewAnalysis()

    // Verify history is preserved
    expect(mockResetSession).toHaveBeenCalledTimes(1)
    expect(useSmartFlowStore.getState).toHaveBeenCalled()
  })

  it('REGRESSION: startNewAnalysis must NOT call reset() which clears history', async () => {
    const mockReset = vi.fn()
    ;(useSmartFlowStore.getState as Mock).mockReturnValue({
      reset: mockReset,
      resetSession: mockResetSession
    })

    await startNewAnalysis()

    // This is the critical regression test
    // If this fails, users will lose their visible history when clicking "새 분석 시작"
    expect(mockReset).not.toHaveBeenCalled()
    expect(mockResetSession).toHaveBeenCalledTimes(1)
  })
})
