import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  ValidationResults,
  StatisticalMethod,
  AnalysisResult,
  DataRow,
  StatisticalAssumptions
} from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { DataCharacteristics } from '@/lib/statistics/data-type-detector'
import {
  saveHistory,
  getAllHistory,
  getHistory,
  deleteHistory,
  clearAllHistory,
  isIndexedDBAvailable,
  type HistoryRecord
} from '@/lib/utils/indexeddb'
import { transformExecutorResult } from '@/lib/utils/result-transformer'
import type { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'

/**
 * 스토어(Store)란?
 * - 전역 상태 저장소입니다. 이 프로젝트는 Zustand를 사용해 화면(컴포넌트) 전반에서 공유되는 상태를 한 곳에서 관리합니다.
 * - 목적: 단계(currentStep), 업로드 데이터(uploadedData), 검증 결과(validationResults), 선택한 방법(selectedMethod) 등
 *   여러 컴포넌트가 함께 쓰는 값을 "단일 출처(Single Source of Truth)"로 유지하여 일관성 있게 흐름을 제어합니다.
 * - 장점: 어떤 컴포넌트에서 값을 바꿔도 다른 컴포넌트가 즉시 반영하고, 다음 단계 활성화 같은 조건도 한 곳(canProceedToNext)에서 관리할 수 있습니다.
 * - 지속성: IndexedDB에 분석 결과를 영구 저장합니다 (원본 데이터는 제외).
 */

// Smart Flow 총 단계 수 (2025-11-24: 7 → 5단계로 축소)
const MAX_STEPS = 5

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

  // 분석 설정
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null

  // 분석 결과
  results: AnalysisResult | null

  // 히스토리
  analysisHistory: AnalysisHistory[]
  currentHistoryId: string | null

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
  setAnalysisPurpose: (purpose: string) => void
  setSelectedMethod: (method: StatisticalMethod | null) => void
  setVariableMapping: (mapping: VariableMapping | null) => void
  setresults: (results: AnalysisResult | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 히스토리 액션 (비동기)
  saveToHistory: (name?: string) => Promise<void>
  loadFromHistory: (historyId: string) => Promise<void>
  deleteFromHistory: (historyId: string) => Promise<void>
  clearHistory: () => Promise<void>
  loadHistoryFromDB: () => Promise<void>
  
  // 네비게이션
  canNavigateToStep: (step: number) => boolean
  navigateToStep: (step: number) => void
  saveCurrentStepData: () => void
  
  // 유틸리티
  canProceedToNext: () => boolean
  goToNextStep: () => void
  goToPreviousStep: () => void
  reset: () => void
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
  analysisPurpose: '',
  selectedMethod: null,
  variableMapping: null,
  results: null,
  analysisHistory: [],
  currentHistoryId: null,
  isLoading: false,
  error: null,
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
      setValidationResults: (results) => set({ validationResults: results }),
      setAssumptionResults: (results) => set({ assumptionResults: results }),
      setAnalysisPurpose: (purpose) => set({ analysisPurpose: purpose }),
      setSelectedMethod: (method) => set({ selectedMethod: method }),
      setVariableMapping: (mapping) => set({ variableMapping: mapping }),
      setresults: (results) => set({ results: results }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error: error }),
      
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
          results: state.results as unknown as Record<string, unknown> | null
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
            currentStep: 6, // 결과 단계로 이동
            completedSteps: [1, 2, 3, 4, 5, 6],
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

        // ⚠️ 마이그레이션: 기존 sessionStorage 히스토리를 IndexedDB로 복사
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
      canProceedToNext: () => {
        const state = get()
        switch (state.currentStep) {
          case 1: return state.uploadedFile !== null && state.uploadedData !== null
          case 2: return state.validationResults?.isValid === true
          case 3: return true // 데이터 탐색 (선택 사항, 항상 진행 가능)
          case 4: return state.selectedMethod !== null
          case 5: return state.variableMapping !== null // 변수 선택 완료
          case 6: return false // 자동 진행
          case 7: return false // 마지막 단계
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
    }),
    {
      name: 'smart-flow-storage',
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
        results: state.results,
        uploadedFileName: state.uploadedFileName,
        // ❌ analysisHistory 제외 (IndexedDB에서 관리)
        // ❌ File 객체는 직렬화 불가
      }),
    }
  )
)