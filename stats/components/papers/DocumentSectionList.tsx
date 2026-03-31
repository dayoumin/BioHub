'use client'

import { useCallback } from 'react'
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
}

function SortableSectionItem({ section, isActive, onSelect, onDelete }: SortableSectionItemProps): React.ReactElement {
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
  const hasContent = section.content.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer group',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50',
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
        <p className={cn('text-sm font-medium truncate', !hasContent && 'text-muted-foreground')}>
          {section.title}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
        <MetaIcon className="w-3 h-3" />
        {meta.label}
      </Badge>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
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
  onAddSection: () => void
}

export default function DocumentSectionList({
  sections,
  activeSectionId,
  onSelectSection,
  onReorder,
  onDeleteSection,
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
