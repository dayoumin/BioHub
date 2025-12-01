'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Check, AlertCircle } from 'lucide-react'
import type { GuidedQuestion, AutoAnswerResult } from '@/types/smart-flow'

interface QuestionCardProps {
  question: GuidedQuestion
  selectedValue: string | null
  onSelect: (value: string) => void
  autoAnswer?: AutoAnswerResult
  questionNumber: number
}

export function QuestionCard({
  question,
  selectedValue,
  onSelect,
  autoAnswer,
  questionNumber
}: QuestionCardProps) {
  // Auto-answer가 있고 high confidence면 자동 선택 표시
  const hasAutoAnswer = autoAnswer && autoAnswer.confidence !== 'unknown'
  const isAutoSelected = hasAutoAnswer && !autoAnswer.requiresConfirmation && selectedValue === autoAnswer.value

  return (
    <div className="space-y-3">
      {/* 질문 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">
          <span className="text-muted-foreground mr-1.5">Q{questionNumber}.</span>
          {question.question}
        </h4>

        {/* AI 감지 배지 */}
        {hasAutoAnswer && (
          <Badge
            variant={autoAnswer.confidence === 'high' ? 'default' : 'secondary'}
            className={cn(
              'flex items-center gap-1 text-xs shrink-0',
              autoAnswer.confidence === 'high' && 'bg-primary/10 text-primary border-primary/20',
              autoAnswer.confidence === 'medium' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
              autoAnswer.confidence === 'low' && 'bg-muted text-muted-foreground'
            )}
          >
            <Sparkles className="h-3 w-3" />
            AI 감지
          </Badge>
        )}
      </div>

      {/* 옵션들 */}
      <div className="grid gap-2">
        {question.options.map((option) => {
          const isSelected = selectedValue === option.value
          const isAutoSuggested = autoAnswer?.value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-background',
                isAutoSuggested && !isSelected && 'border-primary/30 bg-primary/5'
              )}
            >
              {/* 라디오 인디케이터 */}
              <div
                className={cn(
                  'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                )}
              >
                {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>

              {/* 옵션 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium text-sm',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {option.label}
                  </span>

                  {/* AI 추천 표시 */}
                  {isAutoSuggested && !isSelected && (
                    <span className="text-xs text-primary/70 flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      추천
                    </span>
                  )}
                </div>

                {option.hint && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.hint}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Auto-answer 근거 표시 */}
      {hasAutoAnswer && autoAnswer.evidence && (
        <div
          className={cn(
            'flex items-start gap-2 p-2.5 rounded-md text-xs',
            autoAnswer.confidence === 'high' && 'bg-primary/5 text-primary',
            autoAnswer.confidence === 'medium' && 'bg-amber-500/5 text-amber-700',
            autoAnswer.confidence === 'low' && 'bg-muted text-muted-foreground'
          )}
        >
          {autoAnswer.requiresConfirmation ? (
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          )}
          <span>{autoAnswer.evidence}</span>
        </div>
      )}
    </div>
  )
}
