import type { AnalysisResult, DataRow, ValidationResults } from '@/types/analysis'

interface HistoryResultsViewState {
  currentHistoryId: string | null
  results: AnalysisResult | null
  uploadedData: DataRow[] | null
  validationResults: ValidationResults | null
}

export function isHistoryResultsView({
  currentHistoryId,
  results,
  uploadedData,
  validationResults,
}: HistoryResultsViewState): boolean {
  return Boolean(
    currentHistoryId
      && results
      && !uploadedData
      && !validationResults,
  )
}
