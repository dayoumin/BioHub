'use client'

import { useCallback, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from '@/components/common/RecommendationCard'
import { cn } from '@/lib/utils'
import type { DiagnosticReport, MethodRecommendation } from '@/types/analysis'

type VariableAssignments = NonNullable<DiagnosticReport['variableAssignments']>
type CandidateColumn = NonNullable<DiagnosticReport['pendingClarification']>['candidateColumns'][number]

interface VariablePickerProps {
  candidateColumns: CandidateColumn[]
  partialAssignments: VariableAssignments | null
  missingRoles: string[]
  suggestedAnalyses?: MethodRecommendation[]
  onConfirm: (assignments: VariableAssignments) => void
  onCancel: () => void
  onSelectSuggestedMethod?: (recommendation: MethodRecommendation) => void
}

export function VariablePicker({
  candidateColumns,
  partialAssignments,
  missingRoles,
  suggestedAnalyses,
  onConfirm,
  onCancel,
  onSelectSuggestedMethod,
}: VariablePickerProps) {
  const numericColumns = candidateColumns.filter((column) => column.type === 'numeric')
  const categoricalColumns = candidateColumns.filter((column) => column.type === 'categorical')
  const activeGroupingRole: 'factor' | 'independent' = (
    missingRoles.includes('independent') && !missingRoles.includes('factor')
      ? 'independent'
      : 'factor'
  )
  const groupingColumns = activeGroupingRole === 'independent'
    ? candidateColumns
    : categoricalColumns

  const [selectedDependents, setSelectedDependents] = useState<string[]>(
    partialAssignments?.dependent ?? []
  )
  const [selectedGroupingColumns, setSelectedGroupingColumns] = useState<string[]>(
    activeGroupingRole === 'independent'
      ? (partialAssignments?.independent ?? [])
      : (partialAssignments?.factor ?? [])
  )

  const handleToggleDependent = useCallback((columnName: string) => {
    setSelectedDependents((current) => (
      current.includes(columnName)
        ? current.filter((value) => value !== columnName)
        : [...current, columnName]
    ))
  }, [])

  const handleToggleGroupingColumn = useCallback((columnName: string) => {
    setSelectedGroupingColumns((current) => (
      current.includes(columnName) ? current.filter((value) => value !== columnName) : [columnName]
    ))
  }, [])

  const handleConfirm = useCallback(() => {
    const assignments: VariableAssignments = {
      ...(partialAssignments ?? {}),
    }

    if (selectedDependents.length > 0) {
      assignments.dependent = selectedDependents
    }

    if (selectedGroupingColumns.length > 0) {
      if (activeGroupingRole === 'independent') {
        assignments.independent = selectedGroupingColumns
      } else {
        assignments.factor = selectedGroupingColumns
      }
    }

    onConfirm(assignments)
  }, [activeGroupingRole, onConfirm, partialAssignments, selectedDependents, selectedGroupingColumns])

  const isConfirmEnabled = selectedDependents.length > 0 && selectedGroupingColumns.length > 0
  const needsComparisonGroupClarification = activeGroupingRole === 'factor'
  const showRepeatedMeasuresHint = needsComparisonGroupClarification && categoricalColumns.length === 0 && numericColumns.length >= 2
  const showMissingMeasureHint = numericColumns.length === 0
  const showMissingGroupHint = needsComparisonGroupClarification && categoricalColumns.length === 0
  const groupingLabel = activeGroupingRole === 'independent' ? '설명 변수(독립변수):' : '비교 기준(그룹):'

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-primary/10 bg-muted/40 p-4">
      <div className="text-sm font-medium text-foreground">
        비교할 값과 기준을 선택해 주세요.
      </div>

      {(showRepeatedMeasuresHint || showMissingMeasureHint || showMissingGroupHint) && (
        <div
          data-testid="variable-picker-guidance"
          className="rounded-xl bg-background/80 px-3 py-2 text-xs leading-5 text-muted-foreground"
        >
          {showRepeatedMeasuresHint && (
            <p>
              현재 데이터에는 집단을 나누는 범주형 열이 없어 집단간 비교를 바로 진행할 수 없습니다.
              대신 <span className="font-medium text-foreground">time1, time2, time3 같은 반복측정/시점 비교</span>로 해석하는 편이 더 자연스럽습니다.
            </p>
          )}
          {!showRepeatedMeasuresHint && showMissingMeasureHint && (
            <p>
              현재 데이터에는 비교할 수치형 측정값 열이 없습니다. 먼저 비교 대상이 될 숫자 열을 포함해 주세요.
            </p>
          )}
          {!showRepeatedMeasuresHint && !showMissingMeasureHint && showMissingGroupHint && (
            <p>
              현재 데이터에는 집단을 나누는 범주형 열이 없어 집단간 비교를 바로 진행할 수 없습니다.
              그룹 열을 추가하거나, 아래의 <span className="font-medium text-foreground">다시 질문하기</span>로 다른 분석 방향을 요청해 주세요.
            </p>
          )}
        </div>
      )}

      {suggestedAnalyses && suggestedAnalyses.length > 0 && onSelectSuggestedMethod && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            현재 데이터에 더 가까운 분석
          </div>
          <div className="flex flex-col gap-1.5">
            {suggestedAnalyses.map((recommendation) => (
              <RecommendationCard
                key={recommendation.methodId}
                recommendation={recommendation}
                onSelect={() => onSelectSuggestedMethod(recommendation)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            비교할 값(측정값):
          </div>
          <div className="flex flex-wrap gap-2">
            {numericColumns.map((column) => {
              const isSelected = selectedDependents.includes(column.column)

              return (
                <button
                  key={column.column}
                  onClick={() => handleToggleDependent(column.column)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  )}
                >
                  {column.column}
                </button>
              )
            })}
            {numericColumns.length === 0 && (
              <span className="py-1.5 text-xs text-muted-foreground">
                선택 가능한 수치형 변수가 없습니다.
              </span>
            )}
          </div>
        </div>

        <div className="h-px w-full bg-border/50" />

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            {groupingLabel}
          </div>
          <div className="flex flex-wrap gap-2">
            {groupingColumns.map((column) => {
              const isSelected = selectedGroupingColumns.includes(column.column)

              return (
                <button
                  key={column.column}
                  onClick={() => handleToggleGroupingColumn(column.column)}
                  className={cn(
                    'flex flex-col items-start rounded-lg border px-3 py-1.5 text-left text-xs transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  )}
                >
                  <span className="font-medium">{column.column}</span>
                  {column.type === 'categorical' && column.sampleGroups && column.sampleGroups.length > 0 && (
                    <span
                      className={cn(
                        'mt-0.5 text-xs opacity-80',
                        isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {column.sampleGroups.join(', ')}
                    </span>
                  )}
                </button>
              )
            })}
            {groupingColumns.length === 0 && (
              <span className="py-1.5 text-xs text-muted-foreground">
                {activeGroupingRole === 'independent'
                  ? '선택 가능한 독립변수가 없습니다.'
                  : '선택 가능한 범주형 변수가 없습니다.'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          data-testid="variable-picker-confirm"
          onClick={handleConfirm}
          disabled={!isConfirmEnabled}
          size="sm"
          className="flex-1 gap-1.5"
        >
          이 조합으로 분석
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          size="sm"
          className="gap-1.5 text-muted-foreground hover:bg-muted/50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          다시 질문하기
        </Button>
      </div>

      {partialAssignments && (
        <div className="text-center text-xs text-muted-foreground/70">
          * AI가 파악한 일부 변수는 미리 선택되어 있습니다.
        </div>
      )}
    </div>
  )
}
