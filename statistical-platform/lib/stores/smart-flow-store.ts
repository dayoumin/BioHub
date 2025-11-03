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

/**
 * 스토어(Store)란?
 * - 전역 상태 저장소입니다. 이 프로젝트는 Zustand를 사용해 화면(컴포넌트) 전반에서 공유되는 상태를 한 곳에서 관리합니다.
 * - 목적: 단계(currentStep), 업로드 데이터(uploadedData), 검증 결과(validationResults), 선택한 방법(selectedMethod) 등
 *   여러 컴포넌트가 함께 쓰는 값을 "단일 출처(Single Source of Truth)"로 유지하여 일관성 있게 흐름을 제어합니다.
 * - 장점: 어떤 컴포넌트에서 값을 바꿔도 다른 컴포넌트가 즉시 반영하고, 다음 단계 활성화 같은 조건도 한 곳(canProceedToNext)에서 관리할 수 있습니다.
 * - 지속성: sessionStorage에 일부 상태를 저장하여 새로고침 후에도 분석 진행 맥락을 복원합니다(파일 객체는 제외).
 */

// 분석 히스토리 타입
export interface AnalysisHistory {
  id: string
  timestamp: Date
  name: string
  purpose: string
  method: StatisticalMethod | null
  dataFileName: string
  dataRowCount: number
  results: AnalysisResult | null
  stepData: {
    uploadedData: DataRow[] | null
    validationResults: ValidationResults | null
    analysisPurpose: string
    selectedMethod: StatisticalMethod | null
    results: AnalysisResult | null
  }
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
  
  // 히스토리 액션
  saveToHistory: (name?: string) => void
  loadFromHistory: (historyId: string) => void
  deleteFromHistory: (historyId: string) => void
  clearHistory: () => void
  
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
      
      // 히스토리 관리
      saveToHistory: (name) => {
        const state = get()
        if (!state.results) return
        
        const historyEntry: AnalysisHistory = {
          id: `analysis-${Date.now()}`,
          timestamp: new Date(),
          name: name || `분석 ${new Date().toLocaleString('ko-KR')}`,
          purpose: state.analysisPurpose,
          method: state.selectedMethod,
          dataFileName: state.uploadedFile?.name || 'unknown',
          dataRowCount: state.uploadedData?.length || 0,
          results: state.results,
          stepData: {
            uploadedData: state.uploadedData,
            validationResults: state.validationResults,
            analysisPurpose: state.analysisPurpose,
            selectedMethod: state.selectedMethod,
            results: state.results,
          }
        }
        
        set((state) => ({
          analysisHistory: [historyEntry, ...state.analysisHistory].slice(0, 20), // 최대 20개 저장
          currentHistoryId: historyEntry.id
        }))
      },
      
      loadFromHistory: (historyId) => {
        const state = get()
        const history = state.analysisHistory.find(h => h.id === historyId)
        
        if (history) {
          set({
            uploadedData: history.stepData.uploadedData,
            validationResults: history.stepData.validationResults,
            analysisPurpose: history.stepData.analysisPurpose,
            selectedMethod: history.stepData.selectedMethod,
            results: history.stepData.results,
            currentHistoryId: historyId,
            currentStep: 5, // 결과 단계로 이동
            completedSteps: [1, 2, 3, 4, 5]
          })
        }
      },
      
      deleteFromHistory: (historyId) => {
        set((state) => ({
          analysisHistory: state.analysisHistory.filter(h => h.id !== historyId),
          currentHistoryId: state.currentHistoryId === historyId ? null : state.currentHistoryId
        }))
      },
      
      clearHistory: () => {
        set({
          analysisHistory: [],
          currentHistoryId: null
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
          case 3: return state.selectedMethod !== null
          case 4: return false // 자동 진행
          case 5: return false // 마지막 단계
          default: return false
        }
      },
      
      goToNextStep: () => {
        const state = get()
        if (state.currentStep < 5) {
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
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        analysisPurpose: state.analysisPurpose,
        analysisHistory: state.analysisHistory,
        currentHistoryId: state.currentHistoryId,
        // 현재 분석 데이터도 저장 (페이지 새로고침 시 복원)
        uploadedData: state.uploadedData,
        validationResults: state.validationResults,
        selectedMethod: state.selectedMethod,
        variableMapping: state.variableMapping,
        results: state.results,
        uploadedFileName: state.uploadedFileName,
        // File 객체는 직렬화할 수 없으므로 제외
      }),
    }
  )
)