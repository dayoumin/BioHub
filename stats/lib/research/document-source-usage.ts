import { getDocumentSourceId, type DocumentBlueprint } from './document-blueprint-types'
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
  artifactId?: string
}

function sortDocuments(documents: DocumentBlueprint[]): DocumentBlueprint[] {
  return [...documents].sort((left, right) => (
    (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
  ))
}

export function findDocumentSourceUsages(
  documents: DocumentBlueprint[],
  sourceId: string,
): DocumentSourceUsage[] {
  const usages = new Map<string, DocumentSourceUsage>()

  for (const document of sortDocuments(documents)) {
    for (const section of document.sections) {
      const matchingTable = (section.tables ?? []).find(
        (table) => table.sourceAnalysisId === sourceId,
      )
      const matchingFigure = (section.figures ?? []).find(
        (figure) => figure.entityId === sourceId || figure.relatedAnalysisId === sourceId,
      )
      const hasSectionMatch = section.sourceRefs.some(
        (sourceRef) => getDocumentSourceId(sourceRef) === sourceId,
      )

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
        }
      }

      usages.set(`${document.id}:${section.id}`, usage)
    }
  }

  return Array.from(usages.values())
}

export async function loadDocumentSourceUsages(
  sourceId: string,
  options?: { projectId?: string },
): Promise<DocumentSourceUsage[]> {
  if (!options?.projectId) {
    const documents = await loadAllDocumentBlueprints()
    return findDocumentSourceUsages(documents, sourceId)
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
          && edge.targetId === sourceId
        ))
      ))
      .map((ref) => ref.entityId),
  )

  const candidateDocuments = draftDocumentIds.size > 0
    ? documents.filter((document) => draftDocumentIds.has(document.id))
    : documents

  return findDocumentSourceUsages(candidateDocuments, sourceId)
}
