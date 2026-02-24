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
import { Upload, List } from 'lucide-react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { intentRouter } from '@/lib/services/intent-router'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'
import type { ResolvedIntent, AnalysisTrack } from '@/types/smart-flow'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { useTerminology } from '@/hooks/use-terminology'
import { Button } from '@/components/ui/button'

import { ChatInput } from './hub/ChatInput'
import { TrackSuggestions } from './hub/TrackSuggestions'
import { QuickAccessBar } from './hub/QuickAccessBar'

// ===== Types =====

interface ChatCentricHubProps {
  onIntentResolved: (intent: ResolvedIntent, message: string) => void
  onQuickAnalysis: (methodId: string) => void
  onHistorySelect: (historyId: string) => void
}

// ===== Constants =====

const TOTAL_METHODS = Object.values(STATISTICAL_METHODS).filter(m => m.hasOwnPage !== false).length
const TOTAL_CATEGORIES = [...new Set(
  Object.values(STATISTICAL_METHODS).map(m => m.category)
)].length

// ===== SVG Hero Visual =====

function StatisticalHeroVisual({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 300" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-curveGrad" x1="300" y1="50" x2="300" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="hero-strokeGrad" x1="0" y1="150" x2="600" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="hero-ciGrad" x1="300" y1="100" x2="300" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
        <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Baseline */}
      <line x1="50" y1="250" x2="550" y2="250" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      {/* Grid vertical lines */}
      {[150, 250, 350, 450].map((x) => (
        <line key={x} x1={x} y1="80" x2={x} y2="250" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
      ))}
      {/* 95% CI band */}
      <path
        d="M 180,195 L 220,145 L 260,95 L 300,80 L 340,105 L 380,155 L 420,205 L 420,235 L 380,185 L 340,135 L 300,110 L 260,125 L 220,175 L 180,225 Z"
        fill="url(#hero-ciGrad)" opacity="0.3"
      />
      {/* Bell curve fill */}
      <path
        d="M 50,250 C 100,248 150,230 200,180 C 250,130 275,80 300,80 C 325,80 350,130 400,180 C 450,230 500,248 550,250"
        fill="url(#hero-curveGrad)"
      />
      {/* Critical region tails (p < 0.05) */}
      <path d="M 50,250 C 70,249 90,245 110,235 L 110,250 Z" fill="currentColor" opacity="0.15" />
      <path d="M 550,250 C 530,249 510,245 490,235 L 490,250 Z" fill="currentColor" opacity="0.15" />
      {/* Bell curve stroke */}
      <path
        d="M 50,250 C 100,248 150,230 200,180 C 250,130 275,80 300,80 C 325,80 350,130 400,180 C 450,230 500,248 550,250"
        stroke="url(#hero-strokeGrad)" strokeWidth="2.5" filter="url(#hero-glow)"
      />
      {/* Scatter points */}
      <g fill="currentColor">
        {[
          { x: 180, y: 210, o: 0.6 }, { x: 220, y: 160, o: 0.7 },
          { x: 260, y: 110, o: 0.8 }, { x: 300, y: 95,  o: 1.0 },
          { x: 340, y: 120, o: 0.8 }, { x: 380, y: 170, o: 0.7 },
          { x: 420, y: 220, o: 0.6 }, { x: 280, y: 130, o: 0.5 },
          { x: 320, y: 140, o: 0.5 }, { x: 240, y: 190, o: 0.4 },
          { x: 360, y: 200, o: 0.4 },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" opacity={p.o} />
        ))}
      </g>
      {/* Trendline */}
      <path
        d="M 180,210 L 220,160 L 260,110 L 300,95 L 340,120 L 380,170 L 420,220"
        stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.8" strokeDasharray="3 3"
      />
      {/* Statistical formulas */}
      <g fill="currentColor" opacity="0.7" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', fontWeight: 'bold' }}>
        <text x="70"  y="75"  className="select-none">y = β₀ + β₁x + ε</text>
        <text x="410" y="60"  className="select-none">σ² = Σ(X-μ)²/N</text>
        <text x="500" y="240" fontSize="10" opacity="0.4" className="select-none">α=0.05</text>
        <text x="60"  y="240" fontSize="10" opacity="0.4" className="select-none">p-value</text>
      </g>
    </svg>
  )
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
}: ChatCentricHubProps) {
  const prefersReducedMotion = useReducedMotion()
  const t = useTerminology()
  const {
    setActiveTrack,
    setShowHub,
    setQuickAnalysisMode,
    setPurposeInputMode,
    navigateToStep,
  } = useSmartFlowStore()

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

  const handleStartWithData = useCallback(() => {
    setShowHub(false)
    setQuickAnalysisMode(false)
    navigateToStep(1)
  }, [setShowHub, setQuickAnalysisMode, navigateToStep])

  const handleBrowseMethods = useCallback(() => {
    setShowHub(false)
    setQuickAnalysisMode(false)
    setPurposeInputMode('browse')
    navigateToStep(2)
  }, [setShowHub, setQuickAnalysisMode, setPurposeInputMode, navigateToStep])

  // data-testid="hub-upload-card": E2E 호환용 마커 (컨테이너 가시성 감지).
  return (
    <motion.div
      className="w-full space-y-6 py-8"
      data-testid="hub-upload-card"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* ====== Hero Section ====== */}
      <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })}>
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card mb-4">
          {/* Radial glow effects */}
          <div className="absolute -right-24 -top-24 w-[500px] h-[500px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.08] blur-[120px] pointer-events-none" />
          <div className="absolute -left-32 -bottom-32 w-[300px] h-[300px] rounded-full bg-muted/30 dark:bg-muted/10 blur-[100px] pointer-events-none" />

          {/* Normal distribution SVG */}
          <StatisticalHeroVisual
            className="absolute right-[calc(70px-2%)] top-1/2 -translate-y-1/2 w-[42%] h-auto text-primary/40 pointer-events-none select-none hidden lg:block"
          />

          <div className="relative z-10 px-10 lg:px-12 py-10 lg:py-14">
            <div className="max-w-lg">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-foreground/15" />
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
                  Statistical Analysis Platform
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] leading-[1.1] mb-8">
                {t.hub.hero.heading}
                <br />
                <span className="text-muted-foreground/60">{t.hub.hero.subheading}</span>
              </h1>

              {/* Stats badges */}
              <div className="flex items-center gap-3 mb-10">
                {[
                  t.hub.hero.statMethods(TOTAL_METHODS),
                  t.hub.hero.statCategories(TOTAL_CATEGORIES),
                  t.hub.hero.statAi,
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm"
                  >
                    <span className="text-[11px] font-mono text-muted-foreground/70 whitespace-nowrap">{stat}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2.5 px-7 h-12 text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                  onClick={handleStartWithData}
                >
                  <Upload className="w-4 h-4" />
                  {t.hub.hero.uploadButton}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 px-6 h-12 text-sm border-border/50 hover:bg-accent/40 hover:border-border transition-all"
                  onClick={handleBrowseMethods}
                >
                  <List className="w-4 h-4" />
                  {t.hub.hero.browseButton}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

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
