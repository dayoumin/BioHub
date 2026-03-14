'use client'

/**
 * Step 1-4 렌더링 컴포넌트
 *
 * Home(/)과 /analysis 양쪽에서 사용.
 * Hub 렌더링은 포함하지 않음 — 각 페이지가 자체 Hub를 렌더링.
 *
 * TD-10-C: Store 직접 구독 + useDataUpload 훅으로 자급자족.
 * handlers prop 제거 → isHubVisible + onBackToHub만 수신.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DataExplorationStep } from '@/components/analysis/steps/DataExplorationStep'
import { PurposeInputStep } from '@/components/analysis/steps/PurposeInputStep'
import { VariableSelectionStep } from '@/components/analysis/steps/VariableSelectionStep'
import { AnalysisExecutionStep } from '@/components/analysis/steps/AnalysisExecutionStep'
import { ResultsActionStep } from '@/components/analysis/steps/ResultsActionStep'
import { ReanalysisPanel } from '@/components/analysis/ReanalysisPanel'
import { ReanalysisBanner, QuickAnalysisBanner } from '@/components/analysis/steps/Step1ModeBanners'
import { InlineError } from '@/components/common/InlineError'
import { useTerminology } from '@/hooks/use-terminology'
import { useDataUpload } from '@/hooks/use-data-upload'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import type { StatisticalMethod, AnalysisResult } from '@/types/analysis'

interface AnalysisStepsProps {
  /** Hub가 표시 중이면 스텝 렌더링 생략 */
  isHubVisible: boolean
  /** 브라우저/허브로 복귀 (선택적 — /analysis 페이지에서 사용) */
  onBackToHub?: () => void
}

export function AnalysisSteps({ isHubVisible, onBackToHub }: AnalysisStepsProps): React.ReactElement | null {
  const t = useTerminology()

  // ─── Store 직접 구독 ───
  const {
    currentStep,
    uploadedData,
    uploadedFileName,
    validationResults,
    selectedMethod,
    variableMapping,
    results,
    isLoading,
    error,
    setAnalysisPurpose,
    setSelectedMethod,
    setResults,
    setError,
    addCompletedStep,
    goToNextStep,
    goToPreviousStep,
    navigateToStep,
    canProceedToNext,
  } = useAnalysisStore()

  const {
    stepTrack,
    setStepTrack,
  } = useModeStore()

  // ─── useDataUpload 훅 ───
  const { handleUploadComplete, reanalysisCompatibility } = useDataUpload()

  // ─── 애니메이션 방향 추적 ───
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

  // ─── 인라인 핸들러 (이전 useAnalysisHandlers에서 이동) ───

  const handlePurposeSubmit = useCallback((purpose: string, method: StatisticalMethod) => {
    setAnalysisPurpose(purpose)
    setSelectedMethod(method)

    if (!uploadedData || uploadedData.length === 0) {
      setStepTrack('quick')
      navigateToStep(1)
    } else {
      goToNextStep()
    }
  }, [setAnalysisPurpose, setSelectedMethod, goToNextStep, uploadedData, setStepTrack, navigateToStep])

  const handleAnalysisComplete = useCallback((analysisResults: AnalysisResult) => {
    setResults(analysisResults)
    goToNextStep()
  }, [setResults, goToNextStep])

  // U1-2: reanalysis 전진 점프 — 중간 단계 사전 마킹
  const handleReanalysisRun = useCallback(() => {
    addCompletedStep(1)
    addCompletedStep(2)
    addCompletedStep(3)
    navigateToStep(4)
  }, [addCompletedStep, navigateToStep])

  const handleReanalysisEditVariables = useCallback(() => {
    addCompletedStep(1)
    addCompletedStep(2)
    navigateToStep(3)
  }, [addCompletedStep, navigateToStep])

  // ─── 렌더링 ───

  if (isHubVisible) return null

  return (
    <>
      {/* ===== Step 1: Data Exploration ===== */}
      {currentStep === 1 && (
        <div className={animationClass} key="step1">
          {stepTrack === 'reanalysis' && selectedMethod && !uploadedData && (
            <ReanalysisBanner
              method={selectedMethod}
              t={{ title: t.reanalysis.title, description: t.analysis.modeBanners.reanalysis.description }}
            />
          )}

          {stepTrack === 'quick' && selectedMethod && (
            <QuickAnalysisBanner
              method={selectedMethod}
              onNormalMode={() => setStepTrack('normal')}
              onChangeMethod={() => {
                setStepTrack('normal')
                onBackToHub ? onBackToHub() : navigateToStep(2)
              }}
              t={t.analysis.modeBanners.quickAnalysis}
            />
          )}

          <ErrorBoundary>
            <DataExplorationStep
              validationResults={validationResults}
              data={uploadedData ?? []}
              onUploadComplete={handleUploadComplete}
              existingFileName={uploadedFileName ?? undefined}
            />
          </ErrorBoundary>

          {stepTrack === 'reanalysis' && uploadedData && uploadedData.length > 0 && (
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
      {currentStep === 2 && (
        <div className={animationClass} key="step2">
          <PurposeInputStep
            onPurposeSubmit={handlePurposeSubmit}
            validationResults={validationResults}
            data={uploadedData}
          />
        </div>
      )}

      {/* ===== Step 3: Variable Selection ===== */}
      {currentStep === 3 && (
        <div className={animationClass} key="step3">
          <VariableSelectionStep onBack={goToPreviousStep} />
        </div>
      )}

      {/* ===== Step 4: Analysis & Results ===== */}
      {currentStep === 4 && (
        <div className={animationClass} key="step4">
          {!results ? (
            <AnalysisExecutionStep
              selectedMethod={selectedMethod}
              variableMapping={variableMapping ?? {}}
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
            retryLabel={t.analysis.errors.retryLabel}
          />
        </div>
      )}
    </>
  )
}
