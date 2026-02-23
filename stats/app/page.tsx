'use client'

import { useCallback, useEffect, useState, useRef, useTransition, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import {
  StatisticalMethod,
  AnalysisResult,
  DataRow
} from '@/types/smart-flow'
import type { ResolvedIntent } from '@/types/smart-flow'
import { toast } from 'sonner'
import { SmartFlowLayout } from '@/components/smart-flow/layouts/SmartFlowLayout'
import { DataExplorationStep } from '@/components/smart-flow/steps/DataExplorationStep'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import { VariableSelectionStep } from '@/components/smart-flow/steps/VariableSelectionStep'
import { AnalysisExecutionStep } from '@/components/smart-flow/steps/AnalysisExecutionStep'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { AnalysisHistoryPanel } from '@/components/smart-flow/AnalysisHistoryPanel'
import { ReanalysisPanel } from '@/components/smart-flow/ReanalysisPanel'
import { ChatCentricHub } from '@/components/smart-flow/ChatCentricHub'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { checkVariableCompatibility, CompatibilityResult } from '@/lib/utils/variable-compatibility'
import type { ColumnInfo } from '@/lib/statistics/variable-mapping'
import { useTerminology } from '@/hooks/use-terminology'

// UI Components
import { InlineError } from '@/components/common/InlineError'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2, Zap } from 'lucide-react'
// Note: favorites 기능은 ChatCentricHub 내부에서 처리됨

// ===== Main Page Component =====

export default function HomePage() {
  const t = useTerminology()
  const [showHelp, setShowHelp] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [reanalysisCompatibility, setReanalysisCompatibility] = useState<CompatibilityResult | null>(null)
  const [systemMemory, setSystemMemory] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // System memory detection
  useEffect(() => {
    interface NavigatorWithMemory extends Navigator {
      deviceMemory?: number
    }
    if (typeof navigator !== 'undefined') {
      const nav = navigator as NavigatorWithMemory
      if (nav.deviceMemory) {
        setSystemMemory(nav.deviceMemory)
      }
    }
  }, [])


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
    showHub,
    setShowHub,
    quickAnalysisMode,
    setQuickAnalysisMode,
    setPurposeInputMode,
    setUserQuery
  } = useSmartFlowStore()

  // 스텝 전환 애니메이션 방향 추적
  const prevStepRef = useRef(currentStep)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    if (currentStep > prevStepRef.current) setDirection('forward')
    else if (currentStep < prevStepRef.current) setDirection('backward')
    prevStepRef.current = currentStep
  }, [currentStep])

  const animationClass = useMemo(() => {
    if (showHub) return 'animate-fade-in'
    return direction === 'forward' ? 'animate-slide-left' : 'animate-slide-right'
  }, [direction, showHub])

  // Load history from IndexedDB
  useEffect(() => {
    useSmartFlowStore.getState().loadHistoryFromDB().catch(console.error)
  }, [])

  // Reset compatibility when leaving reanalysis mode
  useEffect(() => {
    if (!isReanalysisMode) {
      setReanalysisCompatibility(null)
    }
  }, [isReanalysisMode])

  // Steps configuration
  const steps = useMemo(() => {
    const sl = t.smartFlow.stepShortLabels
    return [
      { id: 1, label: sl.exploration },
      { id: 2, label: sl.method },
      { id: 3, label: sl.variable },
      { id: 4, label: sl.analysis }
    ].map((step) => ({
      ...step,
      completed: (quickAnalysisMode && step.id === 2)
        ? true
        : completedSteps.includes(step.id)
    }))
  }, [completedSteps, quickAnalysisMode, t])

  // Handlers
  const handleStepClick = useCallback((stepId: number) => {
    if (canNavigateToStep(stepId)) {
      startTransition(() => {
        navigateToStep(stepId)
      })
    }
  }, [canNavigateToStep, navigateToStep])

  const handleUploadComplete = useCallback((file: File, data: DataRow[]) => {
    try {
      setUploadedFile(file)
      setUploadedData(data)
      const detailedValidation = DataValidationService.performValidation(data)
      setValidationResults(detailedValidation)

      const currentState = useSmartFlowStore.getState()
      if (currentState.isReanalysisMode && currentState.variableMapping) {
        const columns: ColumnInfo[] = detailedValidation.columnStats?.map(col => ({
          name: col.name,
          type: col.type as 'numeric' | 'categorical' | 'date' | 'text',
          uniqueValues: col.uniqueValues,
          missing: col.missingCount
        })) || []
        const compatibility = checkVariableCompatibility(currentState.variableMapping, columns)
        setReanalysisCompatibility(compatibility)
      }
    } catch (err) {
      setError(t.smartFlow.errors.uploadFailed((err as Error).message))
    }
  }, [setUploadedFile, setUploadedData, setValidationResults, setError])

  const handlePurposeSubmit = useCallback((purpose: string, method: StatisticalMethod) => {
    setAnalysisPurpose(purpose)
    setSelectedMethod(method)

    // 데이터가 없으면 데이터 업로드 단계(Step 1)로 이동
    // QuickAnalysisMode를 켜서 Step 1 완료 후 바로 Step 3(변수 선택)로 이동하게 함
    if (!uploadedData || uploadedData.length === 0) {
      setQuickAnalysisMode(true)
      navigateToStep(1)
    } else {
      goToNextStep()
    }
  }, [setAnalysisPurpose, setSelectedMethod, goToNextStep, uploadedData, setQuickAnalysisMode, navigateToStep])

  const handleAnalysisComplete = useCallback((results: AnalysisResult) => {
    setResults(results)
    goToNextStep()
  }, [setResults, goToNextStep])

  const handleReanalysisRun = useCallback(() => {
    navigateToStep(4)
  }, [navigateToStep])

  const handleReanalysisEditVariables = useCallback(() => {
    navigateToStep(3)
  }, [navigateToStep])

  const handleHistoryToggle = useCallback(() => {
    setShowHistory(prev => !prev)
  }, [])

  const handleHelpToggle = useCallback(() => {
    setShowHelp(prev => !prev)
  }, [])

  // Hub handlers

  // Intent Router 결과 처리 (Chat-First Hub)
  const handleIntentResolved = useCallback((intent: ResolvedIntent, message: string) => {
    switch (intent.track) {
      case 'direct-analysis':
        if (intent.method) {
          // 메서드 확정 → quickAnalysis 경로 (Step 2 건너뜀 → userQuery 불필요)
          setSelectedMethod(intent.method)
          setQuickAnalysisMode(true)
          setShowHub(false)
          navigateToStep(1)
        } else {
          // 방어적 분기: method 없이 → Step 2 AI 추천 경로
          setUserQuery(message)
          setQuickAnalysisMode(false)
          setPurposeInputMode('ai')
          setShowHub(false)
          navigateToStep(2)
        }
        break

      case 'data-consultation':
        // Hub 질문 저장 → Step 2 aiChatInput으로 전달
        setUserQuery(message)
        setQuickAnalysisMode(false)
        setShowHub(false)
        navigateToStep(1)
        break

      case 'experiment-design':
        // Phase 2 미구현 → 토스트 + data-consultation fallback
        setUserQuery(message)
        toast.info(t.hub.experimentNotReady)
        setQuickAnalysisMode(false)
        setShowHub(false)
        navigateToStep(1)
        break
    }
  }, [setSelectedMethod, setQuickAnalysisMode, setShowHub, setPurposeInputMode, setUserQuery, navigateToStep, t])

  // Quick analysis from category or favorites
  const handleQuickAnalysis = useCallback((methodId: string) => {
    const method = STATISTICAL_METHODS[methodId]
    if (method) {
      setSelectedMethod(method)
      setQuickAnalysisMode(true)
      setShowHub(false)
      navigateToStep(1)
    }
  }, [setSelectedMethod, setQuickAnalysisMode, setShowHub, navigateToStep])

  // History select from hub
  const handleHistorySelect = useCallback(async (historyId: string) => {
    try {
      await useSmartFlowStore.getState().loadFromHistory(historyId)
      setShowHub(false)
    } catch (err) {
      console.error('Failed to load history', err)
    }
  }, [setShowHub])

  const handleStep1Next = useCallback(() => {
    if (quickAnalysisMode && selectedMethod) {
      navigateToStep(3)
    } else {
      goToNextStep()
    }
  }, [quickAnalysisMode, selectedMethod, navigateToStep, goToNextStep])

  // Floating navigation button logic
  // Note: canProceedToNext() reads uploadedFile/uploadedData/validationResults/selectedMethod/variableMapping
  // internally via get(), so we must include those as deps for proper reactivity
  const canProceedWithFloatingNav = useMemo(() => {
    if (showHub) return false
    if (currentStep === 4 && results) return false // 결과 페이지에서는 숨김
    return canProceedToNext()
  }, [showHub, currentStep, results, canProceedToNext, uploadedData, uploadedFileName, validationResults, selectedMethod, variableMapping])

  const getNextStepLabel = useMemo(() => {
    const nav = t.smartFlow.floatingNav
    switch (currentStep) {
      case 1: return quickAnalysisMode ? nav.toVariables : nav.toMethod
      case 2: return nav.toVariables
      case 3: return nav.toExecution
      case 4: return nav.runAnalysis
      default: return nav.defaultNext
    }
  }, [currentStep, quickAnalysisMode, t])

  const handleFloatingNext = useCallback(() => {
    // Step 1에서만 사용 (Step 2, 3은 각 스텝 내부에서 처리)
    handleStep1Next()
  }, [handleStep1Next])


  return (
    <SmartFlowLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={handleStepClick}
      isAnalyzing={isLoading}
      showHistory={showHistory}
      showHelp={showHelp}
      onHistoryToggle={handleHistoryToggle}
      onHelpToggle={handleHelpToggle}
      systemMemory={systemMemory}
      historyPanel={<AnalysisHistoryPanel />}
      historyCount={analysisHistory.length}
      showStepper={!showHub}
      showHub={showHub}
      canGoNext={canProceedWithFloatingNav}
      onNext={handleFloatingNext}
      nextLabel={getNextStepLabel}
      showFloatingNav={currentStep === 1 && !showHub}
    >
      {/* ===== Hub Page (Chat-Centric Style) ===== */}
      {showHub && (
        <ChatCentricHub
          onIntentResolved={handleIntentResolved}
          onQuickAnalysis={handleQuickAnalysis}
          onHistorySelect={handleHistorySelect}
        />
      )}

      {/* ===== Step 1: Data Exploration ===== */}
      {!showHub && currentStep === 1 && (
        <div className={animationClass} key="step1">
          {/* 재분석 모드 안내 (데이터 업로드 전) */}
          {isReanalysisMode && selectedMethod && !uploadedData && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{t.reanalysis.title}</Badge>
                      <span className="font-medium">{selectedMethod.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.smartFlow.modeBanners.reanalysis.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* 빠른 분석 모드 안내 */}
          {!isReanalysisMode && quickAnalysisMode && selectedMethod && (
            <Card className="mb-6 border-amber-300/50 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{t.smartFlow.modeBanners.quickAnalysis.badge}</Badge>
                      <span className="font-medium">{selectedMethod.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.smartFlow.modeBanners.quickAnalysis.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setQuickAnalysisMode(false) }}
                    >
                      {t.smartFlow.modeBanners.quickAnalysis.normalMode}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setQuickAnalysisMode(false); navigateToStep(2) }}
                    >
                      {t.smartFlow.modeBanners.quickAnalysis.changeMethod}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <ErrorBoundary>
            <DataExplorationStep
              validationResults={validationResults}
              data={uploadedData || []}
              onNext={handleStep1Next}
              onPrevious={goToPreviousStep}
              onUploadComplete={handleUploadComplete}
              existingFileName={uploadedFileName || undefined}
            />
          </ErrorBoundary>

          {/* 재분석 패널 (데이터 업로드 후) */}
          {isReanalysisMode && uploadedData && uploadedData.length > 0 && (
            <div className="mt-6">
              <ReanalysisPanel
                method={selectedMethod}
                variableMapping={variableMapping}
                compatibility={reanalysisCompatibility}
                onRunAnalysis={handleReanalysisRun}
                onEditVariables={handleReanalysisEditVariables}
                isAnalyzing={isLoading}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== Step 2: Purpose Input ===== */}
      {!showHub && currentStep === 2 && (
        <div className={animationClass} key="step2">
          <PurposeInputStep
            onPurposeSubmit={handlePurposeSubmit}
            validationResults={validationResults}
            data={uploadedData}
          />
        </div>
      )}

      {/* ===== Step 3: Variable Selection ===== */}
      {!showHub && currentStep === 3 && (
        <div className={animationClass} key="step3">
          <VariableSelectionStep />
        </div>
      )}

      {/* ===== Step 4: Analysis & Results =====
       * 이중 구조: !results → AnalysisExecutionStep (실행), results → ResultsActionStep (결과)
       * 분석 완료 시 results가 설정되면 자동 전환.
       * ResultsActionStep에서 navigateToStep(3) 호출 시 results는 유지됨.
       */}
      {!showHub && currentStep === 4 && (
        <div className={animationClass} key="step4">
          {!results ? (
            <AnalysisExecutionStep
              selectedMethod={selectedMethod}
              variableMapping={variableMapping || {}}
              onAnalysisComplete={handleAnalysisComplete}
              onNext={goToNextStep}
              onPrevious={goToPreviousStep}
              canGoNext={canProceedToNext()}
              canGoPrevious={currentStep > 1}
            />
          ) : (
            <ResultsActionStep results={results} />
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 px-6">
          <InlineError
            message={error}
            onRetry={() => setError(null)}
            retryLabel={t.smartFlow.errors.retryLabel}
          />
        </div>
      )}
    </SmartFlowLayout>
  )
}
