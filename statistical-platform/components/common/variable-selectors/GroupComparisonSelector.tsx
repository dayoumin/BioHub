'use client'

/**
 * GroupComparisonSelector - Group Comparison Variable Selector
 *
 * For: t-test (independent), One-way ANOVA, Mann-Whitney U, Kruskal-Wallis
 *
 * Required variables:
 * - 1 categorical group variable
 * - 1 numeric dependent variable
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'

interface GroupComparisonSelectorProps extends VariableSelectorProps {
  /** Require exactly 2 groups (for t-test) */
  requireTwoGroups?: boolean
  /** Method name for display */
  methodName?: string
}

export function GroupComparisonSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title = 'Group Comparison Variable Selection',
  description = 'Select a group variable and a dependent variable to compare',
  className,
  requireTwoGroups = false,
  methodName
}: GroupComparisonSelectorProps) {
  // State
  const [groupVar, setGroupVar] = useState<string | null>(
    initialSelection?.groupVar || null
  )
  const [dependentVar, setDependentVar] = useState<string | null>(
    typeof initialSelection?.dependentVar === 'string' ? initialSelection.dependentVar : null
  )

  // Sync state when initialSelection changes (e.g., from detectedVariables)
  useEffect(() => {
    if (initialSelection?.groupVar) {
      setGroupVar(initialSelection.groupVar)
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

  // Separate columns
  const { numericColumns, categoricalColumns } = useMemo(() => {
    if (!analysis) return { numericColumns: [], categoricalColumns: [] }

    const numeric = analysis.columns.filter(
      col => col.type === 'continuous' && !col.idDetection?.isId
    )
    // For group variable: categorical/binary/ordinal or continuous with few unique values
    const categorical = analysis.columns.filter(
      col => (['categorical', 'binary', 'ordinal'].includes(col.type) || (col.type === 'continuous' && (col.uniqueCount ?? 0) <= 20)) && !col.idDetection?.isId
    )

    return { numericColumns: numeric, categoricalColumns: categorical }
  }, [analysis])

  // Get group count for selected variable
  const selectedGroupCount = useMemo(() => {
    if (!groupVar) return 0
    const col = categoricalColumns.find(c => c.name === groupVar)
    return col?.uniqueCount || 0
  }, [groupVar, categoricalColumns])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []

    if (!groupVar) {
      errors.push('Group variable is required')
    } else if (requireTwoGroups && selectedGroupCount !== 2) {
      errors.push(`t-test requires exactly 2 groups (found ${selectedGroupCount})`)
    }

    if (!dependentVar) {
      errors.push('Dependent variable is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [groupVar, dependentVar, requireTwoGroups, selectedGroupCount])

  // Toggle handlers
  const toggleGroup = useCallback((name: string) => {
    setGroupVar(prev => prev === name ? null : name)
  }, [])

  const toggleDependent = useCallback((name: string) => {
    setDependentVar(prev => prev === name ? null : name)
  }, [])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid || !groupVar || !dependentVar) return

    onComplete({
      groupVar,
      dependentVar
    })
  }, [validation.isValid, groupVar, dependentVar, onComplete])

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
          <Users className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{title}</h2>
              {methodName && <Badge variant="outline">{methodName}</Badge>}
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 집단 변수 */}
        <Card>
          <CardHeader className="pb-3 bg-orange-50 dark:bg-orange-950/30">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">집단 변수</CardTitle>
              <span className="text-destructive">*</span>
              {groupVar && (
                <Badge variant="secondary" className="ml-auto">
                  {groupVar} ({selectedGroupCount} groups)
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Categorical variable defining groups to compare
              {requireTwoGroups && ' (must have exactly 2 groups)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {categoricalColumns.map(col => {
                const isTwoGroups = col.uniqueCount === 2
                const isWarning = requireTwoGroups && col.uniqueCount !== 2

                return (
                  <button
                    key={col.name}
                    onClick={() => toggleGroup(col.name)}
                    disabled={col.name === dependentVar}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 transition-all text-left',
                      'flex items-center justify-between',
                      groupVar === col.name
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/50'
                        : 'border-border hover:border-orange-300',
                      col.name === dependentVar && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div>
                      <span className="font-medium block">{col.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {col.uniqueCount} unique values
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTwoGroups && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          2 groups
                        </Badge>
                      )}
                      {isWarning && groupVar === col.name && (
                        <Badge variant="destructive" className="text-xs">
                          t-test needs 2
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
              {categoricalColumns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No categorical variables found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 종속 변수 */}
        <Card>
          <CardHeader className="pb-3 bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">종속 변수 (Y)</CardTitle>
              <span className="text-destructive">*</span>
              {dependentVar && <Badge variant="default" className="ml-auto">{dependentVar}</Badge>}
            </div>
            <CardDescription className="text-xs">
              Numeric variable to compare across groups
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {numericColumns.map(col => (
                <button
                  key={col.name}
                  onClick={() => toggleDependent(col.name)}
                  disabled={col.name === groupVar}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 transition-all text-left',
                    'flex items-center justify-between',
                    dependentVar === col.name
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/50'
                      : 'border-border hover:border-green-300',
                    col.name === groupVar && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div>
                    <span className="font-medium block">{col.name}</span>
                    {col.statistics && (
                      <span className="text-xs text-muted-foreground">
                        {col.statistics.min !== undefined && col.statistics.max !== undefined
                          ? `Range: ${col.statistics.min.toFixed(1)} ~ ${col.statistics.max.toFixed(1)}`
                          : 'numeric'}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">numeric</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Summary */}
      {(groupVar || dependentVar) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Compare:</span>
              <Badge variant="secondary">{dependentVar || '?'}</Badge>
              <span>across</span>
              <Badge variant="outline">
                {groupVar ? `${groupVar} (${selectedGroupCount} groups)` : '?'}
              </Badge>
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
      ) : validation.errors.length > 0 && (groupVar || dependentVar) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.errors[0]}</AlertDescription>
        </Alert>
      )}


    </div>
  )
}
