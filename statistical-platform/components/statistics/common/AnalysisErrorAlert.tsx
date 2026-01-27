'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface AnalysisErrorAlertProps {
  /** Error message to display. If null/undefined, component renders nothing. */
  error: string | null | undefined
  /** Optional title for the alert (default: none) */
  title?: string
  /** Callback to dismiss/clear the error */
  onDismiss?: () => void
  /** Show dismiss button (default: false) */
  showDismiss?: boolean
  /** Custom class name */
  className?: string
  /** Alert variant (default: 'destructive') */
  variant?: 'default' | 'destructive'
}

/**
 * Common error alert component for statistics pages
 *
 * Provides consistent error display across all 43 statistics pages.
 * Only renders when error is truthy.
 *
 * @example
 * // Basic usage
 * <AnalysisErrorAlert error={error} />
 *
 * @example
 * // With title and dismiss button
 * <AnalysisErrorAlert
 *   error={error}
 *   title="분석 오류"
 *   showDismiss
 *   onDismiss={() => actions.setError(null)}
 * />
 */
export function AnalysisErrorAlert({
  error,
  title,
  onDismiss,
  showDismiss = false,
  className = '',
  variant = 'destructive'
}: AnalysisErrorAlertProps) {
  if (!error) return null

  return (
    <Alert variant={variant} className={className}>
      <AlertCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {showDismiss && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 ml-2"
            aria-label="오류 닫기"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
