import type { ValidationResults } from '@/types/analysis'
import type { HubDataContext } from '@/lib/stores/hub-chat-store'

export function buildHubDataContext(
  fileName: string,
  validationResults: ValidationResults,
): HubDataContext {
  const columns = validationResults.columns ?? validationResults.columnStats ?? []
  const numericColumns = columns
    .filter((column) => column.type === 'numeric')
    .map((column) => column.name)
  const categoricalColumns = columns
    .filter((column) => column.type === 'categorical')
    .map((column) => column.name)

  return {
    fileName,
    totalRows: validationResults.totalRows,
    columnCount: columns.length,
    numericColumns,
    categoricalColumns,
    validationResults,
  }
}
