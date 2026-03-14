import { create } from 'zustand'
import {
  StatisticalMethod,
  AnalysisResult,
} from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { getMethodByIdOrAlias } from '@/lib/constants/statistical-methods'
import type { HistoryRecord, AiRecommendationContext } from '@/lib/utils/storage-types'
import type { ChatMessage } from '@/lib/types/chat'
import { isIndexedDBAvailable } from '@/lib/utils/adapters/indexeddb-adapter'
import { transformExecutorResult, isExecutorResult } from '@/lib/utils/result-transformer'
import type { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'
import {
  saveHistory,
  getAllHistory,
  getHistory,
  deleteHistory,
  clearAllHistory,
  initStorage
} from '@/lib/utils/storage'

/**
 * 분석 히스토리 상태 관리
 *
 * IndexedDB 기반 히스토리 CRUD + 마이그레이션.
 * 분석 상태 복원 시 useAnalysisStore / useModeStore를 직접 호출.
 */

// Smart Flow 총 단계 수
const MAX_STEPS = 4

/** UI용 히스토리 항목 */
export interface AnalysisHistory {
  id: string
  timestamp: Date
  name: string
  purpose: string
  method: {
    id: string
    name: string
    category: string
    description?: string
  } | null
  dataFileName: string
  dataRowCount: number
  results: Record<string, unknown> | null
  aiInterpretation?: string | null
  apaFormat?: string | null
  aiRecommendation?: AiRecommendationContext | null
}

export interface HistoryState {
  analysisHistory: AnalysisHistory[]
  currentHistoryId: string | null
  /** 히스토리 로드 시 복원된 AI 해석 본문 (ResultsActionStep에서 소비 후 null) */
  loadedAiInterpretation: string | null
  /** 히스토리 로드 시 복원된 후속 Q&A 대화 (ResultsActionStep에서 소비 후 null) */
  loadedInterpretationChat: ChatMessage[] | null

  // 액션
  setCurrentHistoryId: (id: string | null) => void
  setLoadedAiInterpretation: (text: string | null) => void
  setLoadedInterpretationChat: (chat: ChatMessage[] | null) => void

  saveToHistory: (
    /** 분석 상태 스냅샷 (analysis-store에서 전달) */
    snapshot: HistorySnapshot,
    name?: string,
    metadata?: { aiInterpretation?: string | null; apaFormat?: string | null; interpretationChat?: ChatMessage[] }
  ) => Promise<void>
  loadFromHistory: (historyId: string) => Promise<HistoryLoadResult | null>
  deleteFromHistory: (historyId: string) => Promise<void>
  clearHistory: () => Promise<void>
  loadHistoryFromDB: () => Promise<void>
  loadSettingsFromHistory: (historyId: string) => Promise<HistorySettingsResult | null>
}

/** saveToHistory에 필요한 분석 상태 스냅샷 */
export interface HistorySnapshot {
  results: AnalysisResult | null
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  uploadedFileName: string | null
  uploadedDataLength: number
  variableMapping: VariableMapping | null
  lastAiRecommendation: AiRecommendationContext | null
}

/** loadFromHistory가 반환하는 복원 데이터 (analysis-store가 소비) */
export interface HistoryLoadResult {
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  results: AnalysisResult | null
  uploadedFileName: string | null
  currentStep: number
  completedSteps: number[]
  loadedAiInterpretation: string | null
  loadedInterpretationChat: ChatMessage[] | null
}

/** loadSettingsFromHistory가 반환하는 설정 데이터 */
export interface HistorySettingsResult {
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null
  analysisPurpose: string
}

/** Executor 결과 마이그레이션 헬퍼 */
function migrateResults(raw: Record<string, unknown> | null): AnalysisResult | null {
  if (!raw) return null
  if (isExecutorResult(raw)) {
    try {
      return transformExecutorResult(raw as unknown as ExecutorResult)
    } catch (error) {
      console.error('[History Migration] Failed to transform:', error)
      return raw as unknown as AnalysisResult
    }
  }
  return raw as unknown as AnalysisResult
}

/** IndexedDB 히스토리 → UI AnalysisHistory 변환 */
function toAnalysisHistory(records: HistoryRecord[]): AnalysisHistory[] {
  return records.map(h => ({
    ...h,
    timestamp: new Date(h.timestamp)
  }))
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  analysisHistory: [],
  currentHistoryId: null,
  loadedAiInterpretation: null,
  loadedInterpretationChat: null,

  setCurrentHistoryId: (id) => set({ currentHistoryId: id }),
  setLoadedAiInterpretation: (text) => set({ loadedAiInterpretation: text }),
  setLoadedInterpretationChat: (chat) => set({ loadedInterpretationChat: chat }),

  saveToHistory: async (snapshot, name, metadata) => {
    if (!snapshot.results) return

    if (!isIndexedDBAvailable()) {
      console.warn('[History] IndexedDB is not available')
      throw new Error('IndexedDB not available')
    }

    const record: HistoryRecord = {
      id: `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      name: name || `분석 ${new Date().toLocaleString('ko-KR')}`,
      purpose: snapshot.analysisPurpose,
      method: snapshot.selectedMethod ? {
        id: snapshot.selectedMethod.id,
        name: snapshot.selectedMethod.name,
        category: snapshot.selectedMethod.category,
        description: snapshot.selectedMethod.description
      } : null,
      dataFileName: snapshot.uploadedFileName || 'unknown',
      dataRowCount: snapshot.uploadedDataLength,
      results: snapshot.results as unknown as Record<string, unknown> | null,
      aiInterpretation: metadata?.aiInterpretation ?? null,
      apaFormat: metadata?.apaFormat ?? null,
      variableMapping: snapshot.variableMapping,
      analysisPurpose: snapshot.analysisPurpose,
      aiRecommendation: snapshot.lastAiRecommendation ?? null,
      interpretationChat: metadata?.interpretationChat?.length ? metadata.interpretationChat : undefined
    }

    try {
      await saveHistory(record)
      const allHistory = await getAllHistory()
      set({
        analysisHistory: toAnalysisHistory(allHistory),
        currentHistoryId: record.id
      })
    } catch (error) {
      console.error('[History] Failed to save:', error)
      throw error
    }
  },

  loadFromHistory: async (historyId) => {
    const record = await getHistory(historyId)
    if (!record) return null

    const migratedResults = migrateResults(record.results)

    const result: HistoryLoadResult = {
      analysisPurpose: record.purpose,
      selectedMethod: (record.method && typeof record.method === 'object' && 'id' in record.method)
        ? (getMethodByIdOrAlias(record.method.id as string) as StatisticalMethod | null) ?? null
        : null,
      results: migratedResults,
      uploadedFileName: record.dataFileName,
      currentStep: MAX_STEPS,
      completedSteps: Array.from({ length: MAX_STEPS }, (_, index) => index + 1),
      loadedAiInterpretation: record.aiInterpretation ?? null,
      loadedInterpretationChat: record.interpretationChat?.length ? record.interpretationChat : null,
    }

    // 히스토리 스토어 자체 상태 업데이트
    set({
      currentHistoryId: historyId,
      loadedAiInterpretation: result.loadedAiInterpretation,
      loadedInterpretationChat: result.loadedInterpretationChat,
    })

    return result
  },

  deleteFromHistory: async (historyId) => {
    await deleteHistory(historyId)
    const allHistory = await getAllHistory()
    set((state) => ({
      analysisHistory: toAnalysisHistory(allHistory),
      currentHistoryId: state.currentHistoryId === historyId ? null : state.currentHistoryId
    }))
  },

  loadSettingsFromHistory: async (historyId) => {
    const record = await getHistory(historyId)
    if (!record) return null

    return {
      selectedMethod: record.method ? {
        id: record.method.id,
        name: record.method.name,
        category: record.method.category as StatisticalMethod['category'],
        description: record.method.description ?? ''
      } : null,
      variableMapping: record.variableMapping ?? null,
      analysisPurpose: record.analysisPurpose ?? '',
    }
  },

  clearHistory: async () => {
    await clearAllHistory()
    set({ analysisHistory: [], currentHistoryId: null })
  },

  loadHistoryFromDB: async () => {
    if (!isIndexedDBAvailable()) {
      console.warn('[History] IndexedDB not available, skipping history load')
      return
    }

    await initStorage()

    // === 마이그레이션 (sessionStorage → IndexedDB, 일회성) ===
    try {
      const sessionData = sessionStorage.getItem('analysis-storage')
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        const oldHistory = parsed?.state?.analysisHistory

        if (oldHistory && Array.isArray(oldHistory) && oldHistory.length > 0) {
          const existingHistory = await getAllHistory()
          if (existingHistory.length === 0) {
            console.log('[Migration] Copying', oldHistory.length, 'histories from sessionStorage to IndexedDB')

            for (const item of oldHistory) {
              const migratedResults = item.results
                ? (isExecutorResult(item.results as Record<string, unknown>)
                  ? (() => {
                    try {
                      const transformed = transformExecutorResult(item.results as unknown as ExecutorResult) as unknown as Record<string, unknown>
                      console.log('[Migration] Transformed executor result for:', item.id || item.name)
                      return transformed
                    } catch (error) {
                      console.error('[Migration] Failed to transform result:', error)
                      return item.results as Record<string, unknown>
                    }
                  })()
                  : item.results as Record<string, unknown>)
                : null

              const record: HistoryRecord = {
                id: item.id || `migrated-${Date.now()}-${Math.random()}`,
                timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
                name: item.name || 'Migrated Analysis',
                purpose: item.purpose || '',
                method: item.method ? {
                  id: item.method.id || 'unknown',
                  name: item.method.name || 'Unknown Method',
                  category: item.method.category || 'unknown',
                  description: item.method.description
                } : null,
                dataFileName: item.dataFileName || 'unknown',
                dataRowCount: item.dataRowCount || 0,
                results: migratedResults,
                aiInterpretation: typeof item.aiInterpretation === 'string' ? item.aiInterpretation : null,
                apaFormat: typeof item.apaFormat === 'string' ? item.apaFormat : null
              }
              await saveHistory(record)
            }

            console.log('[Migration] Successfully migrated', oldHistory.length, 'histories')
            delete parsed.state.analysisHistory
            sessionStorage.setItem('analysis-storage', JSON.stringify(parsed))
          }
        }
      }
    } catch (error) {
      console.warn('[Migration] Failed to migrate sessionStorage history:', error)
    }

    // === IndexedDB에서 로드 + Executor 형식 변환 ===
    const allHistory = await getAllHistory()
    const transformedHistory: AnalysisHistory[] = []
    let needsPersist = false

    for (const h of allHistory) {
      let transformedResults = h.results

      if (h.results) {
        const results = h.results as Record<string, unknown>
        if (isExecutorResult(results)) {
          try {
            transformedResults = transformExecutorResult(results as unknown as ExecutorResult) as unknown as Record<string, unknown>
            console.log('[History Load] Transformed executor result for:', h.id || h.name)
            needsPersist = true
            await saveHistory({ ...h, results: transformedResults }, true)
          } catch (error) {
            console.error('[History Load] Failed to transform result:', error)
          }
        }
      }

      transformedHistory.push({
        ...h,
        results: transformedResults,
        timestamp: new Date(h.timestamp)
      })
    }

    if (needsPersist) {
      console.log('[History Load] Persisted transformed results to IndexedDB')
    }

    set({ analysisHistory: transformedHistory })
  },
}))
