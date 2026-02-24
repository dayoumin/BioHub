'use client'

/**
 * ChatInput — Chat-First 허브의 메인 채팅 입력 컴포넌트
 *
 * - 입력 후 Enter로 제출, Shift+Enter로 줄바꿈
 * - onSubmit 시 Intent Router를 통해 트랙 분류
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Send, Loader2, ArrowUpFromLine } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { TypingIndicator } from '@/components/common/TypingIndicator'

// ===== Props =====

interface ChatInputProps {
  onSubmit: (message: string) => void
  isProcessing: boolean
  /** 외부에서 값을 주입 (트랙 카드 클릭 시) */
  externalValue?: string
  onExternalValueConsumed?: () => void
  /** 파일 업로드 버튼 클릭 시 (Step 1으로 이동) */
  onUploadClick?: () => void
}

// ===== Component =====

export function ChatInput({
  onSubmit,
  isProcessing,
  externalValue,
  onExternalValueConsumed,
  onUploadClick,
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
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <p className="text-sm font-medium text-muted-foreground">
          {t.hub.chatInput.heading}
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              data-testid="ai-chat-input"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={t.hub.chatInput.placeholder}
              disabled={isProcessing}
              rows={3}
              className={cn(
                'min-h-[80px] max-h-[200px] resize-none pr-4',
                'rounded-xl border-muted-foreground/20 text-base',
                'focus:ring-2 focus:ring-primary/30',
                'transition-all duration-200'
              )}
            />
          </div>

          {onUploadClick && (
            <Button
              size="icon"
              variant="outline"
              onClick={onUploadClick}
              disabled={isProcessing}
              className="h-12 w-12 rounded-xl shrink-0 self-end text-muted-foreground hover:text-foreground"
              aria-label="데이터 파일 업로드"
              title="CSV / Excel 파일 업로드"
            >
              <ArrowUpFromLine className="h-5 w-5" />
            </Button>
          )}

          <Button
            data-testid="ai-chat-submit"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isProcessing}
            className="h-12 w-12 rounded-xl shrink-0 self-end"
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
