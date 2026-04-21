'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  const lastRouteHistoryIdRef = useRef<string | null>(null)

  const {
    showHub,
    setShowHub,
  } = useModeStore()

  const handlers = useAnalysisHandlers(showHub)
  const {
    startQuickAnalysis,
    navigateToStep,
    isHistoryResultsView,
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

  useEffect(() => {
    let cancelled = false

    const syncHistoryFromRoute = async (): Promise<void> => {
      if (typeof window === 'undefined') return

      const historyId = new URLSearchParams(window.location.search).get('history')
      if (!historyId) {
        lastRouteHistoryIdRef.current = null
        return
      }
      if (lastRouteHistoryIdRef.current === historyId) return

      lastRouteHistoryIdRef.current = historyId

      try {
        const restored = await loadAndRestoreHistory(historyId)
        if (!cancelled && restored) {
          setShowHub(false)
        }
      } catch (error) {
        console.error('[HomePage] Failed to restore history from route', error)
      }
    }

    const handlePopState = (): void => {
      void syncHistoryFromRoute()
    }

    void syncHistoryFromRoute()
    window.addEventListener('popstate', handlePopState)
    return () => {
      cancelled = true
      window.removeEventListener('popstate', handlePopState)
    }
  }, [setShowHub])

  // === Hub-specific handlers ===

  /**
   * Intent resolved — ChatCentricHub에서 호출
   *
   * data-consultation은 허브 내부(ChatThread)에서 처리하므로 여기 도달하지 않음.
   * 여기에 도달하는 경우:
   * - direct-analysis + 메서드 확정 → quick analysis
   * - direct-analysis + 메서드 미확정 → Step 1 (데이터 업로드 후 Step 2 브라우저)
   * - visualization → Graph Studio 이동
   */
  const handleIntentResolved = useCallback((intent: ResolvedIntent, message: string) => {
    switch (intent.track) {
      case 'direct-analysis':
        startFreshAnalysisSession()
        if (intent.method) {
          startQuickAnalysis(intent.method.id)
        } else {
          // 메서드 미확정 → 데이터 업로드부터 시작 (Step 2 브라우저에서 선택)
          navigateToStep(1)
        }
        setShowHub(false)
        break

      case 'visualization': {
        const bridged = bridgeHubDataToGraphStudio()
        if (!bridged) {
          toast.info(TOAST.navigation.graphStudioOpened)
        }
        router.push('/graph-studio')
        break
      }
    }
  }, [startQuickAnalysis, navigateToStep, setShowHub, router])

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
      onStepChange={isHistoryResultsView ? undefined : handlers.handleStepClick}
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
      showFloatingNav={false}
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
      <AnalysisSteps isHubVisible={showHub} onBackToHub={handleBackToHub} />
    </AnalysisLayout>
  )
}
