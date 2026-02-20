'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Check, Info } from 'lucide-react'
import { useTerminology } from '@/hooks/use-terminology'
import type { GuidedQuestion, AutoAnswerResult } from '@/types/smart-flow'

interface ConversationalQuestionProps {
  question: GuidedQuestion
  selectedValue: string | null
  onSelect: (value: string) => void
  autoAnswer?: AutoAnswerResult
  /** 애니메이션 방향: 'forward' = 오른쪽에서, 'backward' = 왼쪽에서 */
  direction?: 'forward' | 'backward'
}

export function ConversationalQuestion({
  question,
  selectedValue,
  onSelect,
  autoAnswer,
  direction = 'forward'
}: ConversationalQuestionProps) {
  const t = useTerminology()
  const text = t.conversationalQuestion
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-answer 정보
  const hasAutoAnswer = autoAnswer && autoAnswer.confidence !== 'unknown'
  const isAutoSuggested = (value: string) => autoAnswer?.value === value

  // 입력 필드에서 이벤트가 발생했는지 확인하는 헬퍼
  const isEditableElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false
    const tagName = target.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
    if (target.isContentEditable) return true
    return false
  }, [])

  // 키보드 단축키 (1-9로 옵션 선택)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서 타이핑 중이면 무시
      if (isEditableElement(e.target)) return

      const num = parseInt(e.key)
      if (num >= 1 && num <= question.options.length) {
        onSelect(question.options[num - 1].value)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [question.options, onSelect, isEditableElement])

  // 옵션 선택 핸들러
  const handleOptionClick = useCallback((value: string) => {
    onSelect(value)
  }, [onSelect])

  return (
    <div
      ref={containerRef}
      className={cn(
        'space-y-6 animate-in duration-300',
        direction === 'forward' ? 'slide-in-from-right-8 fade-in' : 'slide-in-from-left-8 fade-in'
      )}
    >
      {/* 질문 텍스트 */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">
          {question.question}
        </h3>

        {/* AI 감지 배지 */}
        {hasAutoAnswer && (
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1',
                autoAnswer.confidence === 'high' && 'bg-primary/10 text-primary border-primary/20',
                autoAnswer.confidence === 'medium' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                autoAnswer.confidence === 'low' && 'bg-muted text-muted-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {autoAnswer.confidence === 'high' && text.aiAnalyzed}
              {autoAnswer.confidence === 'medium' && text.aiRecommendNeedsCheck}
              {autoAnswer.confidence === 'low' && text.aiReferenceInfo}
            </Badge>
          </div>
        )}
      </div>

      {/* 옵션들 */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedValue === option.value
          const isAISuggested = isAutoSuggested(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={cn(
                'w-full group relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200',
                'hover:border-primary/50 hover:bg-accent/30 hover:shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : isAISuggested
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-background'
              )}
            >
              {/* 단축키 번호 */}
              <div
                className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                )}
              >
                {isSelected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* 옵션 내용 */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium text-base',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {option.label}
                  </span>

                  {/* AI 추천 표시 */}
                  {isAISuggested && !isSelected && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-primary/5 text-primary border-primary/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {text.recommendedBadge}
                    </Badge>
                  )}
                </div>

                {option.hint && (
                  <p className="text-sm text-muted-foreground">
                    {option.hint}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* AI 근거 표시 */}
      {hasAutoAnswer && autoAnswer.evidence && (
        <div
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg text-sm',
            autoAnswer.confidence === 'high' && 'bg-primary/5 border border-primary/20',
            autoAnswer.confidence === 'medium' && 'bg-amber-500/5 border border-amber-500/20',
            autoAnswer.confidence === 'low' && 'bg-muted border border-border'
          )}
        >
          <Info className={cn(
            'h-4 w-4 mt-0.5 flex-shrink-0',
            autoAnswer.confidence === 'high' && 'text-primary',
            autoAnswer.confidence === 'medium' && 'text-amber-600',
            autoAnswer.confidence === 'low' && 'text-muted-foreground'
          )} />
          <span className={cn(
            autoAnswer.confidence === 'high' && 'text-primary',
            autoAnswer.confidence === 'medium' && 'text-amber-700',
            autoAnswer.confidence === 'low' && 'text-muted-foreground'
          )}>
            {autoAnswer.evidence}
          </span>
        </div>
      )}

      {/* 키보드 힌트 */}
      <p className="text-xs text-muted-foreground text-center">
        {text.keyboardHint(question.options.length)}
      </p>
    </div>
  )
}
