'use client'

/**
 * VariableSelectorSimple - 초간단 변수 선택 컴포넌트
 *
 * 디자인 철학:
 * - 드래그앤드롭 없음 (번거로움 제거)
 * - 할당 개념 없음 (사용자 혼란 제거)
 * - 버튼 클릭만으로 선택 (가장 직관적)
 * - 한 화면에 모든 정보 (스크롤 최소화)
 *
 * 사용 예:
 * ```tsx
 * <VariableSelectorSimple
 *   data={myData}
 *   onComplete={(selected) => {
 *     console.log('종속변수:', selected.dependent)
 *     console.log('독립변수:', selected.independent)
 *   }}
 * />
 * ```
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  analyzeDataset,
  DatasetAnalysis,
  ColumnAnalysis
} from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'

// Props 인터페이스
export interface VariableSelectorSimpleProps {
  data: Record<string, unknown>[]
  onComplete: (selection: {
    dependent: string | null
    independent: string | null
  }) => void
  onBack?: () => void
  title?: string
  description?: string
  className?: string
}

/**
 * 메인 컴포넌트
 */
export function VariableSelectorSimple({
  data,
  onComplete,
  onBack,
  title = '변수 선택',
  description = '분석에 사용할 변수를 선택하세요',
  className
}: VariableSelectorSimpleProps) {
  // 선택된 변수
  const [dependentVar, setDependentVar] = useState<string | null>(null)
  const [independentVar, setIndependentVar] = useState<string | null>(null)

  // 데이터 분석
  const analysis = useMemo<DatasetAnalysis | null>(() => {
    if (!data || data.length === 0) return null
    if (!Array.isArray(data)) return null
    if (!isRecord(data[0])) return null

    return analyzeDataset(data, { detectIdColumns: true })
  }, [data])

  // 검증
  const isValid = useMemo(() => {
    return dependentVar !== null && independentVar !== null
  }, [dependentVar, independentVar])

  // 제출
  const handleSubmit = useCallback(() => {
    if (!isValid) return
    onComplete({
      dependent: dependentVar,
      independent: independentVar
    })
  }, [isValid, dependentVar, independentVar, onComplete])

  // 렌더링
  if (!analysis) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          데이터를 분석할 수 없습니다. 올바른 데이터를 입력했는지 확인하세요.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 헤더 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>

      {/* 종속변수 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">종속변수 (Dependent Variable)</CardTitle>
            <span className="text-destructive">*</span>
          </div>
          <CardDescription>
            예측하거나 설명하려는 대상 변수 (예: 몸무게, 시험 점수)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dependentVar ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">선택됨:</span>
                <Badge variant="secondary" className="text-sm">
                  {dependentVar}
                </Badge>
                <Button
                  onClick={() => setDependentVar(null)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  변경
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {analysis.columns.map(col => (
                <VariableButton
                  key={col.name}
                  column={col}
                  onClick={() => setDependentVar(col.name)}
                  disabled={col.name === independentVar}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 독립변수 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">독립변수 (Independent Variable)</CardTitle>
            <span className="text-destructive">*</span>
          </div>
          <CardDescription>
            종속변수에 영향을 주는 변수 (예: 키, 공부 시간)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {independentVar ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">선택됨:</span>
                <Badge variant="secondary" className="text-sm">
                  {independentVar}
                </Badge>
                <Button
                  onClick={() => setIndependentVar(null)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  변경
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {analysis.columns.map(col => (
                <VariableButton
                  key={col.name}
                  column={col}
                  onClick={() => setIndependentVar(col.name)}
                  disabled={col.name === dependentVar}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 검증 피드백 */}
      {!isValid && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            종속변수와 독립변수를 모두 선택해주세요.
          </AlertDescription>
        </Alert>
      )}

      {isValid && (
        <Alert className="bg-success/10 border-success">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            모든 변수가 선택되었습니다. 분석을 시작할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between pt-2">
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </Button>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="gap-2 ml-auto"
        >
          분석 시작
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * VariableButton - 변수 선택 버튼
 */
interface VariableButtonProps {
  column: ColumnAnalysis
  onClick: () => void
  disabled?: boolean
}

function VariableButton({ column, onClick, disabled }: VariableButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className={cn(
        'h-auto flex-col items-start p-3 text-left',
        'hover:bg-primary/5 hover:border-primary transition-colors',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-2 w-full mb-1">
        <span className="font-medium text-sm truncate">{column.name}</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {column.type}
        </Badge>
      </div>
      {column.statistics && (
        <span className="text-xs text-muted-foreground">
          {column.dataType === 'number' && column.statistics.min !== undefined && column.statistics.max !== undefined
            ? `범위: ${column.statistics.min.toFixed(1)} ~ ${column.statistics.max.toFixed(1)}`
            : `고유값: ${column.uniqueCount}개`}
        </span>
      )}
    </Button>
  )
}
