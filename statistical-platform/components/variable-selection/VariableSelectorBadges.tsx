'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

export interface VariableSelectorBadgesProps {
  /** Available column names to select from */
  columns: string[]
  /** Currently selected value(s) - string for single, string[] for multi-select */
  selectedValue?: string | string[]
  /** Callback when a column is selected */
  onSelect: (header: string) => void
  /** Enable multi-select mode */
  multiSelect?: boolean
  /** Placeholder text when no columns available */
  placeholder?: string
  /** Maximum width for each badge (default: 200px) */
  maxBadgeWidth?: number
  /** Custom class name for container */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * Badge-based variable selector component
 *
 * Used for selecting columns from uploaded data in statistics pages.
 * Supports both single and multi-select modes.
 *
 * @example
 * // Single select
 * <VariableSelectorBadges
 *   columns={['age', 'weight', 'height']}
 *   selectedValue={selectedVar}
 *   onSelect={(header) => setSelectedVar(header)}
 * />
 *
 * @example
 * // Multi select
 * <VariableSelectorBadges
 *   columns={['var1', 'var2', 'var3']}
 *   selectedValue={selectedVars}
 *   onSelect={handleMultiSelect}
 *   multiSelect
 * />
 */
export function VariableSelectorBadges({
  columns,
  selectedValue,
  onSelect,
  _multiSelect = false,
  placeholder = 'No columns available',
  maxBadgeWidth = 200,
  className = '',
  disabled = false
}: VariableSelectorBadgesProps) {
  const isSelected = (header: string): boolean => {
    if (!selectedValue) return false
    if (Array.isArray(selectedValue)) {
      return selectedValue.includes(header)
    }
    return selectedValue === header
  }

  const handleClick = (header: string) => {
    if (disabled) return
    onSelect(header)
  }

  const handleKeyDown = (e: React.KeyboardEvent, header: string) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(header)
    }
  }

  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{placeholder}</p>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {columns.map((header) => {
        const selected = isSelected(header)
        return (
          <Badge
            key={header}
            variant={selected ? 'default' : 'outline'}
            className={`cursor-pointer truncate ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ maxWidth: maxBadgeWidth }}
            title={header}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={selected}
            aria-label={`${header}${selected ? ' (selected)' : ''}`}
            onClick={() => handleClick(header)}
            onKeyDown={(e) => handleKeyDown(e, header)}
          >
            {header}
            {selected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
          </Badge>
        )
      })}
    </div>
  )
}
