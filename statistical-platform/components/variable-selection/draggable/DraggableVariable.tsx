'use client'

/**
 * DraggableVariable - 드래그 가능한 변수 카드 컴포넌트
 *
 * 기능:
 * - 변수 카드 UI 표시 (이름, 타입, 통계 정보)
 * - 드래그 가능하도록 useDraggable hook 사용
 * - 드래그 중 시각적 피드백 제공
 *
 * 디자인 참고: Jamovi 변수 목록
 * CLAUDE.md 규칙: any 금지, unknown + 타입 가드 사용
 */

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColumnAnalysis } from '@/lib/services/variable-type-detector'

// Props 인터페이스
export interface DraggableVariableProps {
  column: ColumnAnalysis
  isDisabled?: boolean
  showStats?: boolean
  className?: string
}

/**
 * 드래그 가능한 변수 카드
 */
export function DraggableVariable({
  column,
  isDisabled = false,
  showStats = true,
  className
}: DraggableVariableProps) {
  // 드래그 설정
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: column.name,
    disabled: isDisabled,
    data: {
      type: 'variable',
      column: column
    }
  })

  // 드래그 중 스타일
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-3 p-3 border rounded-md',
        'transition-all duration-200',
        isDragging
          ? 'opacity-50 shadow-lg border-primary bg-primary/5 cursor-grabbing'
          : 'hover:bg-muted/50 hover:border-muted-foreground/30 cursor-grab',
        isDisabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {/* 드래그 핸들 */}
      <div
        {...listeners}
        {...attributes}
        className={cn(
          'flex-shrink-0 text-muted-foreground transition-colors',
          !isDisabled && 'group-hover:text-foreground cursor-grab active:cursor-grabbing'
        )}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 변수 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{column.name}</p>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {column.type}
          </Badge>
        </div>

        {/* 통계 정보 (옵션) */}
        {showStats && column.statistics && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {column.dataType === 'number' &&
             column.statistics.min !== undefined &&
             column.statistics.max !== undefined
              ? `범위: ${column.statistics.min.toFixed(2)} ~ ${column.statistics.max.toFixed(2)}`
              : `고유값: ${column.uniqueCount}개`}
          </p>
        )}
      </div>

      {/* 드래그 중 표시 */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 rounded-md border-2 border-primary border-dashed" />
      )}
    </div>
  )
}

/**
 * 드래그 오버레이용 변수 카드 (드래그 중 마우스를 따라다니는 카드)
 */
export function DraggableVariableOverlay({ column }: { column: ColumnAnalysis }) {
  return (
    <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-md bg-card shadow-2xl opacity-90">
      <GripVertical className="w-4 h-4 text-primary" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{column.name}</p>
          <Badge variant="outline" className="text-xs">
            {column.type}
          </Badge>
        </div>
      </div>
    </div>
  )
}