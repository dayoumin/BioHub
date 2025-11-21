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
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VariableRequirement } from '@/lib/statistics/variable-requirements'

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
      // ���� Ÿ�̸Ӱ� ������ ��� (�ߺ� ���� ����)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      setNewlyAdded(added)
      // �� Ÿ�̸� ����
      timeoutRef.current = setTimeout(() => {
        setNewlyAdded(null)
        timeoutRef.current = null
      }, 1000)
    }
    prevVariablesRef.current = assignedVariables

    // cleanup: ������Ʈ unmount �� Ÿ�̸� ��� (�޸� ���� ����)
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
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
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
