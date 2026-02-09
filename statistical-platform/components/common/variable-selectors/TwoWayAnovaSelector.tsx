'use client'

/**
 * TwoWayAnovaSelector - Two-way ANOVA Variable Selector
 *
 * Required variables:
 * - 2 categorical factors (groupVar as "factor1,factor2")
 * - 1 numeric dependent variable
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'

export function TwoWayAnovaSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title = 'Two-way ANOVA Variable Selection',
  description = 'Select 2 categorical factors and 1 dependent variable',
  className
}: VariableSelectorProps) {
  // Parse initial factors if provided
  const initialFactors = useMemo(() => {
    if (initialSelection?.groupVar) {
      const parts = initialSelection.groupVar.split(',')
      return { factor1: parts[0] || null, factor2: parts[1] || null }
    }
    return { factor1: null, factor2: null }
  }, [initialSelection])

  // State
  const [factor1, setFactor1] = useState<string | null>(initialFactors.factor1)
  const [factor2, setFactor2] = useState<string | null>(initialFactors.factor2)
  const [dependentVar, setDependentVar] = useState<string | null>(
    typeof initialSelection?.dependentVar === 'string' ? initialSelection.dependentVar : null
  )

  // Sync state when initialSelection changes (e.g., from detectedVariables)
  useEffect(() => {
    if (initialSelection?.groupVar) {
      const parts = initialSelection.groupVar.split(',')
      if (parts[0]) setFactor1(parts[0])
      if (parts[1]) setFactor2(parts[1])
    }
    if (typeof initialSelection?.dependentVar === 'string') {
      setDependentVar(initialSelection.dependentVar)
    }
  }, [initialSelection?.groupVar, initialSelection?.dependentVar])

  // Data analysis
  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null
    if (!Array.isArray(data)) return null
    if (!isRecord(data[0])) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // Separate numeric and categorical columns
  const { numericColumns, categoricalColumns } = useMemo(() => {
    if (!analysis) return { numericColumns: [], categoricalColumns: [] }

    const numeric = analysis.columns.filter(
      col => col.type === 'continuous' && !col.idDetection?.isId
    )
    // For factor variables: categorical/binary/ordinal or continuous with few unique values
    const categorical = analysis.columns.filter(
      col => (['categorical', 'binary', 'ordinal'].includes(col.type) || (col.type === 'continuous' && (col.uniqueCount ?? 0) <= 10)) && !col.idDetection?.isId
    )

    return { numericColumns: numeric, categoricalColumns: categorical }
  }, [analysis])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []

    if (!factor1) errors.push('Factor 1 is required')
    if (!factor2) errors.push('Factor 2 is required')
    if (factor1 && factor2 && factor1 === factor2) errors.push('Factor 1 and Factor 2 must be different')
    if (!dependentVar) errors.push('Dependent variable is required')

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [factor1, factor2, dependentVar])

  // Toggle handlers
  const toggleFactor1 = useCallback((name: string) => {
    setFactor1(prev => prev === name ? null : name)
  }, [])

  const toggleFactor2 = useCallback((name: string) => {
    setFactor2(prev => prev === name ? null : name)
  }, [])

  const toggleDependent = useCallback((name: string) => {
    setDependentVar(prev => prev === name ? null : name)
  }, [])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid || !factor1 || !factor2 || !dependentVar) return

    onComplete({
      groupVar: `${factor1},${factor2}`,
      dependentVar: dependentVar
    })
  }, [validation.isValid, factor1, factor2, dependentVar, onComplete])

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
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
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

      {/* Factor Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Factor 1 */}
        <Card>
          <CardHeader className="pb-3 bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Factor 1</CardTitle>
              <span className="text-destructive">*</span>
              {factor1 && <Badge variant="secondary" className="ml-auto">{factor1}</Badge>}
            </div>
            <CardDescription className="text-xs">
              First categorical factor (e.g., Gender)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {categoricalColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleFactor1(col.name)}
                  disabled={col.name === factor2 || col.name === dependentVar}
                  className={cn(
                    'w-full p-2 rounded-lg border-2 transition-all text-left text-sm',
                    'flex items-center justify-between',
                    factor1 === col.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                      : 'border-border hover:border-blue-300',
                    (col.name === factor2 || col.name === dependentVar) && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="font-medium">{col.name}</span>
                  <Badge variant="outline" className="text-xs">{col.uniqueCount} levels</Badge>
                </button>
              ))}
              {categoricalColumns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No categorical variables found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Factor 2 */}
        <Card>
          <CardHeader className="pb-3 bg-purple-50 dark:bg-purple-950/30">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Factor 2</CardTitle>
              <span className="text-destructive">*</span>
              {factor2 && <Badge variant="secondary" className="ml-auto">{factor2}</Badge>}
            </div>
            <CardDescription className="text-xs">
              Second categorical factor (e.g., Treatment)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {categoricalColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleFactor2(col.name)}
                  disabled={col.name === factor1 || col.name === dependentVar}
                  className={cn(
                    'w-full p-2 rounded-lg border-2 transition-all text-left text-sm',
                    'flex items-center justify-between',
                    factor2 === col.name
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50'
                      : 'border-border hover:border-purple-300',
                    (col.name === factor1 || col.name === dependentVar) && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="font-medium">{col.name}</span>
                  <Badge variant="outline" className="text-xs">{col.uniqueCount} levels</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 종속 변수 */}
      <Card>
        <CardHeader className="pb-3 bg-green-50 dark:bg-green-950/30">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">종속 변수 (Y)</CardTitle>
            <span className="text-destructive">*</span>
            {dependentVar && <Badge variant="default" className="ml-auto">{dependentVar}</Badge>}
          </div>
          <CardDescription className="text-xs">
            Numeric outcome variable to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {numericColumns.map(col => (
              <button
                key={col.name}
                onClick={() => toggleDependent(col.name)}
                disabled={col.name === factor1 || col.name === factor2}
                className={cn(
                  'p-2 rounded-lg border-2 transition-all text-left text-sm',
                  dependentVar === col.name
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/50'
                    : 'border-border hover:border-green-300',
                  (col.name === factor1 || col.name === factor2) && 'opacity-40 cursor-not-allowed'
                )}
              >
                <span className="font-medium block truncate">{col.name}</span>
                <span className="text-xs text-muted-foreground">numeric</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selection Summary */}
      {(factor1 || factor2 || dependentVar) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Model:</span>
              <Badge variant="secondary">{dependentVar || '?'}</Badge>
              <span>=</span>
              <Badge variant="outline">{factor1 || '?'}</Badge>
              <span>+</span>
              <Badge variant="outline">{factor2 || '?'}</Badge>
              <span>+</span>
              <Badge variant="outline">{factor1 && factor2 ? `${factor1}*${factor2}` : '?'}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Feedback */}
      {validation.isValid ? (
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            All variables selected. Ready for analysis.
          </AlertDescription>
        </Alert>
      ) : validation.errors.length > 0 && (factor1 || factor2 || dependentVar) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.errors[0]}</AlertDescription>
        </Alert>
      )}


    </div>
  )
}
