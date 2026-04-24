import {
  getDocumentSourceId,
  type DocumentBlueprint,
  type DocumentSourceKind,
  type DocumentSourceRef,
} from './document-blueprint-types'
import {
  loadAllDocumentBlueprints,
  loadDocumentBlueprints,
} from './document-blueprint-storage'
import { listProjectEntityRefs } from './project-storage'

export interface DocumentSourceUsage {
  documentId: string
  documentTitle: string
  sectionId: string
  sectionTitle: string
  kind: 'section' | 'table' | 'figure'
  label: string
  sourceKind?: DocumentSourceKind
  sourceLabel?: string
  artifactId?: string
}

interface FindDocumentSourceUsagesOptions {
  sourceKind?: DocumentSourceKind
}

function sortDocuments(documents: DocumentBlueprint[]): DocumentBlueprint[] {
  return [...documents].sort((left, right) => (
    (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
  ))
}

export function findDocumentSourceUsages(
  documents: DocumentBlueprint[],
  sourceId: string,
  options?: FindDocumentSourceUsagesOptions,
): DocumentSourceUsage[] {
  const usages = new Map<string, DocumentSourceUsage>()

  for (const document of sortDocuments(documents)) {
    for (const section of document.sections) {
      const matchingSourceRefs = section.sourceRefs.filter(
        (sourceRef) => (
          getDocumentSourceId(sourceRef) === sourceId
          && (!options?.sourceKind || sourceRef.kind === options.sourceKind)
        ),
      )
      const matchingTables = (section.tables ?? []).filter(
        (table) => (
          table.sourceAnalysisId === sourceId
          && (!options?.sourceKind || options.sourceKind === 'analysis')
        ),
      )
      const matchingFigureUsages: DocumentSourceUsage[] = (section.figures ?? []).flatMap((figure): DocumentSourceUsage[] => {
        if (figure.entityId === sourceId && (!options?.sourceKind || options.sourceKind === 'figure')) {
          const matchingFigureSourceRef = matchingSourceRefs.find((sourceRef) => sourceRef.kind === 'figure')
          return [{
            documentId: document.id,
            documentTitle: document.title,
            sectionId: section.id,
            sectionTitle: section.title,
            kind: 'figure' as const,
            label: figure.label,
            sourceKind: 'figure' as const,
            sourceLabel: matchingFigureSourceRef?.label ?? figure.label,
            artifactId: figure.entityId,
          }]
        }

        if (figure.relatedAnalysisId === sourceId && (!options?.sourceKind || options.sourceKind === 'analysis')) {
          const matchingAnalysisSourceRef = matchingSourceRefs.find((sourceRef) => sourceRef.kind === 'analysis')
          return [{
            documentId: document.id,
            documentTitle: document.title,
            sectionId: section.id,
            sectionTitle: section.title,
            kind: 'figure' as const,
            label: figure.label,
            sourceKind: 'analysis' as const,
            sourceLabel: matchingAnalysisSourceRef?.label ?? figure.relatedAnalysisLabel,
            artifactId: figure.entityId,
          }]
        }

        return []
      })

      if (matchingTables.length === 0 && matchingFigureUsages.length === 0 && matchingSourceRefs.length === 0) {
        continue
      }

      for (const matchingTable of matchingTables) {
        const usage: DocumentSourceUsage = {
          documentId: document.id,
          documentTitle: document.title,
          sectionId: section.id,
          sectionTitle: section.title,
          kind: 'table',
          label: matchingTable.caption || section.title,
          sourceKind: 'analysis',
          sourceLabel: matchingTable.sourceAnalysisLabel,
          artifactId: matchingTable.id,
        }
        usages.set(buildUsageKey(usage), usage)
      }

      for (const usage of matchingFigureUsages) {
        usages.set(buildUsageKey(usage), usage)
      }

      if (matchingTables.length === 0 && matchingFigureUsages.length === 0) {
        for (const matchingSourceRef of matchingSourceRefs) {
          const usage: DocumentSourceUsage = {
            documentId: document.id,
            documentTitle: document.title,
            sectionId: section.id,
            sectionTitle: section.title,
            kind: 'section',
            label: section.title,
            sourceKind: getSourceRefKind(matchingSourceRef),
            sourceLabel: matchingSourceRef.label,
          }
          usages.set(buildUsageKey(usage), usage)
        }
      }
    }
  }

  return Array.from(usages.values())
}

function buildUsageKey(usage: DocumentSourceUsage): string {
  return [
    usage.documentId,
    usage.sectionId,
    usage.kind,
    usage.artifactId ?? usage.sourceKind ?? usage.label,
  ].join(':')
}

function getSourceRefKind(sourceRef: DocumentSourceRef | undefined): DocumentSourceKind | undefined {
  return sourceRef?.kind
}

export async function loadDocumentSourceUsages(
  sourceId: string,
  options?: { projectId?: string; sourceKind?: DocumentSourceKind },
): Promise<DocumentSourceUsage[]> {
  if (!options?.projectId) {
    const documents = await loadAllDocumentBlueprints()
    return findDocumentSourceUsages(documents, sourceId, {
      sourceKind: options?.sourceKind,
    })
  }

  const [documents, projectEntityRefs] = await Promise.all([
    loadDocumentBlueprints(options.projectId),
    Promise.resolve(listProjectEntityRefs(options.projectId)),
  ])

  const draftDocumentIds = new Set(
    projectEntityRefs
      .filter((ref) => (
        ref.entityKind === 'draft'
        && (ref.provenanceEdges ?? []).some((edge) => (
          (edge.targetKind === 'analysis' || edge.targetKind === 'figure')
          && (!options.sourceKind || edge.targetKind === options.sourceKind)
          && edge.targetId === sourceId
        ))
      ))
      .map((ref) => ref.entityId),
  )

  const candidateDocuments = draftDocumentIds.size > 0
    ? documents.filter((document) => draftDocumentIds.has(document.id))
    : documents

  return findDocumentSourceUsages(candidateDocuments, sourceId, {
    sourceKind: options.sourceKind,
  })
}
