'use client'

import { useCallback } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Star } from 'lucide-react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { focusRing } from '@/components/common/card-styles'
import { cn } from '@/lib/utils'

interface SortablePinnedItem {
  id: string
}

interface SortablePinnedCardGridProps<T extends SortablePinnedItem> {
  items: readonly T[]
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  maxItems?: number
  onReorder: (activeId: string, overId: string) => void
  renderCard: (item: T, dragHandle: ReactNode) => ReactElement
  getItemLabel: (item: T) => string
  accentStyle?: CSSProperties
  gridClassName?: string
  dataTestId?: string
}

interface SortablePinnedCardItemProps<T extends SortablePinnedItem> {
  item: T
  renderCard: (item: T, dragHandle: ReactNode) => ReactElement
  getItemLabel: (item: T) => string
}

function SortablePinnedCardItem<T extends SortablePinnedItem>({
  item,
  renderCard,
  getItemLabel,
}: SortablePinnedCardItemProps<T>): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      className={cn(
        'absolute left-3 top-3 z-20 rounded-md p-1.5 text-muted-foreground/45 transition-colors hover:bg-muted hover:text-muted-foreground',
        focusRing,
      )}
      aria-label={`${getItemLabel(item)} 순서 이동`}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('h-full', isDragging && 'z-10 opacity-80')}
    >
      {renderCard(item, dragHandle)}
    </div>
  )
}

export function SortablePinnedCardGrid<T extends SortablePinnedItem>({
  items,
  title,
  description,
  emptyTitle,
  emptyDescription,
  maxItems = 6,
  onReorder,
  renderCard,
  getItemLabel,
  accentStyle,
  gridClassName,
  dataTestId,
}: SortablePinnedCardGridProps<T>): ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    onReorder(String(active.id), String(over.id))
  }, [onReorder])

  return (
    <section className="space-y-3" data-testid={dataTestId}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Star className="mt-0.5 h-3.5 w-3.5 fill-current text-muted-foreground/45" style={accentStyle} />
          <div>
            <h2 className="text-base font-semibold text-foreground/90">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground/70">
          {items.length}/{maxItems}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] bg-surface-container-low px-5 py-4">
          <p className="text-sm font-medium text-foreground/90">{emptyTitle}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground/75">{emptyDescription}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
            <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', gridClassName)}>
              {items.map((item) => (
                <SortablePinnedCardItem
                  key={item.id}
                  item={item}
                  renderCard={renderCard}
                  getItemLabel={getItemLabel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
