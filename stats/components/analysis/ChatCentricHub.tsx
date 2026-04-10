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

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { intentRouter, getHubAiResponse, getHubDiagnosticResponse, getHubDiagnosticResumeResponse } from '@/lib/services'
import { bridgeDiagnosticToSmartFlow, prepareManualMethodBrowsing } from '@/lib/stores/store-orchestration'
import { getKoreanName, STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { logger } from '@/lib/utils/logger'
import type { ResolvedIntent, DiagnosticReport, AIRecommendation, MethodRecommendation } from '@/types/analysis'
import { useTerminology } from '@/hooks/use-terminology'
import { useHubChatStore, type HubChatMessage } from '@/lib/stores/hub-chat-store'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
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

function findActivePendingDiagnosticMessage(
  messages: HubChatMessage[],
  uploadNonce: number,
): HubChatMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (
      msg.role === 'assistant'
      && msg.diagnosticReport?.pendingClarification
      && msg.diagnosticReport.uploadNonce === uploadNonce
    ) {
      return msg
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
  const uploadNonce = useAnalysisStore((s) => s.uploadNonce)

  // 인라인 데이터 업로드
  const { handleFileSelected, clearDataContext } = useHubDataUpload()

  const setStreamingStatus = useHubChatStore((s) => s.setStreamingStatus)
  const messages = useHubChatStore((s) => s.messages)
  const activePendingMessage = useMemo(
    () => (dataContext ? findActivePendingDiagnosticMessage(messages, uploadNonce) : null),
    [dataContext, messages, uploadNonce]
  )
  const pendingClarification = activePendingMessage?.diagnosticReport?.pendingClarification ?? null
  const showSupportTools = !dataContext && messages.length === 0

  // 채팅 입력 제출 → resume 감지 → Intent Router 분류 → 트랙별 처리
  const handleChatSubmit = useCallback(async (message: string, directAssignments?: NonNullable<AIRecommendation['variableAssignments']>) => {
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
      const pendingReport = dataContext
        ? findActivePendingDiagnosticMessage(priorMessages, uploadNonce)?.diagnosticReport ?? null
        : null
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
            directAssignments,
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
  }, [onIntentResolved, addMessage, setStreaming, setStreamingStatus, dataContext, hasSeenUploadSuggestion, setHasSeenUploadSuggestion, t])

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
    prepareManualMethodBrowsing()
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

  const handleClarificationCancel = useCallback(() => {
    useHubChatStore.getState().patchLastClarification(null)
  }, [])

  const handleVariableConfirm = useCallback((assignments: NonNullable<AIRecommendation['variableAssignments']>) => {
    // VariablePicker 확정 시 사용자 발화로 대신할 텍스트 구성
    const deps = assignments.dependent?.join(', ') ?? ''
    const groups = [...(assignments.factor || []), ...(assignments.independent || []), ...(assignments.between || [])].join(', ')
    const pseudoMessage = groups ? `${deps} 값을 ${groups} 기준으로 분석해 주세요.` : `${deps} 값을 분석해 주세요.`
    
    // Resume pipeline directly
    void handleChatSubmit(pseudoMessage, assignments)
  }, [handleChatSubmit])

  const handleSuggestedMethodSelect = useCallback((report: DiagnosticReport, suggestion: MethodRecommendation) => {
    const method = STATISTICAL_METHODS[suggestion.methodId]
    const { uploadedData, uploadNonce: currentUploadNonce } = useAnalysisStore.getState()
    const currentDataContext = useHubChatStore.getState().dataContext

    if (!uploadedData || !currentDataContext || report.uploadNonce !== currentUploadNonce) {
      toast.error('데이터가 만료되었습니다. CSV를 다시 업로드해 주세요.')
      return
    }

    if (!method) {
      toast.error('추천된 분석 방법을 찾을 수 없습니다.')
      return
    }

    const recommendation: AIRecommendation = {
      userQuery: report.originUserMessage,
      method,
      confidence: 1,
      reasoning: suggestion.reason ? [suggestion.reason] : [],
      assumptions: [],
      alternatives: [],
      variableAssignments: report.variableAssignments ?? undefined,
    }

    bridgeDiagnosticToSmartFlow(
      {
        ...report,
        pendingClarification: null,
      },
      recommendation,
    )
  }, [])

  // data-testid="hub-upload-card": E2E 호환용 마커 (컨테이너 가시성 감지).
  return (
    <motion.div
      className="w-full space-y-4 py-4 lg:py-5"
      data-testid="hub-upload-card"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      <div className="mx-auto max-w-[1160px] space-y-5">
        {/* ====== Hero Section + ChatThread + ChatInput ====== */}
        <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })}>
          <div className="py-2 lg:py-4">
            <div className="w-full rounded-[24px] border border-border/50 bg-surface-container-lowest px-6 py-7 lg:px-9">
            <div className="flex flex-col items-center text-center">
            {/* Heading */}
              <span className="mb-3 inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1 text-xs font-medium text-primary/80">
                {t.hub.quickStart.newAnalysis}
              </span>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-2">
                {t.hub.hero.heading}
              </h1>
              <p className="mb-7 text-lg text-muted-foreground">
                {t.hub.hero.subheading}
              </p>

              {/* ChatThread — 대화 히스토리 (메시지 있을 때만) */}
              <ChatThread
                activeClarificationMessageId={activePendingMessage?.id ?? null}
                onMethodSelect={onQuickAnalysis}
                onUploadClick={onUploadClick}
                onFileSelected={handleFileSelected}
                onClearChat={handleClearChat}
                onRetry={handleRetry}
                onDiagnosticStart={handleDiagnosticStart}
                onAlternativeSearch={handleAlternativeSearch}
                onVariableConfirm={handleVariableConfirm}
                onClarificationCancel={handleClarificationCancel}
                onSuggestedMethodSelect={handleSuggestedMethodSelect}
              />

              {/* DataContextBadge — 데이터 로드됨 표시 */}
              <DataContextBadge onClear={clearDataContext} />

              {/* ChatInput — centered, wider */}
              <div className="w-full max-w-[760px]">
                {pendingClarification ? (
                  <div
                    data-testid="hub-clarification-lock"
                    className="rounded-2xl border border-border/60 bg-surface-container-low px-5 py-4 text-left"
                  >
                    <p className="text-sm font-medium text-foreground">
                      위 선택 카드에서 필요한 열을 먼저 골라 주세요.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      현재는 자유 입력보다 변수 선택이 우선입니다. 위 카드의 대안 분석을 바로 선택하거나, 직접 다시 설명하고 싶다면 카드의{' '}
                      <span className="font-medium text-foreground">다시 질문하기</span>{' '}
                      버튼으로 자유 입력 모드로 돌아갈 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <ChatInput
                    onSubmit={handleChatSubmit}
                    isProcessing={isProcessing}
                    externalValue={externalValue}
                    onExternalValueConsumed={handleExternalValueConsumed}
                    onUploadClick={onUploadClick}
                    onFileSelected={handleFileSelected}
                  />
                )}
              </div>

              {/* 빠른 분석 pills — 주 입력 바로 아래의 보조 액션 */}
              <div className="mt-5 w-full max-w-[900px] rounded-2xl border border-border/40 bg-surface-container-low/65 px-5 py-3">
                <QuickAnalysisPills onQuickAnalysis={onQuickAnalysis} />
              </div>
            </div>
          </div>
          </div>
        </motion.div>

        {/* 보조 진입 영역 */}
        <motion.div
          {...(prefersReducedMotion ? {} : { variants: itemVariants })}
          className={cn(
            showSupportTools
              ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start'
              : 'flex justify-end'
          )}
        >
          {showSupportTools && (
            <section
              data-testid="hub-support-tools"
              className="rounded-2xl border border-border/50 bg-surface-container-lowest p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                    도구 바로가기
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">빠르게 시작하기</h2>
                </div>
                <p className="max-w-[240px] text-right text-sm text-muted-foreground">
                  채팅 없이 바로 실행할 작업만 모았습니다.
                </p>
              </div>
              <TrackSuggestions
                onStartAnalysis={handleStartAnalysis}
                onUploadClick={onUploadClick}
                showHeader={false}
                showUploadCard={false}
              />
            </section>
          )}

          <aside
            data-testid="hub-recent-rail"
            className={cn(
              'rounded-2xl border border-border/50 bg-surface-container-lowest p-6',
              'min-h-[228px] w-full xl:w-[340px]',
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                  이어서 하기
                </p>
                <h2 className="mt-1 text-lg font-semibold">{t.hub.cards.recentTitle}</h2>
              </div>
              <p className="max-w-[240px] text-right text-sm text-muted-foreground">
                최근 분석과 시각화를 다시 열 수 있습니다.
              </p>
            </div>
            <QuickAccessBar
              onHistoryClick={onHistorySelect}
              onHistoryDelete={onHistoryDelete}
              showHeader={false}
              maxItems={3}
              compact
            />
          </aside>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default ChatCentricHub
