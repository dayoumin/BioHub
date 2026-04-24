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
      const matchingSourceRef = section.sourceRefs.find(
        (sourceRef) => (
          getDocumentSourceId(sourceRef) === sourceId
          && (!options?.sourceKind || sourceRef.kind === options.sourceKind)
        ),
      )
      const matchingTable = (section.tables ?? []).find(
        (table) => (
          table.sourceAnalysisId === sourceId
          && (!options?.sourceKind || options.sourceKind === 'analysis')
        ),
      )
      const matchingFigure = (section.figures ?? []).find(
        (figure) => (
          (
            figure.entityId === sourceId
            && (!options?.sourceKind || options.sourceKind === 'figure')
          )
          || (
            figure.relatedAnalysisId === sourceId
            && (!options?.sourceKind || options.sourceKind === 'analysis')
          )
        ),
      )
      const hasSectionMatch = matchingSourceRef !== undefined

      if (!matchingTable && !matchingFigure && !hasSectionMatch) {
        continue
      }

      let usage: DocumentSourceUsage
      if (matchingTable) {
        usage = {
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
      } else if (matchingFigure) {
        usage = {
          documentId: document.id,
          documentTitle: document.title,
          sectionId: section.id,
          sectionTitle: section.title,
          kind: 'figure',
          label: matchingFigure.label,
          sourceKind: 'figure',
          sourceLabel: matchingSourceRef?.label ?? matchingFigure.label,
          artifactId: matchingFigure.entityId,
        }
      } else {
        usage = {
          documentId: document.id,
          documentTitle: document.title,
          sectionId: section.id,
          sectionTitle: section.title,
          kind: 'section',
          label: section.title,
          sourceKind: getSourceRefKind(matchingSourceRef),
          sourceLabel: matchingSourceRef?.label,
        }
      }

      usages.set(`${document.id}:${section.id}`, usage)
    }
  }

  return Array.from(usages.values())
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
