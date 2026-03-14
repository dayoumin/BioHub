'use client'

/**
 * /analysis — 통계 분석 페이지
 *
 * 카테고리 브라우저로 메서드 탐색 → 선택 → Step 1-4 진행.
 * 홈(/)의 챗 허브와 달리, 여기는 카테고리 브라우저가 진입점.
 *
 * Hub/Step 전환은 로컬 useState — store의 showHub를 사용하지 않음.
 */

import { useState, useCallback } from 'react'
import { useAnalysisHandlers } from '@/hooks/use-analysis-handlers'
import { startFreshAnalysisSession } from '@/lib/stores/store-orchestration'
import { AnalysisLayout } from '@/components/analysis/layouts/AnalysisLayout'
import { AnalysisHistoryPanel } from '@/components/analysis/AnalysisHistoryPanel'
import { StatisticsBrowserHub } from '@/components/analysis/StatisticsBrowserHub'
import { AnalysisSteps } from '@/components/analysis/AnalysisSteps'

export default function AnalysisPage() {
  const [showBrowser, setShowBrowser] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handlers = useAnalysisHandlers(showBrowser)
  const { startQuickAnalysis } = handlers

  const handleMethodSelect = useCallback((methodId: string) => {
    startFreshAnalysisSession()
    if (startQuickAnalysis(methodId)) {
      setShowBrowser(false)
    }
  }, [startQuickAnalysis])

  const handleBackToBrowser = useCallback(() => {
    setShowBrowser(true)
  }, [])

  const handleHistoryToggle = useCallback(() => {
    setShowHistory(prev => !prev)
  }, [])

  const handleHelpToggle = useCallback(() => {
    setShowHelp(prev => !prev)
  }, [])

  return (
    <AnalysisLayout
      currentStep={handlers.currentStep}
      steps={handlers.steps}
      onStepChange={handlers.handleStepClick}
      isAnalyzing={handlers.isLoading}
      showHistory={showHistory}
      showHelp={showHelp}
      onHistoryToggle={handleHistoryToggle}
      onHelpToggle={handleHelpToggle}
      historyPanel={<AnalysisHistoryPanel />}
      historyCount={handlers.analysisHistory.length}
      showStepper={!showBrowser}
      showHub={showBrowser}
      canGoNext={handlers.canProceedWithFloatingNav}
      onNext={handlers.handleFloatingNext}
      nextLabel={handlers.nextStepLabel}
      showFloatingNav={handlers.currentStep === 1 && !showBrowser && handlers.canProceedWithFloatingNav}
    >
      {/* ===== Browser Hub ===== */}
      {showBrowser && (
        <StatisticsBrowserHub onMethodSelect={handleMethodSelect} />
      )}

      {/* ===== Step 1-4 ===== */}
      <AnalysisSteps isHubVisible={showBrowser} onBackToHub={handleBackToBrowser} />
    </AnalysisLayout>
  )
}
