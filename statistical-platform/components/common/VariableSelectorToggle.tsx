'use client'

/**
 * VariableSelectorToggle - 토글 방식 변수 선택 컴포넌트
 *
 * 디자인 철학:
 * - 모든 변수 항상 표시 (숨기지 않음)
 * - 클릭 한 번에 선택/해제 (토글 방식)
 * - 시각적 하이라이트 (선택 상태 명확)
 * - 즉시 피드백 (변경 버튼 불필요)
 *
 * 개선 사항:
 * - ❌ 이전: 선택 → 숨김 → 변경 버튼 → 다시 선택
 * - ✅ 현재: 클릭만으로 선택/해제 토글
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
export interface VariableSelectorToggleProps {
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
export function VariableSelectorToggle({
  data,
  onComplete,
  onBack,
  title = '변수 선택',
  description = '분석에 사용할 변수를 클릭하여 선택하세요',
  className
}: VariableSelectorToggleProps) {
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

  // 종속변수 토글
  const toggleDependent = useCallback((columnName: string) => {
    setDependentVar(prev => prev === columnName ? null : columnName)
  }, [])

  // 독립변수 토글
  const toggleIndependent = useCallback((columnName: string) => {
    setIndependentVar(prev => prev === columnName ? null : columnName)
  }, [])

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

      {/* 변수 선택 영역 (좌우 분할) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 종속변수 선택 */}
        <Card className="h-fit">
          <CardHeader className="pb-3 bg-primary/5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">종속변수</CardTitle>
              <span className="text-destructive">*</span>
              {dependentVar && (
                <Badge variant="default" className="ml-auto">
                  선택됨
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              예측/설명 대상 (예: 몸무게, 점수)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {analysis.columns.map(col => (
                <VariableToggleButton
                  key={col.name}
                  column={col}
                  selected={col.name === dependentVar}
                  onClick={() => toggleDependent(col.name)}
                  disabled={col.name === independentVar}
                  variant="dependent"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 독립변수 선택 */}
        <Card className="h-fit">
          <CardHeader className="pb-3 bg-secondary/5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">독립변수</CardTitle>
              <span className="text-destructive">*</span>
              {independentVar && (
                <Badge variant="secondary" className="ml-auto">
                  선택됨
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              영향을 주는 변수 (예: 키, 공부 시간)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {analysis.columns.map(col => (
                <VariableToggleButton
                  key={col.name}
                  column={col}
                  selected={col.name === independentVar}
                  onClick={() => toggleIndependent(col.name)}
                  disabled={col.name === dependentVar}
                  variant="independent"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 선택 요약 */}
      {(dependentVar || independentVar) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">종속변수:</span>
                {dependentVar ? (
                  <Badge variant="default">{dependentVar}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground italic">선택 안됨</span>
                )}
              </div>
              <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">독립변수:</span>
                {independentVar ? (
                  <Badge variant="secondary">{independentVar}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground italic">선택 안됨</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검증 피드백 */}
      {!isValid && (dependentVar || independentVar) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!dependentVar && '종속변수를 선택해주세요.'}
            {!independentVar && dependentVar && '독립변수를 선택해주세요.'}
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
 * VariableToggleButton - 토글 가능한 변수 버튼
 */
interface VariableToggleButtonProps {
  column: ColumnAnalysis
  selected: boolean
  onClick: () => void
  disabled?: boolean
  variant: 'dependent' | 'independent'
}

function VariableToggleButton({
  column,
  selected,
  onClick,
  disabled,
  variant
}: VariableToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full p-3 rounded-lg border-2 transition-all duration-200',
        'flex items-center justify-between gap-3',
        'text-left hover:shadow-md',

        // 선택되지 않은 상태
        !selected && !disabled && 'border-border bg-card hover:border-primary/50',

        // 선택된 상태
        selected && variant === 'dependent' && 'border-primary bg-primary/10 shadow-sm',
        selected && variant === 'independent' && 'border-secondary bg-secondary/10 shadow-sm',

        // 비활성화 상태
        disabled && 'opacity-40 cursor-not-allowed hover:border-border hover:shadow-none',

        // 호버 애니메이션
        !disabled && 'hover:scale-[1.01]'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'font-medium text-sm truncate',
            selected && 'font-semibold'
          )}>
            {column.name}
          </span>
          <Badge
            variant={selected ? 'default' : 'outline'}
            className="text-xs shrink-0"
          >
            {column.type}
          </Badge>
        </div>
        {column.statistics && (
          <p className="text-xs text-muted-foreground">
            {column.dataType === 'number' && column.statistics.min !== undefined && column.statistics.max !== undefined
              ? `범위: ${column.statistics.min.toFixed(1)} ~ ${column.statistics.max.toFixed(1)}`
              : `고유값: ${column.uniqueCount}개`}
          </p>
        )}
      </div>

      {/* 선택 표시 */}
      <div className={cn(
        'shrink-0 w-5 h-5 rounded-full border-2 transition-all',
        selected && variant === 'dependent' && 'border-primary bg-primary',
        selected && variant === 'independent' && 'border-secondary bg-secondary',
        !selected && 'border-muted-foreground/30'
      )}>
        {selected && (
          <CheckCircle2 className="w-full h-full text-primary-foreground" />
        )}
      </div>
    </button>
  )
}
