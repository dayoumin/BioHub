'use client'

/**
 * CorrelationSelector - Correlation Analysis Variable Selector
 *
 * Required variables:
 * - 2+ numeric variables for correlation analysis
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, TrendingUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'
import { useTerminology } from '@/hooks/use-terminology'

interface CorrelationSelectorProps extends VariableSelectorProps {
  /** Minimum number of variables required (default: 2) */
  minVariables?: number
  /** Maximum number of variables allowed (default: 10) */
  maxVariables?: number
}

export function CorrelationSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title,
  description,
  className,
  minVariables = 2,
  maxVariables = 10
}: CorrelationSelectorProps) {
  // Terminology
  const t = useTerminology()
  const displayTitle = title ?? t.selectorUI.titles.correlation
  const displayDescription = description ?? t.selectorUI.descriptions.correlation

  // State - array of selected variables
  const [selectedVars, setSelectedVars] = useState<string[]>(
    initialSelection?.variables || []
  )

  // Sync state when initialSelection changes (e.g., from detectedVariables)
  useEffect(() => {
    if (initialSelection?.variables && initialSelection.variables.length > 0) {
      setSelectedVars(initialSelection.variables)
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

    if (selectedVars.length < minVariables) {
      errors.push(t.validation.minVariablesRequired(minVariables))
    }
    if (selectedVars.length > maxVariables) {
      errors.push(t.validation.maxVariablesExceeded(maxVariables))
    }

    return {
      isValid: errors.length === 0 && selectedVars.length >= minVariables,
      errors
    }
  }, [selectedVars, minVariables, maxVariables, t])

  // Toggle variable selection
  const toggleVariable = useCallback((name: string) => {
    setSelectedVars(prev => {
      if (prev.includes(name)) {
        return prev.filter(v => v !== name)
      }
      if (prev.length >= maxVariables) {
        return prev
      }
      return [...prev, name]
    })
  }, [maxVariables])

  // Select all
  const selectAll = useCallback(() => {
    const allNames = numericColumns.slice(0, maxVariables).map(c => c.name)
    setSelectedVars(allNames)
  }, [numericColumns, maxVariables])

  // Clear all
  const clearAll = useCallback(() => {
    setSelectedVars([])
  }, [])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid) return

    onComplete({
      variables: selectedVars
    })
  }, [validation.isValid, selectedVars, onComplete])

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
          <TrendingUp className="h-5 w-5 text-primary" />
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

      {/* Variable Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Numeric Variables</CardTitle>
              <Badge variant="outline">
                {selectedVars.length} / {numericColumns.length} selected
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedVars.length === Math.min(numericColumns.length, maxVariables)}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={selectedVars.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Click to select/deselect variables for correlation matrix
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {numericColumns.map(col => {
              const isSelected = selectedVars.includes(col.name)
              const index = selectedVars.indexOf(col.name)

              return (
                <button
                  key={col.name}
                  onClick={() => toggleVariable(col.name)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-left',
                    'hover:shadow-md relative',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                  )}
                  <span className="font-medium block truncate pr-6">{col.name}</span>
                  {col.statistics && (
                    <span className="text-xs text-muted-foreground block mt-1">
                      {col.statistics.min !== undefined && col.statistics.max !== undefined
                        ? `${col.statistics.min.toFixed(1)} ~ ${col.statistics.max.toFixed(1)}`
                        : 'numeric'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {numericColumns.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No numeric variables found in the data
            </p>
          )}

          {numericColumns.length > 0 && numericColumns.length < minVariables && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                At least {minVariables} numeric variables are required for correlation analysis.
                Only {numericColumns.length} found.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Selected Variables Summary */}
      {selectedVars.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Selected:</span>
              <div className="flex flex-wrap gap-1">
                {selectedVars.map(name => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleVariable(name)}
                  >
                    {name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Will generate {selectedVars.length * (selectedVars.length - 1) / 2} correlation pairs
            </p>
          </CardContent>
        </Card>
      )}

      {/* Validation Feedback */}
      {validation.isValid ? (
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            {t.success.allVariablesSelected}
          </AlertDescription>
        </Alert>
      ) : selectedVars.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.errors[0]}</AlertDescription>
        </Alert>
      )}


    </div>
  )
}
