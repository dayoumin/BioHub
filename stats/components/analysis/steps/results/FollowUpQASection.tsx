'use client'

import { type RefObject } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, MessageCircle, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { proseBase } from '@/components/common/card-styles'
import { sectionRevealVariants } from './results-helpers'
import type { ChatMessage } from '@/lib/types/chat'
import type { TerminologyDictionary } from '@/lib/terminology/terminology-types'

interface FollowUpQASectionProps {
  phase: number
  prefersReducedMotion: boolean
  interpretation: string | null | undefined
  isInterpreting: boolean
  followUpMessages: ChatMessage[]
  isFollowUpStreaming: boolean
  chatBottomRef: RefObject<HTMLDivElement | null>
  followUpInput: string
  onFollowUpInputChange: (value: string) => void
  onFollowUp: (question: string) => void
  usedChips: Set<string>
  onChipUsed: (label: string) => void
  t: TerminologyDictionary
}

export function FollowUpQASection({
  phase,
  prefersReducedMotion,
  interpretation,
  isInterpreting,
  followUpMessages,
  isFollowUpStreaming,
  chatBottomRef,
  followUpInput,
  onFollowUpInputChange,
  onFollowUp,
  usedChips,
  onChipUsed,
  t,
}: FollowUpQASectionProps) {
  if (!(phase >= 4 || prefersReducedMotion) || !interpretation || isInterpreting) {
    return null
  }

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : sectionRevealVariants}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      <Card data-testid="follow-up-section">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            {t.results.followUp.title}
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4 space-y-3">
          {/* 이전 Q&A 스레드 */}
          {followUpMessages.length > 0 && (
            <div className="space-y-2">
              {followUpMessages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm',
                    msg.role === 'user'
                      ? 'bg-muted/60 ml-6'
                      : 'bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30'
                  )}
                >
                  {msg.role === 'user' ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t.results.followUp.userLabel}</p>
                  ) : (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400 mb-1 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {t.results.followUp.aiLabel}
                    </p>
                  )}
                  <div className={cn(proseBase, 'leading-relaxed')}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.role === 'assistant' && isFollowUpStreaming && idx === followUpMessages.length - 1 && (
                    <span className="inline-block w-1.5 h-3.5 bg-violet-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
          )}

          {/* 빠른 질문 칩 */}
          <div className="flex flex-wrap gap-1.5">
            {t.results.followUp.chips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  onChipUsed(chip.label)
                  onFollowUp(chip.prompt)
                }}
                disabled={isFollowUpStreaming}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:bg-muted/50 hover:border-border disabled:opacity-40 transition-colors',
                  usedChips.has(chip.label) && 'opacity-50 line-through'
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* 직접 입력 */}
          <div className="flex gap-2">
            <Input
              value={followUpInput}
              onChange={(e) => onFollowUpInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onFollowUp(followUpInput)
                }
              }}
              placeholder={t.results.followUp.placeholder}
              disabled={isFollowUpStreaming}
              className="flex-1 text-sm h-auto py-1.5"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onFollowUp(followUpInput)}
              disabled={isFollowUpStreaming || !followUpInput.trim()}
              className="px-2.5"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
