'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Bot, PenLine, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type {
  DocumentSection,
  DocumentWritingSectionState,
  DocumentWritingSectionStatus,
} from '@/lib/research/document-blueprint-types'

// ── generatedBy 아이콘/라벨 ──

const GENERATED_BY_META: Record<DocumentSection['generatedBy'], { icon: React.ElementType; label: string }> = {
  template: { icon: LayoutTemplate, label: '자동' },
  llm: { icon: Bot, label: 'AI' },
  user: { icon: PenLine, label: '직접' },
}

// ── 정렬 가능한 섹션 아이템 ──

const WRITING_STATUS_META: Record<DocumentWritingSectionStatus, { label: string; className: string }> = {
  idle: {
    label: '\uB300\uAE30',
    className: 'bg-surface-container-high text-on-surface-variant',
  },
  drafting: {
    label: '\uC791\uC131 \uC911',
    className: 'bg-secondary-container text-secondary',
  },
  patched: {
    label: '\uBC18\uC601\uB428',
    className: 'bg-[#d9f0e2] text-[#24543a]',
  },
  skipped: {
    label: '\uBCF4\uC874',
    className: 'bg-surface-container-high text-on-surface-variant',
  },
  failed: {
    label: '\uC2E4\uD328',
    className: 'bg-destructive/10 text-destructive',
  },
}

interface SortableSectionItemProps {
  section: DocumentSection
  writingState?: DocumentWritingSectionState
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
}

function SortableSectionItem({
  section,
  writingState,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SortableSectionItemProps): React.ReactElement {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    committedRef.current = false
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const handleFinishEdit = useCallback(() => {
    if (committedRef.current) return
    committedRef.current = true
    const val = inputRef.current?.value.trim()
    if (val && val !== section.title) onRename(val)
    setEditing(false)
  }, [section.title, onRename])
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const meta = GENERATED_BY_META[section.generatedBy]
  const MetaIcon = meta.icon
  const hasContent = section.content.length > 0 || (Array.isArray(section.plateValue) && section.plateValue.length > 0)
  const sourceCount = section.sourceRefs?.length ?? 0
  const supportCount = (section.sectionSupportBindings ?? []).filter((binding) => binding.included !== false).length
  const hasPreparedMaterials = sourceCount > 0 || supportCount > 0
  const statusLabel = hasContent ? 'Ready' : hasPreparedMaterials ? 'Bound' : 'Empty'
  const writingStatusMeta = writingState && writingState.status !== 'idle'
    ? WRITING_STATUS_META[writingState.status]
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`document-section-row-${section.id}`}
      className={cn(
        'group flex items-start gap-3 rounded-2xl px-3 py-3 transition-all cursor-pointer',
        isActive
          ? 'bg-surface-container-highest shadow-[0px_12px_32px_rgba(25,28,30,0.06)]'
          : 'bg-surface-container-low hover:bg-surface-container',
        isDragging && 'opacity-50',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/50 hover:text-foreground"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            'h-2 w-2 rounded-full',
            hasContent || hasPreparedMaterials ? 'bg-[#188ace]' : 'bg-muted-foreground/30',
          )}
          />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {statusLabel}
          </span>
          {writingStatusMeta && (
            <span
              data-testid={`document-section-writing-${section.id}`}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                writingStatusMeta.className,
              )}
            >
              {writingStatusMeta.label}
            </span>
          )}
        </div>
        {editing ? (
          <input
            ref={inputRef}
            defaultValue={section.title}
            className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
            onBlur={handleFinishEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleFinishEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p
            className={cn('mt-1 text-sm font-medium truncate', !hasContent && !hasPreparedMaterials && 'text-muted-foreground')}
            onDoubleClick={handleStartEdit}
            title="더블클릭하여 제목 편집"
          >
            {section.title}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{sourceCount > 0 ? `원본 ${sourceCount}` : '원본 없음'}</span>
          <span>{supportCount > 0 ? `문헌 ${supportCount}` : '문헌 없음'}</span>
          <span>{section.generatedBy === 'llm' ? 'AI 초안' : section.generatedBy === 'template' ? '구조 자동화' : '직접 작성'}</span>
        </div>
      </div>
      <Badge
        variant="secondary"
        className="shrink-0 gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-medium text-secondary"
      >
        <MetaIcon className="w-3 h-3" />
        {meta.label}
      </Badge>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            onClick={e => e.stopPropagation()}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>섹션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{section.title}&rdquo; 섹션을 삭제하시겠습니까? 작성된 내용이 모두 사라집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── 메인 ──

interface DocumentSectionListProps {
  sections: DocumentSection[]
  sectionStates?: Record<string, DocumentWritingSectionState>
  activeSectionId: string | null
  onSelectSection: (id: string) => void
  onReorder: (sections: DocumentSection[]) => void
  onDeleteSection: (id: string) => void
  onRenameSection: (id: string, newTitle: string) => void
  onAddSection: () => void
}

export default function DocumentSectionList({
  sections,
  sectionStates,
  activeSectionId,
  onSelectSection,
  onReorder,
  onDeleteSection,
  onRenameSection,
  onAddSection,
}: DocumentSectionListProps): React.ReactElement {
  const filledCount = useMemo(() => (
    sections.filter((section) => (
      section.content.length > 0 || (Array.isArray(section.plateValue) && section.plateValue.length > 0)
    )).length
  ), [sections])
  const autoSectionCount = useMemo(() => (
    sections.filter((section) => section.generatedBy !== 'user').length
  ), [sections])
  const activeIndex = useMemo(() => (
    activeSectionId ? sections.findIndex((section) => section.id === activeSectionId) : -1
  ), [activeSectionId, sections])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(arrayMove(sections, oldIndex, newIndex))
  }, [sections, onReorder])

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[24px] bg-surface-container px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Writing Map
            </p>
            <h2 className="text-sm font-semibold text-foreground">문서 목차</h2>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-medium text-on-surface-variant"
          >
            {filledCount}/{sections.length} 작성
          </Badge>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          드래그로 순서를 바꾸고, 제목은 더블클릭해 바로 수정할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-surface-container-high px-2.5 py-1">
            자동 섹션 {autoSectionCount}
          </span>
          {activeIndex >= 0 && (
            <span className="rounded-full bg-surface-container-high px-2.5 py-1">
              현재 {activeIndex + 1} / {sections.length}
            </span>
          )}
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map(section => (
            <SortableSectionItem
              key={section.id}
              section={section}
              writingState={sectionStates?.[section.id]}
              isActive={activeSectionId === section.id}
              onSelect={() => onSelectSection(section.id)}
              onDelete={() => onDeleteSection(section.id)}
              onRename={(newTitle) => onRenameSection(section.id, newTitle)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="secondary"
        size="sm"
        onClick={onAddSection}
        className="mt-1 gap-1 rounded-full bg-surface-container px-3 text-muted-foreground hover:bg-surface-container-high"
      >
        <Plus className="w-4 h-4" />
        섹션 추가
      </Button>
    </div>
  )
}
