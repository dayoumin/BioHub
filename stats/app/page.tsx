'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useModeStore } from '@/lib/stores/mode-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import { loadAndRestoreHistory, startFreshAnalysisSession, bridgeHubDataToGraphStudio } from '@/lib/stores/store-orchestration'
import { useAnalysisHandlers } from '@/hooks/use-analysis-handlers'
import { useTerminology } from '@/hooks/use-terminology'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'
import type { ResolvedIntent } from '@/types/analysis'

import { AnalysisLayout } from '@/components/analysis/layouts/AnalysisLayout'
import { AnalysisHistorySidebar } from '@/components/analysis/AnalysisHistorySidebar'
import { ChatCentricHub } from '@/components/analysis/ChatCentricHub'
import { AnalysisSteps } from '@/components/analysis/AnalysisSteps'

// ===== Main Page Component =====

export default function HomePage() {
  const router = useRouter()
  const t = useTerminology()
  const [showHelp, setShowHelp] = useState(false)
  const [systemMemory, setSystemMemory] = useState<number | null>(null)

  const {
    showHub,
    setShowHub,
    setPurposeInputMode,
    setUserQuery,
  } = useModeStore()

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

  /**
   * Intent resolved — ChatCentricHub에서 호출
   *
   * data-consultation은 이제 허브 내부(ChatThread)에서 처리.
   * 여기에 도달하는 경우:
   * - data-consultation + 추천 없음 → Step 1 이동
   * - direct-analysis → Step 1 또는 quick analysis
   */
  const handleIntentResolved = useCallback((intent: ResolvedIntent, message: string) => {
    switch (intent.track) {
      case 'direct-analysis':
        if (intent.method) {
          startFreshAnalysisSession()
          startQuickAnalysis(intent.method.id)
          setShowHub(false)
        } else {
          startFreshAnalysisSession()
          setUserQuery(message)
          setPurposeInputMode('ai')
          setShowHub(false)
          navigateToStep(1)
        }
        break

      case 'data-consultation':
        // 추천 없음 → Step 1 이동 (추천 있으면 허브 ChatThread에서 표시)
        startFreshAnalysisSession()
        setUserQuery(message)
        setShowHub(false)
        navigateToStep(1)
        break

      // experiment-design 폐기 — data-consultation으로 흡수됨

      case 'visualization': {
        // 허브에 업로드된 데이터가 있으면 Graph Studio로 전달 후 이동
        const bridged = bridgeHubDataToGraphStudio()
        if (!bridged) {
          toast.info(TOAST.navigation.graphStudioOpened)
        }
        router.push('/graph-studio')
        break
      }
    }
  }, [startQuickAnalysis, navigateToStep, setShowHub, setPurposeInputMode, setUserQuery, t, router])

  const handleQuickAnalysis = useCallback((methodId: string) => {
    startFreshAnalysisSession()
    if (startQuickAnalysis(methodId)) {
      setShowHub(false)
    }
  }, [startQuickAnalysis, setShowHub])

  const handleHistorySelect = useCallback(async (historyId: string) => {
    try {
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
    startFreshAnalysisSession()
    setShowHub(false)
    navigateToStep(1)
  }, [setShowHub, navigateToStep])

  const handleHelpToggle = useCallback(() => {
    setShowHelp(prev => !prev)
  }, [])

  const handleBackToHub = useCallback(() => {
    setShowHub(true)
  }, [setShowHub])

  return (
    <AnalysisLayout
      currentStep={handlers.currentStep}
      steps={handlers.steps}
      onStepChange={handlers.handleStepClick}
      isAnalyzing={handlers.isLoading}
      showHelp={showHelp}
      onHelpToggle={handleHelpToggle}
      systemMemory={systemMemory}
      historySidebar={<AnalysisHistorySidebar />}
      showStepper={!showHub}
      showHub={showHub}
      onBackToHub={handleBackToHub}
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
        />
      )}

      {/* ===== Step 1-4 ===== */}
      <AnalysisSteps isHubVisible={showHub} />
    </AnalysisLayout>
  )
}
