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
  AIRecommendation,
  DiagnosticReport,
} from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { DataCharacteristics } from '@/lib/statistics/data-type-detector'
// TD-10-D: dataSummary/methodCompatibility は useMethodCompatibility 훅으로 이동
// CompatibilityResult, DataSummary 타입 및 파생 함수는 더 이상 store에서 불필요
import { transformExecutorResult, isExecutorResult } from '@/lib/utils/result-transformer'
import type { AnalysisResult as ExecutorResult } from '@/lib/services/executors/types'
import { resetPreemptiveState } from '@/lib/services/preemptive-assumption-service'
import { SESSION_STORAGE_KEYS } from '@/lib/constants/storage-keys'
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

  // 분석 설정
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null

  // AI 추천 결과 캐시 (Step 2 뒤로가기 시 재사용)
  cachedAiRecommendation: AIRecommendation | null
  // AI 감지 변수 (Step 2 → Step 3)
  detectedVariables: DetectedVariables | null
  // AI 추천 설정 (Step 2 → Step 4)
  suggestedSettings: SuggestedSettings | null
  // 사용자 분석 옵션 (Step 3 → Step 4)
  analysisOptions: AnalysisOptions

  // Hub Diagnostic Pipeline 결과 (Step 4 AI 해석 참조 + 가정 검정 재사용)
  diagnosticReport: DiagnosticReport | null

  // 분석 결과
  results: AnalysisResult | null

  // 상태
  isLoading: boolean
  error: string | null

  // 기본 setter
  setCurrentStep: (step: number) => void
  addCompletedStep: (step: number) => void
  /** 지정 단계 이후의 completedSteps를 제거 (무효화 시 사용) */
  pruneCompletedStepsFrom: (fromStep: number) => void
  setUploadedFile: (file: File | null) => void
  setUploadedData: (data: DataRow[] | null) => void
  setUploadedFileName: (name: string | null) => void
  setDataCharacteristics: (characteristics: DataCharacteristics | null) => void
  setValidationResults: (results: ValidationResults | null) => void
  patchColumnNormality: (enrichedColumns: ColumnStatistics[]) => void
  setAssumptionResults: (results: StatisticalAssumptions | null) => void
  setAnalysisPurpose: (purpose: string) => void
  setSelectedMethod: (method: StatisticalMethod | null) => void
  setVariableMapping: (mapping: VariableMapping | null) => void
  /** U1-3: 변수 변경 + downstream(results/assumptions) 무효화. Step 3 confirm 시 변경 감지된 경우에만 사용 */
  updateVariableMappingWithInvalidation: (mapping: VariableMapping) => void
  setCachedAiRecommendation: (rec: AIRecommendation | null) => void
  setDetectedVariables: (vars: DetectedVariables | null) => void
  setSuggestedSettings: (settings: SuggestedSettings | null) => void
  setAnalysisOptions: (options: Partial<AnalysisOptions>) => void
  setDiagnosticReport: (report: DiagnosticReport | null) => void
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
  analysisPurpose: '',
  selectedMethod: null as StatisticalMethod | null,
  cachedAiRecommendation: null as AIRecommendation | null,
  variableMapping: null as VariableMapping | null,
  detectedVariables: null as DetectedVariables | null,
  suggestedSettings: null as SuggestedSettings | null,
  analysisOptions: { ...DEFAULT_ANALYSIS_OPTIONS },
  diagnosticReport: null as DiagnosticReport | null,
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

      pruneCompletedStepsFrom: (fromStep) => set((state) => ({
        completedSteps: state.completedSteps.filter(s => s < fromStep)
      })),

      setUploadedFile: (file) => set((state) => ({
        uploadedFile: file,
        uploadedFileName: file?.name || null,
        uploadNonce: state.uploadNonce + 1,
      })),
      setUploadedData: (data) => set({ uploadedData: data, cachedAiRecommendation: null }),
      setUploadedFileName: (name) => set({ uploadedFileName: name }),
      setDataCharacteristics: (characteristics) => set({ dataCharacteristics: characteristics }),
      setValidationResults: (results) => {
        set({
          validationResults: results,
          // validationResults가 변경되면 이전 가정검정 결과는 무효
          assumptionResults: null,
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
      // TD-10-D: 호환성 병합은 useMethodCompatibility 훅이 useMemo로 처리
      setAssumptionResults: (results) => set({ assumptionResults: results }),
      setAnalysisPurpose: (purpose) => set({ analysisPurpose: purpose }),
      setSelectedMethod: (method) => set((state) => ({
        selectedMethod: method,
        analysisOptions: {
          ...DEFAULT_ANALYSIS_OPTIONS,
          alpha: state.analysisOptions.alpha,
          showAssumptions: state.analysisOptions.showAssumptions,
          showEffectSize: state.analysisOptions.showEffectSize,
        },
      })),
      setCachedAiRecommendation: (rec) => set({ cachedAiRecommendation: rec }),
      setVariableMapping: (mapping) => set({ variableMapping: mapping }),
      updateVariableMappingWithInvalidation: (mapping) => set((state) => ({
        variableMapping: mapping,
        results: null,
        assumptionResults: null,
        completedSteps: state.completedSteps.filter(s => s < 4),
      })),
      setDetectedVariables: (vars) => set({ detectedVariables: vars }),
      setSuggestedSettings: (settings) => set({ suggestedSettings: settings }),
      setDiagnosticReport: (report) => set({ diagnosticReport: report }),
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
          variableMapping: data.variableMapping,
          results: data.results,
          uploadedFileName: data.uploadedFileName,
          currentStep: data.currentStep,
          completedSteps: data.completedSteps,
          uploadedData: null,
          dataCharacteristics: null,
          validationResults: null,
          assumptionResults: null,
          uploadedFile: null,
          cachedAiRecommendation: null,
          detectedVariables: null,
          suggestedSettings: null,
          analysisOptions: data.analysisOptions,
          diagnosticReport: null,
          isLoading: false,
          error: null,
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
          assumptionResults: null,
          selectedMethod: data.selectedMethod,
          variableMapping: data.variableMapping,
          analysisPurpose: data.analysisPurpose,
          cachedAiRecommendation: null,
          detectedVariables: null,
          suggestedSettings: null,
          analysisOptions: data.analysisOptions,
          diagnosticReport: null,
          isLoading: false,
          currentStep: 1,
          completedSteps: [],
        })
      },

      // 네비게이션 — U1-1: canNavigateToStep과 동일 규칙 사용 (우회 없음)
      canNavigateToStep: (step) => {
        const state = get()
        if (step === state.currentStep) return true
        if (step < state.currentStep) return true         // 이전 단계 항상 허용
        // 전방 이동: currentStep ~ step-1 까지 모두 completedSteps에 포함되어야 허용
        if (step > state.currentStep) {
          for (let i = state.currentStep; i < step; i++) {
            if (!state.completedSteps.includes(i)) return false
          }
          return true
        }
        return false
      },

      navigateToStep: (step) => {
        const state = get()
        if (!state.canNavigateToStep(step)) return  // 우회 제거 — canNavigateToStep과 동일 규칙
        // 전진 이동 시에만 현재 단계를 완료 처리
        // 뒤로가기는 "포기"이므로 현재 단계를 완료로 마킹하면 안 됨
        if (step > state.currentStep) {
          state.saveCurrentStepData()
        }
        set({ currentStep: step })
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
        // 모드 + 히스토리 + 선행 가정 검정 상태 리셋
        resetPreemptiveState()
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
      name: SESSION_STORAGE_KEYS.analysis.store,
      version: 4,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<AnalysisState>
        if (version < 2) {
          if (!('suggestedSettings' in state)) {
            (state as Record<string, unknown>).suggestedSettings = null
          }
        }
        if (version < 4) {
          state.detectedVariables = null
          state.suggestedSettings = null
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

        // TD-10-D: compatibility는 useMethodCompatibility 훅이 useMemo로 파생 — rehydration 불필요

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
        analysisOptions: state.analysisOptions,
        results: state.results,
        uploadedFileName: state.uploadedFileName,
      }),
    }
  )
)
