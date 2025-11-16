/**
 * StepProgress 컴포넌트
 *
 * 통계 페이지의 단계별 진행 상황을 시각화하는 공통 컴포넌트
 * regression-demo 페이지 패턴을 재사용 가능하게 추출
 */

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export interface Step {
  id: number
  label: string
  icon?: ReactNode
}

interface StepProgressProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepId: number) => void
  className?: string
}

export function StepProgress({ steps, currentStep, onStepClick, className }: StepProgressProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep
        const isClickable = onStepClick && (isCompleted || isCurrent)

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full transition-all',
                'border-2',
                isCompleted && 'bg-primary border-primary text-primary-foreground',
                isCurrent && 'border-primary bg-background text-primary',
                !isCompleted && !isCurrent && 'border-muted-foreground/30 bg-background text-muted-foreground',
                isClickable && 'cursor-pointer hover:scale-110',
                !isClickable && 'cursor-not-allowed'
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : step.icon ? (
                step.icon
              ) : (
                <span className="text-sm font-semibold">{step.id}</span>
              )}
            </button>

            {/* Step Label */}
            <div className="ml-3 flex-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  isCurrent && 'text-foreground',
                  isCompleted && 'text-muted-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground/60'
                )}
              >
                {step.label}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-full mx-4 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
