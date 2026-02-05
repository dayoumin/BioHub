'use client'

import { type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface CollapsibleSectionProps {
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  contentClassName?: string
  children: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}

export function CollapsibleSection({
  label,
  open,
  onOpenChange,
  contentClassName,
  children,
  icon,
  badge,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between" size="sm">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {icon}
            {label}
            {badge}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className={contentClassName}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
