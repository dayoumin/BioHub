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

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import type { StatisticalMethod, AnalysisResult } from '@/types/analysis'

/** Step 전환 애니메이션 variants */
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -20 : 20,
    opacity: 0,
  }),
}

const stepTransition = {
  x: { type: 'tween' as const, duration: 0.25, ease: 'easeOut' as const },
  opacity: { duration: 0.2 },
}

interface AnalysisStepsProps {
  /** Hub가 표시 중이면 스텝 렌더링 생략 */
  isHubVisible: boolean
  /** 브라우저/허브로 복귀 (선택적 — /analysis 페이지에서 사용) */
  onBackToHub?: () => void
}

export function AnalysisSteps({ isHubVisible, onBackToHub }: AnalysisStepsProps): React.ReactElement | null {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()

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
  const [direction, setDirection] = useState(0)
  const isFirstMount = direction === 0

  useEffect(() => {
    if (currentStep > prevStepRef.current) setDirection(1)
    else if (currentStep < prevStepRef.current) setDirection(-1)
    prevStepRef.current = currentStep
  }, [currentStep])

  // 공통 motion props — 4개 Step에서 재사용
  const motionProps = prefersReducedMotion || isFirstMount
    ? { animate: 'center' as const, transition: { duration: 0 } }
    : {
        custom: direction,
        variants: stepVariants,
        initial: 'enter' as const,
        animate: 'center' as const,
        exit: 'exit' as const,
        transition: stepTransition,
      }

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
      <AnimatePresence mode="wait" custom={direction}>
        {/* ===== Step 1: Data Exploration ===== */}
        {currentStep === 1 && (
          <motion.div key="step1" {...motionProps}>
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
          </motion.div>
        )}

        {/* ===== Step 2: Purpose Input ===== */}
        {currentStep === 2 && (
          <motion.div key="step2" {...motionProps}>
            <PurposeInputStep
              onPurposeSubmit={handlePurposeSubmit}
              validationResults={validationResults}
              data={uploadedData}
            />
          </motion.div>
        )}

        {/* ===== Step 3: Variable Selection ===== */}
        {currentStep === 3 && (
          <motion.div key="step3" {...motionProps}>
            <VariableSelectionStep onBack={goToPreviousStep} />
          </motion.div>
        )}

        {/* ===== Step 4: Analysis & Results ===== */}
        {currentStep === 4 && (
          <motion.div key="step4" {...motionProps}>
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
          </motion.div>
        )}
      </AnimatePresence>

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
