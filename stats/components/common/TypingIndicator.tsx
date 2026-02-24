'use client'

/**
 * TypingIndicator — AI가 응답을 생성 중일 때 사용하는 바운싱 점 애니메이션
 *
 * 채팅 앱의 "입력 중" 인디케이터와 동일한 UX 패턴.
 * NaturalLanguageInput, ChatInput 등 AI 대기 상태에서 공통으로 사용.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface TypingIndicatorProps {
  /** 인디케이터 옆에 표시할 레이블 (선택) */
  label?: string
  className?: string
  /** 점 크기 (기본: md) */
  size?: 'sm' | 'md'
}

export function TypingIndicator({ label, className, size = 'md' }: TypingIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()
  const dotClass = size === 'sm'
    ? 'w-1 h-1'
    : 'w-1.5 h-1.5'

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={cn('block rounded-full bg-muted-foreground/50', dotClass)}
            animate={prefersReducedMotion ? { opacity: [1, 0.4, 1] } : { y: [0, -5, 0] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: prefersReducedMotion ? 0 : i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-xs text-muted-foreground" aria-hidden="true">{label}</span>
      )}
    </div>
  )
}