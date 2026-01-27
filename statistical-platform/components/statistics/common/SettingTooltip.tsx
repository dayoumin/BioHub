'use client'

import React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SettingDescription, SettingOption } from '@/lib/statistics/variable-requirements'

export interface SettingTooltipProps {
  /** Setting metadata from variable-requirements.ts */
  setting: SettingDescription
  /** Custom trigger element (default: HelpCircle icon) */
  trigger?: React.ReactNode
  /** Popover alignment */
  align?: 'start' | 'center' | 'end'
  /** Popover side */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Custom class name for popover content */
  className?: string
}

/**
 * SettingTooltip - Popover tooltip for analysis settings
 *
 * Displays setting description, available options, default value, and valid range
 * in a compact popover triggered by a help icon.
 *
 * @example
 * const alphaConfig = method.settings?.alpha
 * <SettingTooltip setting={alphaConfig} />
 *
 * @example
 * // Custom trigger
 * <SettingTooltip setting={setting} trigger={<InfoIcon />} />
 */
export function SettingTooltip({
  setting,
  trigger,
  align = 'center',
  side = 'top',
  className
}: SettingTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center justify-center h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">{setting.label} 도움말</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className={cn('w-80 p-4', className)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">{setting.label}</h4>
            <p className="text-sm text-muted-foreground">
              {setting.description}
            </p>
          </div>

          {/* Options */}
          {setting.options && setting.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">선택 옵션:</p>
              <div className="space-y-2">
                {setting.options.map((option: SettingOption) => (
                  <div
                    key={String(option.value)}
                    className={cn(
                      'rounded-md border p-2',
                      option.value === setting.default && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {option.label}
                      </Badge>
                      {option.value === setting.default && (
                        <Badge className="text-xs">기본값</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Range */}
          {setting.range && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">유효 범위:</span>
              <Badge variant="secondary">
                {setting.range.min} ~ {setting.range.max}
              </Badge>
            </div>
          )}

          {/* Default value (when no options) */}
          {!setting.options && setting.default !== undefined && setting.default !== null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">기본값:</span>
              <Badge variant="secondary">{String(setting.default)}</Badge>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * SettingLabel - Label with integrated tooltip
 *
 * Convenience component that combines a label with SettingTooltip
 *
 * @example
 * <SettingLabel setting={method.settings?.alpha} />
 */
export interface SettingLabelProps {
  /** Setting metadata */
  setting: SettingDescription
  /** Custom label text (overrides setting.label) */
  label?: string
  /** Additional class for the label */
  className?: string
}

export function SettingLabel({
  setting,
  label,
  className
}: SettingLabelProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-sm font-medium">
        {label || setting.label}
      </span>
      <SettingTooltip setting={setting} />
    </div>
  )
}
