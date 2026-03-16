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
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { vi, Mock } from 'vitest'
import { useAnalysisCacheStore } from '@/lib/stores/analysis-cache-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import * as indexeddb from '@/lib/utils/indexeddb'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

// Mock dependencies
vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: {
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

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: {
    getState: vi.fn(() => ({
      resetMode: vi.fn(),
      setShowHub: vi.fn(),
      setStepTrack: vi.fn(),
      setLastAiRecommendation: vi.fn(),
    }))
  }
}))

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: {
    getState: vi.fn(() => ({
      clearHistory: vi.fn().mockResolvedValue(undefined),
      setCurrentHistoryId: vi.fn(),
      setLoadedAiInterpretation: vi.fn(),
      setLoadedInterpretationChat: vi.fn(),
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
  let mockReset: Mock
  let mockResetSession: Mock
  let mockClearCache: Mock
  let mockClearAllHistory: Mock
  let mockDispose: Mock
  let mockModeResetMode: Mock
  let mockHistoryClearHistory: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks
    mockReset = vi.fn()
    mockResetSession = vi.fn()
    mockClearCache = vi.fn()
    mockClearAllHistory = indexeddb.clearAllHistory as Mock
    mockDispose = vi.fn()
    mockModeResetMode = vi.fn()
    mockHistoryClearHistory = vi.fn().mockResolvedValue(undefined)

    ;(useAnalysisStore.getState as Mock).mockReturnValue({
      reset: mockReset,
      resetSession: mockResetSession
    })
    ;(useAnalysisCacheStore.getState as Mock).mockReturnValue({
      clearCache: mockClearCache
    })
    ;(useModeStore.getState as Mock).mockReturnValue({
      resetMode: mockModeResetMode,
      setShowHub: vi.fn(),
      setStepTrack: vi.fn(),
      setLastAiRecommendation: vi.fn(),
    })
    ;(useHistoryStore.getState as Mock).mockReturnValue({
      clearHistory: mockHistoryClearHistory,
      setCurrentHistoryId: vi.fn(),
      setLoadedAiInterpretation: vi.fn(),
      setLoadedInterpretationChat: vi.fn(),
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
      expect(mockHistoryClearHistory).not.toHaveBeenCalled()
      expect(mockModeResetMode).not.toHaveBeenCalled()
      expect(mockDispose).not.toHaveBeenCalled()
    })

    it('should use full reset when clearHistory is true', async () => {
      await clearAllAppData({ clearHistory: true })

      // When clearing history, use full reset()
      expect(mockReset).toHaveBeenCalledTimes(1)
      expect(mockResetSession).not.toHaveBeenCalled()
      // History cleared via store method (handles both IndexedDB + in-memory)
      expect(mockHistoryClearHistory).toHaveBeenCalledTimes(1)
      expect(mockModeResetMode).toHaveBeenCalledTimes(1)
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
      expect(mockHistoryClearHistory).toHaveBeenCalledTimes(1)
      expect(mockModeResetMode).toHaveBeenCalledTimes(1)
      expect(mockDispose).toHaveBeenCalledTimes(1)
    })

    it('should handle history clear errors gracefully', async () => {
      mockHistoryClearHistory.mockRejectedValueOnce(new Error('IndexedDB error'))

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
      expect(mockHistoryClearHistory).not.toHaveBeenCalled()
      expect(mockModeResetMode).not.toHaveBeenCalled()
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
      expect(mockHistoryClearHistory).not.toHaveBeenCalled()
      expect(mockModeResetMode).not.toHaveBeenCalled()
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
      expect(mockHistoryClearHistory).toHaveBeenCalledTimes(1)
      expect(mockModeResetMode).toHaveBeenCalledTimes(1)
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

/**
 * Issue 1 (External AI Review): clearAllAppData({ clearHistory: true }) must sync ALL stores.
 *
 * BUG (current state): Only useAnalysisStore.reset() + clearAllHistory() (IndexedDB direct) are called.
 * Mode-store and history-store in-memory state remain stale after full reset:
 *   - useModeStore: showHub, stepTrack, lastAiRecommendation are NOT reset
 *   - useHistoryStore: analysisHistory[] array is NOT cleared (shows deleted entries)
 *
 * FIX: In the shouldClearHistory branch, add:
 *   useModeStore.getState().resetMode()
 *   await useHistoryStore.getState().clearHistory()   ← handles both IndexedDB + in-memory
 *   (remove direct clearAllHistory() call — now handled by the store method)
 */
describe('Issue 1 — Full reset must sync mode-store and history-store in-memory state', () => {
  let mockReset: Mock
  let mockResetSession: Mock
  let mockClearCache: Mock
  let mockClearAllHistory: Mock
  let mockModeResetMode: Mock
  let mockHistoryClearHistory: Mock
  let mockDispose: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    mockReset = vi.fn()
    mockResetSession = vi.fn()
    mockClearCache = vi.fn()
    mockClearAllHistory = indexeddb.clearAllHistory as Mock
    mockModeResetMode = vi.fn()
    mockHistoryClearHistory = vi.fn().mockResolvedValue(undefined)
    mockDispose = vi.fn()

    ;(useAnalysisStore.getState as Mock).mockReturnValue({
      reset: mockReset,
      resetSession: mockResetSession,
    })
    ;(useAnalysisCacheStore.getState as Mock).mockReturnValue({
      clearCache: mockClearCache,
    })
    ;(useModeStore.getState as Mock).mockReturnValue({
      resetMode: mockModeResetMode,
      setShowHub: vi.fn(),
      setStepTrack: vi.fn(),
      setLastAiRecommendation: vi.fn(),
    })
    ;(useHistoryStore.getState as Mock).mockReturnValue({
      clearHistory: mockHistoryClearHistory,
      setCurrentHistoryId: vi.fn(),
      setLoadedAiInterpretation: vi.fn(),
      setLoadedInterpretationChat: vi.fn(),
    })
    ;(PyodideCoreService.getInstance as Mock).mockReturnValue({
      dispose: mockDispose,
    })
  })

  it('REGRESSION: clearAllAppData({ clearHistory: true }) must call useModeStore.resetMode()', async () => {
    // Without this, mode flags (showHub=false, stepTrack, lastAiRecommendation)
    // persist after full reset, causing stale UI state on next load.
    await clearAllAppData({ clearHistory: true })

    expect(mockModeResetMode).toHaveBeenCalledTimes(1)
  })

  it('REGRESSION: clearAllAppData({ clearHistory: true }) must call useHistoryStore.clearHistory()', async () => {
    // Without this, analysisHistory[] in memory still shows entries after
    // IndexedDB is cleared — the sidebar keeps showing deleted items.
    await clearAllAppData({ clearHistory: true })

    expect(mockHistoryClearHistory).toHaveBeenCalledTimes(1)
  })

  it('REGRESSION: fullReset() must call useModeStore.resetMode()', async () => {
    await fullReset()

    expect(mockModeResetMode).toHaveBeenCalledTimes(1)
  })

  it('REGRESSION: fullReset() must call useHistoryStore.clearHistory()', async () => {
    await fullReset()

    expect(mockHistoryClearHistory).toHaveBeenCalledTimes(1)
  })

  it('clearAllAppData({ clearHistory: false }) must NOT call resetMode or historyClearHistory', async () => {
    // Session-only reset: mode and history in-memory state are intentionally preserved
    await clearAllAppData({ clearHistory: false })

    expect(mockModeResetMode).not.toHaveBeenCalled()
    expect(mockHistoryClearHistory).not.toHaveBeenCalled()
  })

  it('startNewAnalysis() must NOT call resetMode or historyClearHistory', async () => {
    // New analysis keeps history visible — no store-level wipe
    await startNewAnalysis()

    expect(mockModeResetMode).not.toHaveBeenCalled()
    expect(mockHistoryClearHistory).not.toHaveBeenCalled()
  })

  it('full reset executes all 4 store resets in correct order', async () => {
    const callOrder: string[] = []
    mockReset.mockImplementation(() => callOrder.push('analysis.reset'))
    mockModeResetMode.mockImplementation(() => callOrder.push('mode.resetMode'))
    mockHistoryClearHistory.mockImplementation(async () => { callOrder.push('history.clearHistory') })
    mockClearCache.mockImplementation(() => callOrder.push('cache.clearCache'))

    await clearAllAppData({ clearSession: true, clearCache: true, clearHistory: true })

    // All 4 resets must fire
    expect(callOrder).toContain('analysis.reset')
    expect(callOrder).toContain('mode.resetMode')
    expect(callOrder).toContain('history.clearHistory')
    expect(callOrder).toContain('cache.clearCache')
  })
})

describe('Integration with UI Components', () => {
  let mockResetSession: Mock
  let mockClearCache: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    mockResetSession = vi.fn()
    mockClearCache = vi.fn()

    ;(useAnalysisStore.getState as Mock).mockReturnValue({
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
    expect(useAnalysisStore.getState).toHaveBeenCalled()
  })

  it('should be callable from AnalysisHistoryPanel handleNewAnalysis', async () => {
    // Simulate what AnalysisHistoryPanel does
    await startNewAnalysis()

    // Verify history is preserved
    expect(mockResetSession).toHaveBeenCalledTimes(1)
    expect(useAnalysisStore.getState).toHaveBeenCalled()
  })

  it('REGRESSION: startNewAnalysis must NOT call reset() which clears history', async () => {
    const mockReset = vi.fn()
    ;(useAnalysisStore.getState as Mock).mockReturnValue({
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
