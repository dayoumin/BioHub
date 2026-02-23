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

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { intentRouter } from '@/lib/services/intent-router'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'
import type { ResolvedIntent, AnalysisTrack } from '@/types/smart-flow'

import { ChatInput } from './hub/ChatInput'
import { TrackSuggestions } from './hub/TrackSuggestions'
import { QuickAccessBar } from './hub/QuickAccessBar'

// ===== Types =====

interface ChatCentricHubProps {
  onIntentResolved: (intent: ResolvedIntent, message: string) => void
  onQuickAnalysis: (methodId: string) => void
  onHistorySelect: (historyId: string) => void
}

// ===== Animation =====

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

// ===== Component =====

export function ChatCentricHub({
  onIntentResolved,
  onQuickAnalysis,
  onHistorySelect,
}: ChatCentricHubProps) {
  const prefersReducedMotion = useReducedMotion()
  const { setActiveTrack } = useSmartFlowStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [externalValue, setExternalValue] = useState<string | undefined>(undefined)

  // 채팅 입력 제출 → Intent Router 분류 → 즉시 이동
  const handleChatSubmit = useCallback(async (message: string) => {
    if (isProcessing) return

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
      setIsProcessing(false)
    }
  }, [isProcessing, setActiveTrack, onIntentResolved])

  // 트랙 카드 클릭 → example 텍스트 주입 → ChatInput에서 자동 제출
  const handleTrackSelect = useCallback((track: AnalysisTrack, example: string) => {
    setExternalValue(example)
  }, [])

  const handleExternalValueConsumed = useCallback(() => {
    setExternalValue(undefined)
  }, [])

  // data-testid="hub-upload-card": E2E 호환용 마커 (컨테이너 가시성 감지).
  // 기존 E2E의 click→upload 플로우는 Chat-First 전환 후 별도 업데이트 필요.
  return (
    <motion.div
      className="w-full max-w-3xl mx-auto space-y-6 py-8"
      data-testid="hub-upload-card"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* 채팅 입력 (SVG 배경 포함) */}
      <ChatInput
        onSubmit={handleChatSubmit}
        isProcessing={isProcessing}
        externalValue={externalValue}
        onExternalValueConsumed={handleExternalValueConsumed}
      />

      {/* 3트랙 제안 카드 */}
      <TrackSuggestions onTrackSelect={handleTrackSelect} />

      {/* 빠른 분석 + 최근 히스토리 */}
      <QuickAccessBar
        onQuickAnalysis={onQuickAnalysis}
        onHistoryClick={onHistorySelect}
      />
    </motion.div>
  )
}

export default ChatCentricHub
