/**
 * Variable Selector Types
 */

import type { VariableMapping } from '@/lib/statistics/variable-mapping'

/**
 * Base props for all variable selectors
 */
export interface VariableSelectorProps {
  /** Raw data array */
  data: Record<string, unknown>[]
  /** Callback when selection is complete */
  onComplete: (mapping: VariableMapping) => void
  /** Optional back button handler */
  onBack?: () => void
  /** Pre-selected variables from AI recommendation */
  initialSelection?: Partial<VariableMapping>
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Result from variable selection
 */
export interface VariableSelectorResult {
  /** Is the selection valid */
  isValid: boolean
  /** Variable mapping */
  mapping: VariableMapping
  /** Validation errors if any */
  errors: string[]
}

/**
 * Column info for display
 */
export interface ColumnDisplay {
  name: string
  type: 'numeric' | 'categorical' | 'date' | 'text'
  uniqueCount: number
  min?: number
  max?: number
  mean?: number
}