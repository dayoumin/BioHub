'use client'

/**
 * DroppableRoleZone - 변수를 드롭할 수 있는 역할별 영역 컴포넌트
 *
 * 기능:
 * - 역할별 드롭존 UI 표시 (종속변수, 독립변수 등)
 * - 드롭 가능하도록 useDroppable hook 사용
 * - 드롭 시 시각적 피드백 제공 (애니메이션 + 아이콘)
 * - 할당된 변수 Badge로 표시
 *
 * 디자인 참고: Jamovi 변수 할당 영역
 * CLAUDE.md 규칙: any 금지, unknown + 타입 가드 사용
 */

import React, { useState, useEffect, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VariableRequirement } from '@/lib/statistics/variable-requirements'


// 변수 역할별 도움말 텍스트
const ROLE_TOOLTIPS: Record<string, string> = {
  'dependent': '설명하려는 대상 (결과, Y). 예: 체중, 점수, 수확량',
  'independent': '설명에 사용하는 변수 (원인, X). 예: 사료량, 온도, 비료',
  'factor': '그룹을 구분하는 범주형 변수. 예: 사료 종류 (A, B, C), 성별',
  'covariate': '통제하려는 공변량. 예: 초기 체중, 나이',
  'within': '개체 내 반복 측정 요인. 예: 시점 (1일, 7일, 14일)',
  'blocking': '블록 변수 (무선 효과). 예: 수조 번호, 실험 구역'
}

// Props 인터페이스
export interface DroppableRoleZoneProps {
  role: string
  label: string
  description?: string
  required?: boolean
  assignedVariables: string[]
  isOver?: boolean
  canDrop?: boolean
  onRemoveVariable?: (variableName: string) => void
  onClick?: () => void
  className?: string
}

/**
 * 드롭 가능한 역할별 영역
 */
export function DroppableRoleZone({
  role,
  label,
  description,
  required = false,
  assignedVariables,
  onRemoveVariable,
  onClick,
  className
}: DroppableRoleZoneProps) {
  // 드롭존 설정
  const { setNodeRef, isOver } = useDroppable({
    id: role,
    data: {
      type: 'role',
      role: role
    }
  })

  // 새로 추가된 변수 추적 (애니메이션용)
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevVariablesRef = useRef<string[]>(assignedVariables)

  // 변수 추가 감지
  useEffect(() => {
    const added = assignedVariables.find(
      variable => !prevVariablesRef.current.includes(variable)
    )
    if (added) {
      // 기존 타이머가 있으면 제거 (중복 애니메이션 방지)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setNewlyAdded(added)
      // 새 타이머 설정
      timeoutRef.current = setTimeout(() => {
        setNewlyAdded(null)
        timeoutRef.current = null
      }, 1000)
    }
    prevVariablesRef.current = assignedVariables

    // cleanup: 컴포넌트 unmount 시 타이머 제거 (메모리 누수 방지)
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [assignedVariables])


  return (
    <div className={cn('space-y-2', className)}>
      {/* 라벨 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
          {ROLE_TOOLTIPS[role] && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">{ROLE_TOOLTIPS[role]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {assignedVariables.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {assignedVariables.length}개 선택됨
          </span>
        )}
      </div>

      {/* 드롭존 */}
      <div
        ref={setNodeRef}
        onClick={onClick}
        className={cn(
          'min-h-[60px] p-3 border-2 rounded-md transition-all duration-200',
          onClick && 'cursor-pointer hover:border-primary/50 hover:bg-primary/5',
          isOver
            ? 'border-primary bg-primary/10 border-dashed shadow-inner'
            : assignedVariables.length > 0
            ? 'border-border bg-muted/50'
            : 'border-dashed border-muted-foreground/30 bg-muted/20'
        )}
      >
        {assignedVariables.length === 0 ? (
          // 빈 상태
          <div className="flex items-center justify-center h-full">
            <p className={cn(
              'text-sm transition-colors',
              isOver
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            )}>
              {isOver ? '여기에 드롭하세요' : onClick ? '클릭하여 변수 선택 (또는 드래그)' : '+ 변수를 드래그하여 추가'}
            </p>
          </div>
        ) : (
          // 할당된 변수 표시
          <div className="flex flex-wrap gap-2">
            {assignedVariables.map(varName => {
              const isNew = varName === newlyAdded
              return (
                <Badge
                  key={varName}
                  variant="secondary"
                  className={cn(
                    'gap-1.5 px-3 py-1.5 transition-all',
                    isNew && 'bg-primary/10 border-primary/50'
                  )}
                >
                  <span>{varName}</span>
                  {onRemoveVariable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveVariable(varName)
                      }}
                      className="hover:text-destructive transition-colors"
                      aria-label={`${varName} 제거`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {/* 설명 */}
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * 변수 요구사항 기반 드롭존 생성 헬퍼
 */
export function createRoleZone(
  requirement: VariableRequirement,
  assignedVariables: string[],
  onRemoveVariable?: (variableName: string) => void
) {
  return (
    <DroppableRoleZone
      key={requirement.role}
      role={requirement.role}
      label={requirement.label}
      description={requirement.description}
      required={requirement.required}
      assignedVariables={assignedVariables}
      onRemoveVariable={onRemoveVariable}
    />
  )
}
