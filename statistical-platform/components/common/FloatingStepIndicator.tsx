'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { Check, LucideIcon } from 'lucide-react'

export interface StepItem {
  id: number
  label: string
  icon?: LucideIcon
  completed?: boolean
}

export interface FloatingStepIndicatorProps {
  /** Step items to display */
  steps: StepItem[]
  /** Current active step ID */
  currentStep: number
  /** Callback when step is clicked */
  onStepChange?: (stepId: number) => void
  /** Additional CSS classes */
  className?: string
  /** Position variant */
  position?: 'sticky' | 'fixed'
  /** Top offset for sticky/fixed positioning */
  topOffset?: string
}

/**
 * FloatingStepIndicator - Pill-shaped floating step indicator
 *
 * A modern, floating pill-style step indicator that can be used
 * for multi-step flows. Supports sticky or fixed positioning.
 *
 * Features:
 * - Pill-shaped container with backdrop blur
 * - Completed steps show checkmark
 * - Active step is highlighted
 * - Click to navigate (if step is accessible)
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 1, label: 'Upload', icon: Upload },
 *   { id: 2, label: 'Configure', icon: Settings },
 *   { id: 3, label: 'Analyze', icon: Play },
 * ]
 *
 * <FloatingStepIndicator
 *   steps={steps}
 *   currentStep={2}
 *   onStepChange={(id) => setStep(id)}
 * />
 * ```
 */
export const FloatingStepIndicator = memo(function FloatingStepIndicator({
  steps,
  currentStep,
  onStepChange,
  className,
  position = 'sticky',
  topOffset = '3.5rem'
}: FloatingStepIndicatorProps) {
  // Calculate completed steps
  const completedSteps = steps.filter(s => s.completed).map(s => s.id)
  const maxAccessibleStep = Math.max(...completedSteps, currentStep)

  return (
    <div
      className={cn(
        "z-40 pointer-events-none",
        position === 'sticky' && "sticky",
        position === 'fixed' && "fixed left-0 right-0",
        className
      )}
      style={{ top: topOffset }}
    >
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-2">
        <div className="flex items-center justify-center">
          {/* Floating Pill Container */}
          <nav
            className="pointer-events-auto inline-flex items-center bg-background/80 backdrop-blur-md border shadow-sm rounded-full px-6 py-2"
            role="navigation"
            aria-label="Progress steps"
          >
            {steps.map((step, idx) => {
              const isActive = step.id === currentStep
              const isCompleted = completedSteps.includes(step.id) || step.completed
              const canClick = onStepChange && (isCompleted || step.id <= maxAccessibleStep)
              const StepIcon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => canClick && onStepChange?.(step.id)}
                    disabled={!canClick}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.label} (Step ${step.id}${isCompleted ? ', completed' : ''})`}
                    data-testid={`stepper-step-${step.id}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm",
                      canClick && "hover:bg-muted cursor-pointer",
                      !canClick && "cursor-default opacity-50",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary shadow-sm",
                      isCompleted && !isActive && "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {/* Step Number/Icon Circle */}
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isCompleted && !isActive && "bg-primary/10 text-primary",
                      isActive && "bg-background text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted && !isActive ? (
                        <Check className="w-3 h-3" />
                      ) : StepIcon ? (
                        <StepIcon className="w-3 h-3" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>
                    {/* Step Label */}
                    <span className={cn(
                      "font-medium",
                      isActive ? "text-primary-foreground" : ""
                    )}>
                      {step.label}
                    </span>
                  </button>

                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div className="w-4 h-px bg-border mx-1" aria-hidden="true" />
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
})

export default FloatingStepIndicator
