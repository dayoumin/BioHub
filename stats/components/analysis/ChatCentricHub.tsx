'use client'

/**
 * ChatCentricHub ??Chat-First 硫붿씤 ?덈툕
 *
 * 2026 Chat-First UX:
 * - ??붿갹??硫붿씤 吏꾩엯??
 * - Intent Router媛 3?몃옓 遺꾨쪟 (吏곸젒 遺꾩꽍 / ?곗씠???곷떞 / ?ㅽ뿕 ?ㅺ퀎)
 * - ????덉뒪?좊━ ?좎? (hubChatStore)
 * - 鍮좊Ⅸ 遺꾩꽍 pills + 理쒓렐 ?덉뒪?좊━
 *
 * 湲곗〈 ?명솚??
 * - export ?대쫫 ?좎? (ChatCentricHub)
 * - data-testid="hub-upload-card" ?좎?
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
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
import { AnalysisHistorySidebar } from './AnalysisHistorySidebar'

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

/** resume ???ъ슜?섎뒗 湲곕낯 intent (?ㅼ젣 intent???뚯씠?꾨씪?몄뿉 ?대? ?댁옣) */
const RESUME_FALLBACK_INTENT: ResolvedIntent = {
  track: 'data-consultation', confidence: 1, method: null,
  reasoning: '', needsData: false, provider: 'keyword',
}

/** AIRecommendation ??異붿쿇 移대뱶 諛곗뿴 蹂??(二?異붿쿇 + alternatives) */
function mapRecommendationToCards(rec: AIRecommendation | null): MethodRecommendation[] | undefined {
  if (!rec?.method) return undefined

  const cards: MethodRecommendation[] = [{
    methodId: rec.method.id,
    methodName: rec.method.name,
    koreanName: getKoreanName(rec.method.id) ?? rec.method.name,
    reason: rec.reasoning?.join(', ') ?? '',
    badge: 'recommended' as const,
  }]

  // LLM???쒖븞????덈룄 移대뱶濡?異붽? (primary? 以묐났 ?쒓굅)
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

/** 吏곸쟾 assistant 硫붿떆吏?먯꽌 誘몄셿猷?DiagnosticReport ?먯깋 */
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
  const requestTokenRef = useRef(0)
  const [prefillValue, setPrefillValue] = useState<string | undefined>(undefined)
  const [submitValue, setSubmitValue] = useState<string | undefined>(undefined)

  // lastDiagnosticRef ?쒓굅 ???≪뀡 踰꾪듉??硫붿떆吏 ?⑥쐞濡?report/recommendation??吏곸젒 ?꾨떖

  const addMessage = useHubChatStore((s) => s.addMessage)
  const clearMessages = useHubChatStore((s) => s.clearMessages)
  const hasSeenUploadSuggestion = useHubChatStore((s) => s.hasSeenUploadSuggestion)
  const setHasSeenUploadSuggestion = useHubChatStore((s) => s.setHasSeenUploadSuggestion)
  const setStreaming = useHubChatStore((s) => s.setStreaming)
  const dataContext = useHubChatStore((s) => s.dataContext)
  const uploadNonce = useAnalysisStore((s) => s.uploadNonce)

  // ?몃씪???곗씠???낅줈??
  const { handleFileSelected, clearDataContext } = useHubDataUpload()

  const setStreamingStatus = useHubChatStore((s) => s.setStreamingStatus)
  const messages = useHubChatStore((s) => s.messages)
  const activePendingMessage = useMemo(
    () => (dataContext ? findActivePendingDiagnosticMessage(messages, uploadNonce) : null),
    [dataContext, messages, uploadNonce]
  )
  const pendingClarification = activePendingMessage?.diagnosticReport?.pendingClarification ?? null
  const showSupportTools = !dataContext && messages.length === 0

  // 梨꾪똿 ?낅젰 ?쒖텧 ??resume 媛먯? ??Intent Router 遺꾨쪟 ???몃옓蹂?泥섎━
  const handleChatSubmit = useCallback(async (message: string, directAssignments?: NonNullable<AIRecommendation['variableAssignments']>) => {
    if (isProcessingRef.current) return
    const requestToken = requestTokenRef.current + 1
    requestTokenRef.current = requestToken
    isProcessingRef.current = true
    setIsProcessing(true)

    const priorMessages = useHubChatStore.getState().messages

    addMessage({
      id: createMessageId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      directAssignments,
    })

    try {
      setStreaming(true)

      // ?? [1?④퀎] Resume 媛먯? (intentRouter ?몄텧 ?? deterministic) ??
      const pendingReport = dataContext
        ? findActivePendingDiagnosticMessage(priorMessages, uploadNonce)?.diagnosticReport ?? null
        : null
      const uploadedData = useAnalysisStore.getState().uploadedData

      if (pendingReport && dataContext && pendingReport.uploadNonce === uploadNonce) {
        // Resume: pendingClarification??????듬?
        const statusCb = (status: string): void => {
          if (requestTokenRef.current === requestToken) {
            setStreamingStatus(status)
          }
        }
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
        if (requestTokenRef.current !== requestToken) return
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

      // ?? [2?④퀎] Intent Router 遺꾨쪟 ??
      const intent = await intentRouter.classify(message)
      logger.debug('[ChatCentricHub] Intent resolved', {
        track: intent.track,
        confidence: intent.confidence,
        method: intent.method?.id,
      })

      if (intent.track === 'data-consultation') {
        if (dataContext) {
          // === ?곗씠???덉쓬: Diagnostic Pipeline ===
          const statusCb = (status: string): void => {
            if (requestTokenRef.current === requestToken) {
              setStreamingStatus(status)
            }
          }
          const diagResponse = await getHubDiagnosticResponse({
            userMessage: message,
            intent,
            dataContext,
            chatHistory: priorMessages,
            data: uploadedData ?? [],
            uploadNonce,
            onStatus: statusCb,
          })
          if (requestTokenRef.current !== requestToken) return
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
          // === ?곗씠???놁쓬: LLM ?곷떞?ъ? ???===
          setStreamingStatus('분석 방향을 상담하고 있습니다...')
          const aiResponse = await getHubAiResponse({
            userMessage: message,
            intent,
            dataContext: null,
            chatHistory: priorMessages,
          })
          if (requestTokenRef.current !== requestToken) return
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
        // direct-analysis / visualization: ?뺤씤 硫붿떆吏 ???대룞
        let confirmMsg: string
        if (intent.track === 'direct-analysis' && intent.method) {
          confirmMsg = `${getKoreanName(intent.method.id) ?? intent.method.name} ${t.hub.intentMessages.startAnalysisSuffix}`
        } else {
          confirmMsg = t.hub.intentMessages.graphStudio
        }
        if (requestTokenRef.current !== requestToken) return
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
      if (requestTokenRef.current !== requestToken) return
      logger.error('[ChatCentricHub] Intent classification failed', { error })

      // ?먮룞 ?댄깉 ?놁씠 ?먮윭 踰꾨툝 ?쒖떆 ???ъ떆??踰꾪듉?쇰줈 吏곸젒 ?ъ쟾??
      addMessage({
        id: createMessageId(),
        role: 'assistant',
        content: t.hub.intentMessages.classificationError,
        timestamp: Date.now(),
        isError: true,
      })
      // ?먮윭 ???먮옒 ?낅젰 蹂듭썝 ???ъ슜?먭? ?ㅼ떆 ??댄븨?섏? ?딆븘????
      setPrefillValue(message)
    } finally {
      if (requestTokenRef.current !== requestToken) return
      setStreamingStatus(null)
      setStreaming(false)
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }, [onIntentResolved, addMessage, setStreaming, setStreamingStatus, dataContext, hasSeenUploadSuggestion, setHasSeenUploadSuggestion, t])

  // ?쒕낯 ?ш린 怨꾩궛湲?"遺꾩꽍 ?쒖옉" CTA ??ChatInput 二쇱엯
  const handleStartAnalysis = useCallback((example: string) => {
    setSubmitValue(example)
  }, [])

  const handlePrefillValueConsumed = useCallback(() => {
    setPrefillValue(undefined)
  }, [])

  const handleSubmitValueConsumed = useCallback(() => {
    setSubmitValue(undefined)
  }, [])

  // "遺꾩꽍 ?쒖옉?섍린" ??硫붿떆吏??report + ?먮낯 AIRecommendation??吏곸젒 諛쏆쓬
  const handleDiagnosticStart = useCallback((report: DiagnosticReport, recommendation: AIRecommendation) => {
    // ?덈줈怨좎묠 ???곗씠?곌? ?뚯떎??寃쎌슦 諛⑹뼱
    if (!useAnalysisStore.getState().uploadedData) {
      toast.error('데이터가 만료되었습니다. CSV를 다시 업로드해 주세요.')
      return
    }
    bridgeDiagnosticToSmartFlow(report, recommendation)
  }, [])

  // "?ㅻⅨ 諛⑸쾿 李얠븘蹂닿린" ??bridge ??normal ?몃옓 ??Step 2
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

  // ?????珥덇린??
  const handleClearChat = useCallback(() => {
    requestTokenRef.current += 1
    setPrefillValue(undefined)
    setSubmitValue(undefined)
    setStreaming(false)
    setStreamingStatus(null)
    isProcessingRef.current = false
    setIsProcessing(false)
    clearMessages()
  }, [clearMessages, setStreaming, setStreamingStatus])

  // ?먮윭 硫붿떆吏 ?ъ떆?????먮윭 硫붿떆吏 + 吏곸쟾 user 硫붿떆吏 ?쒓굅 ???ъ쟾??(以묐났 諛⑹?)
  const handleRetry = useCallback((errorMessageId: string) => {
    const messages = useHubChatStore.getState().messages
    const errorIndex = messages.findIndex((m) => m.id === errorMessageId)
    if (errorIndex === -1) return
    // errorIndex ?욎뿉????닚?쇰줈 ?먯깋 (諛곗뿴 蹂듭궗 ?놁씠)
    let lastUserMsg: typeof messages[number] | undefined
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserMsg = messages[i]; break }
    }
    if (!lastUserMsg) return
    useHubChatStore.getState().removeMessages([errorMessageId, lastUserMsg.id])
    void handleChatSubmit(lastUserMsg.content, lastUserMsg.directAssignments)
  }, [handleChatSubmit])

  const handleClarificationCancel = useCallback(() => {
    useHubChatStore.getState().patchLastClarification(null)
  }, [])

  const handleVariableConfirm = useCallback((assignments: NonNullable<AIRecommendation['variableAssignments']>) => {
    // VariablePicker ?뺤젙 ???ъ슜??諛쒗솕濡???좏븷 ?띿뒪??援ъ꽦
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
  // data-testid="hub-upload-card": E2E compatibility marker.
  return (
    <motion.div
      className="w-full space-y-4 py-10 lg:py-14"
      data-testid="hub-upload-card"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      <div className="mx-auto max-w-[1160px] space-y-8">
        <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })}>
          <div className="py-8 lg:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_208px] lg:items-start">
              <div className="flex flex-col items-center text-center lg:pr-8">
                  <div className="mb-10">
                    <h1 className="text-[30px] font-semibold tracking-tight text-foreground lg:text-[44px]">
                      BioHub 통계분석
                    </h1>
                  </div>

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

                  <DataContextBadge onClear={clearDataContext} />

                  <div className="w-full max-w-[700px]">
                    {pendingClarification ? (
                      <div
                        data-testid="hub-clarification-lock"
                        className="rounded-2xl bg-surface-container-low px-5 py-4 text-left"
                      >
                        <p className="text-sm font-medium text-foreground">
                          필요한 항목을 먼저 선택해 주세요.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          지금은 카드 선택이 우선입니다. 바로 선택하거나 <span className="font-medium text-foreground">다시 질문하기</span>로 자유 입력 모드로 돌아갈 수 있습니다.
                        </p>
                      </div>
                    ) : (
                      <ChatInput
                        onSubmit={handleChatSubmit}
                        isProcessing={isProcessing}
                        hasAttachedData={Boolean(dataContext)}
                        prefillValue={prefillValue}
                        onPrefillValueConsumed={handlePrefillValueConsumed}
                        submitValue={submitValue}
                        onSubmitValueConsumed={handleSubmitValueConsumed}
                        onUploadClick={onUploadClick}
                        onFileSelected={handleFileSelected}
                      />
                    )}
                  </div>

                  <div className="mt-5 w-full max-w-[900px] px-2 py-1">
                    <QuickAnalysisPills onQuickAnalysis={onQuickAnalysis} />
                  </div>

                  {showSupportTools && (
                    <motion.section
                      {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                      data-testid="hub-support-tools"
                      className="mt-12 w-full max-w-[760px]"
                    >
                      <TrackSuggestions
                        onStartAnalysis={handleStartAnalysis}
                        onUploadClick={onUploadClick}
                        showHeader={false}
                        showUploadCard={false}
                        variant="dock"
                      />
                    </motion.section>
                  )}
              </div>

              <aside className="hidden lg:block lg:pt-[76px]">
                <AnalysisHistorySidebar />
              </aside>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default ChatCentricHub
