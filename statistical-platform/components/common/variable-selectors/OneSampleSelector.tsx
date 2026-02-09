'use client'

/**
 * OneSampleSelector - One-Sample Test Variable Selector
 *
 * For: One-sample t-test
 *
 * Required:
 * - 1 numeric test variable
 * - 1 test value (μ₀, default: 0)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import type { VariableSelectorProps } from './types'

interface OneSampleSelectorProps extends VariableSelectorProps {
  /** Default test value */
  defaultTestValue?: number
}

export function OneSampleSelector({
  data,
  onComplete,
  onBack,
  initialSelection,
  title = '일표본 t-검정 변수 선택',
  description = '검정할 변수와 기준값(μ₀)을 입력하세요',
  className,
  defaultTestValue = 0
}: OneSampleSelectorProps) {
  const [selectedVar, setSelectedVar] = useState<string | null>(
    typeof initialSelection?.dependentVar === 'string' ? initialSelection.dependentVar : null
  )
  const [testValue, setTestValue] = useState<string>(
    String(defaultTestValue)
  )

  useEffect(() => {
    if (typeof initialSelection?.dependentVar === 'string') {
      setSelectedVar(initialSelection.dependentVar)
    }
  }, [initialSelection?.dependentVar])

  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null
    if (!Array.isArray(data)) return null
    if (!isRecord(data[0])) return null
    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  const numericColumns = useMemo(() => {
    if (!analysis) return []
    return analysis.columns.filter(
      col => col.type === 'continuous' && !col.idDetection?.isId
    )
  }, [analysis])

  // Selected variable stats
  const selectedStats = useMemo(() => {
    if (!selectedVar || !data || data.length === 0) return null
    const values = data
      .map(row => Number((row as Record<string, unknown>)[selectedVar]))
      .filter(v => !isNaN(v))
    if (values.length === 0) return null
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
    return { n: values.length, mean, std }
  }, [selectedVar, data])

  const parsedTestValue = Number(testValue)
  const isTestValueValid = testValue.trim() !== '' && !isNaN(parsedTestValue)

  const validation = useMemo(() => {
    const errors: string[] = []
    if (!selectedVar) errors.push('검정 변수를 선택하세요')
    if (!isTestValueValid) errors.push('유효한 기준값을 입력하세요')
    return { isValid: errors.length === 0, errors }
  }, [selectedVar, isTestValueValid])

  const handleSubmit = useCallback(() => {
    if (!validation.isValid || !selectedVar) return
    onComplete({
      dependentVar: selectedVar,
      testValue: String(parsedTestValue)
    })
  }, [validation.isValid, selectedVar, parsedTestValue, onComplete])

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
      {/* Test Variable Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variable Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">검정 변수 (수치형)</Label>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map(col => (
                <Badge
                  key={col.name}
                  variant={selectedVar === col.name ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all px-3 py-1.5',
                    selectedVar === col.name
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedVar(prev => prev === col.name ? null : col.name)}
                >
                  {col.name}
                  {selectedVar === col.name && <CheckCircle2 className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
              {numericColumns.length === 0 && (
                <p className="text-sm text-muted-foreground">수치형 변수가 없습니다</p>
              )}
            </div>
          </div>

          {/* Selected Variable Stats */}
          {selectedStats && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium">{selectedVar}</p>
              <p className="text-muted-foreground">
                n = {selectedStats.n}, 평균 = {selectedStats.mean.toFixed(2)}, SD = {selectedStats.std.toFixed(2)}
              </p>
            </div>
          )}

          {/* Test Value Input */}
          <div className="space-y-2">
            <Label htmlFor="test-value" className="text-sm font-medium">
              기준값 μ₀ (모집단 평균 가설)
            </Label>
            <Input
              id="test-value"
              type="number"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="0"
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              H₀: μ = {isTestValueValid ? parsedTestValue : '?'} vs H₁: μ ≠ {isTestValueValid ? parsedTestValue : '?'}
            </p>
          </div>

          {/* Validation Errors */}
          {!validation.isValid && validation.errors.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {validation.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            이전
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!validation.isValid}
          className="ml-auto"
          data-testid="run-analysis-btn"
        >
          분석 시작
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
