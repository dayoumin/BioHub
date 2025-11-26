'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepNavigationProps {
  /** Show previous button */
  showPrevious?: boolean
  /** Show next button */
  showNext?: boolean
  /** Previous button click handler */
  onPrevious?: () => void
  /** Next button click handler */
  onNext?: () => void
  /** Previous button label */
  previousLabel?: string
  /** Next button label */
  nextLabel?: string
  /** Disable next button */
  disableNext?: boolean
  /** Disable previous button */
  disablePrevious?: boolean
  /** Loading state for next button */
  isLoading?: boolean
  /** Loading message */
  loadingMessage?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * SmartFlow Step Navigation Component
 *
 * - Provides consistent navigation buttons across all steps
 * - Prevents duplicate button issues
 * - Single source of truth for step navigation UI
 *
 * Usage:
 * ```tsx
 * <StepNavigation
 *   showPrevious={true}
 *   showNext={true}
 *   onPrevious={handlePrevious}
 *   onNext={handleNext}
 *   nextLabel="다음 단계로"
 * />
 * ```
 */
export const StepNavigation = memo(function StepNavigation({
  showPrevious = false,
  showNext = true,
  onPrevious,
  onNext,
  previousLabel = '이전',
  nextLabel = '다음 단계로',
  disableNext = false,
  disablePrevious = false,
  isLoading = false,
  loadingMessage,
  className
}: StepNavigationProps) {
  // Don't render if no buttons to show
  if (!showPrevious && !showNext) {
    return null
  }

  return (
    <div className={cn(
      "flex items-center mt-6 pt-4 border-t",
      showPrevious && showNext ? "justify-between" : "justify-end",
      className
    )}>
      {/* Previous Button */}
      {showPrevious && (
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={disablePrevious || isLoading}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {previousLabel}
        </Button>
      )}

      {/* Next Button */}
      {showNext && (
        <Button
          onClick={onNext}
          disabled={disableNext || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {loadingMessage || '처리 중...'}
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
})

export default StepNavigation