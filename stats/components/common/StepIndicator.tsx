'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, XCircle, LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ColorVariant,
  getVariantColors,
  getSizeTokens,
  ANIMATION_TOKENS,
  TYPOGRAPHY_TOKENS,
  LAYOUT_TOKENS,
  MOTION_VARIANTS,
} from '@/lib/design-tokens/step-flow'

// ============================================================================
// Types
// ============================================================================

/**
 * 단계 상태 타입 (통합)
 * - pending: 아직 진행 안 됨
 * - current: 현재 진행 중
 * - completed: 완료됨
 * - error: 에러 발생
 */
export type StepStatus = 'pending' | 'current' | 'completed' | 'error'

/**
 * 단계 정보 인터페이스 (통합)
 */
export interface Step {
  id: string | number
  title: string
  description?: string
  icon?: LucideIcon | ReactNode
  status?: StepStatus  // 옵션: 지정하지 않으면 자동 계산
}

/**
 * 레이아웃 타입
 */
export type StepLayout = 'horizontal' | 'vertical'

/**
 * 크기 타입
 */
export type StepSize = 'sm' | 'md' | 'lg'

// ============================================================================
// Props
// ============================================================================

export interface StepIndicatorProps {
  // 필수
  steps: Step[]
  currentStep: number  // 0-based index

  // 선택
  completedSteps?: (string | number)[]  // 완료된 단계 ID 배열 (Smart Flow 호환)
  variant?: ColorVariant
  size?: StepSize
  layout?: StepLayout
  showProgress?: boolean      // 진행률 바 표시
  showDescription?: boolean   // 설명 표시 (모바일에서는 자동 숨김)
  showStepNumber?: boolean    // 단계 번호 배지 표시

  // 이벤트
  onStepClick?: (stepId: string | number) => void

  // 커스텀 스타일
  className?: string
  stepClassName?: string
}

// ============================================================================
// Component
// ============================================================================

export function StepIndicator({
  steps,
  currentStep,
  completedSteps = [],
  variant = 'gray',
  size = 'md',
  layout = 'horizontal',
  showProgress = true,
  showDescription = true,
  showStepNumber = true,
  onStepClick,
  className,
  stepClassName,
}: StepIndicatorProps) {

  // 디자인 토큰
  const colors = getVariantColors(variant)
  const sizeTokens = getSizeTokens(size)

  // ============================================================================
  // 단계 상태 계산 (통합 로직)
  // ============================================================================

  const getStepStatus = (step: Step, index: number): StepStatus => {
    // 명시적으로 status가 지정된 경우 우선
    if (step.status) return step.status

    // completedSteps 배열 기반 (Smart Flow 패턴)
    if (completedSteps.includes(step.id)) return 'completed'

    // currentStep 기반 (Statistics Page 패턴)
    if (index === currentStep) return 'current'
    if (index < currentStep) return 'completed'

    return 'pending'
  }

  const isStepClickable = (step: Step, index: number): boolean => {
    if (!onStepClick) return false

    // 완료된 단계 또는 현재 단계까지 클릭 가능
    const status = getStepStatus(step, index)
    return status === 'completed' || status === 'current' || index <= currentStep
  }

  // ============================================================================
  // 진행률 계산
  // ============================================================================

  const progressPercentage = (() => {
    if (steps.length <= 1) return 0

    // completedSteps 기반 계산
    if (completedSteps.length > 0) {
      const maxCompletedIndex = Math.max(
        ...completedSteps.map(id => steps.findIndex(s => s.id === id)),
        currentStep
      )
      return ((maxCompletedIndex) / (steps.length - 1)) * 100
    }

    // currentStep 기반 계산
    return (currentStep / (steps.length - 1)) * 100
  })()

  // ============================================================================
  // 색상 클래스 생성
  // ============================================================================

  const getStepColorClasses = (status: StepStatus): string => {
    switch (status) {
      case 'completed':
        return cn(
          colors.completed.bg,
          colors.completed.border,
          colors.completed.text,
          colors.completed.shadow
        )
      case 'current':
        return cn(
          colors.active.bg,
          colors.active.border,
          colors.active.text,
          colors.active.shadow
        )
      case 'error':
        return 'bg-destructive border-destructive text-destructive-foreground shadow-lg shadow-destructive/20'
      case 'pending':
      default:
        return cn(
          colors.pending.bg,
          colors.pending.border,
          colors.pending.text
        )
    }
  }

  // ============================================================================
  // 아이콘 렌더링
  // ============================================================================

  const renderStepIcon = (step: Step, status: StepStatus): ReactNode => {
    const iconSize = sizeTokens.icon

    if (status === 'completed') {
      return <CheckCircle2 className={iconSize} />
    }

    if (status === 'current') {
      return <Loader2 className={cn(iconSize, 'animate-spin')} />
    }

    if (status === 'error') {
      return <XCircle className={iconSize} />
    }

    // 커스텀 아이콘 또는 기본 Circle
    if (step.icon) {
      if (typeof step.icon === 'function') {
        const IconComponent = step.icon as LucideIcon
        return <IconComponent className={iconSize} />
      }
      return step.icon
    }

    return null
  }

  // ============================================================================
  // Horizontal Layout
  // ============================================================================

  if (layout === 'horizontal') {
    return (
      <div className={cn('relative py-4', className)}>
        {/* Progress Bar */}
        {showProgress && steps.length > 1 && (
          <div className="absolute top-9 left-[calc(10%+0.5rem)] right-[calc(10%+0.5rem)] h-0.5 bg-gray-200 dark:bg-gray-700">
            <motion.div
              className={cn(colors.progressBar, 'h-full transition-all')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, progressPercentage)}%` }}
              transition={{ duration: ANIMATION_TOKENS.duration.slow / 1000 }}
            />
          </div>
        )}

        {/* Steps */}
        <div className="relative flex justify-between px-[10%]">
          {steps.map((step, index) => {
            const status = getStepStatus(step, index)
            const isClickable = isStepClickable(step, index)

            return (
              <TooltipProvider key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => isClickable && onStepClick?.(step.id)}
                      disabled={!isClickable}
                      aria-label={`${step.title} 단계로 이동`}
                      aria-current={status === 'current' ? 'step' : undefined}
                      whileHover={isClickable ? { scale: ANIMATION_TOKENS.scale.hover } : undefined}
                      whileTap={isClickable ? { scale: ANIMATION_TOKENS.scale.tap } : undefined}
                      className={cn(
                        'flex flex-col items-center group transition-all',
                        `duration-${ANIMATION_TOKENS.duration.normal}`,
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed',
                        status === 'current' && 'scale-105',
                        stepClassName
                      )}
                    >
                      {/* Step Circle */}
                      <div className="relative">
                        {/* Ripple Effect (현재 단계) */}
                        {status === 'current' && (
                          <div className="absolute inset-0 -m-2">
                            <div className={cn(sizeTokens.ripple, 'rounded-full', colors.ripple, 'animate-ping')} />
                          </div>
                        )}

                        {/* Circle */}
                        <div className={cn(
                          sizeTokens.circle,
                          'rounded-full flex items-center justify-center transition-all',
                          `duration-${ANIMATION_TOKENS.duration.normal}`,
                          LAYOUT_TOKENS.border.width,
                          'relative z-10 shadow-sm',
                          getStepColorClasses(status),
                          isClickable && status !== 'current' && 'group-hover:shadow-md'
                        )}>
                          {renderStepIcon(step, status)}
                        </div>

                        {/* Step Number Badge */}
                        {showStepNumber && status === 'pending' && (
                          <div className={cn(
                            'absolute -top-1 -right-1 z-20 rounded-full',
                            'bg-gray-200 dark:bg-gray-700 flex items-center justify-center',
                            sizeTokens.badge
                          )}>
                            <span className={cn(TYPOGRAPHY_TOKENS.stepNumber, 'text-gray-600 dark:text-gray-400')}>
                              {index + 1}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Step Label */}
                      <div className="mt-3 text-center max-w-[120px]">
                        <p className={cn(
                          TYPOGRAPHY_TOKENS.stepTitle,
                          'transition-colors',
                          `duration-${ANIMATION_TOKENS.duration.normal}`,
                          status === 'completed' && 'text-gray-800 dark:text-gray-200',
                          status === 'current' && 'text-gray-700 dark:text-gray-300',
                          status === 'pending' && 'text-gray-400 dark:text-gray-500',
                          status === 'error' && 'text-destructive'
                        )}>
                          {step.title}
                        </p>

                        {showDescription && step.description && (
                          <p className={cn(
                            TYPOGRAPHY_TOKENS.stepDescription,
                            'mt-1 transition-all',
                            `duration-${ANIMATION_TOKENS.duration.normal}`,
                            status === 'current'
                              ? 'text-gray-600 dark:text-gray-400 opacity-100'
                              : 'text-gray-400 dark:text-gray-500 opacity-60 group-hover:opacity-100'
                          )}>
                            {step.description}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{step.title}</p>
                    {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================================================
  // Vertical Layout (TODO: 향후 구현)
  // ============================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Vertical layout implementation */}
      <p className="text-sm text-muted-foreground">Vertical layout - Coming soon</p>
    </div>
  )
}
