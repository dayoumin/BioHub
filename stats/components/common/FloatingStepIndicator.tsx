'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
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
  /** 우측 보조 영역 */
  rightSlot?: React.ReactNode
}

/**
 * Axiom Slate progress stepper.
 *
 * - Thin continuous progress track + fill
 * - Current step gets a tonal focus card
 * - Completed/upcoming states are separated by typography and icon treatment
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
  const completedSteps = steps.filter((step) => step.completed).map((step) => step.id)
  const maxAccessibleStep = Math.max(...completedSteps, currentStep)
  const progressPercent = steps.length <= 1
    ? 100
    : Number((((Math.max(1, Math.min(currentStep, steps.length)) - 1) / (steps.length - 1)) * 100).toFixed(2))

  return (
    <div
      className={cn(
        'z-40 bg-surface/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85',
        position === 'sticky' && 'sticky',
        position === 'fixed' && 'fixed left-0 right-0',
        className,
      )}
      style={{ top: topOffset }}
    >
      <div className="mx-auto max-w-[1480px] px-6 pb-2 pt-1">
        <div className="rounded-[28px] bg-surface-container-low/78 px-4 py-3">
          <div className="relative w-full pt-3">
            <div className="absolute left-0 top-0 h-px w-full bg-outline-variant/35" />
            <div
              data-testid="stepper-progress-fill"
              className="absolute left-0 top-0 h-0.5 rounded-full bg-accent-tertiary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />

            <nav
              className="relative grid w-full gap-3 md:gap-4"
              style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
              role="navigation"
              aria-label="Progress steps"
            >
              {steps.map((step) => {
                const isActive = step.id === currentStep
                const isCompleted = completedSteps.includes(step.id) || step.completed
                const isSkipped = !isActive && step.skipped
                const canClick = Boolean(onStepChange) && (isCompleted || step.id <= maxAccessibleStep)
                const StepIcon = step.icon

                return (
                  <button
                    key={step.id}
                    onClick={() => canClick && onStepChange?.(step.id)}
                    disabled={!canClick}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.label} (Step ${step.id}${isSkipped ? ', auto-skipped' : isCompleted ? ', completed' : ''})`}
                    data-testid={`stepper-step-${step.id}`}
                    data-state={isActive ? 'active' : isCompleted ? 'completed' : isSkipped ? 'skipped' : 'upcoming'}
                    className={cn(
                      'relative min-w-0 rounded-2xl px-3 py-3 text-left transition-all duration-200',
                      isActive && 'bg-surface-container-lowest shadow-[0px_12px_32px_rgba(25,28,30,0.06)]',
                      canClick && 'cursor-pointer hover:bg-surface-container-lowest/70',
                      !canClick && 'cursor-default',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors',
                          isActive && 'bg-accent-tertiary/12 text-accent-tertiary',
                          isCompleted && !isActive && 'bg-surface-container text-accent-tertiary',
                          isSkipped && 'bg-surface-container text-muted-foreground',
                          !isActive && !isCompleted && !isSkipped && 'bg-transparent text-muted-foreground/45',
                        )}
                      >
                        {isCompleted && !isActive ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : StepIcon ? (
                          <StepIcon className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[11px] font-semibold tabular-nums">{step.id}</span>
                        )}
                      </span>

                      <span
                        className={cn(
                          'truncate text-[10px] font-semibold uppercase tracking-[0.14em]',
                          isActive && 'text-accent-tertiary',
                          isCompleted && !isActive && 'text-foreground/80',
                          isSkipped && 'text-muted-foreground/70',
                          !isActive && !isCompleted && !isSkipped && 'text-muted-foreground/45',
                        )}
                      >
                        {`Step ${String(step.id).padStart(2, '0')}`}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'mt-2 block truncate tracking-tight',
                        isActive && 'text-sm font-semibold text-foreground',
                        isCompleted && !isActive && 'text-[13px] font-medium text-foreground/88',
                        isSkipped && 'text-[13px] font-medium text-muted-foreground',
                        !isActive && !isCompleted && !isSkipped && 'text-[13px] font-medium text-muted-foreground/58',
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {rightSlot && (
          <div className="mt-3 flex justify-end">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  )
})

export default FloatingStepIndicator
