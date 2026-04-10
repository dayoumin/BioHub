import { SESSION_STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { create } from 'zustand'
import {
  StatisticalMethod,
  AnalysisResult,
  AnalysisOptions,
  DEFAULT_ANALYSIS_OPTIONS,
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
  initStorage,
  updateHistory,
  syncHistoryRecord,
} from '@/lib/utils/storage'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'
import { buildAnalysisEvidence } from '@/lib/research/evidence-factory'
import { removeProjectEntityRef, upsertProjectEntityRef } from '@/lib/research/project-storage'

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
  projectId?: string
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
  paperDraft?: PaperDraft | null
}

export interface HistoryState {
  analysisHistory: AnalysisHistory[]
  currentHistoryId: string | null
  /** 히스토리 로드 시 복원된 AI 해석 본문 (ResultsActionStep에서 소비 후 null) */
  loadedAiInterpretation: string | null
  /** 히스토리 로드 시 복원된 후속 Q&A 대화 (ResultsActionStep에서 소비 후 null) */
  loadedInterpretationChat: ChatMessage[] | null
  /** 히스토리 로드 시 복원된 논문 초안 (PaperDraftPanel에서 소비) */
  loadedPaperDraft: PaperDraft | null

  // 액션
  setCurrentHistoryId: (id: string | null) => void
  setLoadedAiInterpretation: (text: string | null) => void
  setLoadedInterpretationChat: (chat: ChatMessage[] | null) => void
  setLoadedPaperDraft: (draft: PaperDraft | null) => void
  patchHistoryPaperDraft: (historyId: string, paperDraft: PaperDraft | null) => Promise<void>

  saveToHistory: (
    /** 분석 상태 스냅샷 (analysis-store에서 전달) */
    snapshot: HistorySnapshot,
    name?: string,
    metadata?: {
      projectId?: string
      aiInterpretation?: string | null
      apaFormat?: string | null
      interpretationModel?: string | null
      interpretationChat?: ChatMessage[]
      paperDraft?: PaperDraft | null
    }
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
  analysisOptions: AnalysisOptions
  lastAiRecommendation: AiRecommendationContext | null
}

/** loadFromHistory가 반환하는 복원 데이터 (analysis-store가 소비) */
export interface HistoryLoadResult {
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null
  analysisOptions: AnalysisOptions
  results: AnalysisResult | null
  uploadedFileName: string | null
  currentStep: number
  completedSteps: number[]
  loadedAiInterpretation: string | null
  loadedInterpretationChat: ChatMessage[] | null
  loadedPaperDraft: PaperDraft | null
}

/** loadSettingsFromHistory가 반환하는 설정 데이터 */
export interface HistorySettingsResult {
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null
  analysisPurpose: string
  analysisOptions: AnalysisOptions
}

/**
 * Executor 결과 → 변환 후 반환 (이미 변환됐으면 as-is).
 *
 * **참조 계약**: 변환이 불필요하면 `raw`를 그대로 반환한다 (새 객체를 생성하지 않음).
 * 호출부에서 `transformed !== raw`로 변환 여부를 판단할 수 있다.
 */
function migrateResults(
  raw: Record<string, unknown> | null,
  label?: string
): Record<string, unknown> | null {
  if (!raw) return null
  if (isExecutorResult(raw)) {
    try {
      const transformed = transformExecutorResult(raw as unknown as ExecutorResult)
      if (label) console.log(`[${label}] Transformed executor result`)
      return transformed as unknown as Record<string, unknown>
    } catch (error) {
      console.error('[History] Failed to transform result:', error)
      return raw
    }
  }
  return raw
}

/** IndexedDB 히스토리 → UI AnalysisHistory 변환 */
function toAnalysisHistory(records: HistoryRecord[]): AnalysisHistory[] {
  return records.map(h => ({
    ...h,
    timestamp: new Date(h.timestamp)
  }))
}

function normalizeAnalysisOptions(
  analysisOptions: Record<string, unknown> | undefined
): AnalysisOptions {
  if (!analysisOptions) return { ...DEFAULT_ANALYSIS_OPTIONS }

  const normalizedAlpha = typeof analysisOptions.alpha === 'number'
    ? analysisOptions.alpha
    : typeof analysisOptions.confidenceLevel === 'number' &&
        analysisOptions.confidenceLevel > 0 &&
        analysisOptions.confidenceLevel < 1
      ? Number((1 - analysisOptions.confidenceLevel).toFixed(10))
      : DEFAULT_ANALYSIS_OPTIONS.alpha

  const normalized = {
    ...DEFAULT_ANALYSIS_OPTIONS,
    ...analysisOptions,
    alpha: normalizedAlpha,
  } as Record<string, unknown>

  delete normalized.confidenceLevel

  return normalized as unknown as AnalysisOptions
}

function syncAnovaMethodVariant(
  analysisOptions: Record<string, unknown> | undefined,
  methodId?: string | null,
  results?: AnalysisResult | null
): AnalysisOptions {
  const normalized = normalizeAnalysisOptions(analysisOptions)
  const canonicalMethodId = methodId ? (getMethodByIdOrAlias(methodId)?.id ?? methodId) : methodId

  if (canonicalMethodId !== 'one-way-anova') {
    return normalized
  }

  const methodSettings = {
    ...(normalized.methodSettings ?? {}),
  }

  if (results?.testVariant === 'welch') {
    methodSettings.welch = true
  } else if (results?.testVariant === 'standard') {
    methodSettings.welch = false
  }

  return {
    ...normalized,
    methodSettings,
  }
}

function resolveHistoryMethod(
  method: HistoryRecord['method'] | null | undefined
): StatisticalMethod | null {
  if (!method) return null
  return (getMethodByIdOrAlias(method.id) as StatisticalMethod | null) ?? null
}

export const useHistoryStore = create<HistoryState>()((set) => ({
  analysisHistory: [],
  currentHistoryId: null,
  loadedAiInterpretation: null,
  loadedInterpretationChat: null,
  loadedPaperDraft: null,

  setCurrentHistoryId: (id) => set({ currentHistoryId: id }),
  setLoadedAiInterpretation: (text) => set({ loadedAiInterpretation: text }),
  setLoadedInterpretationChat: (chat) => set({ loadedInterpretationChat: chat }),
  setLoadedPaperDraft: (draft) => set({ loadedPaperDraft: draft }),

  patchHistoryPaperDraft: async (historyId, paperDraft) => {
    await updateHistory(historyId, { paperDraft })
    await syncHistoryRecord(historyId)
    set((state) => ({
      analysisHistory: state.analysisHistory.map(h =>
        h.id === historyId ? { ...h, paperDraft } : h
      ),
    }))
  },

  saveToHistory: async (snapshot, name, metadata) => {
    if (!snapshot.results) return

    if (!isIndexedDBAvailable()) {
      console.warn('[History] IndexedDB is not available')
      throw new Error('IndexedDB not available')
    }

    const historyId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const syncedAnalysisOptions = syncAnovaMethodVariant(
      snapshot.analysisOptions as unknown as Record<string, unknown>,
      snapshot.selectedMethod?.id,
      snapshot.results
    )

    // Evidence 조립 (AI 추천 근거 + AI 해석 출처)
    const evidenceRecords = buildAnalysisEvidence({
      historyId,
      methodName: snapshot.selectedMethod?.name,
      aiRecommendation: snapshot.lastAiRecommendation,
      aiInterpretation: metadata?.aiInterpretation,
      interpretationModel: metadata?.interpretationModel,
    })

    const record: HistoryRecord = {
      id: historyId,
      timestamp: Date.now(),
      name: name || `분석 ${new Date().toLocaleString('ko-KR')}`,
      projectId: metadata?.projectId,
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
      analysisOptions: syncedAnalysisOptions as Record<string, unknown> & typeof snapshot.analysisOptions,
      analysisPurpose: snapshot.analysisPurpose,
      aiRecommendation: snapshot.lastAiRecommendation ?? null,
      interpretationChat: metadata?.interpretationChat?.length ? metadata.interpretationChat : undefined,
      paperDraft: metadata?.paperDraft ?? null,
      evidenceRecords: evidenceRecords.length > 0 ? evidenceRecords : undefined,
    }

    try {
      await saveHistory(record)
      if (record.projectId) {
        try {
          upsertProjectEntityRef({
            projectId: record.projectId,
            entityKind: 'analysis',
            entityId: record.id,
            label: record.name,
          })
        } catch (linkError) {
          try {
            await deleteHistory(record.id)
          } catch (rollbackError) {
            console.error('[History] Failed to rollback saved record after project link error:', rollbackError)
          }
          throw linkError
        }
      }
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

    const migratedResults = migrateResults(record.results) as AnalysisResult | null
    const selectedMethod = resolveHistoryMethod(record.method)

    const result: HistoryLoadResult = {
      analysisPurpose: record.purpose,
      selectedMethod,
      variableMapping: record.variableMapping ?? null,
      analysisOptions: syncAnovaMethodVariant(
        record.analysisOptions,
        selectedMethod?.id ?? record.method?.id ?? null,
        migratedResults
      ),
      results: migratedResults,
      uploadedFileName: record.dataFileName,
      currentStep: MAX_STEPS,
      completedSteps: Array.from({ length: MAX_STEPS }, (_, index) => index + 1),
      loadedAiInterpretation: record.aiInterpretation ?? null,
      loadedInterpretationChat: record.interpretationChat?.length ? record.interpretationChat : null,
      loadedPaperDraft: record.paperDraft ?? null,
    }

    // 히스토리 스토어 자체 상태 업데이트
    set({
      currentHistoryId: historyId,
      loadedAiInterpretation: result.loadedAiInterpretation,
      loadedInterpretationChat: result.loadedInterpretationChat,
      loadedPaperDraft: result.loadedPaperDraft,
    })

    return result
  },

  deleteFromHistory: async (historyId) => {
    const record = await getHistory(historyId)
    await deleteHistory(historyId)
    try {
      if (record?.projectId) {
        removeProjectEntityRef(record.projectId, 'analysis', historyId)
      }
    } catch (error) {
      if (record) {
        try {
          await saveHistory(record)
        } catch (rollbackError) {
          console.error('[History] Failed to rollback deleted history after project unlink error:', rollbackError)
        }
      }
      throw error
    }
    const allHistory = await getAllHistory()
    set((state) => ({
      analysisHistory: toAnalysisHistory(allHistory),
      currentHistoryId: state.currentHistoryId === historyId ? null : state.currentHistoryId
    }))
  },

  loadSettingsFromHistory: async (historyId) => {
    const record = await getHistory(historyId)
    if (!record) return null

    const selectedMethod = resolveHistoryMethod(record.method)

    return {
      selectedMethod,
      variableMapping: record.variableMapping ?? null,
      analysisPurpose: record.analysisPurpose ?? '',
      analysisOptions: syncAnovaMethodVariant(
        record.analysisOptions,
        selectedMethod?.id ?? record.method?.id ?? null,
        record.results as AnalysisResult | null
      ),
    }
  },

  clearHistory: async () => {
    const records = await getAllHistory()
    await clearAllHistory()
    const removedRefs: Array<{ projectId: string; entityId: string }> = []
    try {
      for (const record of records) {
        if (record.projectId) {
          removeProjectEntityRef(record.projectId, 'analysis', record.id)
          removedRefs.push({ projectId: record.projectId, entityId: record.id })
        }
      }
    } catch (error) {
      try {
        // 이미 삭제된 ref 복원
        for (const ref of removedRefs) {
          upsertProjectEntityRef({
            projectId: ref.projectId,
            entityKind: 'analysis',
            entityId: ref.entityId,
            label: records.find(r => r.id === ref.entityId)?.name ?? '',
          })
        }
        // IndexedDB 레코드 복원
        for (const record of records) {
          await saveHistory(record)
        }
      } catch (rollbackError) {
        console.error('[History] Failed to rollback cleared history after project unlink error:', rollbackError)
      }
      throw error
    }
    set({ analysisHistory: [], currentHistoryId: null })
  },

  loadHistoryFromDB: async () => {
    if (!isIndexedDBAvailable()) {
      console.warn('[History] IndexedDB not available, skipping history load')
      return
    }

    await initStorage()

    // === 마이그레이션 (sessionStorage → IndexedDB, 병합) ===
    try {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEYS.analysis.store)
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        const oldHistory = parsed?.state?.analysisHistory

        if (oldHistory && Array.isArray(oldHistory) && oldHistory.length > 0) {
          // Pre-assign stable IDs to id-less items so partial-failure retries can dedup
          let idsAssigned = false
          for (const item of oldHistory) {
            if (item && !item.id) {
              item.id = `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              idsAssigned = true
            }
          }
          if (idsAssigned) {
            parsed.state.analysisHistory = oldHistory
            sessionStorage.setItem(SESSION_STORAGE_KEYS.analysis.store, JSON.stringify(parsed))
          }

          const existingHistory = await getAllHistory()
          const existingIds = new Set(existingHistory.map(item => item.id))
          const missingHistory = oldHistory.filter(
            (item: Record<string, unknown>) => item?.id && !existingIds.has(String(item.id))
          )

          if (missingHistory.length > 0) {
            console.log('[Migration] Copying', missingHistory.length, 'missing histories')

            for (const item of missingHistory) {
              const record: HistoryRecord = {
                id: String(item.id),
                timestamp: item.timestamp ? new Date(item.timestamp as string | number).getTime() : Date.now(),
                name: (item.name as string) || 'Migrated Analysis',
                purpose: (item.purpose as string) || (item.analysisPurpose as string) || '',
                method: item.method ? {
                  id: (item.method as Record<string, string>).id || 'unknown',
                  name: (item.method as Record<string, string>).name || 'Unknown Method',
                  category: (item.method as Record<string, string>).category || 'unknown',
                  description: (item.method as Record<string, string>).description
                } : null,
                variableMapping: item.variableMapping as HistoryRecord['variableMapping'] ?? null,
                analysisOptions: normalizeAnalysisOptions(item.analysisOptions as Record<string, unknown>) as Record<string, unknown> & AnalysisOptions,
                dataFileName: (item.dataFileName as string) || 'unknown',
                dataRowCount: (item.dataRowCount as number) || 0,
                results: migrateResults(item.results as Record<string, unknown> | null, 'Migration'),
                aiInterpretation: typeof item.aiInterpretation === 'string' ? item.aiInterpretation : null,
                apaFormat: typeof item.apaFormat === 'string' ? item.apaFormat : null,
                analysisPurpose: (item.analysisPurpose as string) || (item.purpose as string) || '',
                aiRecommendation: item.aiRecommendation as HistoryRecord['aiRecommendation'] ?? null,
                interpretationChat: Array.isArray(item.interpretationChat) ? item.interpretationChat : undefined,
              }
              await saveHistory(record)
            }

            console.log('[Migration] Successfully migrated', missingHistory.length, 'histories')
          }

          delete parsed.state.analysisHistory
          sessionStorage.setItem(SESSION_STORAGE_KEYS.analysis.store, JSON.stringify(parsed))
        }
      }
    } catch (error) {
      console.warn('[Migration] Failed to migrate sessionStorage history:', error)
    }

    // === IndexedDB에서 로드 + Executor 형식 변환 ===
    const allHistory = await getAllHistory()
    const transformedHistory: AnalysisHistory[] = []

    for (const h of allHistory) {
      const transformed = migrateResults(h.results, 'History Load')
      if (transformed !== h.results) {
        await saveHistory({ ...h, results: transformed }, true)
      }

      transformedHistory.push({
        ...h,
        results: transformed,
        timestamp: new Date(h.timestamp)
      })
    }

    set({ analysisHistory: transformedHistory })
  },
}))
