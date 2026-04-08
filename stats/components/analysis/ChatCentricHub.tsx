'use client'

/**
 * ChatCentricHub — Chat-First 메인 허브
 *
 * 2026 Chat-First UX:
 * - 대화창이 메인 진입점
 * - Intent Router가 3트랙 분류 (직접 분석 / 데이터 상담 / 실험 설계)
 * - 대화 히스토리 유지 (hubChatStore)
 * - 빠른 분석 pills + 최근 히스토리
 *
 * 기존 호환성:
 * - export 이름 유지 (ChatCentricHub)
 * - data-testid="hub-upload-card" 유지
 */

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { intentRouter } from '@/lib/services/intent-router'
import { getHubAiResponse, getHubDiagnosticResponse, getHubDiagnosticResumeResponse } from '@/lib/services/hub-chat-service'
import { bridgeDiagnosticToSmartFlow } from '@/lib/stores/store-orchestration'
import { getKoreanName } from '@/lib/constants/statistical-methods'
import { logger } from '@/lib/utils/logger'
import type { ResolvedIntent, DiagnosticReport, AIRecommendation, MethodRecommendation } from '@/types/analysis'
import { useTerminology } from '@/hooks/use-terminology'
import { useHubChatStore, type HubChatMessage } from '@/lib/stores/hub-chat-store'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { useHubDataUpload } from '@/hooks/use-hub-data-upload'
import { toast } from 'sonner'

import { ChatInput } from './hub/ChatInput'
import { ChatThread } from './hub/ChatThread'
import { DataContextBadge } from './hub/DataContextBadge'
import { QuickAnalysisPills } from './hub/QuickAnalysisPills'
import { TrackSuggestions } from './hub/TrackSuggestions'
import { QuickAccessBar } from './hub/QuickAccessBar'

// ===== Types =====

interface ChatCentricHubProps {
  onIntentResolved: (intent: ResolvedIntent, message: string) => void
  onQuickAnalysis: (methodId: string) => void
  onHistorySelect: (historyId: string) => void
  onHistoryDelete: (historyId: string) => Promise<void>
  onUploadClick?: () => void
}

// ===== Helpers =====

import { generateId } from '@/lib/utils/generate-id'

const createMessageId = (): string => generateId('msg')

/** resume 시 사용하는 기본 intent (실제 intent는 파이프라인에 이미 내장) */
const RESUME_FALLBACK_INTENT: ResolvedIntent = {
  track: 'data-consultation', confidence: 1, method: null,
  reasoning: '', needsData: false, provider: 'keyword',
}

/** AIRecommendation → 추천 카드 배열 변환 (주 추천 + alternatives) */
function mapRecommendationToCards(rec: AIRecommendation | null): MethodRecommendation[] | undefined {
  if (!rec?.method) return undefined

  const cards: MethodRecommendation[] = [{
    methodId: rec.method.id,
    methodName: rec.method.name,
    koreanName: getKoreanName(rec.method.id) ?? rec.method.name,
    reason: rec.reasoning?.join(', ') ?? '',
    badge: 'recommended' as const,
  }]

  // LLM이 제안한 대안도 카드로 추가 (primary와 중복 제거)
  if (rec.alternatives?.length) {
    const usedIds = new Set([rec.method.id])
    for (const alt of rec.alternatives.slice(0, 2)) {
      if (usedIds.has(alt.id)) continue
      usedIds.add(alt.id)
      cards.push({
        methodId: alt.id,
        methodName: alt.name,
        koreanName: getKoreanName(alt.id) ?? alt.name,
        reason: alt.description ?? '',
        badge: 'alternative' as const,
      })
    }
  }

  return cards
}

/** 직전 assistant 메시지에서 미완료 DiagnosticReport 탐색 */
function findPendingDiagnosticReport(messages: HubChatMessage[]): DiagnosticReport | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'assistant' && msg.diagnosticReport?.pendingClarification) {
      return msg.diagnosticReport
    }
  }
  return null
}

// ===== Animation =====

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }
  }
}

// ===== Component =====

export function ChatCentricHub({
  onIntentResolved,
  onQuickAnalysis,
  onHistorySelect,
  onHistoryDelete,
  onUploadClick,
}: ChatCentricHubProps) {
  const prefersReducedMotion = useReducedMotion()
  const t = useTerminology()
  const [isProcessing, setIsProcessing] = useState(false)
  const isProcessingRef = useRef(false)
  const [externalValue, setExternalValue] = useState<string | undefined>(undefined)

  // lastDiagnosticRef 제거 — 액션 버튼이 메시지 단위로 report/recommendation을 직접 전달

  const addMessage = useHubChatStore((s) => s.addMessage)
  const clearMessages = useHubChatStore((s) => s.clearMessages)
  const hasSeenUploadSuggestion = useHubChatStore((s) => s.hasSeenUploadSuggestion)
  const setHasSeenUploadSuggestion = useHubChatStore((s) => s.setHasSeenUploadSuggestion)
  const setStreaming = useHubChatStore((s) => s.setStreaming)
  const dataContext = useHubChatStore((s) => s.dataContext)

  // 인라인 데이터 업로드
  const { handleFileSelected, clearDataContext } = useHubDataUpload()

  const setStreamingStatus = useHubChatStore((s) => s.setStreamingStatus)

  // 채팅 입력 제출 → resume 감지 → Intent Router 분류 → 트랙별 처리
  const handleChatSubmit = useCallback(async (message: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setIsProcessing(true)

    const priorMessages = useHubChatStore.getState().messages

    addMessage({
      id: createMessageId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    })

    try {
      setStreaming(true)

      // ── [1단계] Resume 감지 (intentRouter 호출 전, deterministic) ──
      const pendingReport = findPendingDiagnosticReport(priorMessages)
      const uploadNonce = useAnalysisStore.getState().uploadNonce
      const uploadedData = useAnalysisStore.getState().uploadedData

      if (pendingReport && dataContext && pendingReport.uploadNonce === uploadNonce) {
        // Resume: pendingClarification에 대한 답변
        const statusCb = (status: string): void => { setStreamingStatus(status) }
        const resumeResponse = await getHubDiagnosticResumeResponse(
          pendingReport,
          message,
          {
            intent: RESUME_FALLBACK_INTENT,
            dataContext,
            chatHistory: priorMessages,
            data: uploadedData ?? [],
            uploadNonce,
            onStatus: statusCb,
          },
        )
        setStreamingStatus(null)
        setStreaming(false)

        addMessage({
          id: createMessageId(),
          role: 'assistant',
          content: resumeResponse.content,
          timestamp: Date.now(),
          diagnosticReport: resumeResponse.diagnosticReport,
          diagnosticRecommendation: resumeResponse.recommendation ?? undefined,
          recommendations: mapRecommendationToCards(resumeResponse.recommendation),
        })
        return
      }

      // ── [2단계] Intent Router 분류 ──
      const intent = await intentRouter.classify(message)
      logger.debug('[ChatCentricHub] Intent resolved', {
        track: intent.track,
        confidence: intent.confidence,
        method: intent.method?.id,
      })

      if (intent.track === 'data-consultation') {
        if (dataContext) {
          // === 데이터 있음: Diagnostic Pipeline ===
          const statusCb = (status: string): void => { setStreamingStatus(status) }
          const diagResponse = await getHubDiagnosticResponse({
            userMessage: message,
            intent,
            dataContext,
            chatHistory: priorMessages,
            data: uploadedData ?? [],
            uploadNonce,
            onStatus: statusCb,
          })
          setStreamingStatus(null)
          setStreaming(false)

          addMessage({
            id: createMessageId(),
            role: 'assistant',
            content: diagResponse.content,
            timestamp: Date.now(),
            intent,
            diagnosticReport: diagResponse.diagnosticReport,
            diagnosticRecommendation: diagResponse.recommendation ?? undefined,
            recommendations: mapRecommendationToCards(diagResponse.recommendation),
          })
        } else {
          // === 데이터 없음: LLM 상담사와 대화 ===
          setStreamingStatus('분석 방향을 상담하고 있습니다...')
          const aiResponse = await getHubAiResponse({
            userMessage: message,
            intent,
            dataContext: null,
            chatHistory: priorMessages,
          })
          setStreamingStatus(null)
          setStreaming(false)

          const shouldSuggestUpload = !hasSeenUploadSuggestion
          addMessage({
            id: createMessageId(),
            role: 'assistant',
            content: aiResponse.content,
            timestamp: Date.now(),
            intent,
            recommendations: mapRecommendationToCards(aiResponse.recommendation),
            suggestUpload: shouldSuggestUpload,
          })

          if (shouldSuggestUpload) {
            setHasSeenUploadSuggestion(true)
          }
        }
      } else {
        // direct-analysis / visualization: 확인 메시지 → 이동
        let confirmMsg: string
        if (intent.track === 'direct-analysis' && intent.method) {
          confirmMsg = `${getKoreanName(intent.method.id) ?? intent.method.name} ${t.hub.intentMessages.startAnalysisSuffix}`
        } else {
          confirmMsg = t.hub.intentMessages.graphStudio
        }
        setStreaming(false)
        addMessage({
          id: createMessageId(),
          role: 'assistant',
          content: confirmMsg,
          timestamp: Date.now(),
          intent,
        })
        onIntentResolved(intent, message)
      }
    } catch (error) {
      logger.error('[ChatCentricHub] Intent classification failed', { error })

      // 자동 이탈 없이 에러 버블 표시 — 재시도 버튼으로 직접 재전송
      addMessage({
        id: createMessageId(),
        role: 'assistant',
        content: t.hub.intentMessages.classificationError,
        timestamp: Date.now(),
        isError: true,
      })
      // 에러 시 원래 입력 복원 — 사용자가 다시 타이핑하지 않아도 됨
      setExternalValue(message)
    } finally {
      setStreamingStatus(null)
      setStreaming(false)
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }, [onIntentResolved, addMessage, setStreaming, setStreamingStatus, dataContext, hasSeenUploadSuggestion, setHasSeenUploadSuggestion])

  // 표본 크기 계산기 "분석 시작" CTA → ChatInput 주입
  const handleStartAnalysis = useCallback((example: string) => {
    setExternalValue(example)
  }, [])

  const handleExternalValueConsumed = useCallback(() => {
    setExternalValue(undefined)
  }, [])

  // "분석 시작하기" — 메시지의 report + 원본 AIRecommendation을 직접 받음
  const handleDiagnosticStart = useCallback((report: DiagnosticReport, recommendation: AIRecommendation) => {
    // 새로고침 후 데이터가 소실된 경우 방어
    if (!useAnalysisStore.getState().uploadedData) {
      toast.error('데이터가 만료되었습니다. CSV를 다시 업로드해 주세요.')
      return
    }
    bridgeDiagnosticToSmartFlow(report, recommendation)
  }, [])

  // "다른 방법 찾아보기" — bridge 후 normal 트랙 → Step 2
  const handleAlternativeSearch = useCallback((report: DiagnosticReport, recommendation: AIRecommendation) => {
    if (!useAnalysisStore.getState().uploadedData) {
      toast.error('데이터가 만료되었습니다. CSV를 다시 업로드해 주세요.')
      return
    }
    bridgeDiagnosticToSmartFlow(report, recommendation)
    useModeStore.getState().setStepTrack('normal')
    useAnalysisStore.getState().addCompletedStep(1)
    useAnalysisStore.getState().navigateToStep(2)
  }, [])

  // 새 대화 초기화
  const handleClearChat = useCallback(() => {
    clearMessages()
  }, [clearMessages])

  // 에러 메시지 재시도 — 에러 메시지 + 직전 user 메시지 제거 후 재전송 (중복 방지)
  const handleRetry = useCallback((errorMessageId: string) => {
    const messages = useHubChatStore.getState().messages
    const errorIndex = messages.findIndex((m) => m.id === errorMessageId)
    if (errorIndex === -1) return
    // errorIndex 앞에서 역순으로 탐색 (배열 복사 없이)
    let lastUserMsg: typeof messages[number] | undefined
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserMsg = messages[i]; break }
    }
    if (!lastUserMsg) return
    useHubChatStore.getState().removeMessages([errorMessageId, lastUserMsg.id])
    void handleChatSubmit(lastUserMsg.content)
  }, [handleChatSubmit])

  // data-testid="hub-upload-card": E2E 호환용 마커 (컨테이너 가시성 감지).
  return (
    <motion.div
      className="w-full space-y-6 py-8"
      data-testid="hub-upload-card"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* ====== Hero Section + ChatThread + ChatInput ====== */}
      <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })}>
        <div className="py-8 lg:py-12">
          <div className="flex flex-col items-center text-center">
            {/* Heading */}
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-1">
              {t.hub.hero.heading}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t.hub.hero.subheading}
            </p>

            {/* ChatThread — 대화 히스토리 (메시지 있을 때만) */}
            <ChatThread
              onMethodSelect={onQuickAnalysis}
              onUploadClick={onUploadClick}
              onClearChat={handleClearChat}
              onRetry={handleRetry}
              onDiagnosticStart={handleDiagnosticStart}
              onAlternativeSearch={handleAlternativeSearch}
            />

            {/* DataContextBadge — 데이터 로드됨 표시 */}
            <DataContextBadge onClear={clearDataContext} />

            {/* ChatInput — centered, wider */}
            <div className="w-full max-w-[680px]">
              <ChatInput
                onSubmit={handleChatSubmit}
                isProcessing={isProcessing}
                externalValue={externalValue}
                onExternalValueConsumed={handleExternalValueConsumed}
                onUploadClick={onUploadClick}
                onFileSelected={handleFileSelected}
              />
            </div>

            {/* 빠른 분석 pills — 중앙 정렬 */}
            <div className="mt-8">
              <QuickAnalysisPills onQuickAnalysis={onQuickAnalysis} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 빠른 시작 그리드 */}
      <TrackSuggestions onStartAnalysis={handleStartAnalysis} onUploadClick={onUploadClick} />

      {/* 최근 분석 히스토리 */}
      <QuickAccessBar
        onHistoryClick={onHistorySelect}
        onHistoryDelete={onHistoryDelete}
      />
    </motion.div>
  )
}

export default ChatCentricHub
