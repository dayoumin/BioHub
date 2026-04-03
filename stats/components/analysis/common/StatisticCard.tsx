'use client'

import { type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface StatisticCardProps {
  label: string
  tooltip: string
  children: ReactNode
  className?: string
}

/**
 * Requires a parent <TooltipProvider> wrapper.
 */
export function StatisticCard({ label, tooltip, children, className }: StatisticCardProps) {
  return (
    <div className={cn(
      "text-center p-4 rounded-xl",
      "bg-surface-container-lowest",
      "shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]",
      className
    )}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center justify-center gap-1">
              {label}
              <HelpCircle className="w-2.5 h-2.5" />
            </p>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
