'use client'

/**
 * PairedSelector - Paired/Repeated Measures Variable Selector
 *
 * For: Paired t-test, Wilcoxon signed-rank, McNemar test
 *
 * Required variables:
 * - 2 numeric variables (before/after, time1/time2)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'
import { useTerminology } from '@/hooks/use-terminology'

interface PairedSelectorProps extends VariableSelectorProps {
  /** Labels for the two measurements */
  labels?: { first: string; second: string }
}

export function PairedSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title,
  description,
  className,
  labels
}: PairedSelectorProps) {
  // Terminology
  const t = useTerminology()
  const displayTitle = title ?? t.selectorUI.titles.paired
  const displayDescription = description ?? t.selectorUI.descriptions.paired
  const defaultLabels = {
    first: t.variables.pairedFirst.title,
    second: t.variables.pairedSecond.title
  }
  const displayLabels = labels ?? defaultLabels

  // State
  const [var1, setVar1] = useState<string | null>(
    initialSelection?.variables?.[0] || null
  )
  const [var2, setVar2] = useState<string | null>(
    initialSelection?.variables?.[1] || null
  )

  // Sync state when initialSelection changes (e.g., from detectedVariables)
  useEffect(() => {
    if (initialSelection?.variables) {
      if (initialSelection.variables[0]) setVar1(initialSelection.variables[0])
      if (initialSelection.variables[1]) setVar2(initialSelection.variables[1])
    }
  }, [initialSelection?.variables])

  // Data analysis
  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null
    if (!Array.isArray(data)) return null
    if (!isRecord(data[0])) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // Get numeric columns only (continuous type)
  const numericColumns = useMemo(() => {
    if (!analysis) return []
    return analysis.columns.filter(
      col => col.type === 'continuous' && !col.idDetection?.isId
    )
  }, [analysis])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []

    if (!var1) errors.push(`${displayLabels.first} ${t.validation.dependentRequired.split(' ')[0]}`)
    if (!var2) errors.push(`${displayLabels.second} ${t.validation.dependentRequired.split(' ')[0]}`)
    if (var1 && var2 && var1 === var2) errors.push(t.validation.differentVariablesRequired)

    return {
      isValid: errors.length === 0 && var1 !== null && var2 !== null && var1 !== var2,
      errors
    }
  }, [var1, var2, displayLabels, t])

  // Toggle handlers
  const toggleVar1 = useCallback((name: string) => {
    setVar1(prev => prev === name ? null : name)
  }, [])

  const toggleVar2 = useCallback((name: string) => {
    setVar2(prev => prev === name ? null : name)
  }, [])

  // Swap variables
  const swapVariables = useCallback(() => {
    setVar1(var2)
    setVar2(var1)
  }, [var1, var2])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid || !var1 || !var2) return

    onComplete({
      variables: [var1, var2]
    })
  }, [validation.isValid, var1, var2, onComplete])

  if (!analysis) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Cannot analyze data</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
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
            disabled={!validation.isValid}
            className="gap-2"
            data-testid="run-analysis-btn"
          >
            분석 시작
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variable 1 (Before/Time 1) */}
        <Card>
          <CardHeader className="pb-3 bg-info-bg">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{displayLabels.first}</CardTitle>
              <span className="text-destructive">*</span>
              {var1 && <Badge variant="secondary" className="ml-auto">{var1}</Badge>}
            </div>
            <CardDescription className="text-xs">
              First measurement
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {numericColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleVar1(col.name)}
                  disabled={col.name === var2}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 transition-all text-left',
                    'flex items-center justify-between',
                    var1 === col.name
                      ? 'border-info-border bg-info-bg'
                      : 'border-border hover:border-info-border/50',
                    col.name === var2 && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div>
                    <span className="font-medium block">{col.name}</span>
                    {col.statistics && col.statistics.mean !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        Mean: {col.statistics.mean.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {var1 === col.name && (
                    <CheckCircle2 className="h-4 w-4 text-info" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Variable 2 (After/Time 2) */}
        <Card>
          <CardHeader className="pb-3 bg-highlight-bg">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{displayLabels.second}</CardTitle>
              <span className="text-destructive">*</span>
              {var2 && <Badge variant="secondary" className="ml-auto">{var2}</Badge>}
            </div>
            <CardDescription className="text-xs">
              Second measurement
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {numericColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleVar2(col.name)}
                  disabled={col.name === var1}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 transition-all text-left',
                    'flex items-center justify-between',
                    var2 === col.name
                      ? 'border-highlight-border bg-highlight-bg'
                      : 'border-border hover:border-highlight-border/50',
                    col.name === var1 && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div>
                    <span className="font-medium block">{col.name}</span>
                    {col.statistics && col.statistics.mean !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        Mean: {col.statistics.mean.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {var2 === col.name && (
                    <CheckCircle2 className="h-4 w-4 text-highlight" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Summary */}
      {(var1 || var2) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <Badge variant="secondary">{var1 || '?'}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={swapVariables}
                disabled={!var1 || !var2}
                className="gap-1"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Swap
              </Button>
              <Badge variant="secondary">{var2 || '?'}</Badge>
            </div>
            {var1 && var2 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Testing: {var2} - {var1} (difference)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Feedback */}
      {validation.isValid ? (
        <Alert className="bg-success-bg border-success-border">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            {t.success.allVariablesSelected}
          </AlertDescription>
        </Alert>
      ) : validation.errors.length > 0 && (var1 || var2) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.errors[0]}</AlertDescription>
        </Alert>
      )}


    </div>
  )
}
