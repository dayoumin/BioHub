'use client'

import { type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface StatisticCardProps {
  label: string
  tooltip: string
  children: ReactNode
}

/**
 * Requires a parent <TooltipProvider> wrapper.
 */
export function StatisticCard({ label, tooltip, children }: StatisticCardProps) {
  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              {label}
              <HelpCircle className="w-3 h-3" />
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
