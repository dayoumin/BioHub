'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/components/common/card-styles'
import { Check, Zap, LucideIcon } from 'lucide-react'

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
 * StepIndicator — STITCH 시안 스타일
 *
 * 원형 번호 + 수평 연결선 + 하단 라벨
 * - 완료: 파란 원 + ✓ 체크
 * - 현재: 파란 테두리 + 번호
 * - 미래: 회색 테두리 + 번호
 * - 스킵: 회색 원 + ✓ (quickAnalysis)
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
      <div className={cn(LAYOUT.maxWidth, 'px-6 py-4')}>
        <div className="flex items-start justify-between">
          {/* Step indicators */}
          <nav
            className="flex items-start"
            role="navigation"
            aria-label="Progress steps"
          >
            {steps.map((step, idx) => {
              const isActive = step.id === currentStep
              const isCompleted = completedSteps.includes(step.id) || step.completed
              const isSkipped = !isActive && step.skipped
              const canClick = onStepChange && (isCompleted || step.id <= maxAccessibleStep)
              const isLast = idx === steps.length - 1

              return (
                <div key={step.id} className="flex items-start">
                  {/* Step: circle + label */}
                  <button
                    onClick={() => canClick && onStepChange?.(step.id)}
                    disabled={!canClick}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.label} (Step ${step.id}${isSkipped ? ', auto-skipped' : isCompleted ? ', completed' : ''})`}
                    data-testid={`stepper-step-${step.id}`}
                    className={cn(
                      "flex flex-col items-center gap-2 transition-all",
                      canClick && "cursor-pointer",
                      !canClick && "cursor-default",
                    )}
                  >
                    {/* Circle */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2",
                      // 완료: 파란 배경 + 흰 체크
                      isCompleted && !isActive && !isSkipped && "bg-primary border-primary text-primary-foreground",
                      // 스킵(완료): 회색 배경 + 체크
                      isSkipped && "bg-muted border-muted-foreground/30 text-muted-foreground",
                      // 현재: 파란 테두리 + 파란 번호
                      isActive && "border-primary bg-primary text-primary-foreground",
                      // 미래: 회색 테두리 + 회색 번호
                      !isActive && !isCompleted && !isSkipped && "border-muted-foreground/30 bg-background text-muted-foreground",
                    )}>
                      {isSkipped ? (
                        <Check className="w-4 h-4" />
                      ) : isCompleted && !isActive ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>

                    {/* Label */}
                    <span className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isActive && "text-primary",
                      isCompleted && !isActive && "text-primary",
                      isSkipped && "text-muted-foreground",
                      !isActive && !isCompleted && !isSkipped && "text-muted-foreground",
                    )}>
                      {step.label}
                    </span>
                  </button>

                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex items-center pt-4 px-1">
                      <div className={cn(
                        "w-16 sm:w-24 h-0.5 transition-colors",
                        // 이 연결선 다음 스텝이 완료됐거나 현재면 파란색
                        (isCompleted || isActive) && (steps[idx + 1]?.completed || steps[idx + 1]?.id === currentStep)
                          ? "bg-primary"
                          : isCompleted || isActive
                            ? "bg-primary/40"
                            : "bg-muted-foreground/20",
                      )} />
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Right slot */}
          {rightSlot && (
            <div className="flex-shrink-0 ml-4">
              {rightSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default FloatingStepIndicator
