import { getDocumentSourceId, type DocumentBlueprint } from './document-blueprint-types'
import {
  loadAllDocumentBlueprints,
  loadDocumentBlueprints,
} from './document-blueprint-storage'

export interface DocumentSourceUsage {
  documentId: string
  documentTitle: string
  sectionId: string
  sectionTitle: string
  kind: 'section' | 'table' | 'figure'
  label: string
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
        }
      } else if (matchingFigure) {
        usage = {
          documentId: document.id,
          documentTitle: document.title,
          sectionId: section.id,
          sectionTitle: section.title,
          kind: 'figure',
          label: matchingFigure.label,
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
  const documents = options?.projectId
    ? await loadDocumentBlueprints(options.projectId)
    : await loadAllDocumentBlueprints()
  return findDocumentSourceUsages(documents, sourceId)
}
