export function buildAnalysisHistoryUrl(historyId: string): string {
  return `/?history=${encodeURIComponent(historyId)}`
}

export function buildGraphStudioProjectUrl(projectId: string): string {
  return `/graph-studio?project=${encodeURIComponent(projectId)}`
}

export function buildDocumentEditorUrl(
  documentId: string,
  options?: {
    sectionId?: string
    tableId?: string
    figureId?: string
  },
): string {
  const params = new URLSearchParams({ doc: documentId })
  if (options?.sectionId) {
    params.set('section', options.sectionId)
  }
  if (options?.tableId) {
    params.set('table', options.tableId)
  }
  if (options?.figureId) {
    params.set('figure', options.figureId)
  }
  return `/papers?${params.toString()}`
}
