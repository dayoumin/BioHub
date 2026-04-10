'use client'

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
import { AlertCircle, GripVertical, X, ArrowRight, ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { analyzeDataset } from '@/lib/services'
import { isRecord } from '@/lib/utils/type-guards'
import {
  getMethodRequirements,
  type StatisticalMethodRequirements,
  type VariableRequirement,
} from '@/lib/statistics/variable-requirements'
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
import { MethodGuidancePanel } from './MethodGuidancePanel'
import {
  buildSlotsFromMethodRequirements,
  buildMethodFitState,
  buildVariableCandidates,
  decorateSlotsWithMethodRequirements,
  type MethodFitState,
  type MethodMismatchHint,
  type SelectorColumnInfo,
  type VariableCandidate,
} from './method-fit'

interface UnifiedVariableSelectorProps {
  data: Record<string, unknown>[]
  selectorType: SelectorType
  onComplete: (mapping: VariableMapping) => void
  onMappingChange?: (mapping: VariableMapping) => void
  onBack?: () => void
  initialSelection?: Partial<VariableMapping>
  className?: string
  backLabel?: string
  methodId?: string
  methodName?: string
  mismatchHint?: MethodMismatchHint
  onFitAction?: () => void
}

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

function PoolVariable({
  candidate,
  onClick,
}: {
  candidate: VariableCandidate
  onClick: () => void
}) {
  const { column, status, isSelectable } = candidate
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${column.name}`,
    data: { columnName: column.name, columnType: column.type },
    disabled: status === 'assigned' || !isSelectable,
  })

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-150',
        status === 'assigned'
          ? 'cursor-pointer border-transparent bg-muted/30 opacity-75 hover:opacity-90 hover:bg-muted/50'
          : status === 'invalid'
            ? 'cursor-pointer border-destructive/20 bg-destructive/5 opacity-75 hover:bg-destructive/10'
            : status === 'recommended'
              ? 'cursor-pointer border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 active:scale-[0.98]'
              : 'cursor-pointer border-border/50 hover:border-primary/40 hover:bg-accent/50 active:scale-[0.98]',
        isDragging && 'opacity-50',
      )}
      data-testid={`pool-var-${column.name}`}
      {...((status === 'assigned' || !isSelectable) ? {} : { ...attributes, ...listeners })}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{column.name}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0',
              column.type === 'numeric'
                ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400',
            )}
          >
            {column.type === 'numeric' ? '연속형' : '범주형'}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0',
              status === 'recommended' && 'border-primary/30 bg-primary/10 text-primary',
              status === 'valid' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              status === 'assigned' && 'border-border/50 bg-muted text-muted-foreground',
              status === 'caution' && 'border-amber-300 bg-amber-50 text-amber-700',
              status === 'invalid' && 'border-destructive/30 bg-destructive/10 text-destructive',
            )}
          >
            {status === 'recommended' ? '추천' : status === 'valid' ? '가능' : status === 'assigned' ? '배정됨' : status === 'caution' ? '주의' : '불가'}
          </Badge>
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{candidate.reason}</p>
      </div>
    </button>
  )
}

function DragOverlayChip({ name, type }: { name: string; type: AcceptedType }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm shadow-lg">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="font-medium">{name}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {type === 'numeric' ? '연속형' : '범주형'}
      </Badge>
    </div>
  )
}

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
  columns: SelectorColumnInfo[]
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
  const activeType = active?.data?.current?.columnType as AcceptedType | undefined
  const canDrop = activeType ? isTypeAccepted(slot, activeType) : true
  const isRejectDrop = isOver && !canDrop
  const showExpandedHelp = isActive || hasValidationError

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[64px] rounded-lg border-2 border-dashed p-3 transition-all duration-150',
        colors.dashed,
        isOver && canDrop && 'border-primary/60 bg-primary/5',
        isRejectDrop && 'border-destructive/60 bg-destructive/5',
        !isOver && assignedVars.length > 0 && `${colors.bg} border-solid ${colors.border}`,
        !isOver && assignedVars.length === 0 && hasValidationError && 'border-destructive/30 bg-destructive/5',
        !isOver && isActive && assignedVars.length === 0 && 'border-primary/50 bg-primary/5 ring-1 ring-primary/20',
      )}
      data-testid={`slot-${slot.id}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-semibold', colors.text)}>{slot.label}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-[9px] px-1 py-0',
              slot.required ? 'border-destructive/30 text-destructive' : '',
            )}
          >
            {slot.required ? '필수' : '선택'}
          </Badge>
        </div>
        {slot.multiple && slot.maxCount && (
          <span className="text-[10px] text-muted-foreground">
            {assignedVars.length}/{slot.maxCount}
          </span>
        )}
      </div>

      {assignedVars.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {assignedVars.map(varName => {
            const col = columns.find(c => c.name === varName)
            return (
              <div
                key={varName}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                  colors.chip,
                )}
                data-testid={`chip-${varName}`}
              >
                <span>{varName}</span>
                {col && (
                  <span className="text-[10px] opacity-60">
                    {col.type === 'numeric' ? '연속형' : '범주형'}
                  </span>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(varName)
                  }}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
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
          className="w-full py-1 text-left text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
        >
          {isRejectDrop ? (
            '이 역할에는 맞지 않는 변수입니다.'
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

function MethodFitBanner({
  fitState,
  methodName,
  onAction,
}: {
  fitState: MethodFitState
  methodName?: string
  onAction?: () => void
}) {
  const tone = {
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    partial: 'border-amber-200 bg-amber-50 text-amber-900',
    blocked: 'border-destructive/20 bg-destructive/5 text-foreground',
    mismatch: 'border-primary/20 bg-primary/5 text-foreground',
  }[fitState.status]

  const icon = fitState.status === 'ready'
    ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
    : fitState.status === 'partial'
      ? <Info className="mt-0.5 h-4 w-4 text-amber-700" />
      : <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />

  return (
    <div className={cn('rounded-2xl border px-4 py-3 shadow-sm', tone)} data-testid="method-fit-banner">
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">
            {methodName ? `${methodName} 설정 상태` : fitState.title}
          </p>
          <p className="mt-1 text-sm">{fitState.message}</p>
          {fitState.actionLabel && (
            <p className="mt-2 text-xs text-muted-foreground">{fitState.actionLabel}</p>
          )}
          {fitState.actionCtaLabel && onAction && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8"
              onClick={onAction}
              data-testid="method-fit-action"
            >
              {fitState.actionCtaLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function UnifiedVariableSelector({
  data,
  selectorType,
  onComplete,
  onMappingChange,
  onBack,
  initialSelection,
  className,
  backLabel,
  methodId,
  methodName,
  mismatchHint,
  onFitAction,
}: UnifiedVariableSelectorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const methodRequirements = useMemo(
    () => (methodId ? getMethodRequirements(methodId) : undefined),
    [methodId]
  )

  const baseSlots = useMemo(
    () => buildSlotsFromMethodRequirements(selectorType, methodRequirements) ?? getSlotConfigs(selectorType),
    [selectorType, methodRequirements]
  )
  const slots = useMemo(
    () => decorateSlotsWithMethodRequirements(baseSlots, methodRequirements),
    [baseSlots, methodRequirements]
  )

  const columns = useMemo((): SelectorColumnInfo[] => {
    if (!data || data.length === 0) return []
    const safeData = data.filter(isRecord)
    if (safeData.length === 0) return []

    const analysis = analyzeDataset(safeData, { detectIdColumns: true })
    return analysis.columns
      .filter(column => !column.idDetection?.isId)
      .map(column => ({
        name: column.name,
        type: toAcceptedType(column.type),
        rawType: column.type,
        dataType: column.dataType,
        uniqueCount: column.uniqueCount,
        missingCount: column.missingCount,
        nonMissingCount: column.totalCount - column.missingCount,
        sampleValues: column.samples ?? safeData.slice(0, 20).map(row => row[column.name]),
      }))
  }, [data])

  const [assignments, setAssignments] = useState<Record<string, string[]>>(() =>
    buildInitialAssignments(slots, columns, initialSelection)
  )

  useEffect(() => {
    if (columns.length === 0) return
    setAssignments(buildInitialAssignments(slots, columns, initialSelection))
  }, [initialSelection, slots, columns])

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [dragItem, setDragItem] = useState<{ name: string; type: AcceptedType } | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    onMappingChange?.(buildMappingFromSlots(slots, assignments))
  }, [slots, assignments, onMappingChange])

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

  const assignedSet = useMemo(() => {
    const set = new Set<string>()
    for (const vars of Object.values(assignments)) {
      for (const variable of vars) {
        set.add(variable)
      }
    }
    return set
  }, [assignments])

  const focusedSlotId = useMemo(() => {
    if (activeSlotId) return activeSlotId

    const firstMissingRequired = slots.find(slot => {
      if (!slot.required) return false
      const assigned = assignments[slot.id] ?? []
      if (assigned.length === 0) return true
      return slot.minCount !== undefined && assigned.length < slot.minCount
    })

    return firstMissingRequired?.id ?? slots[0]?.id ?? null
  }, [activeSlotId, assignments, slots])

  const focusedSlot = useMemo(
    () => slots.find(slot => slot.id === focusedSlotId) ?? null,
    [focusedSlotId, slots]
  )

  const fitState = useMemo(() => buildMethodFitState({
    slots,
    assignments,
    columns,
    methodRequirements,
    methodId,
    mismatchHint,
  }), [slots, assignments, columns, methodRequirements, methodId, mismatchHint])

  const variableCandidates = useMemo(() => buildVariableCandidates({
    columns,
    slots,
    assignments,
    focusSlotId: focusedSlotId,
    methodRequirements,
    methodId,
  }), [columns, slots, assignments, focusedSlotId, methodRequirements, methodId])

  const findTargetSlot = useCallback((varType: AcceptedType): SlotConfig | undefined => {
    if (focusedSlot && isTypeAccepted(focusedSlot, varType)) {
      const assigned = assignments[focusedSlot.id] ?? []
      const isFull = !focusedSlot.multiple && assigned.length >= 1
      const isMultiFull = focusedSlot.multiple && focusedSlot.maxCount !== undefined && assigned.length >= focusedSlot.maxCount
      if (!isFull && !isMultiFull) return focusedSlot
    }

    for (const slot of slots) {
      if (!isTypeAccepted(slot, varType)) continue
      const assigned = assignments[slot.id] ?? []
      if (!slot.multiple && assigned.length >= 1) continue
      if (slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount) continue
      if (slot.required && assigned.length === 0) return slot
    }

    for (const slot of slots) {
      if (!isTypeAccepted(slot, varType)) continue
      const assigned = assignments[slot.id] ?? []
      if (!slot.multiple && assigned.length >= 1) continue
      if (slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount) continue
      return slot
    }

    return undefined
  }, [focusedSlot, assignments, slots])

  const handlePoolClick = useCallback((candidate: VariableCandidate) => {
    const { column } = candidate

    if (assignedSet.has(column.name)) {
      setAssignments(prev => {
        const next = { ...prev }
        for (const slotId of Object.keys(next)) {
          if (next[slotId]?.includes(column.name)) {
            next[slotId] = next[slotId].filter(value => value !== column.name)
            break
          }
        }
        return next
      })
      setValidationErrors([])
      return
    }

    if (!candidate.isSelectable) {
      setValidationErrors([candidate.reason])
      if (focusedSlotId) setActiveSlotId(focusedSlotId)
      return
    }

    const targetSlot = findTargetSlot(column.type)
    if (!targetSlot) return

    setAssignments(prev => ({
      ...prev,
      [targetSlot.id]: [...(prev[targetSlot.id] ?? []), column.name],
    }))
    setActiveSlotId(null)
    setValidationErrors([])
  }, [assignedSet, findTargetSlot, focusedSlotId])

  const handleSlotClick = useCallback((slotId: string) => {
    setActiveSlotId(prev => prev === slotId ? null : slotId)
  }, [])

  const handleRemove = useCallback((slotId: string, varName: string) => {
    setAssignments(prev => ({
      ...prev,
      [slotId]: (prev[slotId] ?? []).filter(value => value !== varName),
    }))
    setValidationErrors([])
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const payload = event.active.data.current
    if (!payload || typeof payload.columnName !== 'string' || typeof payload.columnType !== 'string') return
    setDragItem({ name: payload.columnName, type: payload.columnType as AcceptedType })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragItem(null)
    const { over, active } = event
    if (!over) return

    const slotId = over.data.current && typeof over.data.current.slotId === 'string'
      ? over.data.current.slotId
      : undefined
    if (!slotId) return

    const payload = active.data.current
    if (!payload || typeof payload.columnName !== 'string' || typeof payload.columnType !== 'string') return

    const slot = slots.find(item => item.id === slotId)
    if (!slot || !isTypeAccepted(slot, payload.columnType as AcceptedType)) return

    const assigned = assignments[slotId] ?? []
    if (!slot.multiple && assigned.length >= 1) return
    if (slot.multiple && slot.maxCount !== undefined && assigned.length >= slot.maxCount) return
    if (assignedSet.has(payload.columnName)) return

    const candidate = variableCandidates.find(item => item.column.name === payload.columnName)
    if (!candidate?.isSelectable) return

    setAssignments(prev => ({
      ...prev,
      [slotId]: [...(prev[slotId] ?? []), payload.columnName],
    }))
    setValidationErrors([])
  }, [slots, assignments, assignedSet, variableCandidates])

  const handleSubmit = useCallback(() => {
    const errors = validateSlots(slots, assignments)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    if (fitState.status !== 'ready') {
      setValidationErrors([fitState.message])
      return
    }

    const mapping = buildMappingFromSlots(slots, assignments)
    onComplete(mapping)
  }, [slots, assignments, fitState, onComplete])

  const isReady = fitState.status === 'ready' && liveValidationErrors.length === 0
  const requiredSlotCount = useMemo(() => slots.filter(slot => slot.required).length, [slots])
  const completedRequiredSlotCount = useMemo(
    () => slots.filter(slot => slot.required && (assignments[slot.id] ?? []).length > 0).length,
    [slots, assignments]
  )
  const assignedVariableCount = useMemo(
    () => Object.values(assignments).reduce((sum, vars) => sum + vars.length, 0),
    [assignments]
  )
  const numericColumnCount = useMemo(
    () => columns.filter(column => column.type === 'numeric').length,
    [columns]
  )
  const categoricalColumnCount = columns.length - numericColumnCount
  const recommendedCandidateCount = useMemo(
    () => variableCandidates.filter(candidate => candidate.status === 'recommended').length,
    [variableCandidates]
  )

  return (
    <div className={cn('space-y-4', className)} data-testid="unified-variable-selector">
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationErrors.join(' / ')}</AlertDescription>
        </Alert>
      )}

      <MethodFitBanner
        fitState={fitState}
        methodName={methodName ?? methodRequirements?.name}
        onAction={onFitAction}
      />
      <MethodGuidancePanel methodRequirements={methodRequirements} />

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
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                슬롯을 클릭하면 현재 역할에 맞는 변수만 먼저 정리됩니다. 드래그는 보조 기능으로만 사용할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-7 text-xs font-medium">
                필수 슬롯 {completedRequiredSlotCount}/{requiredSlotCount}
              </Badge>
              <Badge variant="secondary" className="h-7 text-xs font-medium">
                선택된 변수 {assignedVariableCount}개
              </Badge>
              {recommendedCandidateCount > 0 && (
                <Badge variant="outline" className="h-7 border-primary/20 bg-primary/5 text-xs font-medium text-primary">
                  추천 후보 {recommendedCandidateCount}개
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.92fr)_240px]">
          <div className="order-1 space-y-3 rounded-2xl border border-border/40 bg-background p-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  분석 역할
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  필수 역할부터 채우면 시스템이 다음 추천 후보를 좁혀줍니다.
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

          <div className="order-2 space-y-2 rounded-2xl border border-border/40 bg-background/80 p-4 shadow-[0px_6px_24px_rgba(25,28,30,0.04)]">
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  사용 가능한 변수
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>현재 기준</span>
                  <span className="rounded-full border border-border/50 bg-background px-2 py-0.5 font-medium text-foreground">
                    {focusedSlot?.label ?? '역할 선택'}
                  </span>
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
            <div className="space-y-1 overflow-y-auto pr-1 lg:max-h-[500px]" data-testid="variable-pool">
              {variableCandidates.map(candidate => (
                <PoolVariable
                  key={candidate.column.name}
                  candidate={candidate}
                  onClick={() => handlePoolClick(candidate)}
                />
              ))}
              {variableCandidates.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  현재 역할에 사용할 수 있는 변수가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className="hidden lg:order-3 lg:block lg:sticky lg:top-4">
            <LiveDataSummary
              data={data}
              assignments={assignments}
              slots={slots}
              columns={columns}
            />
          </div>
        </div>

        <DragOverlay>
          {dragItem && <DragOverlayChip name={dragItem.name} type={dragItem.type} />}
        </DragOverlay>
      </DndContext>

      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-border/40 bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              진행 상태
            </p>
            <p className="mt-1 text-sm text-foreground">{fitState.message}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {onBack ? (
              <Button variant="outline" size="default" className="h-10 w-full sm:w-auto" onClick={onBack}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                {backLabel ?? '이전 단계'}
              </Button>
            ) : null}
            <Button
              onClick={handleSubmit}
              size="default"
              disabled={!isReady}
              className="h-10 w-full gap-1.5 sm:w-auto"
              data-testid="variable-selection-next"
            >
              {isReady && <CheckCircle2 className="h-3.5 w-3.5" />}
              분석 실행으로 계속
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildInitialAssignments(
  slots: SlotConfig[],
  columns: SelectorColumnInfo[],
  initial?: Partial<VariableMapping>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const slot of slots) {
    result[slot.id] = []
  }

  if (!initial || columns.length === 0) return result

  const columnNames = new Set(columns.map(column => column.name))

  for (const slot of slots) {
    const value = initial[slot.mappingKey]
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      result[slot.id] = value.filter(variable => typeof variable === 'string' && columnNames.has(variable))
      continue
    }

    if (typeof value !== 'string') continue

    if (slot.multiple && slot.multipleFormat === 'comma') {
      result[slot.id] = value
        .split(',')
        .map(part => part.trim())
        .filter(part => columnNames.has(part))
      continue
    }

    if (columnNames.has(value)) {
      result[slot.id] = [value]
    }
  }

  return result
}

function getEmptySlotHint(slot: SlotConfig): string {
  return `${slot.label}을(를) 클릭해서 채우세요`
}
