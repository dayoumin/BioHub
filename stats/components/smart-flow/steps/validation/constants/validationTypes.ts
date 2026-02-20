import { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

export interface DataValidationStepProps {
  validationResults: ValidationResults | null
  data: any[] | null
}

export interface CorrelationMatrixData {
  matrix: number[][]
  labels: string[]
}

export interface ChartModalState {
  column: ColumnStatistics | null
  isOpen: boolean
}

// Type guard for ValidationResults with columnStats
export function hasColumnStats(results: ValidationResults | null): results is ValidationResults & { columnStats: ColumnStatistics[] } {
  return results !== null && 'columnStats' in results && Array.isArray(results.columnStats)
}

// Check if column is numeric
export function isNumericColumn(column: ColumnStatistics): boolean {
  return column.type === 'numeric'
}

// Check if column is categorical
export function isCategoricalColumn(column: ColumnStatistics): boolean {
  return column.type === 'categorical' || column.uniqueValues <= 20
}