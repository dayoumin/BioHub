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
import { useTerminology } from '@/hooks/use-terminology'

interface GroupComparisonSelectorProps extends VariableSelectorProps {
  /** Require exactly 2 groups (for t-test) */
  requireTwoGroups?: boolean
  /** Method name for display */
  methodName?: string
  /** Show covariate selector (ANCOVA) */
  showCovariate?: boolean
}

export function GroupComparisonSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title,
  description,
  className,
  requireTwoGroups = false,
  methodName,
  showCovariate = false
}: GroupComparisonSelectorProps) {
  // Terminology
  const t = useTerminology()

  // Use terminology defaults if not provided
  const displayTitle = title ?? t.selectorUI.titles.groupComparison
  const displayDescription = description ?? t.selectorUI.descriptions.groupComparison

  // State
  const [groupVar, setGroupVar] = useState<string | null>(
    initialSelection?.groupVar || null
  )
  const [dependentVar, setDependentVar] = useState<string | null>(
    typeof initialSelection?.dependentVar === 'string' ? initialSelection.dependentVar : null
  )
  const [covariates, setCovariates] = useState<string[]>(() => {
    const c = initialSelection?.covariate
    if (!c) return []
    return Array.isArray(c) ? c : [c]
  })

  // Sync state when initialSelection changes (e.g., from detectedVariables)
  useEffect(() => {
    if (initialSelection?.groupVar) {
      setGroupVar(initialSelection.groupVar)
    }
    if (typeof initialSelection?.dependentVar === 'string') {
      setDependentVar(initialSelection.dependentVar)
    }
    if (initialSelection?.covariate) {
      const c = initialSelection.covariate
      setCovariates(Array.isArray(c) ? c : [c])
    }
  }, [initialSelection?.groupVar, initialSelection?.dependentVar, initialSelection?.covariate])

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
      errors.push(t.validation.groupRequired)
    } else if (requireTwoGroups && selectedGroupCount !== 2) {
      errors.push(t.validation.twoGroupsRequired(selectedGroupCount))
    }

    if (!dependentVar) {
      errors.push(t.validation.dependentRequired)
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

  const toggleCovariate = useCallback((name: string) => {
    setCovariates(prev =>
      prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]
    )
  }, [])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid || !groupVar || !dependentVar) return

    onComplete({
      groupVar,
      dependentVar,
      ...(covariates.length > 0 && { covariate: covariates })
    })
  }, [validation.isValid, groupVar, dependentVar, covariates, onComplete])

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
              <h2 className="text-xl font-semibold">{displayTitle}</h2>
              {methodName && <Badge variant="outline">{methodName}</Badge>}
            </div>
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
        {/* Group Variable */}
        <Card>
          <CardHeader className="pb-3 bg-success-bg">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t.variables.group.title}</CardTitle>
              <span className="text-destructive">*</span>
              {groupVar && (
                <Badge variant="secondary" className="ml-auto">
                  {groupVar} ({selectedGroupCount} {t.selectorUI.labels.groups})
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {t.variables.group.description}
              {requireTwoGroups && ` - ${t.validation.twoGroupsRequired(2).split('(')[0].trim()}`}
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
                        ? 'border-success-border bg-success-bg'
                        : 'border-border hover:border-success-border/50',
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
                        <Badge variant="default" className="text-xs bg-success">
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

        {/* Dependent Variable */}
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
                  disabled={col.name === groupVar}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 transition-all text-left',
                    'flex items-center justify-between',
                    dependentVar === col.name
                      ? 'border-info-border bg-info-bg'
                      : 'border-border hover:border-info-border/50',
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

      {/* Covariate Selection (ANCOVA only) */}
      {showCovariate && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">공변량 (Covariate)</CardTitle>
              <span className="text-muted-foreground text-xs">(선택사항)</span>
              {covariates.length > 0 && (
                <Badge variant="outline" className="ml-auto">{covariates.length}개 선택</Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              ANCOVA에서 통제할 연속형 공변량을 선택하세요 (복수 선택 가능)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {numericColumns
                .filter(col => col.name !== groupVar && col.name !== dependentVar)
                .map(col => (
                  <button
                    key={col.name}
                    onClick={() => toggleCovariate(col.name)}
                    className={cn(
                      'p-2 rounded-lg border-2 transition-all text-left text-sm',
                      covariates.includes(col.name)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="font-medium block truncate">{col.name}</span>
                    <span className="text-xs text-muted-foreground">numeric</span>
                  </button>
                ))}
              {numericColumns.filter(col => col.name !== groupVar && col.name !== dependentVar).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full py-2">
                  사용 가능한 공변량이 없습니다
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
        <Alert className="bg-success-bg border-success-border">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            {t.success.allVariablesSelected}
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
