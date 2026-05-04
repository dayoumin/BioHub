'use client'

import { useCallback, useState, useRef } from 'react'
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
import type { DocumentSection } from '@/lib/research/document-blueprint-types'

// ── generatedBy 아이콘/라벨 ──

const GENERATED_BY_META: Record<DocumentSection['generatedBy'], { icon: React.ElementType; label: string }> = {
  template: { icon: LayoutTemplate, label: '자동' },
  llm: { icon: Bot, label: 'AI' },
  user: { icon: PenLine, label: '직접' },
}

// ── 정렬 가능한 섹션 아이템 ──

interface SortableSectionItemProps {
  section: DocumentSection
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
}

function SortableSectionItem({ section, isActive, onSelect, onDelete, onRename }: SortableSectionItemProps): React.ReactElement {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 transition-all cursor-pointer group',
        isActive
          ? 'bg-surface-container-high text-foreground'
          : 'bg-surface-container-lowest hover:bg-surface-container-high',
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
        className="shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            defaultValue={section.title}
            className="text-sm font-medium w-full bg-transparent border-b border-primary outline-none"
            onBlur={handleFinishEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleFinishEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p
            className={cn('text-sm font-medium truncate', !hasContent && 'text-muted-foreground')}
            onDoubleClick={handleStartEdit}
            title="더블클릭하여 제목 편집"
          >
            {section.title}
          </p>
        )}
      </div>
      <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
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
  activeSectionId: string | null
  onSelectSection: (id: string) => void
  onReorder: (sections: DocumentSection[]) => void
  onDeleteSection: (id: string) => void
  onRenameSection: (id: string, newTitle: string) => void
  onAddSection: () => void
}

export default function DocumentSectionList({
  sections,
  activeSectionId,
  onSelectSection,
  onReorder,
  onDeleteSection,
  onRenameSection,
  onAddSection,
}: DocumentSectionListProps): React.ReactElement {
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
    <div className="flex flex-col gap-1">
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
              isActive={activeSectionId === section.id}
              onSelect={() => onSelectSection(section.id)}
              onDelete={() => onDeleteSection(section.id)}
              onRename={(newTitle) => onRenameSection(section.id, newTitle)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="ghost"
        size="sm"
        onClick={onAddSection}
        className="gap-1 mt-2 text-muted-foreground"
      >
        <Plus className="w-4 h-4" />
        섹션 추가
      </Button>
    </div>
  )
}
