'use client'

import { Button } from '@/components/ui/button'
import { BIOLOGY_PANEL_SOFT } from '@/lib/design-tokens/biology'

interface GeneticsExamplePickerItem {
  id: string
  label: string
  description: string
}

interface GeneticsExamplePickerProps<T extends GeneticsExamplePickerItem> {
  title: string
  description: string
  items: readonly T[]
  onSelect: (item: T) => void
}

export function GeneticsExamplePicker<T extends GeneticsExamplePickerItem>({
  title,
  description,
  items,
  onSelect,
}: GeneticsExamplePickerProps<T>): React.ReactElement | null {
  if (items.length === 0) {
    return null
  }

  return (
    <section className={`${BIOLOGY_PANEL_SOFT} space-y-3 p-4`}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelect(item)}
            className="border-0 bg-surface-container-lowest text-left text-foreground hover:bg-surface-container-high"
          >
            {item.label}
          </Button>
        ))}
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={`${item.id}-desc`} className="text-xs text-muted-foreground/80">
            <span className="font-medium text-foreground/90">{item.label}</span>
            {' — '}
            {item.description}
          </li>
        ))}
      </ul>
    </section>
  )
}
