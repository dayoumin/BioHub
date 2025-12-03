/**
 * Data Management Service
 *
 * Provides unified data clearing and management functions
 * for the statistical analysis platform.
 *
 * @module lib/services/data-management
 */

import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useAnalysisCacheStore } from '@/lib/stores/analysis-cache-store'
import { clearAllHistory } from '@/lib/utils/indexeddb'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

/**
 * Data clearing options
 */
export interface ClearDataOptions {
  /** Clear current analysis session (default: true) */
  clearSession?: boolean
  /** Clear analysis cache (default: true) */
  clearCache?: boolean
  /** Clear IndexedDB history (default: false) */
  clearHistory?: boolean
  /** Reset Pyodide instance (default: false) */
  resetPyodide?: boolean
}

/**
 * Clear all application data with specified options
 *
 * @example
 * // Start new analysis (keep history)
 * await clearAllAppData({ clearHistory: false })
 *
 * // Full reset
 * await clearAllAppData({ clearHistory: true, resetPyodide: true })
 */
export async function clearAllAppData(options: ClearDataOptions = {}): Promise<void> {
  const {
    clearSession = true,
    clearCache = true,
    clearHistory: shouldClearHistory = false,
    resetPyodide = false
  } = options

  console.log('[DataManagement] Clearing app data...', options)

  // 1. Clear current session (Smart Flow state)
  // Use resetSession() to preserve analysisHistory in memory
  // Use reset() only when clearing history as well
  if (clearSession) {
    if (shouldClearHistory) {
      // Full reset including history
      useSmartFlowStore.getState().reset()
    } else {
      // Session-only reset, keep history visible
      useSmartFlowStore.getState().resetSession()
    }
    console.log('[DataManagement] Session cleared')
  }

  // 2. Clear analysis cache
  if (clearCache) {
    useAnalysisCacheStore.getState().clearCache()
    console.log('[DataManagement] Cache cleared')
  }

  // 3. Clear IndexedDB history (optional)
  if (shouldClearHistory) {
    try {
      await clearAllHistory()
      console.log('[DataManagement] IndexedDB history cleared')
    } catch (error) {
      console.warn('[DataManagement] Failed to clear IndexedDB:', error)
    }
  }

  // 4. Reset Pyodide instance (optional, rarely needed)
  if (resetPyodide) {
    try {
      const pyodideService = PyodideCoreService.getInstance()
      pyodideService.dispose()
      console.log('[DataManagement] Pyodide disposed')
    } catch (error) {
      console.warn('[DataManagement] Failed to dispose Pyodide:', error)
    }
  }

  console.log('[DataManagement] Data clearing complete')
}

/**
 * Start a new analysis session
 * Clears current session and cache but preserves history
 */
export async function startNewAnalysis(): Promise<void> {
  await clearAllAppData({
    clearSession: true,
    clearCache: true,
    clearHistory: false,
    resetPyodide: false
  })
}

/**
 * Load different data file (reset for new data)
 * Clears current session but preserves history and cache
 */
export async function loadNewData(): Promise<void> {
  await clearAllAppData({
    clearSession: true,
    clearCache: false, // Keep cache for potential re-analysis
    clearHistory: false,
    resetPyodide: false
  })
}

/**
 * Full application reset
 * Clears everything including history
 */
export async function fullReset(): Promise<void> {
  await clearAllAppData({
    clearSession: true,
    clearCache: true,
    clearHistory: true,
    resetPyodide: true
  })
}

/**
 * Get current memory usage information (if available)
 */
export function getMemoryInfo(): { used?: number; total?: number; percentage?: number } | null {
  // Browser memory API (Chrome only)
  interface PerformanceWithMemory extends Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }

  const perf = performance as PerformanceWithMemory

  if (perf.memory) {
    const used = perf.memory.usedJSHeapSize
    const total = perf.memory.jsHeapSizeLimit
    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round((used / total) * 100)
    }
  }

  return null
}