import type { HistoryRecord } from '@/lib/utils/storage-types'
import { getAllHistory } from '@/lib/utils/storage'
import { loadBioToolHistory, type BioToolHistoryEntry } from '@/lib/bio-tools'
import {
  loadAnalysisHistory,
  loadGeneticsHistory,
  type BarcodingHistoryEntry,
  type BoldHistoryEntry,
  type PhylogenyHistoryEntry,
  type ProteinHistoryEntry,
  type SeqStatsHistoryEntry,
  type SimilarityHistoryEntry,
  type TranslationHistoryEntry,
} from '@/lib/genetics'
import { generateId } from '@/lib/utils/generate-id'
import { listProjectEntityRefs } from './project-storage'
import { loadDocumentBlueprint, saveDocumentBlueprint, DocumentBlueprintConflictError } from './document-blueprint-storage'
import {
  convertPaperTable,
  createGeneratedArtifactProvenance,
  createDocumentSourceRef,
  upsertGeneratedArtifactProvenance,
  type DocumentBlueprint,
  type DocumentSection,
  type DocumentSourceRef,
} from './document-blueprint-types'
import {
  mergeDocumentSectionPatch,
  shouldSkipDocumentSectionBodyPatch,
  updateDocumentSectionWritingState,
  updateDocumentWritingState,
} from './document-writing'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'
import type { ProjectEntityRef } from '@biohub/types'
import { safelyBuildAnalysisWritingDraftFromHistory } from './analysis-writing-draft'
import {
  createNormalizedAnalysisWritingSource,
  createNormalizedFigureWritingSource,
  createNormalizedSupplementaryWritingSource,
  getWritingSectionHeading,
  type SupplementaryWritingSourceMaps,
  writeNormalizedSourceBlock,
} from './document-writing-source-registry'

const runningDocumentJobs = new Map<string, Promise<DocumentBlueprint | null>>()
const runningSectionJobs = new Map<string, Promise<DocumentBlueprint | null>>()

class DocumentWritingJobStaleError extends Error {
  constructor() {
    super('문서 작성 job이 더 이상 최신 상태가 아닙니다.')
    this.name = 'DocumentWritingJobStaleError'
  }
}

interface SupplementaryDataMaps extends SupplementaryWritingSourceMaps {
  projectRefsByEntityId: Map<string, ProjectEntityRef>
}

interface DocumentSectionDraftPatch extends Partial<DocumentSection> {
  skippedForReview?: boolean
}

export type DocumentSectionRegenerationMode = 'regenerate' | 'refresh-linked-sources'

interface PatchDocumentSectionOptions {
  preserveBody?: boolean
  expectedSectionSnapshot?: {
    content: string
    plateValue?: unknown
    generatedBy: DocumentSection['generatedBy']
  }
}

function buildEntryMap<T extends { id: string }>(entries: readonly T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry] as const))
}

function collectAnalysisSourceRefs(section: DocumentSection): DocumentSourceRef[] {
  return (section.sourceRefs ?? []).filter((sourceRef) => sourceRef.kind === 'analysis')
}

function isSupplementarySourceRef(
  sourceRef: DocumentSourceRef,
  projectRefsByEntityId: ReadonlyMap<string, ProjectEntityRef>,
): boolean {
  const entityKind = projectRefsByEntityId.get(sourceRef.sourceId)?.entityKind
  if (entityKind) {
    return entityKind !== 'analysis' && entityKind !== 'figure'
  }
  return sourceRef.kind !== 'analysis' && sourceRef.kind !== 'figure'
}

function collectSupplementarySourceRefs(
  section: DocumentSection,
  projectRefsByEntityId: ReadonlyMap<string, ProjectEntityRef>,
): DocumentSourceRef[] {
  return (section.sourceRefs ?? []).filter((sourceRef) => (
    isSupplementarySourceRef(sourceRef, projectRefsByEntityId)
  ))
}

function dedupeSourceRefs(sourceRefs: readonly DocumentSourceRef[]): DocumentSourceRef[] {
  const deduped = new Map<string, DocumentSourceRef>()
  for (const sourceRef of sourceRefs) {
    const key = `${sourceRef.kind}:${sourceRef.sourceId}`
    if (!deduped.has(key)) {
      deduped.set(key, sourceRef)
    }
  }
  return Array.from(deduped.values())
}

function canInsertMethodsDraft(draft: PaperDraft): boolean {
  if (draft.methodsReadiness?.canGenerateDraft === false) return false
  return draft.methodsReadiness?.shouldReviewBeforeInsert !== true
}

function canInsertResultsDraft(draft: PaperDraft): boolean {
  if (draft.resultsReadiness?.canGenerateDraft === false) return false
  return draft.resultsReadiness?.shouldReviewBeforeInsert !== true
}

function buildMethodsSectionPatch(
  projectId: string,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  language: 'ko' | 'en',
): DocumentSectionDraftPatch {
  const analysisRefs = collectAnalysisSourceRefs(section)
  const parts: string[] = []
  const usedSourceRefs: DocumentSourceRef[] = []
  let skippedForReview = false

  for (const sourceRef of analysisRefs) {
    const record = historyById.get(sourceRef.sourceId)
    if (!record) {
      continue
    }
    const draft = safelyBuildAnalysisWritingDraftFromHistory(record, language)
    if (!draft) {
      continue
    }
    if (!draft.methods) {
      continue
    }
    if (!canInsertMethodsDraft(draft)) {
      skippedForReview = true
      continue
    }
    const normalizedSource = createNormalizedAnalysisWritingSource({
      projectId,
      sourceRef,
      record,
      draft,
    })
    const methodsBody = writeNormalizedSourceBlock(normalizedSource, 'methods', { language }) ?? draft.methods
    const meta = [
      record.dataFileName ? `${language === 'ko' ? '파일' : 'File'}: ${record.dataFileName}` : null,
      record.dataRowCount > 0 ? `${language === 'ko' ? '표본수' : 'Samples'}: ${record.dataRowCount}` : null,
    ].filter((value): value is string => value !== null)
    const prefix = meta.length > 0 ? `> ${meta.join(' · ')}\n\n` : ''
    parts.push(`### ${normalizedSource.title}\n\n${prefix}${methodsBody}`)
    usedSourceRefs.push(sourceRef)
  }

  return {
    content: parts.join('\n\n'),
    sourceRefs: dedupeSourceRefs(usedSourceRefs),
    generatedBy: 'template',
    skippedForReview,
  }
}

function buildResultsSectionPatch(
  projectId: string,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  supplementaryMaps: SupplementaryDataMaps,
  language: 'ko' | 'en',
): DocumentSectionDraftPatch {
  const analysisRefs = collectAnalysisSourceRefs(section)
  const parts: string[] = []
  const tables = []
  const usedSourceRefs: DocumentSourceRef[] = []
  let skippedForReview = false

  for (const sourceRef of analysisRefs) {
    const record = historyById.get(sourceRef.sourceId)
    if (!record) {
      continue
    }
    const draft = safelyBuildAnalysisWritingDraftFromHistory(record, language)
    if (!draft) {
      continue
    }
    if (!canInsertResultsDraft(draft)) {
      skippedForReview = true
      continue
    }
    const convertedTables = (draft.tables ?? []).map((table) => (
      convertPaperTable(table, {
        sourceAnalysisId: record.id,
        sourceAnalysisLabel: record.method?.name ?? record.name,
      })
    ))
    const normalizedSource = createNormalizedAnalysisWritingSource({
      projectId,
      sourceRef,
      record,
      draft,
      tables: convertedTables,
    })
    if (draft.results) {
      const resultsBody = writeNormalizedSourceBlock(normalizedSource, 'results', { language }) ?? draft.results
      const details = [
        record.apaFormat ? `${language === 'ko' ? 'APA' : 'APA'}: ${record.apaFormat}` : null,
        record.aiInterpretation ? `${language === 'ko' ? 'AI 해석' : 'AI interpretation'}: ${record.aiInterpretation}` : null,
      ].filter((value): value is string => value !== null)
      const detailBlock = details.length > 0
        ? `${details.map((line) => `- ${line}`).join('\n')}\n\n`
        : ''
      parts.push(`### ${normalizedSource.title}\n\n${detailBlock}${resultsBody}`)
    }
    const normalizedTables = normalizedSource.artifacts.tables ?? []
    tables.push(...normalizedTables)
    if (draft.results || normalizedTables.length > 0) {
      usedSourceRefs.push(sourceRef)
    }
  }

  if ((section.figures ?? []).length > 0) {
    const figureLines = (section.figures ?? []).map((figure) => {
      const figureSourceRef = createDocumentSourceRef('figure', figure.entityId, {
        label: figure.caption,
      })
      const normalizedSource = createNormalizedFigureWritingSource({
        projectId,
        sourceRef: figureSourceRef,
        figure,
      })
      const figureLine = writeNormalizedSourceBlock(normalizedSource, 'results', { language })
      if (figureLine) {
        usedSourceRefs.push(figureSourceRef)
      }
      return figureLine
    }).filter((value): value is string => value !== null)
    if (figureLines.length > 0) {
      parts.push(`${getWritingSectionHeading('figures', { language })}\n\n${figureLines.join('\n')}`)
    }
  }

  const supplementaryBlock = buildSupplementaryResultsBlock(section, supplementaryMaps, language)
  if (supplementaryBlock.content) {
    parts.push(supplementaryBlock.content)
    usedSourceRefs.push(...supplementaryBlock.sourceRefs)
  }

  return {
    content: parts.join('\n\n'),
    sourceRefs: dedupeSourceRefs(usedSourceRefs),
    tables: tables.length > 0 ? tables : undefined,
    generatedBy: 'template',
    skippedForReview,
  }
}

function buildSupplementaryResultsBlock(
  section: DocumentSection,
  supplementaryMaps: SupplementaryDataMaps,
  language: 'ko' | 'en',
): { content: string; sourceRefs: DocumentSourceRef[] } {
  const supplementarySourceRefs = collectSupplementarySourceRefs(section, supplementaryMaps.projectRefsByEntityId)
  if (supplementarySourceRefs.length === 0) {
    return { content: '', sourceRefs: [] }
  }

  const lines: string[] = [getWritingSectionHeading('supplementary', { language }), '']
  const usedSourceRefs: DocumentSourceRef[] = []

  for (const sourceRef of supplementarySourceRefs) {
    const entityRef = supplementaryMaps.projectRefsByEntityId.get(sourceRef.sourceId)
    if (!entityRef) {
      lines.push(`- ${sourceRef.label ?? sourceRef.sourceId}`)
      continue
    }

    const source = createNormalizedSupplementaryWritingSource({
      entityRef,
      sourceRef,
      language,
      maps: supplementaryMaps,
    })
    lines.push(writeNormalizedSourceBlock(source, 'supplementary', { language }) ?? `- ${entityRef.label ?? sourceRef.label ?? entityRef.entityId}`)
    usedSourceRefs.push(sourceRef)
  }

  return {
    content: lines.join('\n'),
    sourceRefs: dedupeSourceRefs(usedSourceRefs),
  }
}

function hasRequestedSectionSources(section: DocumentSection): boolean {
  return (
    (section.sourceRefs?.length ?? 0) > 0
    || (section.figures?.length ?? 0) > 0
  )
}

function patchProducesWritableContent(patch: Partial<DocumentSection>): boolean {
  if (typeof patch.content === 'string' && patch.content.trim().length > 0) {
    return true
  }
  if ((patch.tables?.length ?? 0) > 0) {
    return true
  }
  if ((patch.figures?.length ?? 0) > 0) {
    return true
  }
  return false
}

function areJsonSnapshotsEqual(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
  } catch {
    return left === right
  }
}

function sectionMatchesSnapshot(
  section: DocumentSection,
  snapshot: PatchDocumentSectionOptions['expectedSectionSnapshot'],
): boolean {
  if (!snapshot) {
    return true
  }

  return (
    section.content === snapshot.content
    && section.generatedBy === snapshot.generatedBy
    && areJsonSnapshotsEqual(section.plateValue, snapshot.plateValue)
  )
}

function clearNonTargetActiveSectionStates(
  document: DocumentBlueprint,
  targetSectionId: string,
): DocumentBlueprint {
  const current = document.writingState
  if (!current) {
    return document
  }

  const sectionStates = Object.fromEntries(
    Object.entries(current.sectionStates).filter(([sectionId, sectionState]) => (
      sectionId === targetSectionId
      || (sectionState.status !== 'drafting' && sectionState.status !== 'failed')
    )),
  )

  return {
    ...document,
    writingState: {
      ...current,
      sectionStates,
    },
  }
}

async function failSectionWriting(
  documentId: string,
  jobId: string,
  sectionId: string,
  message: string,
): Promise<DocumentBlueprint | null> {
  try {
    return await mutateDocumentWithRetry(documentId, (document) => {
      const failedSection = updateDocumentSectionWritingState(document, sectionId, 'failed', {
        jobId,
        message,
      })
      return updateDocumentWritingState(failedSection, 'failed', {
        jobId,
        errorMessage: message,
      })
    }, 3, {
      expectedJobId: jobId,
    })
  } catch {
    return null
  }
}

function createSupplementaryDataMaps(document: DocumentBlueprint): SupplementaryDataMaps {
  return {
    projectRefsByEntityId: new Map(listProjectEntityRefs(document.projectId).map((ref) => [ref.entityId, ref] as const)),
    bioToolById: buildEntryMap(loadBioToolHistory()),
    blastById: buildEntryMap(loadAnalysisHistory()),
    proteinById: buildEntryMap(loadGeneticsHistory('protein') as ProteinHistoryEntry[]),
    seqStatsById: buildEntryMap(loadGeneticsHistory('seq-stats') as SeqStatsHistoryEntry[]),
    similarityById: buildEntryMap(loadGeneticsHistory('similarity') as SimilarityHistoryEntry[]),
    phylogenyById: buildEntryMap(loadGeneticsHistory('phylogeny') as PhylogenyHistoryEntry[]),
    boldById: buildEntryMap(loadGeneticsHistory('bold') as BoldHistoryEntry[]),
    translationById: buildEntryMap(loadGeneticsHistory('translation') as TranslationHistoryEntry[]),
  }
}

async function mutateDocumentWithRetry(
  documentId: string,
  updater: (document: DocumentBlueprint) => DocumentBlueprint,
  attempts = 3,
  options?: {
    expectedJobId?: string
  },
): Promise<DocumentBlueprint | null> {
  let remainingAttempts = attempts

  while (remainingAttempts > 0) {
    const latestDocument = await loadDocumentBlueprint(documentId)
    if (!latestDocument) {
      return null
    }
    if (
      options?.expectedJobId
      && latestDocument.writingState?.jobId
      && latestDocument.writingState.jobId !== options.expectedJobId
    ) {
      throw new DocumentWritingJobStaleError()
    }

    const nextDocument = updater(latestDocument)
    try {
      return await saveDocumentBlueprint(nextDocument, {
        expectedUpdatedAt: latestDocument.updatedAt,
      })
    } catch (error) {
      if (error instanceof DocumentBlueprintConflictError) {
        remainingAttempts -= 1
        continue
      }
      throw error
    }
  }

  throw new Error('문서 저장 충돌이 반복되어 작성 상태를 반영하지 못했습니다.')
}

async function patchDocumentSection(
  documentId: string,
  jobId: string,
  sectionId: 'methods' | 'results',
  buildPatch: (section: DocumentSection, document: DocumentBlueprint) => DocumentSectionDraftPatch,
  options: PatchDocumentSectionOptions = {},
): Promise<DocumentBlueprint | null> {
  return mutateDocumentWithRetry(documentId, (document) => {
    const section = document.sections.find((item) => item.id === sectionId)
    if (!section) {
      return updateDocumentSectionWritingState(document, sectionId, 'failed', {
        message: `${sectionId} 섹션을 찾을 수 없습니다.`,
      })
    }
    if (!options.preserveBody && !sectionMatchesSnapshot(section, options.expectedSectionSnapshot)) {
      return updateDocumentSectionWritingState(document, sectionId, 'failed', {
        jobId,
        message: '섹션 재생성 중 사용자 편집이 감지되어 자동 덮어쓰기를 중단했습니다.',
      })
    }

    const patch = buildPatch(section, document)
    if (hasRequestedSectionSources(section) && !patchProducesWritableContent(patch)) {
      return updateDocumentSectionWritingState(document, sectionId, 'failed', {
        message: patch.skippedForReview
          ? '사용자 확인이 필요한 초안이라 문서에 자동 반영하지 않았습니다.'
          : '연결된 자료에서 초안 내용을 생성하지 못했습니다.',
      })
    }

    const shouldSkipBodyPatch = options.preserveBody ?? shouldSkipDocumentSectionBodyPatch(section)
    const nextSections = document.sections.map((item) => (
      item.id === sectionId
        ? mergeDocumentSectionPatch(
          shouldSkipBodyPatch ? item : { ...item, generatedBy: 'template' },
          patch,
        )
        : item
    ))
    const now = new Date().toISOString()
    const patchedSection = nextSections.find((item) => item.id === sectionId)

    let updatedDocument: DocumentBlueprint = {
      ...document,
      sections: nextSections,
      updatedAt: now,
    }

    if (!shouldSkipBodyPatch && patchProducesWritableContent(patch) && patchedSection) {
      const artifactSourceRefs = patch.sourceRefs ?? patchedSection.sourceRefs
      updatedDocument = {
        ...updatedDocument,
        metadata: upsertGeneratedArtifactProvenance(
          updatedDocument.metadata,
          createGeneratedArtifactProvenance({
            artifactKind: sectionId,
            generatedAt: now,
            generator: {
              type: 'template',
              id: 'document-writing-orchestrator',
            },
            sourceRefs: artifactSourceRefs,
            options: {
              language: document.language,
            },
          }),
        ),
      }
    }

    const sectionUpdatedDocument = updateDocumentSectionWritingState(updatedDocument, sectionId, shouldSkipBodyPatch ? 'skipped' : 'patched', {
      message: shouldSkipBodyPatch ? '사용자 편집 본문은 유지하고 연결 자료만 갱신했습니다.' : '섹션 초안을 다시 생성했습니다.',
    })
    return clearNonTargetActiveSectionStates(sectionUpdatedDocument, sectionId)
  }, 3, {
    expectedJobId: jobId,
  })
}

async function failDocumentWriting(documentId: string, jobId: string, message: string): Promise<DocumentBlueprint | null> {
  return mutateDocumentWithRetry(documentId, (document) => {
    let updatedDocument = updateDocumentWritingState(document, 'failed', {
      jobId,
      errorMessage: message,
    })

    for (const sectionId of ['methods', 'results'] as const) {
      const currentStatus = updatedDocument.writingState?.sectionStates[sectionId]?.status
      if (currentStatus === 'patched' || currentStatus === 'skipped') {
        continue
      }
      updatedDocument = updateDocumentSectionWritingState(updatedDocument, sectionId, 'failed', {
        message,
      })
    }

    return updatedDocument
  }, 3, {
    expectedJobId: jobId,
  })
}

async function runDocumentWriting(documentId: string): Promise<DocumentBlueprint | null> {
  const document = await loadDocumentBlueprint(documentId)
  if (!document) {
    return null
  }

  if (document.writingState?.status === 'completed') {
    return document
  }

  const jobId = document.writingState?.jobId ?? generateId('docjob')

  const histories = await getAllHistory()
  const historyById = new Map(histories.map((record) => [record.id, record] as const))
  const supplementaryMaps = createSupplementaryDataMaps(document)

  try {
    await mutateDocumentWithRetry(documentId, (currentDocument) => updateDocumentWritingState(currentDocument, 'drafting', {
      jobId,
    }), 3, {
      expectedJobId: jobId,
    })

    const patchedMethods = await patchDocumentSection(documentId, jobId, 'methods', (section, currentDocument) => (
      buildMethodsSectionPatch(currentDocument.projectId, section, historyById, currentDocument.language)
    ))
    if (patchedMethods?.writingState?.sectionStates.methods?.status === 'failed') {
      throw new Error(patchedMethods.writingState.sectionStates.methods.message ?? 'methods 초안 생성에 실패했습니다.')
    }

    await mutateDocumentWithRetry(documentId, (currentDocument) => updateDocumentWritingState(currentDocument, 'patching', {
      jobId,
    }), 3, {
      expectedJobId: jobId,
    })

    const patchedResults = await patchDocumentSection(documentId, jobId, 'results', (section, currentDocument) => (
      buildResultsSectionPatch(currentDocument.projectId, section, historyById, supplementaryMaps, currentDocument.language)
    ))
    if (patchedResults?.writingState?.sectionStates.results?.status === 'failed') {
      throw new Error(patchedResults.writingState.sectionStates.results.message ?? 'results 초안 생성에 실패했습니다.')
    }

    return mutateDocumentWithRetry(documentId, (currentDocument) => updateDocumentWritingState(currentDocument, 'completed', {
      jobId,
      errorMessage: undefined,
    }), 3, {
      expectedJobId: jobId,
    })
  } catch (error) {
    if (error instanceof DocumentWritingJobStaleError) {
      return null
    }
    const message = error instanceof Error ? error.message : '문서 초안 생성에 실패했습니다.'
    await failDocumentWriting(documentId, jobId, message)
    return null
  }
}

export function ensureDocumentWriting(documentId: string): Promise<DocumentBlueprint | null> {
  const runningSectionJob = runningSectionJobs.get(documentId)
  if (runningSectionJob) {
    return runningSectionJob
  }

  const runningJob = runningDocumentJobs.get(documentId)
  if (runningJob) {
    return runningJob
  }

  const job = runDocumentWriting(documentId)
    .finally(() => {
      runningDocumentJobs.delete(documentId)
    })

  runningDocumentJobs.set(documentId, job)
  return job
}

export function retryDocumentWriting(documentId: string): Promise<DocumentBlueprint | null> {
  const runningSectionJob = runningSectionJobs.get(documentId)
  if (runningSectionJob) {
    return runningSectionJob
  }

  const runningJob = runningDocumentJobs.get(documentId)
  if (runningJob) {
    return runningJob
  }

  const restartJob = (async (): Promise<DocumentBlueprint | null> => {
    const currentDocument = await loadDocumentBlueprint(documentId)
    if (!currentDocument) {
      return null
    }

    const nextJobId = generateId('docjob')
    const now = new Date().toISOString()
    let restartedDocument = updateDocumentWritingState(currentDocument, 'collecting', {
      jobId: nextJobId,
      startedAt: now,
      updatedAt: now,
      errorMessage: undefined,
    })

    for (const sectionId of ['methods', 'results'] as const) {
      restartedDocument = updateDocumentSectionWritingState(restartedDocument, sectionId, 'drafting', {
        jobId: nextJobId,
        updatedAt: now,
      })
    }

    await saveDocumentBlueprint(restartedDocument, {
      expectedUpdatedAt: currentDocument.updatedAt,
    })

    return runDocumentWriting(documentId)
  })()
    .finally(() => {
      runningDocumentJobs.delete(documentId)
    })

  runningDocumentJobs.set(documentId, restartJob)
  return restartJob
}

function isRegeneratableSectionId(sectionId: string): sectionId is 'methods' | 'results' {
  return sectionId === 'methods' || sectionId === 'results'
}

function buildSectionPatchForRegeneration(
  sectionId: 'methods' | 'results',
  document: DocumentBlueprint,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  supplementaryMaps: SupplementaryDataMaps,
): DocumentSectionDraftPatch {
  if (sectionId === 'methods') {
    return buildMethodsSectionPatch(document.projectId, section, historyById, document.language)
  }

  return buildResultsSectionPatch(document.projectId, section, historyById, supplementaryMaps, document.language)
}

export function regenerateDocumentSection(
  documentId: string,
  sectionId: string,
  mode: DocumentSectionRegenerationMode,
): Promise<DocumentBlueprint | null> {
  if (!isRegeneratableSectionId(sectionId)) {
    return Promise.reject(new Error('Methods/Results 섹션만 자동 재생성을 지원합니다.'))
  }

  const runningDocumentJob = runningDocumentJobs.get(documentId)
  if (runningDocumentJob) {
    return Promise.reject(new Error('문서 전체 자동 작성이 진행 중입니다. 완료 후 섹션을 다시 생성하세요.'))
  }

  const sectionJobKey = documentId
  const runningSectionJob = runningSectionJobs.get(sectionJobKey)
  if (runningSectionJob) {
    return Promise.reject(new Error('이미 다른 섹션 재생성이 진행 중입니다. 완료 후 다시 시도하세요.'))
  }

  const sectionJob = (async (): Promise<DocumentBlueprint | null> => {
    let jobId = ''
    const currentDocument = await loadDocumentBlueprint(documentId)
    if (!currentDocument) {
      return null
    }

    const section = currentDocument.sections.find((item) => item.id === sectionId)
    if (!section) {
      return null
    }

    const expectedSectionSnapshot = {
      content: section.content,
      plateValue: section.plateValue,
      generatedBy: section.generatedBy,
    }
    jobId = generateId('sectionjob')
    const now = new Date().toISOString()
    try {
      const draftingDocument = updateDocumentWritingState(currentDocument, 'patching', {
        jobId,
        startedAt: now,
        updatedAt: now,
        errorMessage: undefined,
      })
      await saveDocumentBlueprint(updateDocumentSectionWritingState(draftingDocument, sectionId, 'drafting', {
        jobId,
        updatedAt: now,
        message: mode === 'refresh-linked-sources'
          ? '사용자 편집 본문은 유지하고 연결 자료를 갱신합니다.'
          : '섹션 초안을 다시 생성합니다.',
      }), {
        expectedUpdatedAt: currentDocument.updatedAt,
      })

      const latestDocument = await loadDocumentBlueprint(documentId)
      if (!latestDocument) {
        return null
      }

      const histories = await getAllHistory()
      const historyById = new Map(histories.map((record) => [record.id, record] as const))
      const supplementaryMaps = createSupplementaryDataMaps(latestDocument)
      const patched = await patchDocumentSection(
        documentId,
        jobId,
        sectionId,
        (currentSection, document) => buildSectionPatchForRegeneration(
          sectionId,
          document,
          currentSection,
          historyById,
          supplementaryMaps,
        ),
        {
          preserveBody: mode === 'refresh-linked-sources',
          expectedSectionSnapshot,
        },
      )

      if (patched?.writingState?.sectionStates[sectionId]?.status === 'failed') {
        return mutateDocumentWithRetry(documentId, (document) => updateDocumentWritingState(document, 'failed', {
          jobId,
          errorMessage: patched.writingState?.sectionStates[sectionId]?.message,
        }), 3, {
          expectedJobId: jobId,
        })
      }

      return mutateDocumentWithRetry(documentId, (document) => updateDocumentWritingState(
        clearNonTargetActiveSectionStates(document, sectionId),
        'completed',
        {
          jobId,
          errorMessage: undefined,
        },
      ), 3, {
        expectedJobId: jobId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '섹션 재생성에 실패했습니다.'
      return failSectionWriting(documentId, jobId, sectionId, message)
    }
  })().finally(() => {
    runningSectionJobs.delete(sectionJobKey)
  })

  runningSectionJobs.set(sectionJobKey, sectionJob)
  return sectionJob
}
