'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

/**
 * FilterToggle - Pill Style Toggle Component (Style 4)
 *
 * Use for toggling options within the same content view.
 * Stripe/Tailwind style with pill indicator.
 *
 * When to use:
 * - Toggling visualization options (Histogram vs Boxplot)
 * - Filter options that don't change the main content
 * - Quick option switching within a section
 *
 * @example
 * ```tsx
 * const [chartType, setChartType] = useState('histogram')
 *
 * <FilterToggle
 *   options={[
 *     { id: 'histogram', label: 'Histogram', icon: BarChart3 },
 *     { id: 'boxplot', label: 'Boxplot', icon: GitCommitHorizontal }
 *   ]}
 *   value={chartType}
 *   onChange={setChartType}
 * />
 * ```
 */

export interface FilterOption {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

interface FilterToggleProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  /** Size variant (default: sm) */
  size?: 'sm' | 'md'
  /** Accessible label for the toggle group */
  ariaLabel?: string
}

export function FilterToggle({
  options,
  value,
  onChange,
  className,
  size = 'sm',
  ariaLabel = 'Filter options'
}: FilterToggleProps) {
  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-9 text-sm px-3'
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg bg-muted p-1",
        className
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map(option => {
        const Icon = option.icon
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={isActive}
            onClick={() => !option.disabled && onChange(option.id)}
            disabled={option.disabled}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all",
              sizeClasses[size],
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {Icon && <Icon className={cn(size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4")} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * FilterToggleGroup - Multiple filter toggles in a row
 *
 * @example
 * ```tsx
 * <FilterToggleGroup>
 *   <FilterToggle options={chartOptions} value={chart} onChange={setChart} />
 *   <FilterToggle options={colorOptions} value={color} onChange={setColor} />
 * </FilterToggleGroup>
 * ```
 */
interface FilterToggleGroupProps {
  children: ReactNode
  className?: string
}

export function FilterToggleGroup({
  children,
  className
}: FilterToggleGroupProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {children}
    </div>
  )
}
