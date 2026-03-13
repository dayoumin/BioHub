'use client'

/**
 * Step 1-4 공용 핸들러 훅
 *
 * Home(/)과 /analysis 양쪽에서 사용.
 * Hub↔Step 전환 로직은 포함하지 않음 — 각 페이지가 소유.
 */

import { useCallback, useEffect, useState, useRef, useTransition, useMemo } from 'react'
import { toast } from 'sonner'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import { checkVariableCompatibility, CompatibilityResult } from '@/lib/utils/variable-compatibility'
import { extractDetectedVariables } from '@/lib/services/variable-detection-service'
import { enrichWithNormality } from '@/lib/services/normality-enrichment-service'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnInfo } from '@/lib/statistics/variable-mapping'
import type { StatisticalMethod, AnalysisResult, DataRow, ValidationResults } from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { AnalysisHistory } from '@/lib/stores/analysis-store'

interface AnalysisHandlersReturn {
  // Store state (리렌더 트리거용)
  currentStep: number
  completedSteps: number[]
  uploadedData: DataRow[] | null
  uploadedFileName: string | null | undefined
  validationResults: ValidationResults | null
  selectedMethod: StatisticalMethod | null
  variableMapping: VariableMapping | null
  results: AnalysisResult | null
  isLoading: boolean
  error: string | null
  analysisHistory: AnalysisHistory[]
  isReanalysisMode: boolean
  quickAnalysisMode: boolean

  // Step config
  steps: Array<{ id: number; label: string; completed: boolean; skipped: boolean }>

  // Animation
  animationClass: string
  direction: 'forward' | 'backward'

  // Step handlers
  handleStepClick: (stepId: number) => void
  handleUploadComplete: (file: File, data: DataRow[]) => Promise<void>
  handlePurposeSubmit: (purpose: string, method: StatisticalMethod) => void
  handleAnalysisComplete: (results: AnalysisResult) => void
  handleStep1Next: () => void
  handleReanalysisRun: () => void
  handleReanalysisEditVariables: () => void

  // Quick analysis (카테고리/추천카드에서 메서드 선택 → Step 1)
  startQuickAnalysis: (methodId: string) => boolean

  // Floating nav
  canProceedWithFloatingNav: boolean
  nextStepLabel: string
  handleFloatingNext: () => void

  // Reanalysis compatibility
  reanalysisCompatibility: CompatibilityResult | null

  // Store actions (UI에서 직접 필요한 것)
  setQuickAnalysisMode: (v: boolean) => void
  navigateToStep: (step: number) => void
  goToPreviousStep: () => void
  goToNextStep: () => void
  setError: (e: string | null) => void
  canProceedToNext: () => boolean

  // Transition
  isPending: boolean
}

export function useAnalysisHandlers(
  /** Hub 표시 중인지 (애니메이션 클래스 계산용) */
  isHubVisible: boolean,
): AnalysisHandlersReturn {
  const t = useTerminology()
  const [reanalysisCompatibility, setReanalysisCompatibility] = useState<CompatibilityResult | null>(null)
  const [isPending, startTransition] = useTransition()

  // Zustand store
  const {
    currentStep,
    completedSteps,
    uploadedData,
    uploadedFileName,
    validationResults,
    selectedMethod,
    variableMapping,
    results,
    isLoading,
    error,
    analysisHistory,
    setUploadedFile,
    setUploadedData,
    setValidationResults,
    setAnalysisPurpose,
    setSelectedMethod,
    setResults,
    setError,
    canProceedToNext,
    goToNextStep,
    goToPreviousStep,
    navigateToStep,
    canNavigateToStep,
    isReanalysisMode,
    quickAnalysisMode,
    setQuickAnalysisMode,
    setDetectedVariables,
    patchColumnNormality,
  } = useAnalysisStore()

  // 스텝 전환 애니메이션 방향 추적
  const prevStepRef = useRef(currentStep)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    if (currentStep > prevStepRef.current) setDirection('forward')
    else if (currentStep < prevStepRef.current) setDirection('backward')
    prevStepRef.current = currentStep
  }, [currentStep])

  const animationClass = useMemo(() => {
    if (isHubVisible) return 'animate-fade-in'
    return direction === 'forward' ? 'animate-slide-left' : 'animate-slide-right'
  }, [direction, isHubVisible])

  // Load history from IndexedDB
  useEffect(() => {
    useAnalysisStore.getState().loadHistoryFromDB().catch(console.error)
  }, [])

  // Reset compatibility when leaving reanalysis mode
  useEffect(() => {
    if (!isReanalysisMode) {
      setReanalysisCompatibility(null)
    }
  }, [isReanalysisMode])

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
      completed: (quickAnalysisMode && step.id === 2)
        ? true
        : completedSteps.includes(step.id),
      skipped: quickAnalysisMode && step.id === 2,
    }))
  }, [completedSteps, quickAnalysisMode, t])

  // === Handlers ===

  const handleStepClick = useCallback((stepId: number) => {
    if (canNavigateToStep(stepId)) {
      startTransition(() => {
        navigateToStep(stepId)
      })
    }
  }, [canNavigateToStep, navigateToStep])

  const handleUploadComplete = useCallback(async (file: File, data: DataRow[]) => {
    try {
      setUploadedFile(file)
      setUploadedData(data)
      const detailedValidation = DataValidationService.performValidation(data)
      setValidationResults(detailedValidation)

      const currentState = useAnalysisStore.getState()
      if (currentState.isReanalysisMode && currentState.variableMapping) {
        const columns: ColumnInfo[] = detailedValidation.columnStats?.map(col => ({
          name: col.name,
          type: col.type as 'numeric' | 'categorical' | 'date' | 'text',
          uniqueValues: col.uniqueValues,
          missing: col.missingCount,
        })) ?? []
        const compatibility = checkVariableCompatibility(currentState.variableMapping, columns)
        setReanalysisCompatibility(compatibility)
      }

      // 비동기 정규성 검정 (fire-and-forget)
      if (detailedValidation.columnStats?.length) {
        const capturedNonce = useAnalysisStore.getState().uploadNonce
        enrichWithNormality(detailedValidation.columnStats, data)
          .then(({ enrichedColumns, testedCount }) => {
            if (testedCount > 0) {
              const current = useAnalysisStore.getState()
              if (current.uploadNonce !== capturedNonce) return
              patchColumnNormality(enrichedColumns)
            }
          })
          .catch(() => { /* graceful degradation */ })
      }

      // 빠른 분석 모드: 업로드 직후 Step 3으로 자동 이동
      if (currentState.quickAnalysisMode && currentState.selectedMethod && !currentState.isReanalysisMode) {
        const detectedVars = extractDetectedVariables(
          currentState.selectedMethod.id,
          detailedValidation,
          null,
        )
        setDetectedVariables(detectedVars)
        toast.success(`${file.name} 업로드 완료 — 변수 선택으로 이동합니다`)
        navigateToStep(3)
      }
    } catch (err) {
      setError(t.analysis.errors.uploadFailed((err as Error).message))
    }
  }, [setUploadedFile, setUploadedData, setValidationResults, patchColumnNormality, setDetectedVariables, setError, navigateToStep, t])

  const handlePurposeSubmit = useCallback((purpose: string, method: StatisticalMethod) => {
    setAnalysisPurpose(purpose)
    setSelectedMethod(method)

    if (!uploadedData || uploadedData.length === 0) {
      setQuickAnalysisMode(true)
      navigateToStep(1)
    } else {
      goToNextStep()
    }
  }, [setAnalysisPurpose, setSelectedMethod, goToNextStep, uploadedData, setQuickAnalysisMode, navigateToStep])

  const handleAnalysisComplete = useCallback((analysisResults: AnalysisResult) => {
    setResults(analysisResults)
    goToNextStep()
  }, [setResults, goToNextStep])

  const handleReanalysisRun = useCallback(() => {
    navigateToStep(4)
  }, [navigateToStep])

  const handleReanalysisEditVariables = useCallback(() => {
    navigateToStep(3)
  }, [navigateToStep])

  const handleStep1Next = useCallback(() => {
    if (quickAnalysisMode && selectedMethod) {
      navigateToStep(3)
    } else {
      goToNextStep()
    }
  }, [quickAnalysisMode, selectedMethod, navigateToStep, goToNextStep])

  /** 메서드 ID → quickAnalysis 모드 진입. 성공 시 true 반환 */
  const startQuickAnalysis = useCallback((methodId: string): boolean => {
    const method = STATISTICAL_METHODS[methodId]
    if (!method) return false
    setSelectedMethod(method)
    setQuickAnalysisMode(true)
    navigateToStep(1)
    return true
  }, [setSelectedMethod, setQuickAnalysisMode, navigateToStep])

  // Floating nav
  const canProceedWithFloatingNav = useMemo(() => {
    if (isHubVisible) return false
    if (currentStep === 4 && results) return false
    return canProceedToNext()
  }, [isHubVisible, currentStep, results, canProceedToNext, uploadedData, uploadedFileName, validationResults, selectedMethod, variableMapping])

  const nextStepLabel = useMemo(() => {
    const nav = t.analysis.floatingNav
    switch (currentStep) {
      case 1: return quickAnalysisMode ? nav.toVariables : nav.toMethod
      case 2: return nav.toVariables
      case 3: return nav.toExecution
      case 4: return nav.runAnalysis
      default: return nav.defaultNext
    }
  }, [currentStep, quickAnalysisMode, t])

  const handleFloatingNext = useCallback(() => {
    handleStep1Next()
  }, [handleStep1Next])

  return {
    currentStep,
    completedSteps,
    uploadedData,
    uploadedFileName,
    validationResults,
    selectedMethod,
    variableMapping,
    results,
    isLoading,
    error,
    analysisHistory,
    isReanalysisMode,
    quickAnalysisMode,
    steps,
    animationClass,
    direction,
    handleStepClick,
    handleUploadComplete,
    handlePurposeSubmit,
    handleAnalysisComplete,
    handleStep1Next,
    handleReanalysisRun,
    handleReanalysisEditVariables,
    startQuickAnalysis,
    canProceedWithFloatingNav,
    nextStepLabel,
    handleFloatingNext,
    reanalysisCompatibility,
    setQuickAnalysisMode,
    navigateToStep,
    goToPreviousStep,
    goToNextStep,
    setError,
    canProceedToNext,
    isPending,
  }
}
