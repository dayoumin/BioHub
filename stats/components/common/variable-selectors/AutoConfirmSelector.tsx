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
  className,
  backLabel
}: VariableSelectorProps) {
  const displayTitle = title ?? 'AI 감지 변수 확인'
  const displayDescription =
    description ?? 'AI가 감지한 변수를 확인하고 분석을 시작합니다'

  const hasSelection =
    initialSelection !== undefined &&
    Object.values(initialSelection).some(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))

  const detectedRoleCount = initialSelection
    ? Object.values(initialSelection).filter(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)).length
    : 0

  const handleSubmit = useCallback(() => {
    onComplete(initialSelection ?? {})
  }, [onComplete, initialSelection])

  const summaryItems = [
    initialSelection?.dependentVar ? {
      label: '종속변수',
      value: Array.isArray(initialSelection.dependentVar)
        ? initialSelection.dependentVar
        : [initialSelection.dependentVar],
      variant: 'secondary' as const,
    } : null,
    initialSelection?.independentVar ? {
      label: '독립변수',
      value: (Array.isArray(initialSelection.independentVar)
        ? initialSelection.independentVar
        : initialSelection.independentVar.split(',')
      ).map((v: string) => v.trim()).filter(Boolean),
      variant: 'outline' as const,
    } : null,
    initialSelection?.event ? {
      label: '사건변수',
      value: [initialSelection.event],
      variant: 'secondary' as const,
    } : null,
    initialSelection?.groupVar ? {
      label: '그룹변수',
      value: [initialSelection.groupVar],
      variant: 'outline' as const,
    } : null,
    initialSelection?.variables && initialSelection.variables.length > 0 ? {
      label: '변수',
      value: initialSelection.variables,
      variant: 'outline' as const,
    } : null,
  ].filter(Boolean) as Array<{ label: string; value: string[]; variant: 'secondary' | 'outline' }>

  return (
    <div className={cn('space-y-5', className)}>
      <div className="rounded-2xl border border-border/40 bg-surface-container-low px-5 py-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Step 3
              </p>
              <h2 className="text-xl font-semibold tracking-tight">{displayTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{displayDescription}</p>
            </div>
          </div>
          <Badge variant="secondary" className="h-7 shrink-0 text-xs font-medium">
            감지된 역할 {detectedRoleCount}개
          </Badge>
        </div>
      </div>

      {/* Detected Variables Summary */}
      <Card className="border-border/40 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-info" />
            감지된 변수
          </CardTitle>
          <CardDescription className="text-xs">
            별도 변수 선택 UI 없이 바로 진행되는 분석입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {hasSelection ? (
            <div className="space-y-2.5 text-sm">
              {summaryItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/40 bg-muted/20 px-3.5 py-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                    <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.value.map((value) => (
                        <Badge key={`${item.label}-${value}`} variant={item.variant}>
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="border-border/50 bg-surface-container-lowest">
              <Info className="h-4 w-4" />
              <AlertDescription>
                AI가 특정 변수를 감지하지 못했습니다.
                분석 단계에서 직접 입력할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-border/40 bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              진행 상태
            </p>
            <p className="mt-1 text-sm text-foreground">
              감지된 변수를 확인했고 바로 분석을 시작할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {onBack ? (
              <Button onClick={onBack} variant="outline" size="default" className="h-10 w-full gap-2 sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                {backLabel ?? '이전 단계'}
              </Button>
            ) : null}
            <Button
              onClick={handleSubmit}
              size="default"
              className="h-10 w-full gap-2 sm:w-auto"
              data-testid="run-analysis-btn"
            >
              분석 시작
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
