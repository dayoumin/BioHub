'use client'

import { useCallback, useEffect, useState, useTransition, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import {
  StatisticalMethod,
  AnalysisResult,
  DataRow
} from '@/types/smart-flow'
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

// UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2 } from 'lucide-react'
// Note: favorites 기능은 ChatCentricHub 내부에서 처리됨

// ===== Main Page Component =====

export default function HomePage() {
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
    setPurposeInputMode
  } = useSmartFlowStore()

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
    return [
      { id: 1, label: '탐색' },
      { id: 2, label: '방법' },
      { id: 3, label: '변수' },
      { id: 4, label: '분석' }
    ].map((step) => ({
      ...step,
      completed: completedSteps.includes(step.id)
    }))
  }, [completedSteps])

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
      setError('데이터 업로드 중 오류가 발생했습니다: ' + (err as Error).message)
    }
  }, [setUploadedFile, setUploadedData, setValidationResults, setError])

  const handlePurposeSubmit = useCallback((purpose: string, method: StatisticalMethod) => {
    setAnalysisPurpose(purpose)
    setSelectedMethod(method)
    goToNextStep()
  }, [setAnalysisPurpose, setSelectedMethod, goToNextStep])

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
  const handleStartWithData = useCallback(() => {
    setShowHub(false)
    setQuickAnalysisMode(false)
    navigateToStep(1)
  }, [setShowHub, setQuickAnalysisMode, navigateToStep])

  const handleStartWithAI = useCallback(() => {
    setShowHub(false)
    setQuickAnalysisMode(false)
    setPurposeInputMode('ai')
    navigateToStep(2)
  }, [setShowHub, setQuickAnalysisMode, setPurposeInputMode, navigateToStep])

  const handleStartWithMethod = useCallback(() => {
    setShowHub(false)
    setQuickAnalysisMode(false)
    setPurposeInputMode('browse')
    navigateToStep(2)
  }, [setShowHub, setQuickAnalysisMode, setPurposeInputMode, navigateToStep])

  // 히스토리는 이제 우측 사이드바에 항상 표시됨

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

  const handleStep1Next = useCallback(() => {
    if (quickAnalysisMode && selectedMethod) {
      navigateToStep(3)
    } else {
      goToNextStep()
    }
  }, [quickAnalysisMode, selectedMethod, navigateToStep, goToNextStep])

  // Floating navigation button logic
  const canProceedWithFloatingNav = useMemo(() => {
    if (showHub) return false
    if (currentStep === 4 && results) return false // 결과 페이지에서는 숨김
    return canProceedToNext()
  }, [showHub, currentStep, results, canProceedToNext])

  const getNextStepLabel = useMemo(() => {
    switch (currentStep) {
      case 1: return quickAnalysisMode ? '변수 선택으로' : '분석 방법 선택으로'
      case 2: return '변수 선택으로'
      case 3: return '분석 실행으로'
      case 4: return '분석 실행'
      default: return '다음 단계로'
    }
  }, [currentStep, quickAnalysisMode])

  const handleFloatingNext = useCallback(() => {
    if (currentStep === 1) {
      handleStep1Next()
    } else if (currentStep === 2) {
      // Step 2 handled internally by PurposeInputStep
    } else if (currentStep === 3) {
      // Step 3 handled internally by VariableSelectionStep
    } else {
      goToNextStep()
    }
  }, [currentStep, handleStep1Next, goToNextStep])


  return (
    <SmartFlowLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={handleStepClick}
      isAnalyzing={isLoading}
      analyzingMessage="분석 중입니다..."
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
      showFloatingNav={currentStep !== 4 || !results}
    >
      {/* ===== Hub Page (Chat-Centric Style) ===== */}
      {showHub && (
        <ChatCentricHub
          onStartWithData={handleStartWithData}
          onStartWithBrowse={handleStartWithMethod}
          onShowHistory={handleHistoryToggle}
          onGoToDetailedAI={handleStartWithAI}
        />
      )}

      {/* ===== Step 1: Data Exploration ===== */}
      {!showHub && currentStep === 1 && (
        <div className="animate-fade-in">
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
                      <Badge variant="secondary" className="text-xs">재분석 모드</Badge>
                      <span className="font-medium">{selectedMethod.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      이전 설정으로 새 데이터를 분석합니다. 아래에서 데이터를 업로드하세요.
                    </p>
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
        <div className="animate-fade-in">
          <PurposeInputStep
            onPurposeSubmit={handlePurposeSubmit}
            validationResults={validationResults}
            data={uploadedData}
          />
        </div>
      )}

      {/* ===== Step 3: Variable Selection ===== */}
      {!showHub && currentStep === 3 && (
        <div className="animate-fade-in">
          <VariableSelectionStep />
        </div>
      )}

      {/* ===== Step 4: Analysis & Results ===== */}
      {!showHub && currentStep === 4 && (
        <div className="animate-fade-in">
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
        <div className="mt-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-destructive font-bold">오류:</span>
            <span className="text-sm text-destructive/90">{error}</span>
          </div>
        </div>
      )}
    </SmartFlowLayout>
  )
}
