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
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import type { StepTrack } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
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

  // Zustand stores
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
  } = useAnalysisStore()

  const { stepTrack, setStepTrack } = useModeStore()
  const { analysisHistory } = useHistoryStore()

  // Load history from IndexedDB
  useEffect(() => {
    useHistoryStore.getState().loadHistoryFromDB().catch(console.error)
  }, [])

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
      completed: (stepTrack === 'quick' && step.id === 2)
        ? true
        : completedSteps.includes(step.id),
      skipped: stepTrack === 'quick' && step.id === 2,
    }))
  }, [completedSteps, stepTrack, t])

  // === Handlers ===

  const handleStepClick = useCallback((stepId: number) => {
    if (canNavigateToStep(stepId)) {
      startTransition(() => {
        navigateToStep(stepId)
      })
    }
  }, [canNavigateToStep, navigateToStep])

  // U1-2: Quick 전진 점프 — 중간 단계 사전 마킹
  const handleStep1Next = useCallback(() => {
    if (stepTrack === 'quick' && selectedMethod) {
      addCompletedStep(1)
      addCompletedStep(2)
      navigateToStep(3)
    } else {
      goToNextStep()
    }
  }, [stepTrack, selectedMethod, addCompletedStep, navigateToStep, goToNextStep])

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
      case 1: return stepTrack === 'quick' ? nav.toVariables : nav.toMethod
      case 2: return nav.toVariables
      case 3: return nav.toExecution
      case 4: return nav.runAnalysis
      default: return nav.defaultNext
    }
  }, [currentStep, stepTrack, t])

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
