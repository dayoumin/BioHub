import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  ValidationResults,
  StatisticalMethod,
  AnalysisResult,
  DataRow,
  StatisticalAssumptions,
  SuggestedSettings
} from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { DataCharacteristics } from '@/lib/statistics/data-type-detector'
import type {
  CompatibilityResult,
  DataSummary,
  AssumptionResults
} from '@/lib/statistics/data-method-compatibility'
import {
  extractDataSummary,
  getStructuralCompatibilityMap,
  mergeAssumptionResults,
  extractAssumptionResults
} from '@/lib/statistics/data-method-compatibility'
import {
  saveHistory,
  getAllHistory,
  getHistory,
  deleteHistory,
  clearAllHistory,
  initStorage
} from '@/lib/utils/storage'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import { isIndexedDBAvailable } from '@/lib/utils/adapters/indexeddb-adapter'
import { transformExecutorResult } from '@/lib/utils/result-transformer'
import type { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'

/**
 * AI가 Step 2에서 감지한 변수 정보
 * Step 3 변수 선택의 초기값으로 사용
 */
export interface DetectedVariables {
  /** Factor variables for ANOVA (e.g., ['gender', 'treatment']) */
  factors?: string[]
  /** Group variable for t-test/one-way ANOVA */
  groupVariable?: string
  /** Suggested dependent variable */
  dependentCandidate?: string
  /** Numeric variables for correlation */
  numericVars?: string[]
  /** Paired variables for paired tests */
  pairedVars?: [string, string]
  /** Independent variables for regression (LLM enhanced) */
  independentVars?: string[]
  /** Covariate variables for ANCOVA (LLM enhanced) */
  covariates?: string[]
}

/**
 * Smart Flow Store - 전역 상태 관리
 *
 * ====== 저장소 전략 (Storage Strategy) ======
 *
 * 1. IndexedDB (영구 저장)
 *    - 용도: 분석 히스토리 (analysisHistory)
 *    - 위치: lib/utils/indexeddb.ts
 *    - 최대: 100개 레코드
 *
 * 2. sessionStorage (세션 유지)
 *    - 용도: 현재 진행 중인 분석 상태
 *    - 저장 항목: currentStep, uploadedData, selectedMethod, results 등
 *    - ❌ analysisHistory는 제외 (partialize에서 명시적 제외)
 *
 * 3. localStorage (별도 관리)
 *    - 용도: 즐겨찾기 (statPlatform_favorites)
 *    - 이 스토어에서 관리하지 않음
 *
 * ====== 마이그레이션 ======
 * loadHistoryFromDB()에 기존 sessionStorage → IndexedDB 마이그레이션 코드 포함
 * (기존 사용자 데이터 보존용, 한 번 실행 후 자동 삭제)
 */

// Smart Flow 총 단계 수 (2025-11-26: 5 → 4단계로 축소)
const MAX_STEPS = 4

// 분석 히스토리 타입 (UI용 - IndexedDB와 호환)
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
}

interface SmartFlowState {
  // 현재 단계
  currentStep: number
  completedSteps: number[]

  // 데이터
  uploadedFile: File | null
  uploadedData: DataRow[] | null
  uploadedFileName?: string | null

  // 데이터 특성 (새로 추가)
  dataCharacteristics: DataCharacteristics | null

  // 검증
  validationResults: ValidationResults | null

  // 통계적 가정 검정 결과 (새로 추가)
  assumptionResults: StatisticalAssumptions | null

  // 데이터-방법 호환성 (NEW)
  dataSummary: DataSummary | null
  methodCompatibility: Map<string, CompatibilityResult> | null

  // 분석 설정
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null

  // AI 감지 변수 (Step 2 -> Step 3 전달용)
  detectedVariables: DetectedVariables | null
  // AI 추천 설정 (Step 2 -> Step 4 전달용)
  suggestedSettings: SuggestedSettings | null

  // 분석 결과
  results: AnalysisResult | null

  // 히스토리
  analysisHistory: AnalysisHistory[]
  currentHistoryId: string | null

  // 재분석 모드
  isReanalysisMode: boolean

  // 허브 & 빠른 분석 모드
  showHub: boolean
  quickAnalysisMode: boolean
  // Step 2 입력 모드 (AI 추천 vs 직접 선택)
  purposeInputMode: 'ai' | 'browse'

  // 상태
  isLoading: boolean
  error: string | null
  
  // 액션
  setCurrentStep: (step: number) => void
  addCompletedStep: (step: number) => void
  setUploadedFile: (file: File | null) => void
  setUploadedData: (data: DataRow[] | null) => void
  setUploadedFileName: (name: string | null) => void
  setDataCharacteristics: (characteristics: DataCharacteristics | null) => void
  setValidationResults: (results: ValidationResults | null) => void
  setAssumptionResults: (results: StatisticalAssumptions | null) => void
  setDataSummary: (summary: DataSummary | null) => void
  setMethodCompatibility: (compatibility: Map<string, CompatibilityResult> | null) => void
  updateCompatibility: () => void  // Recalculate compatibility based on current data/assumptions
  setAnalysisPurpose: (purpose: string) => void
  setSelectedMethod: (method: StatisticalMethod | null) => void
  setVariableMapping: (mapping: VariableMapping | null) => void
  setDetectedVariables: (vars: DetectedVariables | null) => void
  setSuggestedSettings: (settings: SuggestedSettings | null) => void
  setResults: (results: AnalysisResult | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 히스토리 액션 (비동기)
  saveToHistory: (name?: string) => Promise<void>
  loadFromHistory: (historyId: string) => Promise<void>
  deleteFromHistory: (historyId: string) => Promise<void>
  clearHistory: () => Promise<void>
  loadHistoryFromDB: () => Promise<void>
  loadSettingsFromHistory: (historyId: string) => Promise<void>
  setIsReanalysisMode: (mode: boolean) => void
  setShowHub: (show: boolean) => void
  setQuickAnalysisMode: (mode: boolean) => void
  setPurposeInputMode: (mode: 'ai' | 'browse') => void

  // 네비게이션
  canNavigateToStep: (step: number) => boolean
  navigateToStep: (step: number) => void
  saveCurrentStepData: () => void
  
  // 유틸리티
  canProceedToNext: () => boolean
  goToNextStep: () => void
  goToPreviousStep: () => void
  reset: () => void
  /** Reset session data only (preserves analysisHistory) */
  resetSession: () => void
}

const initialState = {
  currentStep: 1,
  completedSteps: [],
  uploadedFile: null,
  uploadedData: null,
  uploadedFileName: null,
  dataCharacteristics: null,
  validationResults: null,
  assumptionResults: null,
  dataSummary: null,
  methodCompatibility: null,
  analysisPurpose: '',
  selectedMethod: null,
  variableMapping: null,
  detectedVariables: null,
  suggestedSettings: null,
  results: null,
  analysisHistory: [],
  currentHistoryId: null,
  isLoading: false,
  error: null,
  isReanalysisMode: false,
  showHub: true,
  quickAnalysisMode: false,
  purposeInputMode: 'ai' as const,
}

export const useSmartFlowStore = create<SmartFlowState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 기본 setter들
      setCurrentStep: (step) => set({ currentStep: step }),
      
      addCompletedStep: (step) => set((state) => ({
        completedSteps: [...new Set([...state.completedSteps, step])]
      })),
      
      setUploadedFile: (file) => set({ uploadedFile: file, uploadedFileName: file?.name || null }),
      setUploadedData: (data) => set({ uploadedData: data }),
      setUploadedFileName: (name) => set({ uploadedFileName: name }),
      setDataCharacteristics: (characteristics) => set({ dataCharacteristics: characteristics }),
      setValidationResults: (results) => {
        // Clear compatibility when validation results change
        if (!results) {
          set({
            validationResults: null,
            dataSummary: null,
            methodCompatibility: null,
            assumptionResults: null
          })
          return
        }

        // Extract data summary and compute structural compatibility immediately
        const dataSummary = extractDataSummary(results)
        const structuralCompatibility = getStructuralCompatibilityMap(dataSummary)

        set({
          validationResults: results,
          dataSummary,
          methodCompatibility: structuralCompatibility,
          // Clear assumption results when data changes (will be recalculated by Pyodide)
          assumptionResults: null
        })
      },
      setAssumptionResults: (results) => {
        // When assumption results arrive, merge with existing structural compatibility
        const state = get()
        if (!results || !state.methodCompatibility || !state.dataSummary) {
          set({ assumptionResults: results })
          return
        }

        const assumptions = extractAssumptionResults(results)
        const mergedCompatibility = mergeAssumptionResults(
          state.methodCompatibility,
          assumptions,
          state.dataSummary
        )

        set({
          assumptionResults: results,
          methodCompatibility: mergedCompatibility
        })
      },
      setDataSummary: (summary) => set({ dataSummary: summary }),
      setMethodCompatibility: (compatibility) => set({ methodCompatibility: compatibility }),
      updateCompatibility: () => {
        // Recalculate compatibility based on current data/assumptions
        // This is typically called after assumption tests complete
        const state = get()
        if (!state.validationResults) {
          set({ dataSummary: null, methodCompatibility: null })
          return
        }

        const dataSummary = extractDataSummary(state.validationResults)
        const structuralMap = getStructuralCompatibilityMap(dataSummary)

        // If we have assumption results, merge them
        if (state.assumptionResults) {
          const assumptions = extractAssumptionResults(state.assumptionResults)
          const mergedMap = mergeAssumptionResults(structuralMap, assumptions, dataSummary)
          set({ dataSummary, methodCompatibility: mergedMap })
        } else {
          set({ dataSummary, methodCompatibility: structuralMap })
        }
      },
      setAnalysisPurpose: (purpose) => set({ analysisPurpose: purpose }),
      setSelectedMethod: (method) => set({ selectedMethod: method }),
      setVariableMapping: (mapping) => set({ variableMapping: mapping }),
      setDetectedVariables: (vars) => set({ detectedVariables: vars }),
      setSuggestedSettings: (settings) => set({ suggestedSettings: settings }),
      setResults: (results) => set({ results: results }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error: error }),
      setIsReanalysisMode: (mode) => set({ isReanalysisMode: mode }),
      setShowHub: (show) => set({ showHub: show }),
      setQuickAnalysisMode: (mode) => set({ quickAnalysisMode: mode }),
      setPurposeInputMode: (mode) => set({ purposeInputMode: mode }),

      // 히스토리 관리 (IndexedDB)
      saveToHistory: async (name) => {
        const state = get()
        if (!state.results) return

        if (!isIndexedDBAvailable()) {
          console.warn('[History] IndexedDB is not available')
          return
        }

        const record: HistoryRecord = {
          id: `analysis-${Date.now()}`,
          timestamp: Date.now(),
          name: name || `분석 ${new Date().toLocaleString('ko-KR')}`,
          purpose: state.analysisPurpose,
          method: state.selectedMethod ? {
            id: state.selectedMethod.id,
            name: state.selectedMethod.name,
            category: state.selectedMethod.category,
            description: state.selectedMethod.description
          } : null,
          dataFileName: state.uploadedFile?.name || 'unknown',
          dataRowCount: state.uploadedData?.length || 0,
          results: state.results as unknown as Record<string, unknown> | null,
          variableMapping: state.variableMapping,
          analysisPurpose: state.analysisPurpose
        }

        try {
          // IndexedDB에 저장 (원본 데이터 제외)
          await saveHistory(record)

          // UI 상태 갱신
          const allHistory = await getAllHistory()
          set({
            analysisHistory: allHistory.map(h => ({
              ...h,
              timestamp: new Date(h.timestamp)
            })),
            currentHistoryId: record.id
          })
        } catch (error) {
          console.error('[History] Failed to save:', error)
        }
      },

      loadFromHistory: async (historyId) => {
        const record = await getHistory(historyId)

        if (record) {
          // 결과 마이그레이션: 기존 Executor 형식을 새로운 UI 형식으로 변환
          let migratedResults: AnalysisResult | null = null

          if (record.results) {
            const results = record.results as Record<string, unknown>

            // Executor 형식 감지: metadata와 mainResults가 있으면 기존 형식
            if (results.metadata && results.mainResults) {
              try {
                migratedResults = transformExecutorResult(results as unknown as ExecutorResult)
                console.log('[History Migration] Transformed executor result to UI format')
              } catch (error) {
                console.error('[History Migration] Failed to transform:', error)
                migratedResults = results as unknown as AnalysisResult
              }
            } else {
              // 이미 새로운 형식이거나 알 수 없는 형식
              migratedResults = results as unknown as AnalysisResult
            }
          }

          // 결과만 복원 (원본 데이터는 없음)
          set({
            analysisPurpose: record.purpose,
            selectedMethod: record.method as StatisticalMethod | null,
            results: migratedResults,
            uploadedFileName: record.dataFileName,
            currentHistoryId: historyId,
            currentStep: MAX_STEPS, // 결과 단계로 이동
            completedSteps: Array.from({ length: MAX_STEPS }, (_, index) => index + 1),
            // ⚠️ 원본 데이터는 복원 안 됨 (재분석 불가)
            uploadedData: null,
            validationResults: null,
            uploadedFile: null
          })
        }
      },

      deleteFromHistory: async (historyId) => {
        await deleteHistory(historyId)

        // UI 상태 갱신
        const allHistory = await getAllHistory()
        set((state) => ({
          analysisHistory: allHistory.map(h => ({
            ...h,
            timestamp: new Date(h.timestamp)
          })),
          currentHistoryId: state.currentHistoryId === historyId ? null : state.currentHistoryId
        }))
      },

      loadSettingsFromHistory: async (historyId) => {
        const record = await getHistory(historyId)
        if (!record) return

        set({
          // 데이터 초기화 (새로 업로드해야 함)
          uploadedData: null,
          uploadedFile: null,
          uploadedFileName: null,
          validationResults: null,
          results: null,
          error: null,
          dataCharacteristics: null,
          dataSummary: null,
          assumptionResults: null,

          // 설정 복원
          selectedMethod: record.method ? {
            id: record.method.id,
            name: record.method.name,
            category: record.method.category as StatisticalMethod['category'],
            description: record.method.description ?? ''
          } : null,
          variableMapping: record.variableMapping ?? null,
          analysisPurpose: record.analysisPurpose ?? '',

          // 재분석 모드 활성화
          isReanalysisMode: true,

          // Step 1로 이동
          currentStep: 1,
          completedSteps: [],
        })
      },

      clearHistory: async () => {
        await clearAllHistory()
        set({
          analysisHistory: [],
          currentHistoryId: null
        })
      },

      // IndexedDB에서 히스토리 불러오기 (초기화 시)
      loadHistoryFromDB: async () => {
        // IndexedDB 가용성 체크 (지원하지 않는 브라우저에서 크래시 방지)
        if (!isIndexedDBAvailable()) {
          console.warn('[History] IndexedDB not available, skipping history load')
          return
        }

        // Storage Facade 초기화 (Turso URL 있으면 Hybrid 모드)
        await initStorage()

        /**
         * ====== 마이그레이션 (일회성) ======
         * 배경: 과거에는 analysisHistory가 sessionStorage에 저장되었음
         * 현재: IndexedDB로 변경됨 (영구 저장, 브라우저 종료 후에도 유지)
         * 동작: sessionStorage에 기존 히스토리가 있고 IndexedDB가 비어있으면 복사
         * 완료 후: sessionStorage에서 analysisHistory 삭제
         * 제거 시점: 충분한 시간이 지난 후 (2025-Q2 이후 제거 가능)
         */
        try {
          const sessionData = sessionStorage.getItem('smart-flow-storage')
          if (sessionData) {
            const parsed = JSON.parse(sessionData)
            const oldHistory = parsed?.state?.analysisHistory

            if (oldHistory && Array.isArray(oldHistory) && oldHistory.length > 0) {
              // IndexedDB에 기존 히스토리가 없는 경우에만 마이그레이션
              const existingHistory = await getAllHistory()
              if (existingHistory.length === 0) {
                console.log('[Migration] Copying', oldHistory.length, 'histories from sessionStorage to IndexedDB')

                for (const item of oldHistory) {
                  // 결과 변환: Executor 형식 -> UI 형식
                  let migratedResults: Record<string, unknown> | null = null
                  if (item.results) {
                    const results = item.results as Record<string, unknown>
                    // Executor 형식 감지: metadata + mainResults 존재
                    if (results.metadata && results.mainResults) {
                      try {
                        migratedResults = transformExecutorResult(results as unknown as ExecutorResult) as unknown as Record<string, unknown>
                        console.log('[Migration] Transformed executor result for:', item.id || item.name)
                      } catch (error) {
                        console.error('[Migration] Failed to transform result:', error)
                        migratedResults = results
                      }
                    } else {
                      migratedResults = results
                    }
                  }

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
                    results: migratedResults
                  }

                  await saveHistory(record)
                }

                console.log('[Migration] Successfully migrated', oldHistory.length, 'histories')

                // 마이그레이션 완료 후 sessionStorage에서 히스토리 제거
                delete parsed.state.analysisHistory
                sessionStorage.setItem('smart-flow-storage', JSON.stringify(parsed))
              }
            }
          }
        } catch (error) {
          console.warn('[Migration] Failed to migrate sessionStorage history:', error)
        }

        // IndexedDB에서 히스토리 불러오기 + Executor 형식 변환
        const allHistory = await getAllHistory()
        const transformedHistory = []
        let needsPersist = false

        for (const h of allHistory) {
          let transformedResults = h.results

          // Executor 형식 감지 및 변환
          if (h.results) {
            const results = h.results as Record<string, unknown>
            if (results.metadata && results.mainResults) {
              try {
                transformedResults = transformExecutorResult(results as unknown as ExecutorResult) as unknown as Record<string, unknown>
                console.log('[History Load] Transformed executor result for:', h.id || h.name)
                needsPersist = true

                // IndexedDB에 변환된 결과 영구 저장 (isUpdate=true로 삭제 방지)
                await saveHistory({
                  ...h,
                  results: transformedResults
                }, true)
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

        set({
          analysisHistory: transformedHistory
        })
      },

      // 네비게이션 with 데이터 저장
      canNavigateToStep: (step) => {
        const state = get()
        // 완료된 단계나 현재 단계로만 이동 가능
        return step === state.currentStep || state.completedSteps.includes(step)
      },
      
      navigateToStep: (step) => {
        const state = get()
        if (state.canNavigateToStep(step)) {
          // 현재 단계 데이터 저장
          state.saveCurrentStepData()
          set({ currentStep: step })
        }
      },
      
      saveCurrentStepData: () => {
        const state = get()
        // 각 단계별 데이터는 이미 개별 setter로 저장되므로
        // 여기서는 완료 단계 추가만
        if (!state.completedSteps.includes(state.currentStep)) {
          set((s) => ({
            completedSteps: [...s.completedSteps, state.currentStep]
          }))
        }
      },
      
      // 유틸리티 함수들
      // 4단계 플로우: 탐색(1) → 방법(2) → 변수(3) → 분석(4)
      canProceedToNext: () => {
        const state = get()
        switch (state.currentStep) {
          case 1: return state.uploadedFile !== null && state.uploadedData !== null && state.validationResults?.isValid === true // 탐색: 데이터 업로드 완료
          case 2: return state.selectedMethod !== null // 방법: 분석 방법 선택 완료
          case 3: return state.variableMapping !== null // 변수: 변수 매핑 완료
          case 4: return false // 분석: 마지막 단계
          default: return false
        }
      },

      goToNextStep: () => {
        const state = get()
        if (state.currentStep < MAX_STEPS) {
          set({
            completedSteps: [...new Set([...state.completedSteps, state.currentStep])],
            currentStep: state.currentStep + 1
          })
        }
      },
      
      goToPreviousStep: () => {
        const state = get()
        if (state.currentStep > 1) {
          set({ currentStep: state.currentStep - 1 })
        }
      },
      
      reset: () => set(initialState),

      // Reset session data only - preserves analysisHistory for "새 분석 시작"
      resetSession: () => set((state) => ({
        currentStep: 1,
        completedSteps: [],
        uploadedFile: null,
        uploadedData: null,
        uploadedFileName: null,
        dataCharacteristics: null,
        validationResults: null,
        assumptionResults: null,
        dataSummary: null,
        methodCompatibility: null,
        analysisPurpose: '',
        selectedMethod: null,
        variableMapping: null,
        detectedVariables: null,
        suggestedSettings: null,
        results: null,
        currentHistoryId: null,
        isLoading: false,
        error: null,
        isReanalysisMode: false,
        showHub: true,
        quickAnalysisMode: false,
        purposeInputMode: 'ai',
        // Preserve history
        analysisHistory: state.analysisHistory
      })),
    }),
    {
      name: 'smart-flow-storage',
      // Fix 5-B: persist 버전 관리 (향후 스키마 변경 시 migration 경로 제공)
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>
        if (version < 2) {
          // v1 → v2: detectedVariables에 independentVars, covariates 추가
          // suggestedSettings, purposeInputMode 필드 추가
          // 기존 값은 그대로 유지, 새 필드는 초기값으로
          state.suggestedSettings = state.suggestedSettings ?? null
        }
        return state as SmartFlowState
      },
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        // Rehydrate 시 results가 old executor 형식인 경우 변환
        if (state?.results) {
          const results = state.results as unknown as Record<string, unknown>
          if (results.metadata && results.mainResults) {
            try {
              state.results = transformExecutorResult(results as unknown as ExecutorResult)
              console.log('[Rehydrate] Transformed executor result from sessionStorage')
            } catch (error) {
              console.error('[Rehydrate] Failed to transform result:', error)
            }
          }
        }

        // Recalculate compatibility map if validationResults exists but methodCompatibility is null
        if (state?.validationResults && !state.methodCompatibility) {
          try {
            const dataSummary = extractDataSummary(state.validationResults)
            const compatibilityMap = getStructuralCompatibilityMap(dataSummary)
            state.dataSummary = dataSummary
            state.methodCompatibility = compatibilityMap
            console.log('[Rehydrate] Recalculated compatibility map from validationResults')
          } catch (error) {
            console.error('[Rehydrate] Failed to recalculate compatibility:', error)
          }
        }

        // 진행 중인 분석이 있으면 Hub 숨기고 해당 Step으로 이동
        if (state && (state.uploadedData || state.selectedMethod || state.results)) {
          state.showHub = false
          console.log('[Rehydrate] Restored in-progress analysis, hiding Hub')
        }
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        analysisPurpose: state.analysisPurpose,
        currentHistoryId: state.currentHistoryId,
        // 현재 분석 데이터만 저장 (페이지 새로고침 시 복원)
        uploadedData: state.uploadedData,
        validationResults: state.validationResults,
        selectedMethod: state.selectedMethod,
        variableMapping: state.variableMapping,
        detectedVariables: state.detectedVariables,
        suggestedSettings: state.suggestedSettings,
        results: state.results,
        uploadedFileName: state.uploadedFileName,
        /**
         * ❌ analysisHistory 제외
         * 이유: IndexedDB에서 영구 관리 (sessionStorage는 세션 종료 시 삭제됨)
         * 로드: loadHistoryFromDB()에서 IndexedDB → UI 상태로 불러옴
         */
        // ❌ File 객체는 직렬화 불가
        // Fix 5-A: purposeInputMode는 의도적으로 persist하지 않음
        // 새로고침 시 항상 'ai' 모드로 시작 (사용자 경험 일관성)
      }),
    }
  )
)
