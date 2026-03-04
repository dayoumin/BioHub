'use client'

/**
 * AutoConfirmSelector - Auto-confirm Variable Selector for complex methods
 *
 * Used for methods that do not need custom variable selection UI:
 *   repeated-measures-anova, manova, mixed-model,
 *   arima, seasonal-decompose, stationarity-test,
 *   kaplan-meier, cox-regression, discriminant, power-analysis
 *
 * Displays AI-detected variables as read-only summary and
 * proceeds immediately on user confirmation.
 */

import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRight, ArrowLeft, Wand2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VariableSelectorProps } from './types'

export function AutoConfirmSelector({
  onComplete,
  onBack,
  initialSelection,
  title,
  description,
  className
}: VariableSelectorProps) {
  const displayTitle = title ?? 'AI 감지 변수 확인'
  const displayDescription =
    description ?? 'AI가 감지한 변수를 확인하고 분석을 시작합니다'

  const hasSelection =
    initialSelection !== undefined &&
    Object.values(initialSelection).some(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))

  const handleSubmit = useCallback(() => {
    onComplete(initialSelection ?? {})
  }, [onComplete, initialSelection])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wand2 className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">{displayTitle}</h2>
            <p className="text-sm text-muted-foreground">{displayDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button onClick={onBack} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            className="gap-2"
            data-testid="run-analysis-btn"
          >
            분석 시작
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detected Variables Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-info" />
            감지된 변수
          </CardTitle>
          <CardDescription className="text-xs">
            이 분석 방법은 별도의 변수 선택 UI 없이 자동으로 진행됩니다.
            아래 변수를 확인 후 분석을 시작하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {hasSelection ? (
            <div className="space-y-2 text-sm">
              {initialSelection?.dependentVar && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">종속변수:</span>
                  {Array.isArray(initialSelection.dependentVar)
                    ? initialSelection.dependentVar.map((v: string) => (
                        <Badge key={v} variant="secondary">{v}</Badge>
                      ))
                    : <Badge variant="secondary">{initialSelection.dependentVar}</Badge>}
                </div>
              )}
              {initialSelection?.independentVar && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">독립변수:</span>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(initialSelection.independentVar)
                      ? initialSelection.independentVar
                      : initialSelection.independentVar.split(',')
                    ).map((v: string) => (
                      <Badge key={v} variant="outline">{v.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {initialSelection?.event && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">사건변수:</span>
                  <Badge variant="secondary">{initialSelection.event}</Badge>
                </div>
              )}
              {initialSelection?.groupVar && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">그룹변수:</span>
                  <Badge variant="outline">{initialSelection.groupVar}</Badge>
                </div>
              )}
              {initialSelection?.variables && initialSelection.variables.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">변수:</span>
                  <div className="flex flex-wrap gap-1">
                    {initialSelection.variables.map(v => (
                      <Badge key={v} variant="outline">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                AI가 특정 변수를 감지하지 못했습니다.
                분석 단계에서 직접 입력할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
