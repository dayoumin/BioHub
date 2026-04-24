import type {
  DocumentBlueprint,
  DocumentSection,
  DocumentSourceRef,
  DocumentTable,
  FigureRef,
  DocumentWritingSectionState,
  DocumentWritingSectionStatus,
  DocumentWritingState,
  DocumentWritingStatus,
} from './document-blueprint-types'
import {
  buildDocumentTableId,
  normalizeDocumentWritingState,
} from './document-blueprint-types'

interface WritingStateUpdateOptions {
  jobId?: string
  updatedAt?: string
  startedAt?: string
  errorMessage?: string
}

interface SectionStateUpdateOptions {
  jobId?: string
  updatedAt?: string
  message?: string
}

function nextTimestamp(updatedAt?: string): string {
  return updatedAt ?? new Date().toISOString()
}

export function updateDocumentWritingState(
  document: DocumentBlueprint,
  status: DocumentWritingStatus,
  options: WritingStateUpdateOptions = {},
): DocumentBlueprint {
  const current = normalizeDocumentWritingState(document.writingState)
  const next: DocumentWritingState = {
    ...current,
    status,
    jobId: options.jobId ?? current.jobId,
    startedAt: options.startedAt ?? current.startedAt,
    updatedAt: nextTimestamp(options.updatedAt),
    errorMessage: options.errorMessage,
  }

  return {
    ...document,
    writingState: next,
  }
}

export function updateDocumentSectionWritingState(
  document: DocumentBlueprint,
  sectionId: string,
  status: DocumentWritingSectionStatus,
  options: SectionStateUpdateOptions = {},
): DocumentBlueprint {
  const current = normalizeDocumentWritingState(document.writingState)
  const sectionState: DocumentWritingSectionState = {
    ...current.sectionStates[sectionId],
    status,
    jobId: options.jobId ?? current.sectionStates[sectionId]?.jobId ?? current.jobId,
    updatedAt: nextTimestamp(options.updatedAt),
    message: options.message,
  }

  return {
    ...document,
    writingState: {
      ...current,
      updatedAt: nextTimestamp(options.updatedAt),
      sectionStates: {
        ...current.sectionStates,
        [sectionId]: sectionState,
      },
    },
  }
}

export function shouldSkipDocumentSectionBodyPatch(section: DocumentSection): boolean {
  return section.generatedBy === 'user'
}

function dedupeSourceRefs(sourceRefs: readonly DocumentSourceRef[]): DocumentSourceRef[] {
  const seen = new Map<string, DocumentSourceRef>()
  for (const sourceRef of sourceRefs) {
    const key = `${sourceRef.kind}:${sourceRef.sourceId}`
    if (!seen.has(key)) {
      seen.set(key, sourceRef)
    }
  }
  return Array.from(seen.values())
}

function mergeDocumentTables(
  currentTables: readonly DocumentTable[] | undefined,
  nextTables: readonly DocumentTable[] | undefined,
): DocumentTable[] | undefined {
  if (!nextTables) {
    return currentTables ? [...currentTables] : undefined
  }

  const merged = new Map<string, DocumentTable>()
  for (const table of currentTables ?? []) {
    const id = table.id ?? buildDocumentTableId(table)
    merged.set(id, {
      ...table,
      id,
    })
  }
  for (const table of nextTables) {
    const id = table.id ?? buildDocumentTableId(table)
    merged.set(id, {
      ...table,
      id,
    })
  }

  return Array.from(merged.values())
}

function mergeDocumentFigures(
  currentFigures: readonly FigureRef[] | undefined,
  nextFigures: readonly FigureRef[] | undefined,
): FigureRef[] | undefined {
  if (!nextFigures) {
    return currentFigures ? [...currentFigures] : undefined
  }

  const merged = new Map<string, FigureRef>()
  for (const figure of currentFigures ?? []) {
    merged.set(figure.entityId, figure)
  }
  for (const figure of nextFigures) {
    merged.set(figure.entityId, figure)
  }

  return Array.from(merged.values())
}

export function mergeDocumentSectionPatch(
  section: DocumentSection,
  patch: Partial<DocumentSection>,
): DocumentSection {
  const preserveBody = shouldSkipDocumentSectionBodyPatch(section)

  return {
    ...section,
    ...patch,
    content: preserveBody ? section.content : (patch.content ?? section.content),
    plateValue: preserveBody ? section.plateValue : (patch.plateValue ?? section.plateValue),
    sourceRefs: patch.sourceRefs
      ? dedupeSourceRefs([...(section.sourceRefs ?? []), ...patch.sourceRefs])
      : section.sourceRefs,
    tables: mergeDocumentTables(section.tables, patch.tables),
    figures: mergeDocumentFigures(section.figures, patch.figures),
    generatedBy: section.generatedBy === 'user'
      ? 'user'
      : (patch.generatedBy ?? section.generatedBy),
  }
}
