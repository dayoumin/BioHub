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
  useSensors,
  useSensor,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, GripVertical, X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services'
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
  backLabel?: string
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
  hasValidationError,
}: {
  slot: SlotConfig
  assignedVars: string[]
  columns: ColumnInfo[]
  onRemove: (varName: string) => void
  onClickAssign: (slotId: string) => void
  isActive: boolean
  hasValidationError: boolean
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
  const showExpandedHelp = isActive || hasValidationError

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border-2 border-dashed p-3 transition-all duration-150 min-h-[56px]',
        colors.dashed,
        isOver && canDrop && 'border-primary/60 bg-primary/5',
        isRejectDrop && 'border-destructive/60 bg-destructive/5',
        !isOver && assignedVars.length > 0 && `${colors.bg} border-solid ${colors.border}`,
        !isOver && assignedVars.length === 0 && hasValidationError && 'border-destructive/30 bg-destructive/5',
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
          className="w-full py-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          disabled={isFull || isMultipleFull}
        >
          {isRejectDrop ? (
            '이 타입은 배치할 수 없습니다'
          ) : (
            <div className="space-y-1">
              <div className={cn('font-medium', hasValidationError && 'text-destructive')}>
                {getEmptySlotHint(slot)}
              </div>
              {showExpandedHelp && (
                <div className="text-[11px] leading-relaxed">{slot.description}</div>
              )}
            </div>
          )}
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
  backLabel,
}: UnifiedVariableSelectorProps) {
  // dnd-kit: 5px 이동 후에만 드래그 시작 → 클릭과 드래그 구분
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

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

  // Sync assignments when initialSelection, slots, or columns change after mount
  // (e.g., AI detection results arrive late, anova upgrades to two-way-anova, or data replaced)
  // slots/columns are useMemo results — stable references unless selectorType/data changes
  useEffect(() => {
    if (columns.length === 0) return
    setAssignments(buildInitialAssignments(slots, columns, initialSelection))
  }, [initialSelection, slots, columns])

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [dragItem, setDragItem] = useState<{ name: string; type: AcceptedType } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const liveValidationErrors = useMemo(() => validateSlots(slots, assignments), [slots, assignments])
  const slotValidationState = useMemo(() => {
    const state = new Set<string>()
    for (const slot of slots) {
      if (liveValidationErrors.some(error => error.startsWith(slot.label))) {
        state.add(slot.id)
      }
    }
    return state
  }, [slots, liveValidationErrors])

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
    const data = event.active.data.current
    if (!data || typeof data.columnName !== 'string' || typeof data.columnType !== 'string') return
    setDragItem({ name: data.columnName, type: data.columnType as AcceptedType })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragItem(null)
    const { over, active } = event
    if (!over) return

    const slotId = over.data.current && typeof over.data.current.slotId === 'string'
      ? over.data.current.slotId : undefined
    if (!slotId) return

    const data = active.data.current
    if (!data || typeof data.columnName !== 'string' || typeof data.columnType !== 'string') return
    const columnName = data.columnName
    const columnType = data.columnType as AcceptedType

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
    return liveValidationErrors.length === 0
  }, [liveValidationErrors])

  const requiredSlotCount = useMemo(
    () => slots.filter(slot => slot.required).length,
    [slots]
  )

  const completedRequiredSlotCount = useMemo(
    () => slots.filter(slot => slot.required && (assignments[slot.id] ?? []).length > 0).length,
    [slots, assignments]
  )

  const assignedVariableCount = useMemo(
    () => Object.values(assignments).reduce((sum, vars) => sum + vars.length, 0),
    [assignments]
  )

  const remainingRequiredSlotCount = Math.max(requiredSlotCount - completedRequiredSlotCount, 0)
  const numericColumnCount = useMemo(
    () => columns.filter(column => column.type === 'numeric').length,
    [columns]
  )
  const categoricalColumnCount = columns.length - numericColumnCount

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
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-2xl border border-border/40 bg-surface-container-low px-5 py-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Step 3
              </p>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                역할 슬롯을 먼저 채우세요
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                슬롯을 클릭한 다음 변수를 누르거나 드래그해서 배정할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="h-7 text-xs font-medium">
                필수 슬롯 {completedRequiredSlotCount}/{requiredSlotCount}
              </Badge>
              <Badge variant="secondary" className="h-7 text-xs font-medium">
                선택된 변수 {assignedVariableCount}개
              </Badge>
              {remainingRequiredSlotCount > 0 && (
                <Badge variant="outline" className="h-7 text-xs font-medium border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  남은 필수 {remainingRequiredSlotCount}개
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.92fr)_240px] items-start">
          {/* Left: Role Slots */}
          <div className="order-1 space-y-3 rounded-2xl border border-border/40 bg-background p-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)] lg:order-1">
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  분석 역할
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  필수 슬롯부터 채우면 됩니다.
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] font-medium">
                Main
              </Badge>
            </div>
            {slots.map(slot => (
              <RoleSlot
                key={slot.id}
                slot={slot}
                assignedVars={assignments[slot.id] ?? []}
                columns={columns}
                onRemove={(varName) => handleRemove(slot.id, varName)}
                onClickAssign={handleSlotClick}
                isActive={activeSlotId === slot.id}
                hasValidationError={slotValidationState.has(slot.id)}
              />
            ))}
          </div>

          {/* Center: Variable Pool */}
          <div className="order-2 space-y-2 rounded-2xl border border-border/40 bg-background/80 p-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)] lg:order-2">
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  사용 가능한 변수
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>클릭 시 자동 배치</span>
                  <span className="rounded-full border border-border/50 bg-background px-2 py-0.5">
                    연속형 {numericColumnCount}
                  </span>
                  <span className="rounded-full border border-border/50 bg-background px-2 py-0.5">
                    범주형 {categoricalColumnCount}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px] font-medium">
                {columns.length}개
              </Badge>
            </div>
            <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1 lg:max-h-[500px]" data-testid="variable-pool">
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

          {/* Right: Live Data Summary */}
          <div className="hidden lg:order-3 lg:block lg:sticky lg:top-4">
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
      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-border/40 bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              진행 상태
            </p>
            <p className="mt-1 text-sm text-foreground">
              {isValid
                ? '필수 슬롯이 준비되었습니다. 분석을 실행할 수 있습니다.'
                : `필수 슬롯 ${remainingRequiredSlotCount}개만 더 채우면 됩니다.`}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {onBack ? (
              <Button variant="outline" size="default" className="h-10 w-full sm:w-auto" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {backLabel ?? '이전 단계'}
              </Button>
            ) : null}
            <Button
              onClick={handleSubmit}
              size="default"
              disabled={!isValid}
              className="h-10 w-full gap-1.5 sm:w-auto"
              data-testid="variable-selection-next"
            >
              {isValid && <CheckCircle2 className="h-3.5 w-3.5" />}
              분석 실행으로 계속
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
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

    if (Array.isArray(value)) {
      // Array input (e.g. variables: string[], covariate: string[])
      result[slot.id] = value.filter(v => typeof v === 'string' && colNames.has(v))
    } else if (typeof value === 'string') {
      if (slot.multiple && slot.multipleFormat === 'comma') {
        // Comma-separated string → split into array (e.g. groupVar, independentVar)
        const parts = value.split(',').map(s => s.trim()).filter(s => colNames.has(s))
        result[slot.id] = parts
      } else if (slot.multiple) {
        // Single string for a multiple-array slot → wrap in array
        if (colNames.has(value)) result[slot.id] = [value]
      } else {
        if (colNames.has(value)) {
          result[slot.id] = [value]
        }
      }
    }
  }

  return result
}

function getEmptySlotHint(slot: SlotConfig): string {
  const typeLabel = slot.accepts.length === 1
    ? slot.accepts[0] === 'numeric' ? '연속형 변수' : '범주형 변수'
    : '연속형 또는 범주형 변수'

  return `${typeLabel}를 클릭하거나 드래그하세요`
}
