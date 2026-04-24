import type { ProjectEntityKind } from '@biohub/types'

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

interface BuildProjectEntityNavigationUrlOptions {
  bioToolId?: string
}

export function buildProjectEntityNavigationUrl(
  entityKind: ProjectEntityKind,
  entityId: string,
  options?: BuildProjectEntityNavigationUrlOptions,
): string | undefined {
  const encodedEntityId = encodeURIComponent(entityId)

  switch (entityKind) {
    case 'analysis':
      return buildAnalysisHistoryUrl(entityId)
    case 'figure':
      return buildGraphStudioProjectUrl(entityId)
    case 'draft':
      return buildDocumentEditorUrl(entityId)
    case 'bio-tool-result': {
      if (options?.bioToolId) {
        return `/bio-tools?tool=${encodeURIComponent(options.bioToolId)}&history=${encodedEntityId}`
      }
      return `/bio-tools?history=${encodedEntityId}`
    }
    case 'blast-result':
      return `/genetics/barcoding?history=${encodedEntityId}`
    case 'seq-stats-result':
      return `/genetics/seq-stats?history=${encodedEntityId}`
    case 'similarity-result':
      return `/genetics/similarity?history=${encodedEntityId}`
    case 'phylogeny-result':
      return `/genetics/phylogeny?history=${encodedEntityId}`
    case 'bold-result':
      return `/genetics/bold-id?history=${encodedEntityId}`
    case 'translation-result':
      return `/genetics/translation?history=${encodedEntityId}`
    case 'protein-result':
      return `/genetics/protein?history=${encodedEntityId}`
    default:
      return undefined
  }
}
