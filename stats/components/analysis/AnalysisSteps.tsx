'use client'

/**
 * Step 1-4 렌더링 컴포넌트
 *
 * Home(/)과 /analysis 양쪽에서 사용.
 * Hub 렌더링은 포함하지 않음 — 각 페이지가 자체 Hub를 렌더링.
 */

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
import type { useAnalysisHandlers } from '@/hooks/use-analysis-handlers'

type Handlers = ReturnType<typeof useAnalysisHandlers>

interface AnalysisStepsProps {
  handlers: Handlers
  /** Hub가 표시 중이면 스텝 렌더링 생략 */
  isHubVisible: boolean
  /** 브라우저/허브로 복귀 (선택적 — /analysis 페이지에서 사용) */
  onBackToHub?: () => void
}

export function AnalysisSteps({ handlers, isHubVisible, onBackToHub }: AnalysisStepsProps): React.ReactElement | null {
  const t = useTerminology()
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
    isReanalysisMode,
    quickAnalysisMode,
    animationClass,
    reanalysisCompatibility,
    handleUploadComplete,
    handlePurposeSubmit,
    handleAnalysisComplete,
    handleReanalysisRun,
    handleReanalysisEditVariables,
    setQuickAnalysisMode,
    navigateToStep,
    goToPreviousStep,
    goToNextStep,
    canProceedToNext,
    setError,
  } = handlers

  if (isHubVisible) return null

  return (
    <>
      {/* ===== Step 1: Data Exploration ===== */}
      {currentStep === 1 && (
        <div className={animationClass} key="step1">
          {isReanalysisMode && selectedMethod && !uploadedData && (
            <ReanalysisBanner
              method={selectedMethod}
              t={{ title: t.reanalysis.title, description: t.analysis.modeBanners.reanalysis.description }}
            />
          )}

          {!isReanalysisMode && quickAnalysisMode && selectedMethod && (
            <QuickAnalysisBanner
              method={selectedMethod}
              onNormalMode={() => setQuickAnalysisMode(false)}
              onChangeMethod={() => {
                setQuickAnalysisMode(false)
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
