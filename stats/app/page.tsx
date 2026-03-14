'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import { loadAndRestoreHistory, startFreshAnalysisSession } from '@/lib/stores/store-orchestration'
import { useAnalysisHandlers } from '@/hooks/use-analysis-handlers'
import { useTerminology } from '@/hooks/use-terminology'
import { getRecommendations } from '@/lib/services/consultant-service'
import { toast } from 'sonner'
import type { ResolvedIntent, ConsultantResponse } from '@/types/analysis'

import { AnalysisLayout } from '@/components/analysis/layouts/AnalysisLayout'
import { AnalysisHistoryPanel } from '@/components/analysis/AnalysisHistoryPanel'
import { ChatCentricHub } from '@/components/analysis/ChatCentricHub'
import { AnalysisSteps } from '@/components/analysis/AnalysisSteps'

// ===== Main Page Component =====

export default function HomePage() {
  const t = useTerminology()
  const [showHelp, setShowHelp] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [systemMemory, setSystemMemory] = useState<number | null>(null)
  const [consultantResponse, setConsultantResponse] = useState<ConsultantResponse | null>(null)

  const {
    showHub,
    setShowHub,
    setPurposeInputMode,
    setUserQuery,
  } = useModeStore()

  const addCompletedStep = useAnalysisStore(s => s.addCompletedStep)
  const handlers = useAnalysisHandlers(showHub)
  const {
    startQuickAnalysis,
    navigateToStep,
  } = handlers

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

  // === Hub-specific handlers ===

  const handleIntentResolved = useCallback((intent: ResolvedIntent, message: string) => {
    switch (intent.track) {
      case 'direct-analysis':
        setConsultantResponse(null)
        if (intent.method) {
          startFreshAnalysisSession()
          startQuickAnalysis(intent.method.id)
          setShowHub(false)
        } else {
          startFreshAnalysisSession()
          setUserQuery(message)
          setPurposeInputMode('ai')
          setShowHub(false)
          addCompletedStep(1)  // U1-2: Step 1→2 전진 점프 사전 마킹
          navigateToStep(2)
        }
        break

      case 'data-consultation': {
        const response = getRecommendations(message)
        if (response.recommendations.length > 0) {
          setConsultantResponse(response)
          setUserQuery(message)
        } else {
          startFreshAnalysisSession()
          setUserQuery(message)
          setShowHub(false)
          navigateToStep(1)
        }
        break
      }

      case 'experiment-design':
        setConsultantResponse(null)
        startFreshAnalysisSession()
        setUserQuery(message)
        toast.info(t.hub.experimentNotReady)
        setShowHub(false)
        navigateToStep(1)
        break
    }
  }, [startQuickAnalysis, navigateToStep, setShowHub, setPurposeInputMode, setUserQuery, t])

  const handleQuickAnalysis = useCallback((methodId: string) => {
    setConsultantResponse(null)
    startFreshAnalysisSession()
    if (startQuickAnalysis(methodId)) {
      setShowHub(false)
    }
  }, [startQuickAnalysis, setShowHub])

  const handleHistorySelect = useCallback(async (historyId: string) => {
    try {
      setConsultantResponse(null)
      await loadAndRestoreHistory(historyId)
      setShowHub(false)
    } catch (err) {
      console.error('Failed to load history', err)
    }
  }, [setShowHub])

  const handleHistoryDelete = useCallback(async (historyId: string) => {
    await useHistoryStore.getState().deleteFromHistory(historyId)
  }, [])

  const handleHubUploadClick = useCallback(() => {
    setConsultantResponse(null)
    startFreshAnalysisSession()
    setShowHub(false)
    navigateToStep(1)
  }, [setShowHub, navigateToStep])

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
      systemMemory={systemMemory}
      historyPanel={<AnalysisHistoryPanel />}
      historyCount={handlers.analysisHistory.length}
      showStepper={!showHub}
      showHub={showHub}
      canGoNext={handlers.canProceedWithFloatingNav}
      onNext={handlers.handleFloatingNext}
      nextLabel={handlers.nextStepLabel}
      showFloatingNav={handlers.currentStep === 1 && !showHub && handlers.canProceedWithFloatingNav}
    >
      {/* ===== Hub Page (Chat-Centric Style) ===== */}
      {showHub && (
        <ChatCentricHub
          onIntentResolved={handleIntentResolved}
          onQuickAnalysis={handleQuickAnalysis}
          onHistorySelect={handleHistorySelect}
          onHistoryDelete={handleHistoryDelete}
          onUploadClick={handleHubUploadClick}
          onHistoryShowMore={handleHistoryToggle}
          consultantResponse={consultantResponse}
        />
      )}

      {/* ===== Step 1-4 ===== */}
      <AnalysisSteps isHubVisible={showHub} />
    </AnalysisLayout>
  )
}
