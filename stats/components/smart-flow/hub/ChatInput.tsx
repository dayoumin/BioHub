'use client'

/**
 * ChatInput — Chat-First 허브의 메인 채팅 입력 컴포넌트
 *
 * - 입력 후 Enter로 제출, Shift+Enter로 줄바꿈
 * - onSubmit 시 Intent Router를 통해 트랙 분류
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Send, Loader2, ArrowUpFromLine, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
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
  const [value, setValue] = useState('')

  // 최신 콜백을 ref로 캡처 (deps 안정화)
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit
  const onConsumedRef = useRef(onExternalValueConsumed)
  onConsumedRef.current = onExternalValueConsumed

  // 외부 값 주입 처리 — 즉시 submit + 입력창 초기화
  useEffect(() => {
    if (externalValue) {
      onSubmitRef.current(externalValue)
      setValue('')
      onConsumedRef.current?.()
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
    <div className="space-y-3">
      <div className="relative">
        {/* Textarea with buttons inside */}
        <Textarea
          data-testid="ai-chat-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t.hub.chatInput.placeholder}
          disabled={isProcessing}
          rows={2}
          className={cn(
            'min-h-[64px] max-h-[160px] resize-none pl-5 pr-24',
            'rounded-2xl border-border bg-background text-base',
            'shadow-md',
            'focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'transition-all duration-200'
          )}
        />

        {/* Buttons inside textarea — bottom right */}
        <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
          {onUploadClick && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onUploadClick}
              disabled={isProcessing}
              className="h-9 w-9 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent"
              aria-label={t.hub.chatInput.uploadAriaLabel}
              title={t.hub.chatInput.uploadTitle}
            >
              <ArrowUpFromLine className="h-4 w-4" />
            </Button>
          )}

          <Button
            data-testid="ai-chat-submit"
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || isProcessing}
            className="h-9 w-9 rounded-lg"
            aria-label={t.hub.chatInput.sendAriaLabel}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 프라이버시 안내 */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
        <ShieldCheck className="h-3 w-3 shrink-0" />
        {t.hub.chatInput.privacyNotice}
      </p>

      {/* 처리 중 상태 인디케이터 */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
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
  )
}
