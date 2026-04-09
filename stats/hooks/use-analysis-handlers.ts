'use client'

/**
 * 레이아웃·네비게이션 공용 핸들러 훅
 *
 * Home(/)과 /analysis 양쪽에서 사용.
 * 페이지 레이아웃(AnalysisLayout)에 필요한 상태 + floating nav + quick analysis.
 *
 * TD-10-C: Step별 상태/핸들러는 AnalysisSteps가 store 직접 구독.
 * 이 훅은 레이아웃 전용으로 슬림화됨 (35개 → 17개 반환).
 */

import { useCallback, useEffect, useTransition, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import type { StepTrack } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import { prepareManualMethodBrowsing } from '@/lib/stores/store-orchestration'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { useTerminology } from '@/hooks/use-terminology'
import type { AnalysisHistory } from '@/lib/stores/history-store'

interface AnalysisHandlersReturn {
  // Layout state
  currentStep: number
  isLoading: boolean
  analysisHistory: AnalysisHistory[]

  // Step config (stepper UI)
  steps: Array<{ id: number; label: string; completed: boolean; skipped: boolean }>

  // Step navigation
  handleStepClick: (stepId: number) => void

  // Quick analysis (카테고리/추천카드에서 메서드 선택 → Step 1)
  startQuickAnalysis: (methodId: string) => boolean

  // Floating nav
  canProceedWithFloatingNav: boolean
  nextStepLabel: string
  handleFloatingNext: () => void

  // Store actions (페이지에서 직접 필요한 것)
  setStepTrack: (track: StepTrack) => void
  navigateToStep: (step: number) => void

  // Transition
  isPending: boolean
}

export function useAnalysisHandlers(
  /** Hub 표시 중인지 (floating nav 조건용) */
  isHubVisible: boolean,
): AnalysisHandlersReturn {
  const t = useTerminology()
  const [isPending, startTransition] = useTransition()

  // Zustand stores — useShallow로 불필요한 리렌더 방지
  const {
    currentStep,
    completedSteps,
    uploadedData,
    uploadedFileName,
    selectedMethod,
    variableMapping,
    results,
    isLoading,
    validationResults,
    canProceedToNext,
    addCompletedStep,
    goToNextStep,
    navigateToStep,
    canNavigateToStep,
  } = useAnalysisStore(useShallow((s) => ({
    currentStep: s.currentStep,
    completedSteps: s.completedSteps,
    uploadedData: s.uploadedData,
    uploadedFileName: s.uploadedFileName,
    selectedMethod: s.selectedMethod,
    variableMapping: s.variableMapping,
    results: s.results,
    isLoading: s.isLoading,
    validationResults: s.validationResults,
    canProceedToNext: s.canProceedToNext,
    addCompletedStep: s.addCompletedStep,
    goToNextStep: s.goToNextStep,
    navigateToStep: s.navigateToStep,
    canNavigateToStep: s.canNavigateToStep,
  })))

  const { stepTrack, setStepTrack } = useModeStore(useShallow((s) => ({
    stepTrack: s.stepTrack,
    setStepTrack: s.setStepTrack,
  })))
  const { analysisHistory } = useHistoryStore(useShallow((s) => ({
    analysisHistory: s.analysisHistory,
  })))

  // Load history from IndexedDB
  useEffect(() => {
    useHistoryStore.getState().loadHistoryFromDB().catch(console.error)
  }, [])

  // Step 2 skip 판정 (quick + diagnostic 트랙)
  const skipStep2 = stepTrack === 'quick' || stepTrack === 'diagnostic'

  // Steps configuration
  const steps = useMemo(() => {
    const sl = t.analysis.stepShortLabels
    return [
      { id: 1, label: sl.exploration },
      { id: 2, label: sl.method },
      { id: 3, label: sl.variable },
      { id: 4, label: sl.analysis },
    ].map((step) => ({
      ...step,
      completed: (skipStep2 && step.id === 2)
        ? true
        : completedSteps.includes(step.id),
      skipped: skipStep2 && step.id === 2,
    }))
  }, [completedSteps, skipStep2, t])

  // === Handlers ===

  const handleStepClick = useCallback((stepId: number) => {
    if (canNavigateToStep(stepId)) {
      startTransition(() => {
        // Step 2 클릭 = 메서드 변경 의도 → normal 모드로 전환
        if (stepId === 2 && skipStep2) prepareManualMethodBrowsing()
        navigateToStep(stepId)
      })
    }
  }, [canNavigateToStep, navigateToStep, skipStep2])

  // U1-2: Quick/Diagnostic 전진 점프 — 중간 단계 사전 마킹
  const handleStep1Next = useCallback(() => {
    if (skipStep2 && selectedMethod) {
      addCompletedStep(1)
      addCompletedStep(2)
      navigateToStep(3)
    } else {
      goToNextStep()
    }
  }, [skipStep2, selectedMethod, addCompletedStep, navigateToStep, goToNextStep])

  /** 메서드 ID → quickAnalysis 모드 진입. 성공 시 true 반환 */
  const startQuickAnalysis = useCallback((methodId: string): boolean => {
    const method = STATISTICAL_METHODS[methodId]
    if (!method) return false
    useAnalysisStore.getState().setSelectedMethod(method)
    setStepTrack('quick')
    navigateToStep(1)
    return true
  }, [setStepTrack, navigateToStep])

  // Floating nav
  const canProceedWithFloatingNav = useMemo(() => {
    if (isHubVisible) return false
    if (currentStep === 4 && results) return false
    return canProceedToNext()
  }, [isHubVisible, currentStep, results, canProceedToNext, uploadedData, uploadedFileName, validationResults, selectedMethod, variableMapping])

  const nextStepLabel = useMemo(() => {
    const nav = t.analysis.floatingNav
    switch (currentStep) {
      case 1: return skipStep2 ? nav.toVariables : nav.toMethod
      case 2: return nav.toVariables
      case 3: return nav.toExecution
      case 4: return nav.runAnalysis
      default: return nav.defaultNext
    }
  }, [currentStep, skipStep2, t])

  const handleFloatingNext = useCallback(() => {
    handleStep1Next()
  }, [handleStep1Next])

  return {
    currentStep,
    isLoading,
    analysisHistory,
    steps,
    handleStepClick,
    startQuickAnalysis,
    canProceedWithFloatingNav,
    nextStepLabel,
    handleFloatingNext,
    setStepTrack,
    navigateToStep,
    isPending,
  }
}
