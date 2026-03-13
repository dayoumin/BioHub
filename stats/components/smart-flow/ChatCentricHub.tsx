'use client'

/**
 * ChatCentricHub — Chat-First 메인 허브
 *
 * 2026 Chat-First UX:
 * - 대화창이 메인 진입점
 * - Intent Router가 3트랙 분류 (직접 분석 / 데이터 상담 / 실험 설계)
 * - 빠른 분석 pills + 최근 히스토리
 *
 * 기존 호환성:
 * - export 이름 유지 (ChatCentricHub)
 * - data-testid="hub-upload-card" 유지
 */

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { intentRouter } from '@/lib/services/intent-router'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'
import type { ResolvedIntent } from '@/types/smart-flow'
import { useTerminology } from '@/hooks/use-terminology'

import { ChatInput } from './hub/ChatInput'
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
  onHistoryShowMore?: () => void
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
  onHistoryShowMore,
}: ChatCentricHubProps) {
  const prefersReducedMotion = useReducedMotion()
  const t = useTerminology()
  const { setActiveTrack } = useSmartFlowStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const isProcessingRef = useRef(false)
  const [externalValue, setExternalValue] = useState<string | undefined>(undefined)

  // 채팅 입력 제출 → Intent Router 분류 → 즉시 이동
  const handleChatSubmit = useCallback(async (message: string) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    setIsProcessing(true)
    try {
      const intent = await intentRouter.classify(message)
      logger.debug('[ChatCentricHub] Intent resolved', {
        track: intent.track,
        confidence: intent.confidence,
        method: intent.method?.id
      })

      setActiveTrack(intent.track)
      onIntentResolved(intent, message)
    } catch (error) {
      logger.error('[ChatCentricHub] Intent classification failed', { error })
      toast.info(t.hub.intentClassificationFailed)
      // fallback: 데이터 상담으로 이동
      const fallback: ResolvedIntent = {
        track: 'data-consultation',
        confidence: 0.5,
        method: null,
        reasoning: '분류 실패, 기본 경로',
        needsData: true,
        provider: 'keyword'
      }
      setActiveTrack(fallback.track)
      onIntentResolved(fallback, message)
    } finally {
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }, [setActiveTrack, onIntentResolved, t.hub.intentClassificationFailed])

  // 표본 크기 계산기 "분석 시작" CTA → ChatInput 주입
  const handleStartAnalysis = useCallback((example: string) => {
    setExternalValue(example)
  }, [])

  const handleExternalValueConsumed = useCallback(() => {
    setExternalValue(undefined)
  }, [])

  // data-testid="hub-upload-card": E2E 호환용 마커 (컨테이너 가시성 감지).
  return (
    <motion.div
      className="w-full space-y-6 py-8"
      data-testid="hub-upload-card"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* ====== Hero Section + ChatInput ====== */}
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

            {/* ChatInput — centered, wider */}
            <div className="w-full max-w-[680px]">
              <ChatInput
                onSubmit={handleChatSubmit}
                isProcessing={isProcessing}
                externalValue={externalValue}
                onExternalValueConsumed={handleExternalValueConsumed}
                onUploadClick={onUploadClick}
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
        onQuickAnalysis={onQuickAnalysis}
        onHistoryClick={onHistorySelect}
        onHistoryDelete={onHistoryDelete}
        onShowMore={onHistoryShowMore}
      />
    </motion.div>
  )
}

export default ChatCentricHub
