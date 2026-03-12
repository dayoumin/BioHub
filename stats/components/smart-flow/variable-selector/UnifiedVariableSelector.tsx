'use client'

/**
 * UnifiedVariableSelector — 통합 변수 선택 컴포넌트
 *
 * STITCH 시안 기반: 좌(변수 풀) + 우(역할 슬롯) 2-column 레이아웃.
 * 클릭 기본 + @dnd-kit 드래그&드롭 향상.
 * SelectorType별 슬롯 구성은 slot-configs.ts에서 가져옴.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, GripVertical, X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services/variable-type-detector'
import { isRecord } from '@/lib/utils/type-guards'
import {
  getSlotConfigs,
  toAcceptedType,
  isTypeAccepted,
  buildMappingFromSlots,
  validateSlots,
  type SelectorType,
  type SlotConfig,
  type AcceptedType,
} from './slot-configs'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import { LiveDataSummary } from './LiveDataSummary'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnifiedVariableSelectorProps {
  data: Record<string, unknown>[]
  selectorType: SelectorType
  onComplete: (mapping: VariableMapping) => void
  onBack?: () => void
  initialSelection?: Partial<VariableMapping>
  className?: string
}

interface ColumnInfo {
  name: string
  type: AcceptedType
  uniqueCount: number
}

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  info: {
    border: 'border-info-border',
    bg: 'bg-info-bg',
    text: 'text-info',
    dashed: 'border-info/30',
    chip: 'bg-info-bg border-info-border text-info',
  },
  success: {
    border: 'border-success-border',
    bg: 'bg-success-bg',
    text: 'text-success',
    dashed: 'border-success/30',
    chip: 'bg-success-bg border-success-border text-success',
  },
  highlight: {
    border: 'border-highlight-border',
    bg: 'bg-highlight-bg',
    text: 'text-highlight',
    dashed: 'border-highlight/30',
    chip: 'bg-highlight-bg border-highlight-border text-highlight',
  },
  muted: {
    border: 'border-border/50',
    bg: 'bg-muted/50',
    text: 'text-muted-foreground',
    dashed: 'border-border/30',
    chip: 'bg-muted border-border/50 text-muted-foreground',
  },
} as const

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Draggable variable chip in the pool */
function PoolVariable({
  column,
  isAssigned,
  onClick,
}: {
  column: ColumnInfo
  isAssigned: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${column.name}`,
    data: { columnName: column.name, columnType: column.type },
    disabled: isAssigned,
  })

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm',
        'border transition-all duration-150',
        isAssigned
          ? 'cursor-pointer border-transparent bg-muted/30 opacity-60 hover:opacity-80 hover:bg-muted/50'
          : 'cursor-pointer border-border/50 hover:border-primary/40 hover:bg-accent/50 active:scale-[0.98]',
        isDragging && 'opacity-50',
      )}
      data-testid={`pool-var-${column.name}`}
      {...(isAssigned ? {} : { ...attributes, ...listeners })}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
      <span className="truncate flex-1 font-medium">{column.name}</span>
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1.5 py-0 flex-shrink-0',
          column.type === 'numeric'
            ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
            : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
        )}
      >
        {column.type === 'numeric' ? '연속형' : '범주형'}
      </Badge>
    </button>
  )
}

/** Drag overlay chip (follows cursor) */
function DragOverlayChip({ name, type }: { name: string; type: AcceptedType }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/50 bg-background shadow-lg text-sm">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="font-medium">{name}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {type === 'numeric' ? '연속형' : '범주형'}
      </Badge>
    </div>
  )
}

/** Droppable role slot */
function RoleSlot({
  slot,
  assignedVars,
  columns,
  onRemove,
  onClickAssign,
  isActive,
}: {
  slot: SlotConfig
  assignedVars: string[]
  columns: ColumnInfo[]
  onRemove: (varName: string) => void
  onClickAssign: (slotId: string) => void
  isActive: boolean
}) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${slot.id}`,
    data: { slotId: slot.id },
  })

  const colors = COLOR_MAP[slot.colorScheme]
  const isFull = !slot.multiple && assignedVars.length >= 1
  const isMultipleFull = slot.multiple && slot.maxCount !== undefined && assignedVars.length >= slot.maxCount

  // Check if the dragged item's type is accepted
  const activeType = active?.data?.current?.columnType as AcceptedType | undefined
  const canDrop = activeType ? isTypeAccepted(slot, activeType) : true
  const isRejectDrop = isOver && !canDrop

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border-2 border-dashed p-3 transition-all duration-150 min-h-[56px]',
        colors.dashed,
        isOver && canDrop && 'border-primary/60 bg-primary/5',
        isRejectDrop && 'border-destructive/60 bg-destructive/5',
        !isOver && assignedVars.length > 0 && `${colors.bg} border-solid ${colors.border}`,
        !isOver && isActive && assignedVars.length === 0 && 'border-primary/50 bg-primary/5 ring-1 ring-primary/20',
      )}
      data-testid={`slot-${slot.id}`}
    >
      {/* Slot header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-semibold', colors.text)}>{slot.label}</span>
          {slot.required ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive/30 text-destructive">
              필수
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              선택
            </Badge>
          )}
        </div>
        {slot.multiple && slot.maxCount && (
          <span className="text-[10px] text-muted-foreground">
            {assignedVars.length}/{slot.maxCount}
          </span>
        )}
      </div>

      {/* Assigned variable chips */}
      {assignedVars.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {assignedVars.map(varName => {
            const col = columns.find(c => c.name === varName)
            return (
              <div
                key={varName}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium',
                  colors.chip,
                )}
                data-testid={`chip-${varName}`}
              >
                <span>{varName}</span>
                {col && (
                  <span className="opacity-60 text-[10px]">
                    {col.type === 'numeric' ? '연속형' : '범주형'}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(varName) }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label={`${varName} 제거`}
                  data-testid={`remove-${varName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <button
          onClick={() => onClickAssign(slot.id)}
          className="w-full text-xs text-muted-foreground/60 py-1 hover:text-muted-foreground transition-colors"
          disabled={isFull || isMultipleFull}
        >
          {isRejectDrop ? '이 타입은 배치할 수 없습니다' : '좌측에서 변수를 클릭하거나 드래그하세요'}
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnifiedVariableSelector({
  data,
  selectorType,
  onComplete,
  onBack,
  initialSelection,
  className,
}: UnifiedVariableSelectorProps) {
  const slots = useMemo(() => getSlotConfigs(selectorType), [selectorType])

  // Analyze dataset columns
  const columns = useMemo((): ColumnInfo[] => {
    if (!data || data.length === 0) return []
    const safeData = data.filter(isRecord)
    if (safeData.length === 0) return []
    const analysis = analyzeDataset(safeData, { detectIdColumns: true })
    return analysis.columns
      .filter(col => !col.idDetection?.isId)
      .map(col => ({
        name: col.name,
        type: toAcceptedType(col.type),
        uniqueCount: col.uniqueCount,
      }))
  }, [data])

  // Slot assignments: { slotId: [varName, ...] }
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() =>
    buildInitialAssignments(slots, columns, initialSelection)
  )

  // Sync assignments when initialSelection or selectorType changes after mount
  // (e.g., AI detection results arrive late, or anova upgrades to two-way-anova)
  useEffect(() => {
    if (columns.length === 0) return
    setAssignments(buildInitialAssignments(slots, columns, initialSelection))
  }, [initialSelection, selectorType]) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [dragItem, setDragItem] = useState<{ name: string; type: AcceptedType } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // All assigned variable names (across all slots)
  const assignedSet = useMemo(() => {
    const set = new Set<string>()
    for (const vars of Object.values(assignments)) {
      for (const v of vars) set.add(v)
    }
    return set
  }, [assignments])

  // Find first available slot for a given variable type
  const findTargetSlot = useCallback((varType: AcceptedType): SlotConfig | undefined => {
    // If a slot is "active" (clicked), use that
    if (activeSlotId) {
      const slot = slots.find(s => s.id === activeSlotId)
      if (slot && isTypeAccepted(slot, varType)) {
        const assigned = assignments[slot.id] ?? []
        const isFull = !slot.multiple && assigned.length >= 1
        const isMultiFull = slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount
        if (!isFull && !isMultiFull) return slot
      }
    }
    // Otherwise, find first empty required slot that accepts this type
    for (const slot of slots) {
      if (!isTypeAccepted(slot, varType)) continue
      const assigned = assignments[slot.id] ?? []
      if (!slot.multiple && assigned.length >= 1) continue
      if (slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount) continue
      // Prefer required slots first
      if (slot.required && assigned.length === 0) return slot
    }
    // Then any slot with space
    for (const slot of slots) {
      if (!isTypeAccepted(slot, varType)) continue
      const assigned = assignments[slot.id] ?? []
      if (!slot.multiple && assigned.length >= 1) continue
      if (slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount) continue
      return slot
    }
    return undefined
  }, [slots, assignments, activeSlotId])

  // Click to assign or unassign (toggle) a variable from pool
  const handlePoolClick = useCallback((column: ColumnInfo) => {
    // If already assigned → remove from its slot (toggle off)
    if (assignedSet.has(column.name)) {
      setAssignments(prev => {
        const next = { ...prev }
        for (const slotId of Object.keys(next)) {
          if (next[slotId]?.includes(column.name)) {
            next[slotId] = next[slotId].filter(v => v !== column.name)
            break
          }
        }
        return next
      })
      setValidationErrors([])
      return
    }

    // Otherwise assign to target slot
    const targetSlot = findTargetSlot(column.type)
    if (!targetSlot) return

    setAssignments(prev => ({
      ...prev,
      [targetSlot.id]: [...(prev[targetSlot.id] ?? []), column.name],
    }))
    setActiveSlotId(null)
    setValidationErrors([])
  }, [assignedSet, findTargetSlot])

  // Click slot to make it the active target
  const handleSlotClick = useCallback((slotId: string) => {
    setActiveSlotId(prev => prev === slotId ? null : slotId)
  }, [])

  // Remove a variable from a slot
  const handleRemove = useCallback((slotId: string, varName: string) => {
    setAssignments(prev => ({
      ...prev,
      [slotId]: (prev[slotId] ?? []).filter(v => v !== varName),
    }))
    setValidationErrors([])
  }, [])

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { columnName, columnType } = event.active.data.current as {
      columnName: string
      columnType: AcceptedType
    }
    setDragItem({ name: columnName, type: columnType })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragItem(null)
    const { over, active } = event
    if (!over) return

    const slotId = (over.data.current as { slotId?: string })?.slotId
    if (!slotId) return

    const { columnName, columnType } = active.data.current as {
      columnName: string
      columnType: AcceptedType
    }

    const slot = slots.find(s => s.id === slotId)
    if (!slot || !isTypeAccepted(slot, columnType)) return

    const assigned = assignments[slotId] ?? []
    if (!slot.multiple && assigned.length >= 1) return
    if (slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount) return
    if (assignedSet.has(columnName)) return

    setAssignments(prev => ({
      ...prev,
      [slotId]: [...(prev[slotId] ?? []), columnName],
    }))
    setValidationErrors([])
  }, [slots, assignments, assignedSet])

  // Submit
  const handleSubmit = useCallback(() => {
    const errors = validateSlots(slots, assignments)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    const mapping = buildMappingFromSlots(slots, assignments)
    onComplete(mapping)
  }, [slots, assignments, onComplete])

  // Check if ready
  const isValid = useMemo(() => {
    return validateSlots(slots, assignments).length === 0
  }, [slots, assignments])

  return (
    <div className={cn('space-y-4', className)} data-testid="unified-variable-selector">
      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationErrors.join(' / ')}</AlertDescription>
        </Alert>
      )}

      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-[1fr_1.2fr] lg:grid-cols-[1fr_1.2fr_200px] gap-4 items-start">
          {/* Left: Variable Pool */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
              사용 가능한 변수
            </h3>
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1" data-testid="variable-pool">
              {columns.map(col => (
                <PoolVariable
                  key={col.name}
                  column={col}
                  isAssigned={assignedSet.has(col.name)}
                  onClick={() => handlePoolClick(col)}
                />
              ))}
              {columns.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  사용 가능한 변수가 없습니다
                </p>
              )}
            </div>
          </div>

          {/* Center: Role Slots */}
          <div className="space-y-3">
            {slots.map(slot => (
              <RoleSlot
                key={slot.id}
                slot={slot}
                assignedVars={assignments[slot.id] ?? []}
                columns={columns}
                onRemove={(varName) => handleRemove(slot.id, varName)}
                onClickAssign={handleSlotClick}
                isActive={activeSlotId === slot.id}
              />
            ))}
          </div>

          {/* Right: Live Data Summary */}
          <div className="hidden lg:block lg:sticky lg:top-4">
            <LiveDataSummary
              data={data}
              assignments={assignments}
              slots={slots}
              columns={columns}
            />
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {dragItem && <DragOverlayChip name={dragItem.name} type={dragItem.type} />}
        </DragOverlay>
      </DndContext>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            이전 단계
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleSubmit}
          size="sm"
          disabled={!isValid}
          className="gap-1.5"
          data-testid="variable-selection-next"
        >
          {isValid && <CheckCircle2 className="h-3.5 w-3.5" />}
          다음 단계
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build initial slot assignments from initialSelection (VariableMapping).
 * Maps each VariableMapping key back to the appropriate slot.
 */
function buildInitialAssignments(
  slots: SlotConfig[],
  columns: ColumnInfo[],
  initial?: Partial<VariableMapping>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const slot of slots) {
    result[slot.id] = []
  }

  if (!initial || columns.length === 0) return result

  const colNames = new Set(columns.map(c => c.name))

  for (const slot of slots) {
    const value = initial[slot.mappingKey]
    if (value === undefined || value === null) continue

    if (slot.mappingKey === 'variables' && Array.isArray(value)) {
      result[slot.id] = value.filter(v => colNames.has(v))
    } else if (typeof value === 'string') {
      if (slot.multiple) {
        // comma-separated (groupVar for two-way-anova, independentVar for regression)
        const parts = value.split(',').map(s => s.trim()).filter(s => colNames.has(s))
        result[slot.id] = parts
      } else {
        if (colNames.has(value)) {
          result[slot.id] = [value]
        }
      }
    } else if (Array.isArray(value)) {
      result[slot.id] = value.filter(v => typeof v === 'string' && colNames.has(v))
    }
  }

  return result
}
