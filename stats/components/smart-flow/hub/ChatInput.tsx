'use client'

/**
 * ChatInput — Chat-First 허브의 메인 채팅 입력 컴포넌트
 *
 * - 정규분포 SVG를 배경으로 사용 (opacity ~0.05)
 * - 입력 후 Enter로 제출, Shift+Enter로 줄바꿈
 * - onSubmit 시 Intent Router를 통해 트랙 분류
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { TypingIndicator } from '@/components/common/TypingIndicator'

// ===== SVG Background =====

function StatisticalHeroVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 300"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bg-curveGrad" x1="300" y1="50" x2="300" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="bg-strokeGrad" x1="0" y1="150" x2="600" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <line x1="50" y1="250" x2="550" y2="250" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />

      {[150, 250, 350, 450].map((x) => (
        <line key={x} x1={x} y1="80" x2={x} y2="250" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
      ))}

      <path
        d="M 50,250 C 100,248 150,230 200,180 C 250,130 275,80 300,80 C 325,80 350,130 400,180 C 450,230 500,248 550,250"
        fill="url(#bg-curveGrad)"
      />
      <path
        d="M 50,250 C 100,248 150,230 200,180 C 250,130 275,80 300,80 C 325,80 350,130 400,180 C 450,230 500,248 550,250"
        stroke="url(#bg-strokeGrad)"
        strokeWidth="2.5"
      />

      <g fill="currentColor">
        {[
          { x: 180, y: 210, o: 0.6 }, { x: 220, y: 160, o: 0.7 },
          { x: 260, y: 110, o: 0.8 }, { x: 300, y: 95, o: 1.0 },
          { x: 340, y: 120, o: 0.8 }, { x: 380, y: 170, o: 0.7 },
          { x: 420, y: 220, o: 0.6 },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" opacity={p.o} />
        ))}
      </g>

      <g fill="currentColor" opacity="0.7" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', fontWeight: 'bold' }}>
        <text x="70" y="75" className="select-none">y = β₀ + β₁x + ε</text>
        <text x="410" y="60" className="select-none">σ² = Σ(X-μ)²/N</text>
        <text x="500" y="240" fontSize="10" opacity="0.4" className="select-none">α=0.05</text>
        <text x="60" y="240" fontSize="10" opacity="0.4" className="select-none">p-value</text>
      </g>
    </svg>
  )
}

// ===== Props =====

interface ChatInputProps {
  onSubmit: (message: string) => void
  isProcessing: boolean
  /** 외부에서 값을 주입 (트랙 카드 클릭 시) */
  externalValue?: string
  onExternalValueConsumed?: () => void
}

// ===== Component =====

export function ChatInput({
  onSubmit,
  isProcessing,
  externalValue,
  onExternalValueConsumed,
}: ChatInputProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const [value, setValue] = useState('')

  // 최신 콜백을 ref로 캡처 (deps 안정화)
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const onConsumedRef = useRef(onExternalValueConsumed)
  onConsumedRef.current = onExternalValueConsumed

  // 외부 값 주입 처리 — externalValue만 deps로 사용
  // consumed 콜백은 submit 후에 호출 (동기 호출 시 state 변경 → cleanup → timer 취소됨)
  useEffect(() => {
    if (externalValue) {
      setValue(externalValue)
      const timer = setTimeout(() => {
        onSubmitRef.current(externalValue)
        onConsumedRef.current?.()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [externalValue])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isProcessing) return
    onSubmit(trimmed)
    setValue('')
  }, [value, isProcessing, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
  }, [])

  return (
    <motion.div
      className="relative"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* SVG 배경 */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <StatisticalHeroVisual
          className="w-full h-full text-primary opacity-[0.04] dark:opacity-[0.06]"
        />
      </div>

      {/* 콘텐츠 */}
      <div className="relative rounded-2xl border bg-background/80 backdrop-blur-sm p-8 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          {t.hub.chatInput.heading}
        </h1>

        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              data-testid="ai-chat-input"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={t.hub.chatInput.placeholder}
              disabled={isProcessing}
              rows={1}
              className={cn(
                'min-h-[48px] max-h-[120px] resize-none pr-12',
                'rounded-xl border-muted-foreground/20',
                'focus:ring-2 focus:ring-primary/30',
                'transition-all duration-200'
              )}
            />
          </div>

          <Button
            data-testid="ai-chat-submit"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isProcessing}
            className="h-12 w-12 rounded-xl shrink-0"
            aria-label={t.hub.chatInput.sendAriaLabel}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* 처리 중 상태 인디케이터 */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '1.5rem' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <TypingIndicator
                label={t.hub.chatInput.processingMessage}
                className="pt-1"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
