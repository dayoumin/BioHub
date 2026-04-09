'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { DiagnosticReport } from '@/types/analysis'

type VariableAssignments = NonNullable<DiagnosticReport['variableAssignments']>
type CandidateColumn = NonNullable<DiagnosticReport['pendingClarification']>['candidateColumns'][number]

interface VariablePickerProps {
  /** 후보 컬럼 (수치형 + 범주형 공통 배열) */
  candidateColumns: CandidateColumn[]
  /** LLM이 부분 탐지한 결과 (프리셀렉션) */
  partialAssignments: VariableAssignments | null
  /** 누락된 역할 목록 (어떤 컴포넌트들을 필수로 요구할지 결정에 활용할 수 있음) */
  missingRoles: string[]
  /** 확정 시 */
  onConfirm: (assignments: VariableAssignments) => void
  /** "다시 질문하기" — clarification 취소, 자유 입력으로 복귀 */
  onCancel: () => void
}

export function VariablePicker({
  candidateColumns,
  partialAssignments,
  missingRoles,
  onConfirm,
  onCancel,
}: VariablePickerProps) {
  // 수치형(측정값)과 범주형(그룹)을 분리
  const numericColumns = candidateColumns.filter(c => c.type === 'numeric')
  const categoricalColumns = candidateColumns.filter(c => c.type === 'categorical')

  // 상태 관리: 선택된 수치형 변수들 (다중 선택 허용)
  const [selectedDependents, setSelectedDependents] = useState<string[]>(
    partialAssignments?.dependent || []
  )

  // 상태 관리: 선택된 범주형 변수들 (단일/복수 선택 여부 - 통상 1개)
  const [selectedFactors, setSelectedFactors] = useState<string[]>(
    partialAssignments?.factor || []
  )

  const handleToggleDependent = useCallback((colName: string) => {
    setSelectedDependents(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    )
  }, [])

  const handleToggleFactor = useCallback((colName: string) => {
    // 범주형은 보통 1개만 주로 그룹 요인으로 잡으므로 단일 선택 혹은 토글
    setSelectedFactors(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [colName]
    )
  }, [])

  const handleConfirm = useCallback(() => {
    // 확인 시, VariableAssignments 구성
    const assignments: VariableAssignments = {
      ...(partialAssignments || {}),
    }

    if (selectedDependents.length > 0) {
      assignments.dependent = selectedDependents
    }
    if (selectedFactors.length > 0) {
      assignments.factor = selectedFactors
    }

    onConfirm(assignments)
  }, [partialAssignments, selectedDependents, selectedFactors, onConfirm])

  // 최소 1개 이상씩은 선택해야 분석이 원활함
  const isConfirmEnabled = selectedDependents.length > 0 && selectedFactors.length > 0

  return (
    <div className="bg-muted/40 rounded-xl p-4 flex flex-col gap-5 border border-primary/10">
      <div className="text-sm font-medium text-foreground">
        비교할 값과 기준을 선택해 주세요.
      </div>

      <div className="flex flex-col gap-4">
        {/* 측정값 (수치형) */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            비교할 값 (측정값):
          </div>
          <div className="flex flex-wrap gap-2">
            {numericColumns.map(col => {
              const isSelected = selectedDependents.includes(col.column)
              return (
                <button
                  key={col.column}
                  onClick={() => handleToggleDependent(col.column)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border text-foreground'
                  )}
                >
                  {col.column}
                </button>
              )
            })}
            {numericColumns.length === 0 && (
              <span className="text-xs text-muted-foreground py-1.5">선택 가능한 수치형 변수가 없습니다.</span>
            )}
          </div>
        </div>

        <div className="w-full h-px bg-border/50" />

        {/* 그룹 (범주형) */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            비교 기준 (그룹):
          </div>
          <div className="flex flex-wrap gap-2">
            {categoricalColumns.map(col => {
              const isSelected = selectedFactors.includes(col.column)
              return (
                <button
                  key={col.column}
                  onClick={() => handleToggleFactor(col.column)}
                  className={cn(
                    'flex flex-col items-start px-3 py-1.5 rounded-lg text-xs transition-colors border text-left',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border text-foreground'
                  )}
                >
                  <span className="font-medium">{col.column}</span>
                  {col.sampleGroups && col.sampleGroups.length > 0 && (
                    <span className={cn(
                      'text-xs opacity-80 mt-0.5',
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}>
                      {col.sampleGroups.join(', ')} 등
                    </span>
                  )}
                </button>
              )
            })}
            {categoricalColumns.length === 0 && (
              <span className="text-xs text-muted-foreground py-1.5">선택 가능한 범주형 변수가 없습니다.</span>
            )}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={handleConfirm}
          disabled={!isConfirmEnabled}
          size="sm"
          className="gap-1.5 flex-1"
        >
          이 조합으로 분석
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          size="sm"
          className="gap-1.5 text-muted-foreground hover:bg-muted/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          다시 질문하기
        </Button>
      </div>

      {/* 프리셀렉션 안내 메시지 */}
      {partialAssignments && (
        <div className="text-xs text-muted-foreground/70 text-center">
          * AI가 파악한 일부 변수가 미리 선택되어 있습니다.
        </div>
      )}
    </div>
  )
}
