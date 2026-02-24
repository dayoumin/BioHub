'use client'

/**
 * MultipleRegressionSelector - Multiple Regression Variable Selector
 *
 * Required variables:
 * - 1 numeric dependent variable (Y)
 * - 1+ numeric independent variables (X1, X2, ...)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, LineChart, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'
import { useTerminology } from '@/hooks/use-terminology'

interface MultipleRegressionSelectorProps extends VariableSelectorProps {
  /** Minimum number of independent variables (default: 1) */
  minIndependent?: number
  /** Maximum number of independent variables (default: 10) */
  maxIndependent?: number
}

export function MultipleRegressionSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title,
  description,
  className,
  minIndependent = 1,
  maxIndependent = 10
}: MultipleRegressionSelectorProps) {
  // Terminology
  const t = useTerminology()
  const displayTitle = title ?? t.selectorUI.titles.multipleRegression
  const displayDescription = description ?? t.selectorUI.descriptions.multipleRegression

  // State
  const [dependentVar, setDependentVar] = useState<string | null>(
    typeof initialSelection?.dependentVar === 'string' ? initialSelection.dependentVar : null
  )
  const [independentVars, setIndependentVars] = useState<string[]>(
    Array.isArray(initialSelection?.independentVar)
      ? initialSelection.independentVar
      : initialSelection?.independentVar
        ? [initialSelection.independentVar]
        : []
  )

  // Sync state when initialSelection changes (e.g., from detectedVariables)
  useEffect(() => {
    if (typeof initialSelection?.dependentVar === 'string') {
      setDependentVar(initialSelection.dependentVar)
    }
    if (initialSelection?.independentVar) {
      const newIndependent = Array.isArray(initialSelection.independentVar)
        ? initialSelection.independentVar
        : typeof initialSelection.independentVar === 'string'
          ? initialSelection.independentVar.split(',').filter(Boolean)
          : []
      if (newIndependent.length > 0) {
        setIndependentVars(newIndependent)
      }
    }
  }, [initialSelection?.dependentVar, initialSelection?.independentVar])

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

    if (!dependentVar) {
      errors.push(t.validation.dependentRequired)
    }
    if (independentVars.length < minIndependent) {
      errors.push(t.validation.independentRequired)
    }
    if (independentVars.length > maxIndependent) {
      errors.push(t.validation.maxVariablesExceeded(maxIndependent))
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [dependentVar, independentVars, minIndependent, maxIndependent, t])

  // Toggle dependent
  const toggleDependent = useCallback((name: string) => {
    setDependentVar(prev => prev === name ? null : name)
    // Remove from independent if selected as dependent
    setIndependentVars(prev => prev.filter(v => v !== name))
  }, [])

  // Toggle independent
  const toggleIndependent = useCallback((name: string) => {
    if (name === dependentVar) return

    setIndependentVars(prev => {
      if (prev.includes(name)) {
        return prev.filter(v => v !== name)
      }
      if (prev.length >= maxIndependent) return prev
      return [...prev, name]
    })
  }, [dependentVar, maxIndependent])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid || !dependentVar) return

    onComplete({
      dependentVar,
      independentVar: independentVars.length === 1 ? independentVars[0] : independentVars
    })
  }, [validation.isValid, dependentVar, independentVars, onComplete])

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
          <LineChart className="h-5 w-5 text-primary" />
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
        {/* Dependent Variable (Y) */}
        <Card>
          <CardHeader className="pb-3 bg-info-bg">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t.variables.dependent.title}</CardTitle>
              <span className="text-destructive">*</span>
              {dependentVar && <Badge variant="default" className="ml-auto">{dependentVar}</Badge>}
            </div>
            <CardDescription className="text-xs">
              {t.variables.dependent.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {numericColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleDependent(col.name)}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 transition-all text-left',
                    'flex items-center justify-between',
                    dependentVar === col.name
                      ? 'border-info-border bg-info-bg'
                      : 'border-border hover:border-info-border/50'
                  )}
                >
                  <div>
                    <span className="font-medium block">{col.name}</span>
                    {col.statistics && (
                      <span className="text-xs text-muted-foreground">
                        {col.statistics.mean !== undefined
                          ? `Mean: ${col.statistics.mean.toFixed(2)}`
                          : 'numeric'}
                      </span>
                    )}
                  </div>
                  {dependentVar === col.name && (
                    <CheckCircle2 className="h-4 w-4 text-info" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Independent Variables (X) */}
        <Card>
          <CardHeader className="pb-3 bg-success-bg">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t.variables.independent.title}</CardTitle>
              <span className="text-destructive">*</span>
              <Badge variant="outline" className="ml-auto">
                {independentVars.length} / {maxIndependent}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {t.variables.independent.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {numericColumns.map(col => {
                const isSelected = independentVars.includes(col.name)
                const isDisabled = col.name === dependentVar
                const index = independentVars.indexOf(col.name)

                return (
                  <button
                    key={col.name}
                    onClick={() => toggleIndependent(col.name)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 transition-all text-left',
                      'flex items-center justify-between',
                      isSelected
                        ? 'border-success-border bg-success-bg'
                        : 'border-border hover:border-success-border/50',
                      isDisabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div>
                      <span className="font-medium block">{col.name}</span>
                      {col.statistics && (
                        <span className="text-xs text-muted-foreground">
                          {col.statistics.mean !== undefined
                            ? `Mean: ${col.statistics.mean.toFixed(2)}`
                            : 'numeric'}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Summary */}
      {(dependentVar || independentVars.length > 0) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Model:</span>
              <Badge variant="default">{dependentVar || 'Y'}</Badge>
              <span>=</span>
              {independentVars.length > 0 ? (
                independentVars.map((v, i) => (
                  <React.Fragment key={v}>
                    {i > 0 && <span>+</span>}
                    <Badge
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-secondary/80"
                      onClick={() => toggleIndependent(v)}
                    >
                      {v}
                      <X className="h-3 w-3" />
                    </Badge>
                  </React.Fragment>
                ))
              ) : (
                <span className="text-muted-foreground">X1 + X2 + ...</span>
              )}
            </div>
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
      ) : validation.errors.length > 0 && (dependentVar || independentVars.length > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.errors[0]}</AlertDescription>
        </Alert>
      )}


    </div>
  )
}
