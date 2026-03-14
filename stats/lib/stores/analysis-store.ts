import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  ValidationResults,
  ColumnStatistics,
  StatisticalMethod,
  AnalysisResult,
  DataRow,
  StatisticalAssumptions,
  SuggestedSettings,
  AnalysisOptions,
  DEFAULT_ANALYSIS_OPTIONS,
} from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { DataCharacteristics } from '@/lib/statistics/data-type-detector'
import type {
  CompatibilityResult,
  DataSummary,
} from '@/lib/statistics/data-method-compatibility'
import {
  extractDataSummary,
  getStructuralCompatibilityMap,
  mergeAssumptionResults,
  extractAssumptionResults
} from '@/lib/statistics/data-method-compatibility'
import { transformExecutorResult, isExecutorResult } from '@/lib/utils/result-transformer'
import type { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'
import { useModeStore } from './mode-store'
import { useHistoryStore } from './history-store'
import type { HistoryLoadResult, HistorySettingsResult } from './history-store'

/**
 * 핵심 분석 상태 관리
 *
 * 분석 플로우의 데이터 + 단계 네비게이션.
 * UI 모드 → mode-store, 히스토리 → history-store.
 */

// Smart Flow 총 단계 수
const MAX_STEPS = 4

/**
 * AI가 Step 2에서 감지한 변수 정보
 * Step 3 변수 선택의 초기값으로 사용
 */
export interface DetectedVariables {
  factors?: string[]
  groupVariable?: string
  dependentCandidate?: string
  numericVars?: string[]
  pairedVars?: [string, string]
  independentVars?: string[]
  covariates?: string[]
  eventVariable?: string
}

// Re-export for backward compatibility
export type { AnalysisHistory } from './history-store'
export type { AiRecommendationContext } from '@/lib/utils/storage-types'

interface AnalysisState {
  // 현재 단계
  currentStep: number
  completedSteps: number[]

  // 데이터
  uploadedFile: File | null
  uploadedData: DataRow[] | null
  uploadedFileName?: string | null
  uploadNonce: number

  // 데이터 특성
  dataCharacteristics: DataCharacteristics | null

  // 검증
  validationResults: ValidationResults | null

  // 통계적 가정 검정 결과
  assumptionResults: StatisticalAssumptions | null

  // 데이터-방법 호환성
  dataSummary: DataSummary | null
  methodCompatibility: Map<string, CompatibilityResult> | null

  // 분석 설정
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null

  // AI 감지 변수 (Step 2 → Step 3)
  detectedVariables: DetectedVariables | null
  // AI 추천 설정 (Step 2 → Step 4)
  suggestedSettings: SuggestedSettings | null
  // 사용자 분석 옵션 (Step 3 → Step 4)
  analysisOptions: AnalysisOptions

  // 분석 결과
  results: AnalysisResult | null

  // 상태
  isLoading: boolean
  error: string | null

  // 기본 setter
  setCurrentStep: (step: number) => void
  addCompletedStep: (step: number) => void
  setUploadedFile: (file: File | null) => void
  setUploadedData: (data: DataRow[] | null) => void
  setUploadedFileName: (name: string | null) => void
  setDataCharacteristics: (characteristics: DataCharacteristics | null) => void
  setValidationResults: (results: ValidationResults | null) => void
  patchColumnNormality: (enrichedColumns: ColumnStatistics[]) => void
  setAssumptionResults: (results: StatisticalAssumptions | null) => void
  setDataSummary: (summary: DataSummary | null) => void
  setMethodCompatibility: (compatibility: Map<string, CompatibilityResult> | null) => void
  updateCompatibility: () => void
  setAnalysisPurpose: (purpose: string) => void
  setSelectedMethod: (method: StatisticalMethod | null) => void
  setVariableMapping: (mapping: VariableMapping | null) => void
  setDetectedVariables: (vars: DetectedVariables | null) => void
  setSuggestedSettings: (settings: SuggestedSettings | null) => void
  setAnalysisOptions: (options: Partial<AnalysisOptions>) => void
  setResults: (results: AnalysisResult | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 히스토리 복원 (history-store에서 호출)
  restoreFromHistory: (data: HistoryLoadResult) => void
  restoreSettingsFromHistory: (data: HistorySettingsResult) => void

  // 네비게이션
  canNavigateToStep: (step: number) => boolean
  navigateToStep: (step: number) => void
  saveCurrentStepData: () => void

  // 유틸리티
  canProceedToNext: () => boolean
  goToNextStep: () => void
  goToPreviousStep: () => void
  reset: () => void
  resetSession: () => void
}

const initialState = {
  currentStep: 1,
  completedSteps: [] as number[],
  uploadedFile: null as File | null,
  uploadedData: null as DataRow[] | null,
  uploadedFileName: null as string | null,
  uploadNonce: 0,
  dataCharacteristics: null as DataCharacteristics | null,
  validationResults: null as ValidationResults | null,
  assumptionResults: null as StatisticalAssumptions | null,
  dataSummary: null as DataSummary | null,
  methodCompatibility: null as Map<string, CompatibilityResult> | null,
  analysisPurpose: '',
  selectedMethod: null as StatisticalMethod | null,
  variableMapping: null as VariableMapping | null,
  detectedVariables: null as DetectedVariables | null,
  suggestedSettings: null as SuggestedSettings | null,
  analysisOptions: { ...DEFAULT_ANALYSIS_OPTIONS },
  results: null as AnalysisResult | null,
  isLoading: false,
  error: null as string | null,
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 기본 setter
      setCurrentStep: (step) => set({ currentStep: step }),

      addCompletedStep: (step) => set((state) => ({
        completedSteps: [...new Set([...state.completedSteps, step])]
      })),

      setUploadedFile: (file) => set((state) => ({
        uploadedFile: file,
        uploadedFileName: file?.name || null,
        uploadNonce: state.uploadNonce + 1,
      })),
      setUploadedData: (data) => set({ uploadedData: data }),
      setUploadedFileName: (name) => set({ uploadedFileName: name }),
      setDataCharacteristics: (characteristics) => set({ dataCharacteristics: characteristics }),
      setValidationResults: (results) => {
        if (!results) {
          set({
            validationResults: null,
            dataSummary: null,
            methodCompatibility: null,
            assumptionResults: null
          })
          return
        }

        const dataSummary = extractDataSummary(results)
        const structuralCompatibility = getStructuralCompatibilityMap(dataSummary)

        set({
          validationResults: results,
          dataSummary,
          methodCompatibility: structuralCompatibility,
          assumptionResults: null
        })
      },
      patchColumnNormality: (enrichedColumns) => {
        const state = get()
        if (!state.validationResults) return
        set({
          validationResults: {
            ...state.validationResults,
            columnStats: enrichedColumns,
            columns: enrichedColumns,
          },
        })
      },
      setAssumptionResults: (results) => {
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
        const state = get()
        if (!state.validationResults) {
          set({ dataSummary: null, methodCompatibility: null })
          return
        }

        const dataSummary = extractDataSummary(state.validationResults)
        const structuralMap = getStructuralCompatibilityMap(dataSummary)

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
      setAnalysisOptions: (options) => set((state) => ({
        analysisOptions: { ...state.analysisOptions, ...options },
      })),
      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // 히스토리 복원 (history-store가 로드한 데이터를 수신)
      restoreFromHistory: (data) => {
        set({
          analysisPurpose: data.analysisPurpose,
          selectedMethod: data.selectedMethod,
          results: data.results,
          uploadedFileName: data.uploadedFileName,
          currentStep: data.currentStep,
          completedSteps: data.completedSteps,
          uploadedData: null,
          validationResults: null,
          uploadedFile: null,
        })
      },

      restoreSettingsFromHistory: (data) => {
        set({
          uploadedData: null,
          uploadedFile: null,
          uploadedFileName: null,
          validationResults: null,
          results: null,
          error: null,
          dataCharacteristics: null,
          dataSummary: null,
          assumptionResults: null,
          selectedMethod: data.selectedMethod,
          variableMapping: data.variableMapping,
          analysisPurpose: data.analysisPurpose,
          currentStep: 1,
          completedSteps: [],
        })
      },

      // 네비게이션
      canNavigateToStep: (step) => {
        const state = get()
        return step === state.currentStep || state.completedSteps.includes(step)
      },

      navigateToStep: (step) => {
        const state = get()
        const isForwardSkip = step > state.currentStep
        if (state.canNavigateToStep(step) || isForwardSkip) {
          state.saveCurrentStepData()
          if (step > state.currentStep + 1) {
            const skippedSteps = Array.from(
              { length: step - state.currentStep - 1 },
              (_, i) => state.currentStep + 1 + i
            )
            set((s) => ({
              completedSteps: [...new Set([...s.completedSteps, ...skippedSteps])],
              currentStep: step,
            }))
          } else {
            set({ currentStep: step })
          }
        }
      },

      saveCurrentStepData: () => {
        const state = get()
        if (!state.completedSteps.includes(state.currentStep)) {
          set((s) => ({
            completedSteps: [...s.completedSteps, state.currentStep]
          }))
        }
      },

      // 유틸리티
      canProceedToNext: () => {
        const state = get()
        switch (state.currentStep) {
          case 1: return state.uploadedFile !== null && state.uploadedData !== null && state.validationResults?.isValid === true
          case 2: return state.selectedMethod !== null
          case 3: return state.variableMapping !== null
          case 4: return false
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

      resetSession: () => {
        // 모드 + 히스토리 상태도 리셋
        useModeStore.getState().resetMode()
        useHistoryStore.getState().setCurrentHistoryId(null)
        useHistoryStore.getState().setLoadedAiInterpretation(null)
        useHistoryStore.getState().setLoadedInterpretationChat(null)

        set((state) => ({
          ...initialState,
          uploadNonce: state.uploadNonce + 1,
        }))
      },
    }),
    {
      name: 'analysis-storage',
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<AnalysisState>
        if (version < 2) {
          if (!('suggestedSettings' in state)) {
            (state as Record<string, unknown>).suggestedSettings = null
          }
        }
        // v2 → v3: history/mode 필드 제거 (이전 persist에 남아있을 수 있음)
        // 이전 persist 데이터에서 mode/history 필드 무시 — 자동으로 drop됨

        return {
          ...state,
          isLoading: false,
          error: null
        } as AnalysisState
      },
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        // Executor 형식 변환
        if (state?.results) {
          const results = state.results as unknown as Record<string, unknown>
          if (isExecutorResult(results)) {
            try {
              state.results = transformExecutorResult(results as unknown as ExecutorResult)
              console.log('[Rehydrate] Transformed executor result from sessionStorage')
            } catch (error) {
              console.error('[Rehydrate] Failed to transform result:', error)
            }
          }
        }

        // Compatibility 재계산
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

        // 진행 중인 분석이 있으면 Hub 숨기기
        if (state && (state.uploadedData || state.selectedMethod || state.results)) {
          useModeStore.getState().setShowHub(false)
          console.log('[Rehydrate] Restored in-progress analysis, hiding Hub')
        }
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        analysisPurpose: state.analysisPurpose,
        uploadedData: state.uploadedData,
        validationResults: state.validationResults,
        selectedMethod: state.selectedMethod,
        variableMapping: state.variableMapping,
        detectedVariables: state.detectedVariables,
        suggestedSettings: state.suggestedSettings,
        analysisOptions: state.analysisOptions,
        results: state.results,
        uploadedFileName: state.uploadedFileName,
      }),
    }
  )
)
