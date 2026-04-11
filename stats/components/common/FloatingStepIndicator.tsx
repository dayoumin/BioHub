'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/components/common/card-styles'
import { Check, LucideIcon } from 'lucide-react'

export interface StepItem {
  id: number
  label: string
  icon?: LucideIcon
  completed?: boolean
  /** 사용자가 직접 완료하지 않고 자동으로 건너뛴 스텝 (QuickAnalysis 등) */
  skipped?: boolean
}

export interface FloatingStepIndicatorProps {
  steps: StepItem[]
  currentStep: number
  onStepChange?: (stepId: number) => void
  className?: string
  position?: 'sticky' | 'fixed'
  topOffset?: string
  /** 우측 보조 영역 (예: "예제 데이터 불러오기" 버튼) */
  rightSlot?: React.ReactNode
}

/**
 * StepIndicator — Axiom Slate "Progress Bar" 스타일
 *
 * 상단 얇은 라인 (전체 너비) + 완료/현재 스텝에 두꺼운 accent 바
 * - 완료: accent bar + 진한 텍스트 + 체크 아이콘
 * - 현재: accent bar + 진한 텍스트
 * - 미래: 바 없음 + 연한 텍스트
 */
export const FloatingStepIndicator = memo(function FloatingStepIndicator({
  steps,
  currentStep,
  onStepChange,
  className,
  position = 'sticky',
  topOffset = '3.5rem',
  rightSlot,
}: FloatingStepIndicatorProps) {
  const completedSteps = steps.filter(s => s.completed).map(s => s.id)
  const maxAccessibleStep = Math.max(...completedSteps, currentStep)

  return (
    <div
      className={cn(
        "z-40 bg-background",
        position === 'sticky' && "sticky",
        position === 'fixed' && "fixed left-0 right-0",
        className
      )}
      style={{ top: topOffset }}
    >
      <div className="mx-auto max-w-[1480px] px-6 pb-4 pt-0">
        {/* Progress bar container */}
        <div className="relative w-full">
          {/* Background track — thin 2px line across full width */}
          <div className="h-0.5 w-full bg-outline-variant/30 absolute top-0 left-0" />

          {/* Step grid */}
          <nav
            className="relative grid w-full"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
            role="navigation"
            aria-label="Progress steps"
          >
            {steps.map((step) => {
              const isActive = step.id === currentStep
              const isCompleted = completedSteps.includes(step.id) || step.completed
              const isSkipped = !isActive && step.skipped
              const canClick = onStepChange && (isCompleted || step.id <= maxAccessibleStep)
              const hasBar = isActive || isCompleted || isSkipped

              return (
                <button
                  key={step.id}
                  onClick={() => canClick && onStepChange?.(step.id)}
                  disabled={!canClick}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`${step.label} (Step ${step.id}${isSkipped ? ', auto-skipped' : isCompleted ? ', completed' : ''})`}
                  data-testid={`stepper-step-${step.id}`}
                  className={cn(
                    "relative pt-4 text-left transition-all",
                    canClick && "cursor-pointer",
                    !canClick && "cursor-default",
                  )}
                >
                  {/* Active/completed accent bar — thicker, overlays the track */}
                  {hasBar && (
                    <div
                      className={cn(
                        "h-1 w-full absolute top-[-1px] left-0 transition-colors",
                        isSkipped
                          ? "bg-muted-foreground/40"
                          : "bg-accent-tertiary",
                      )}
                    />
                  )}

                  {/* Step number label */}
                  <span
                    className={cn(
                      "text-[10px] font-bold block mb-1 tracking-wide",
                      isActive || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                      isSkipped && "text-muted-foreground/50",
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-accent-tertiary" />
                        Step {String(step.id).padStart(2, '0')}
                      </span>
                    ) : (
                      `Step ${String(step.id).padStart(2, '0')}`
                    )}
                  </span>

                  {/* Step name */}
                  <span
                    className={cn(
                      "text-xs font-medium block",
                      isActive && "text-foreground",
                      isCompleted && !isActive && "text-foreground",
                      isSkipped && "text-muted-foreground",
                      !isActive && !isCompleted && !isSkipped && "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right slot — positioned below the progress bar */}
        {rightSlot && (
          <div className="flex justify-end mt-3">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  )
})

export default FloatingStepIndicator
