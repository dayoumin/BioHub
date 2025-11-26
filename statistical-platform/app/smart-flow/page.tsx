'use client'

import { useCallback, useEffect, useState, useTransition, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { DataValidationService } from '@/lib/services/data-validation-service'
import {
  ValidationResults,
  StatisticalMethod,
  AnalysisResult,
  DataRow
} from '@/types/smart-flow'
import { SmartFlowLayout } from '@/components/smart-flow/layouts/SmartFlowLayout'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import { DataExplorationStep } from '@/components/smart-flow/steps/DataExplorationStep'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import { VariableSelectionStep } from '@/components/smart-flow/steps/VariableSelectionStep'
import { AnalysisExecutionStep } from '@/components/smart-flow/steps/AnalysisExecutionStep'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { AnalysisHistoryPanel } from '@/components/smart-flow/AnalysisHistoryPanel'

export default function SmartFlowPage() {
  const [showHelp, setShowHelp] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [systemMemory, setSystemMemory] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // 시스템 메모리 감지 (Navigator API)
  useEffect(() => {
    interface NavigatorWithMemory extends Navigator {
      deviceMemory?: number
    }

    if (typeof navigator !== 'undefined') {
      const nav = navigator as NavigatorWithMemory
      if (nav.deviceMemory) {
        setSystemMemory(nav.deviceMemory) // GB 단위
      }
    }
  }, [])

  // Zustand store 사용 (IndexedDB 히스토리 + sessionStorage 현재 상태)
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
    setUploadedFile,
    setUploadedData,
    setValidationResults,
    setAnalysisPurpose,
    setSelectedMethod,
    setresults,
    setError,
    canProceedToNext,
    goToNextStep,
    goToPreviousStep,
    reset,
    navigateToStep,
    canNavigateToStep,
    loadHistoryFromDB
  } = useSmartFlowStore()

  // IndexedDB에서 히스토리 불러오기 (초기화)
  useEffect(() => {
    loadHistoryFromDB().catch(console.error)
  }, [loadHistoryFromDB])

  // 페이지 이탈 시 세션 상태 초기화 (분석 히스토리는 IndexedDB에 유지)
  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  // Steps configuration (useMemo로 최적화)
  // 2025-11-26: SmartFlowLayout STEPS와 동기화
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

  // 데이터 검증 수행 (상세 검증 포함)
  const performDataValidation = useCallback(async (data: DataRow[]): Promise<ValidationResults> => {
    return await DataValidationService.performDetailedValidation(data)
  }, [])

  const handleStepClick = useCallback((stepId: number) => {
    if (canNavigateToStep(stepId)) {
      startTransition(() => {
        navigateToStep(stepId)
      })
    }
  }, [canNavigateToStep, navigateToStep])

  const handleUploadComplete = useCallback((file: File, data: DataRow[]) => {
    try {
      // 1단계: 데이터 저장
      setUploadedFile(file)
      setUploadedData(data)

      // 2단계: 상세 검증 수행 (동기)
      const detailedValidation = DataValidationService.performValidation(data)
      setValidationResults(detailedValidation)

      // Step 1에서 업로드 완료 - 같은 화면에서 데이터 탐색 표시
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
    setresults(results)
    goToNextStep()
  }, [setresults, goToNextStep])

  // 히스토리/도움말 토글 핸들러 (메모이제이션)
  const handleHistoryToggle = useCallback(() => {
    setShowHistory(prev => !prev)
  }, [])

  const handleHelpToggle = useCallback(() => {
    setShowHelp(prev => !prev)
  }, [])

  // 하단 데이터 미리보기 제거됨 (Step 2에서 이미 표시)

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
    >
      {/* Step 1: 데이터 탐색 (업로드 포함) */}
      {currentStep === 1 && (
        <div className="animate-fade-in">
          <ErrorBoundary>
            <DataExplorationStep
              validationResults={validationResults}
              data={uploadedData || []}
              onNext={goToNextStep}
              onPrevious={goToPreviousStep}
              onUploadComplete={handleUploadComplete}
              existingFileName={uploadedFileName || undefined}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Step 2: 분석 목적 선택 */}
      {currentStep === 2 && (
        <div className="animate-fade-in">
          <PurposeInputStep
            onPurposeSubmit={handlePurposeSubmit}
            validationResults={validationResults}
            data={uploadedData}
          />
        </div>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 3 && (
        <div className="animate-fade-in">
          <VariableSelectionStep />
        </div>
      )}

      {/* Step 4: 분석 실행 및 결과 */}
      {currentStep === 4 && (
        <div className="animate-fade-in">
          <AnalysisExecutionStep
            selectedMethod={selectedMethod}
            variableMapping={variableMapping || {}}
            onAnalysisComplete={handleAnalysisComplete}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            canGoNext={canProceedToNext()}
            canGoPrevious={currentStep > 1}
          />

          {/* 분석 완료 시 즉시 결과 표시 */}
          {results && (
            <div className="mt-6">
              <ResultsActionStep results={results} />
            </div>
          )}
        </div>
      )}

      {/* 에러 메시지 표시 */}
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
