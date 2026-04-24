import { listProjects } from '@/lib/graph-studio'
import { getAllHistory } from '@/lib/utils/storage'
import { generateId } from '@/lib/utils/generate-id'
import type { ProjectEntityRef } from '@biohub/types'
import { listProjectEntityRefs } from './project-storage'
import { createEmptySections } from './document-preset-registry'
import {
  buildFigureRef,
  createDocumentSourceRef,
  generateDocumentId,
  getGraphPrimaryAnalysisId,
  type DocumentBlueprint,
  type DocumentMetadata,
  type DocumentPreset,
  type DocumentSection,
  type DocumentSourceRef,
} from './document-blueprint-types'
import { loadDocumentBlueprint, saveDocumentBlueprint } from './document-blueprint-storage'
import { updateDocumentSectionWritingState, updateDocumentWritingState } from './document-writing'
import { retryDocumentWriting } from './document-writing-orchestrator'
import type {
  RetryWritingSessionInput,
  StartManualBlankWritingSessionInput,
  StartSourceBoundWritingSessionInput,
  StartWritingSessionInput,
  WritingSourceRequest,
} from './document-writing-source-types'
import type { GraphProject } from '@/types/graph-studio'

export const DOCUMENT_WRITING_ENTITY_KINDS = [
  'analysis',
  'figure',
  'bio-tool-result',
  'blast-result',
  'protein-result',
  'seq-stats-result',
  'similarity-result',
  'phylogeny-result',
  'bold-result',
  'translation-result',
] as const satisfies readonly ProjectEntityRef['entityKind'][]

interface CreateDocumentWritingSessionSourceEntityIds {
  analysisIds?: string[]
  figureIds?: string[]
  entityIds?: string[]
}

export interface CreateDocumentWritingSessionOptions {
  projectId: string
  title: string
  preset?: DocumentPreset
  language?: 'ko' | 'en'
  authors?: string[]
  metadata?: DocumentMetadata
  sourceEntityIds?: CreateDocumentWritingSessionSourceEntityIds
}

interface SelectedFigureEntry {
  entityRef: ProjectEntityRef
  graphProject: GraphProject
}

export function canCreateDocumentWritingSessionForEntityKind(
  entityKind: ProjectEntityRef['entityKind'],
): boolean {
  return (DOCUMENT_WRITING_ENTITY_KINDS as readonly ProjectEntityRef['entityKind'][]).includes(entityKind)
}

function buildSelectedEntityRefs(
  entityRefs: ProjectEntityRef[],
  sourceEntityIds: CreateDocumentWritingSessionSourceEntityIds | undefined,
): ProjectEntityRef[] {
  const analysisIds = new Set(sourceEntityIds?.analysisIds ?? [])
  const figureIds = new Set(sourceEntityIds?.figureIds ?? [])
  const entityIds = new Set(sourceEntityIds?.entityIds ?? [])
  const hasFilter = analysisIds.size > 0 || figureIds.size > 0 || entityIds.size > 0
  const supplementaryRefsById = new Map<string, ProjectEntityRef[]>()

  for (const entityRef of entityRefs) {
    if (
      entityRef.entityKind !== 'analysis'
      && entityRef.entityKind !== 'figure'
      && entityIds.has(entityRef.entityId)
    ) {
      const existingRefs = supplementaryRefsById.get(entityRef.entityId)
      if (existingRefs) {
        existingRefs.push(entityRef)
      } else {
        supplementaryRefsById.set(entityRef.entityId, [entityRef])
      }
    }
  }

  const unambiguousSupplementaryKeys = new Set(
    Array.from(supplementaryRefsById.values())
      .filter((refs) => refs.length === 1)
      .map(([entityRef]) => `${entityRef.entityKind}:${entityRef.entityId}`),
  )

  return entityRefs.filter((entityRef) => {
    if (!hasFilter) {
      return canCreateDocumentWritingSessionForEntityKind(entityRef.entityKind)
    }

    if (entityRef.entityKind === 'analysis') {
      return analysisIds.has(entityRef.entityId)
    }

    if (entityRef.entityKind === 'figure') {
      return figureIds.has(entityRef.entityId)
    }

    return unambiguousSupplementaryKeys.has(`${entityRef.entityKind}:${entityRef.entityId}`)
  })
}

function buildSelectedEntityRefsFromRequests(
  entityRefs: ProjectEntityRef[],
  requestedSources: readonly WritingSourceRequest[],
): ProjectEntityRef[] {
  const requestKeys = new Set(requestedSources.map((request) => `${request.entityKind}:${request.entityId}`))
  return entityRefs.filter((entityRef) => requestKeys.has(`${entityRef.entityKind}:${entityRef.entityId}`))
}

function dedupeSourceRefs(sourceRefs: readonly DocumentSourceRef[]): DocumentSourceRef[] {
  const merged = new Map<string, DocumentSourceRef>()

  for (const sourceRef of sourceRefs) {
    const key = `${sourceRef.kind}:${sourceRef.sourceId}`
    if (!merged.has(key)) {
      merged.set(key, sourceRef)
    }
  }

  return Array.from(merged.values())
}

async function applySourceBindings(
  sections: DocumentSection[],
  selectedEntityRefs: ProjectEntityRef[],
): Promise<DocumentSection[]> {
  const historyEntries = await getAllHistory()
  const graphProjects = listProjects()
  const historyById = new Map(historyEntries.map((entry) => [entry.id, entry] as const))
  const graphById = new Map(graphProjects.map((graphProject) => [graphProject.id, graphProject] as const))

  const analysisSourceRefs = selectedEntityRefs
    .filter((entityRef) => entityRef.entityKind === 'analysis')
    .map((entityRef) => {
      const historyEntry = historyById.get(entityRef.entityId)
      return createDocumentSourceRef('analysis', entityRef.entityId, {
        label: historyEntry?.method?.name ?? historyEntry?.name ?? entityRef.label,
      })
    })

  const selectedFigures = selectedEntityRefs
    .filter((entityRef) => entityRef.entityKind === 'figure')
    .map((entityRef) => ({ entityRef, graphProject: graphById.get(entityRef.entityId) }))
    .filter((entry): entry is SelectedFigureEntry => entry.graphProject !== undefined)

  const figureSourceRefs = selectedFigures.map(({ entityRef, graphProject }) => createDocumentSourceRef('figure', entityRef.entityId, {
    label: graphProject.name ?? entityRef.label,
  }))

  const inferredAnalysisSourceRefs = selectedFigures
    .map(({ entityRef, graphProject }) => {
      const relatedAnalysisId = entityRef.provenanceEdges
        ?.find((edge) => edge.targetKind === 'analysis')
        ?.targetId ?? getGraphPrimaryAnalysisId(graphProject)
      if (!relatedAnalysisId) {
        return null
      }
      const relatedHistory = historyById.get(relatedAnalysisId)
      return createDocumentSourceRef('analysis', relatedAnalysisId, {
        label: relatedHistory?.method?.name ?? relatedHistory?.name,
      })
    })
    .filter((sourceRef): sourceRef is DocumentSourceRef => sourceRef !== null)

  const mergedAnalysisSourceRefs = dedupeSourceRefs([
    ...analysisSourceRefs,
    ...inferredAnalysisSourceRefs,
  ])
  const supplementarySourceRefs = selectedEntityRefs
    .filter((entityRef) => entityRef.entityKind !== 'analysis' && entityRef.entityKind !== 'figure')
    .map((entityRef) => createDocumentSourceRef('supplementary', entityRef.entityId, {
      label: entityRef.label,
    }))

  return sections.map((section) => {
    if (section.id === 'methods') {
      return {
        ...section,
        sourceRefs: mergedAnalysisSourceRefs,
      }
    }

    if (section.id === 'results') {
      return {
        ...section,
        sourceRefs: dedupeSourceRefs([...mergedAnalysisSourceRefs, ...figureSourceRefs, ...supplementarySourceRefs]),
        figures: selectedFigures.length > 0
          ? selectedFigures.map(({ entityRef, graphProject }, index) => {
              const relatedAnalysisId = entityRef.provenanceEdges
                ?.find((edge) => edge.targetKind === 'analysis')
                ?.targetId ?? getGraphPrimaryAnalysisId(graphProject)
              const relatedHistory = relatedAnalysisId ? historyById.get(relatedAnalysisId) : undefined
              return buildFigureRef(graphProject, index, {
                relatedAnalysisId,
                relatedAnalysisLabel: relatedHistory?.method?.name ?? relatedHistory?.name,
              })
            })
          : undefined,
      }
    }

    return section
  })
}

function hasWritableSourceBindings(sections: readonly DocumentSection[]): boolean {
  return sections.some((section) => (
    (section.sourceRefs?.length ?? 0) > 0
    || (section.figures?.length ?? 0) > 0
  ))
}

async function createManualBlankDocument(
  input: StartManualBlankWritingSessionInput,
): Promise<DocumentBlueprint> {
  const now = new Date().toISOString()
  const sections = createEmptySections(input.preset ?? 'paper', input.language ?? 'ko')

  let document: DocumentBlueprint = {
    id: generateDocumentId(),
    projectId: input.projectId,
    preset: input.preset ?? 'paper',
    title: input.title,
    authors: input.authors,
    language: input.language ?? 'ko',
    sections,
    metadata: input.metadata ?? {},
    writingState: undefined,
    createdAt: now,
    updatedAt: now,
  }

  document = updateDocumentWritingState(document, 'idle', {
    updatedAt: now,
  })

  return saveDocumentBlueprint(document)
}

async function createSourceBoundWritingDocument(
  input: StartSourceBoundWritingSessionInput,
): Promise<DocumentBlueprint> {
  const now = new Date().toISOString()
  const jobId = generateId('docjob')
  const allEntityRefs = listProjectEntityRefs(input.projectId)
  const selectedEntityRefs = buildSelectedEntityRefsFromRequests(allEntityRefs, input.requestedSources)

  const sections = await applySourceBindings(
    createEmptySections(input.preset ?? 'paper', input.language ?? 'ko'),
    selectedEntityRefs,
  )

  if (!hasWritableSourceBindings(sections)) {
    throw new Error('선택한 결과를 문서 초안 자료로 연결하지 못했습니다.')
  }

  let document: DocumentBlueprint = {
    id: generateDocumentId(),
    projectId: input.projectId,
    preset: input.preset ?? 'paper',
    title: input.title,
    authors: input.authors,
    language: input.language ?? 'ko',
    sections,
    metadata: input.metadata ?? {},
    writingState: undefined,
    createdAt: now,
    updatedAt: now,
  }

  document = updateDocumentWritingState(document, 'collecting', {
    jobId,
    startedAt: now,
    updatedAt: now,
  })

  for (const sectionId of ['methods', 'results']) {
    document = updateDocumentSectionWritingState(document, sectionId, 'drafting', {
      jobId,
      updatedAt: now,
    })
  }

  return saveDocumentBlueprint(document)
}

async function retryWritingSession(
  input: RetryWritingSessionInput,
): Promise<DocumentBlueprint> {
  const existingDocument = await loadDocumentBlueprint(input.documentId)
  if (!existingDocument) {
    throw new Error('재시도할 문서를 찾을 수 없습니다.')
  }

  const retriedDocument = await retryDocumentWriting(input.documentId)
  return retriedDocument ?? existingDocument
}

export async function startWritingSession(
  input: StartWritingSessionInput,
): Promise<DocumentBlueprint> {
  switch (input.mode) {
    case 'manual-blank':
      return createManualBlankDocument(input)
    case 'source-bound-draft':
      return createSourceBoundWritingDocument(input)
    case 'retry':
      return retryWritingSession(input)
    default: {
      const _exhaustive: never = input
      return _exhaustive
    }
  }
}

function buildRequestedSourcesFromLegacyFilters(
  projectId: string,
  sourceEntityIds: CreateDocumentWritingSessionSourceEntityIds | undefined,
): WritingSourceRequest[] {
  const allEntityRefs = listProjectEntityRefs(projectId)
  return buildSelectedEntityRefs(allEntityRefs, sourceEntityIds).map((entityRef) => ({
    entityKind: entityRef.entityKind,
    entityId: entityRef.entityId,
    label: entityRef.label,
  }))
}

export async function createDocumentWritingSession(
  options: CreateDocumentWritingSessionOptions,
): Promise<DocumentBlueprint> {
  return startWritingSession({
    mode: 'source-bound-draft',
    projectId: options.projectId,
    title: options.title,
    preset: options.preset,
    language: options.language,
    authors: options.authors,
    metadata: options.metadata,
    requestedSources: buildRequestedSourcesFromLegacyFilters(options.projectId, options.sourceEntityIds),
  })
}
