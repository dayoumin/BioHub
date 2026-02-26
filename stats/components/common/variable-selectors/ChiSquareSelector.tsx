'use client'

/**
 * ChiSquareSelector - Chi-square / Categorical Variable Selector
 *
 * Modes (derived from methodId):
 * - 'independence': 2 categorical vars — chi-square, chi-square-independence, mcnemar
 * - 'goodness':    1 categorical var  — chi-square-goodness, proportion-test
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'

interface ChiSquareSelectorProps extends VariableSelectorProps {
  /** Statistical method ID — used to derive mode */
  methodId?: string
}

const GOODNESS_IDS = new Set(['chi-square-goodness', 'proportion-test'])
const BINARY_ONLY_IDS = new Set(['mcnemar', 'proportion-test'])

export function ChiSquareSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title,
  description,
  className,
  methodId
}: ChiSquareSelectorProps) {
  const mode = GOODNESS_IDS.has(methodId ?? '') ? 'goodness' : 'independence'

  const displayTitle =
    title ?? (mode === 'independence' ? '범주형 독립성 검정' : '적합도 검정')
  const displayDescription =
    description ?? (
      mode === 'independence'
        ? '두 범주형 변수 간의 관계를 검정합니다'
        : '관측 빈도와 기대 빈도의 일치 여부를 검정합니다'
    )

  // independentVar / dependentVar can be string | string[] — take first element if array
  const toSingleVar = (v: string | string[] | undefined): string | null => {
    if (!v) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
  }

  // State
  const [rowVar, setRowVar] = useState<string | null>(
    toSingleVar(initialSelection?.independentVar)
  )
  const [colVar, setColVar] = useState<string | null>(
    toSingleVar(initialSelection?.dependentVar)
  )
  // proportion-test 전용: 귀무가설 비율 p₀ (0.01 ~ 0.99)
  const [nullProportion, setNullProportion] = useState<string>('0.5')

  useEffect(() => {
    const iv = toSingleVar(initialSelection?.independentVar)
    const dv = toSingleVar(initialSelection?.dependentVar)
    if (iv) setRowVar(iv)
    if (dv) setColVar(dv)
  }, [initialSelection?.independentVar, initialSelection?.dependentVar])

  // Data analysis
  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null
    if (!Array.isArray(data)) return null
    if (!isRecord(data[0])) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // Categorical columns — binary-only filter for mcnemar/proportion-test
  const requireBinary = BINARY_ONLY_IDS.has(methodId ?? '')
  const categoricalColumns = useMemo(() => {
    if (!analysis) return []
    return analysis.columns.filter(
      col =>
        ['categorical', 'binary', 'ordinal'].includes(col.type) &&
        !col.idDetection?.isId &&
        (!requireBinary || col.uniqueCount === 2)
    )
  }, [analysis, requireBinary])

  // proportion-test nullProportion 입력 핸들러
  const handleNullProportionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNullProportion(e.target.value)
  }, [])

  // nullProportion 파싱 결과
  const nullProportionNum = useMemo(() => {
    const v = parseFloat(nullProportion)
    return isNaN(v) ? null : v
  }, [nullProportion])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []
    if (mode === 'independence') {
      if (!rowVar) errors.push('행 변수(Row)를 선택하세요')
      if (!colVar) errors.push('열 변수(Column)를 선택하세요')
      if (rowVar && colVar && rowVar === colVar) errors.push('서로 다른 변수를 선택하세요')
    } else {
      if (!colVar) errors.push('검정 변수를 선택하세요')
      if (methodId === 'proportion-test') {
        if (nullProportionNum === null || nullProportionNum <= 0 || nullProportionNum >= 1) {
          errors.push('귀무가설 비율은 0 초과 1 미만이어야 합니다')
        }
      }
    }
    return { isValid: errors.length === 0, errors }
  }, [mode, rowVar, colVar, methodId, nullProportionNum])

  const toggleRow = useCallback((name: string) => {
    setRowVar(prev => (prev === name ? null : name))
  }, [])

  const toggleCol = useCallback((name: string) => {
    setColVar(prev => (prev === name ? null : name))
  }, [])

  const handleSubmit = useCallback(() => {
    if (!validation.isValid) return
    if (mode === 'independence') {
      onComplete({ independentVar: rowVar ?? undefined, dependentVar: colVar ?? undefined })
    } else {
      onComplete({
        dependentVar: colVar ?? undefined,
        // proportion-test: nullProportion을 string으로 전달 (VariableMapping index signature 준수)
        ...(methodId === 'proportion-test' && nullProportionNum !== null && {
          nullProportion: String(nullProportionNum)
        })
      })
    }
  }, [validation.isValid, mode, rowVar, colVar, methodId, nullProportionNum, onComplete])

  if (!analysis) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>데이터를 분석할 수 없습니다</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3X3 className="h-5 w-5 text-primary" />
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

      {mode === 'independence' ? (
        /* Independence / McNemar: 2 categorical variables */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Row Variable */}
          <Card>
            <CardHeader className="pb-3 bg-success-bg">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {methodId === 'mcnemar' ? '전(Before) 변수' : '행 변수 (Row)'}
                </CardTitle>
                <span className="text-destructive">*</span>
                {rowVar && <Badge variant="secondary" className="ml-auto">{rowVar}</Badge>}
              </div>
              <CardDescription className="text-xs">
                {methodId === 'mcnemar'
                  ? '전 측정의 범주형 변수'
                  : '첫 번째 범주형 변수'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {categoricalColumns.map(col => (
                  <button
                    key={col.name}
                    onClick={() => toggleRow(col.name)}
                    disabled={col.name === colVar}
                    className={cn(
                      'w-full p-2 rounded-lg border-2 transition-all text-left text-sm',
                      'flex items-center justify-between',
                      rowVar === col.name
                        ? 'border-success-border bg-success-bg'
                        : 'border-border hover:border-success-border/50',
                      col.name === colVar && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span className="font-medium">{col.name}</span>
                    <Badge variant="outline" className="text-xs">{col.uniqueCount} levels</Badge>
                  </button>
                ))}
                {categoricalColumns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    범주형 변수가 없습니다
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column Variable */}
          <Card>
            <CardHeader className="pb-3 bg-highlight-bg">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {methodId === 'mcnemar' ? '후(After) 변수' : '열 변수 (Column)'}
                </CardTitle>
                <span className="text-destructive">*</span>
                {colVar && <Badge variant="secondary" className="ml-auto">{colVar}</Badge>}
              </div>
              <CardDescription className="text-xs">
                {methodId === 'mcnemar'
                  ? '후 측정의 범주형 변수'
                  : '두 번째 범주형 변수'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {categoricalColumns.map(col => (
                  <button
                    key={col.name}
                    onClick={() => toggleCol(col.name)}
                    disabled={col.name === rowVar}
                    className={cn(
                      'w-full p-2 rounded-lg border-2 transition-all text-left text-sm',
                      'flex items-center justify-between',
                      colVar === col.name
                        ? 'border-highlight-border bg-highlight-bg'
                        : 'border-border hover:border-highlight-border/50',
                      col.name === rowVar && 'opacity-40 cursor-not-allowed'
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
      ) : (
        /* Goodness / Proportion: single variable */
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 bg-info-bg">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">검정 변수</CardTitle>
                <span className="text-destructive">*</span>
                {colVar && <Badge variant="default" className="ml-auto">{colVar}</Badge>}
              </div>
              <CardDescription className="text-xs">
                {methodId === 'proportion-test'
                  ? '이진(Binary) 범주형 변수를 선택하세요'
                  : '관측 빈도를 검정할 범주형 변수를 선택하세요'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {categoricalColumns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {requireBinary
                    ? '이진(2-레벨) 범주형 변수가 없습니다'
                    : '범주형 변수가 없습니다'}
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categoricalColumns.map(col => (
                    <button
                      key={col.name}
                      onClick={() => toggleCol(col.name)}
                      className={cn(
                        'p-2 rounded-lg border-2 transition-all text-left text-sm',
                        colVar === col.name
                          ? 'border-info-border bg-info-bg'
                          : 'border-border hover:border-info-border/50'
                      )}
                    >
                      <span className="font-medium block truncate">{col.name}</span>
                      <Badge variant="outline" className="text-xs mt-1">{col.uniqueCount} levels</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* proportion-test 전용: 귀무가설 비율 입력 */}
          {methodId === 'proportion-test' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">귀무가설 비율 (p₀)</CardTitle>
                <CardDescription className="text-xs">
                  검정할 기준 비율을 입력하세요 (0 초과 ~ 1 미만, 기본값: 0.5)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <Label htmlFor="null-proportion" className="text-sm text-muted-foreground whitespace-nowrap">
                    p₀ =
                  </Label>
                  <Input
                    id="null-proportion"
                    type="number"
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    value={nullProportion}
                    onChange={handleNullProportionChange}
                    className="w-28 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    예: 0.5 (50/50), 0.3 (30%)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Validation Feedback */}
      {validation.isValid ? (
        <Alert className="bg-success-bg border-success-border">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            변수 선택이 완료되었습니다
          </AlertDescription>
        </Alert>
      ) : validation.errors.length > 0 && (rowVar || colVar) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.errors[0]}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
