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
  },
): string {
  const params = new URLSearchParams({ doc: documentId })
  if (options?.sectionId) {
    params.set('section', options.sectionId)
  }
  return `/papers?${params.toString()}`
}
