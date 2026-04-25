import type { AnalysisResult } from '@/types/analysis'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
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
import { generatePaperDraft } from '@/lib/services'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import { generateId } from '@/lib/utils/generate-id'
import { listProjectEntityRefs } from './project-storage'
import { loadDocumentBlueprint, saveDocumentBlueprint, DocumentBlueprintConflictError } from './document-blueprint-storage'
import {
  convertPaperTable,
  createDocumentSourceRef,
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
import type { DraftContext, PaperDraft } from '@/lib/services/paper-draft/paper-types'
import type { ProjectEntityRef } from '@biohub/types'
import {
  createNormalizedAnalysisWritingSource,
  createNormalizedFigureWritingSource,
  createNormalizedSupplementaryWritingSource,
  getWritingSectionHeading,
  type SupplementaryWritingSourceMaps,
  writeNormalizedSourceBlock,
} from './document-writing-source-registry'
import {
  hasRenderableSectionSupportContent,
  renderSectionSupportMarkdown,
  stripRenderedSectionSupportMarkdown,
} from './document-support-renderer'
import { inferDocumentSectionSupportRole } from './document-support-asset-types'
import { buildSectionWritingContext } from './document-section-writing-context'
import { resolveDocumentWriterSettings } from './document-writer-engine-registry'
import type { NormalizedWritingSource } from './document-writing-source-types'

const runningDocumentJobs = new Map<string, Promise<DocumentBlueprint | null>>()

const CORE_DRAFTABLE_SECTION_IDS = new Set([
  'introduction',
  'background',
  'summary',
  'methods',
  'results',
  'discussion',
  'conclusion',
])

class DocumentWritingJobStaleError extends Error {
  constructor() {
    super('문서 작성 job이 더 이상 최신 상태가 아닙니다.')
    this.name = 'DocumentWritingJobStaleError'
  }
}

interface SupplementaryDataMaps extends SupplementaryWritingSourceMaps {
  projectRefsByEntityId: Map<string, ProjectEntityRef>
}

function buildEntryMap<T extends { id: string }>(entries: readonly T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry] as const))
}

function collectMappedVariables(variableMapping: VariableMapping | null | undefined): string[] {
  const variables = new Set<string>()
  const addValue = (value: string | string[] | undefined): void => {
    if (!value) {
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          variables.add(item)
        }
      }
      return
    }
    variables.add(value)
  }

  addValue(variableMapping?.dependentVar)
  addValue(variableMapping?.independentVar)
  addValue(variableMapping?.variables)
  addValue(variableMapping?.covariate)
  addValue(variableMapping?.within)
  addValue(variableMapping?.between)
  addValue(variableMapping?.groupVar)
  addValue(variableMapping?.timeVar)

  return Array.from(variables)
}

function getDependentVariable(variableMapping: VariableMapping | null | undefined): string | undefined {
  if (!variableMapping?.dependentVar) {
    return undefined
  }
  return Array.isArray(variableMapping.dependentVar)
    ? variableMapping.dependentVar[0]
    : variableMapping.dependentVar
}

function buildDefaultDraftContext(record: HistoryRecord, analysisResult: AnalysisResult): DraftContext {
  const variableMapping = record.variableMapping ?? null
  const mappedVariables = collectMappedVariables(variableMapping)
  const variableLabels = Object.fromEntries(mappedVariables.map((variableName) => [variableName, variableName]))
  const groupLabels = Object.fromEntries(
    (analysisResult.groupStats ?? [])
      .map((groupStat) => groupStat.name ?? '')
      .filter((groupName): groupName is string => groupName.length > 0)
      .map((groupName) => [groupName, groupName]),
  )
  const dependentVariable = getDependentVariable(variableMapping)

  return {
    variableLabels,
    variableUnits: {},
    groupLabels,
    dependentVariable: dependentVariable ? variableLabels[dependentVariable] ?? dependentVariable : undefined,
    researchContext: record.analysisPurpose ?? record.purpose ?? undefined,
  }
}

function safelyBuildPaperDraftFromHistory(
  record: HistoryRecord,
  language: 'ko' | 'en',
): PaperDraft | null {
  try {
    return buildPaperDraftFromHistory(record, language)
  } catch (error) {
    console.warn('[document-writing] skipped invalid analysis source:', record.id, error)
    return null
  }
}

function buildPaperDraftFromHistory(
  record: HistoryRecord,
  language: 'ko' | 'en',
): PaperDraft {
  if (record.paperDraft) {
    return record.paperDraft
  }

  const analysisResult = record.results as AnalysisResult | null
  if (!analysisResult || !record.method?.id) {
    throw new Error(`분석 ${record.id}의 초안 생성 입력이 부족합니다.`)
  }

  const mappedVariables = collectMappedVariables(record.variableMapping ?? null)
  const statisticalResult = convertToStatisticalResult(analysisResult, {
    sampleSize: record.dataRowCount,
    groups: analysisResult.groupStats?.length,
    variables: mappedVariables.length > 0 ? mappedVariables : undefined,
    timestamp: new Date(record.timestamp),
  })

  return generatePaperDraft(
    {
      analysisResult,
      statisticalResult,
      aiInterpretation: record.aiInterpretation ?? null,
      apaFormat: record.apaFormat ?? null,
      exportOptions: {
        includeInterpretation: false,
        includeRawData: false,
        includeMethodology: false,
        includeReferences: false,
        language,
      },
      dataInfo: {
        fileName: record.dataFileName,
        totalRows: record.dataRowCount,
        columnCount: record.columnInfo?.length ?? mappedVariables.length,
        variables: record.columnInfo?.map((column) => column.name) ?? mappedVariables,
      },
      rawDataRows: null,
    },
    buildDefaultDraftContext(record, analysisResult),
    record.method.id,
    {
      language,
      postHocDisplay: 'significant-only',
    },
  )
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

function collectFigureSourceRefs(section: DocumentSection): DocumentSourceRef[] {
  return (section.figures ?? []).map((figure) => createDocumentSourceRef('figure', figure.entityId, {
    label: figure.caption,
  }))
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

function appendSectionSupportNotes(
  content: string,
  section: DocumentSection,
  language: 'ko' | 'en',
): string {
  const supportMarkdown = renderSectionSupportMarkdown(section, language)
  const contentWithoutStaleSupport = stripRenderedSectionSupportMarkdown(content, supportMarkdown)
  if (!supportMarkdown) {
    return contentWithoutStaleSupport
  }
  if (!contentWithoutStaleSupport.trim()) {
    return supportMarkdown
  }
  if (contentWithoutStaleSupport.includes(supportMarkdown)) {
    return contentWithoutStaleSupport
  }
  return `${contentWithoutStaleSupport}\n\n${supportMarkdown}`
}

function buildWriterCitationSupportBindings(
  section: DocumentSection,
  citationIds: readonly string[],
): Array<{
  id: string
  sourceKind: 'citation-record'
  sourceId: string
  role: ReturnType<typeof inferDocumentSectionSupportRole>
  label: string
  citationIds: string[]
  included: true
  origin: 'writer'
}> {
  const existingCitationIds = new Set<string>()
  for (const binding of section.sectionSupportBindings ?? []) {
    if (binding.sourceKind === 'citation-record') {
      existingCitationIds.add(binding.sourceId)
    }
    for (const citationId of binding.citationIds ?? []) {
      existingCitationIds.add(citationId)
    }
  }

  return citationIds.filter((citationId) => !existingCitationIds.has(citationId)).map((citationId) => ({
    id: `writer-citation-${section.id}-${citationId}`,
    sourceKind: 'citation-record',
    sourceId: citationId,
    role: inferDocumentSectionSupportRole(section.id),
    label: citationId,
    citationIds: [citationId],
    included: true,
    origin: 'writer',
  }))
}

function collectSectionWritingSources(
  projectId: string,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  supplementaryMaps: SupplementaryDataMaps,
  language: 'ko' | 'en',
): NormalizedWritingSource[] {
  const sources: NormalizedWritingSource[] = []

  for (const sourceRef of collectAnalysisSourceRefs(section)) {
    const record = historyById.get(sourceRef.sourceId)
    if (!record) {
      continue
    }
    const draft = safelyBuildPaperDraftFromHistory(record, language)
    if (!draft) {
      continue
    }
    sources.push(createNormalizedAnalysisWritingSource({
      projectId,
      sourceRef,
      record,
      draft,
    }))
  }

  for (const sourceRef of collectSupplementarySourceRefs(section, supplementaryMaps.projectRefsByEntityId)) {
    const entityRef = supplementaryMaps.projectRefsByEntityId.get(sourceRef.sourceId)
    if (!entityRef) {
      continue
    }
    sources.push(createNormalizedSupplementaryWritingSource({
      entityRef,
      sourceRef,
      language,
      maps: supplementaryMaps,
    }))
  }

  for (const figure of section.figures ?? []) {
    sources.push(createNormalizedFigureWritingSource({
      projectId,
      sourceRef: createDocumentSourceRef('figure', figure.entityId, {
        label: figure.caption,
      }),
      figure,
    }))
  }

  return sources
}

async function buildNarrativeSectionPatch(
  document: DocumentBlueprint,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  supplementaryMaps: SupplementaryDataMaps,
): Promise<Partial<DocumentSection>> {
  const sources = collectSectionWritingSources(
    document.projectId,
    section,
    historyById,
    supplementaryMaps,
    document.language,
  )
  const context = buildSectionWritingContext({
    document,
    section,
    sources,
  })
  const writerSettings = resolveDocumentWriterSettings(document, context.sectionKind)
  const result = await writerSettings.engine.writeSection({
    provider: writerSettings.provider,
    quality: writerSettings.quality,
    context,
  })
  const generatedBy = result.provider === 'template' ? 'template' : 'llm'

  return {
    content: result.content,
    sourceRefs: dedupeSourceRefs([
      ...collectAnalysisSourceRefs(section),
      ...collectSupplementarySourceRefs(section, supplementaryMaps.projectRefsByEntityId),
      ...collectFigureSourceRefs(section),
    ]),
    sectionSupportBindings: buildWriterCitationSupportBindings(section, result.citationIds),
    generatedBy,
  }
}

async function buildWriterBackedSectionPatch(
  document: DocumentBlueprint,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  supplementaryMaps: SupplementaryDataMaps,
  basePatch: Partial<DocumentSection>,
): Promise<Partial<DocumentSection>> {
  const sources = collectSectionWritingSources(
    document.projectId,
    section,
    historyById,
    supplementaryMaps,
    document.language,
  )
  const context = buildSectionWritingContext({
    document,
    section,
    sources,
  })
  const writerSettings = resolveDocumentWriterSettings(document, context.sectionKind)
  if (writerSettings.provider === 'template') {
    return basePatch
  }

  const result = await writerSettings.engine.writeSection({
    provider: writerSettings.provider,
    quality: writerSettings.quality,
    context,
  })

  if (result.provider === 'template' || !result.content.trim()) {
    return basePatch
  }

  return {
    ...basePatch,
    content: result.content,
    sectionSupportBindings: buildWriterCitationSupportBindings(section, result.citationIds),
    generatedBy: 'llm',
  }
}

function buildMethodsSectionPatch(
  projectId: string,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  language: 'ko' | 'en',
): Partial<DocumentSection> {
  const analysisRefs = collectAnalysisSourceRefs(section)
  const parts: string[] = []

  for (const sourceRef of analysisRefs) {
    const record = historyById.get(sourceRef.sourceId)
    if (!record) {
      continue
    }
    const draft = safelyBuildPaperDraftFromHistory(record, language)
    if (!draft) {
      continue
    }
    if (!draft.methods) {
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
  }

  return {
    content: appendSectionSupportNotes(parts.join('\n\n'), section, language),
    sourceRefs: dedupeSourceRefs(analysisRefs),
    generatedBy: 'template',
  }
}

function buildResultsSectionPatch(
  projectId: string,
  section: DocumentSection,
  historyById: Map<string, HistoryRecord>,
  supplementaryMaps: SupplementaryDataMaps,
  language: 'ko' | 'en',
): Partial<DocumentSection> {
  const analysisRefs = collectAnalysisSourceRefs(section)
  const supplementaryRefs = collectSupplementarySourceRefs(section, supplementaryMaps.projectRefsByEntityId)
  const parts: string[] = []
  const tables = []

  for (const sourceRef of analysisRefs) {
    const record = historyById.get(sourceRef.sourceId)
    if (!record) {
      continue
    }
    const draft = safelyBuildPaperDraftFromHistory(record, language)
    if (!draft) {
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
    tables.push(...(normalizedSource.artifacts.tables ?? []))
  }

  if ((section.figures ?? []).length > 0) {
    const figureLines = (section.figures ?? []).map((figure) => {
      const normalizedSource = createNormalizedFigureWritingSource({
        projectId,
        sourceRef: createDocumentSourceRef('figure', figure.entityId, {
          label: figure.caption,
        }),
        figure,
      })
      return writeNormalizedSourceBlock(normalizedSource, 'results', { language })
    }).filter((value): value is string => value !== null)
    if (figureLines.length > 0) {
      parts.push(`${getWritingSectionHeading('figures', { language })}\n\n${figureLines.join('\n')}`)
    }
  }

  const supplementaryBlock = buildSupplementaryResultsBlock(section, supplementaryMaps, language)
  if (supplementaryBlock) {
    parts.push(supplementaryBlock)
  }

  return {
    content: appendSectionSupportNotes(parts.join('\n\n'), section, language),
    sourceRefs: dedupeSourceRefs([
      ...analysisRefs,
      ...supplementaryRefs,
      ...((section.figures ?? []).map((figure) => createDocumentSourceRef('figure', figure.entityId, {
        label: figure.caption,
      }))),
    ]),
    tables: tables.length > 0 ? tables : undefined,
    generatedBy: 'template',
  }
}

function buildSupplementaryResultsBlock(
  section: DocumentSection,
  supplementaryMaps: SupplementaryDataMaps,
  language: 'ko' | 'en',
): string {
  const supplementarySourceRefs = collectSupplementarySourceRefs(section, supplementaryMaps.projectRefsByEntityId)
  if (supplementarySourceRefs.length === 0) {
    return ''
  }

  const lines: string[] = [getWritingSectionHeading('supplementary', { language }), '']

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
  }

  return lines.join('\n')
}

function hasRequestedSectionSources(section: DocumentSection): boolean {
  return (
    (section.sourceRefs?.length ?? 0) > 0
    || (section.figures?.length ?? 0) > 0
    || hasRenderableSectionSupportContent(section)
  )
}

function isDraftableSection(section: DocumentSection): boolean {
  return section.id !== 'references'
    && (CORE_DRAFTABLE_SECTION_IDS.has(section.id) || hasRenderableSectionSupportContent(section))
    && hasRequestedSectionSources(section)
}

function getDraftableSectionIds(document: DocumentBlueprint): string[] {
  return document.sections
    .filter(isDraftableSection)
    .map((section) => section.id)
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

async function mutateDocumentWithRetry(
  documentId: string,
  updater: (document: DocumentBlueprint) => DocumentBlueprint | Promise<DocumentBlueprint>,
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

    const nextDocument = await updater(latestDocument)
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
  sectionId: string,
  buildPatch: (section: DocumentSection, document: DocumentBlueprint) => Partial<DocumentSection> | Promise<Partial<DocumentSection>>,
): Promise<DocumentBlueprint | null> {
  return mutateDocumentWithRetry(documentId, async (document) => {
    const section = document.sections.find((item) => item.id === sectionId)
    if (!section) {
      return updateDocumentSectionWritingState(document, sectionId, 'failed', {
        message: `${sectionId} 섹션을 찾을 수 없습니다.`,
      })
    }

    const shouldSkipBodyPatch = shouldSkipDocumentSectionBodyPatch(section)
    if (shouldSkipBodyPatch) {
      return updateDocumentSectionWritingState(document, sectionId, 'skipped', {
        message: '사용자 편집 본문은 유지하고 연결 자료 작성은 건너뛰었습니다.',
      })
    }

    const patch = await buildPatch(section, document)
    if (hasRequestedSectionSources(section) && !patchProducesWritableContent(patch)) {
      return updateDocumentSectionWritingState(document, sectionId, 'failed', {
        message: '연결된 자료에서 초안 내용을 생성하지 못했습니다.',
      })
    }

    const nextSections = document.sections.map((item) => (
      item.id === sectionId
        ? mergeDocumentSectionPatch(item, patch)
        : item
    ))

    const updatedDocument = {
      ...document,
      sections: nextSections,
      updatedAt: new Date().toISOString(),
    }

    return updateDocumentSectionWritingState(updatedDocument, sectionId, shouldSkipBodyPatch ? 'skipped' : 'patched', {
      message: shouldSkipBodyPatch ? '사용자 편집 본문은 유지하고 연결 자료만 갱신했습니다.' : undefined,
    })
  }, 3, {
    expectedJobId: jobId,
  })
}

async function markDocumentSectionFailed(
  documentId: string,
  jobId: string,
  sectionId: string,
  message: string,
): Promise<DocumentBlueprint | null> {
  return mutateDocumentWithRetry(documentId, (document) => (
    updateDocumentSectionWritingState(document, sectionId, 'failed', {
      jobId,
      message,
    })
  ), 3, {
    expectedJobId: jobId,
  })
}

async function patchDocumentSectionSafely(
  documentId: string,
  jobId: string,
  sectionId: string,
  buildPatch: (section: DocumentSection, document: DocumentBlueprint) => Partial<DocumentSection> | Promise<Partial<DocumentSection>>,
): Promise<{
  document: DocumentBlueprint | null
  message?: string
}> {
  try {
    const updatedDocument = await patchDocumentSection(documentId, jobId, sectionId, buildPatch)
    const sectionState = updatedDocument?.writingState?.sectionStates[sectionId]
    return {
      document: updatedDocument,
      message: sectionState?.message,
    }
  } catch (error) {
    if (error instanceof DocumentWritingJobStaleError) {
      throw error
    }

    const message = error instanceof Error ? error.message : `${sectionId} 섹션 초안 생성에 실패했습니다.`
    const failedDocument = await markDocumentSectionFailed(documentId, jobId, sectionId, message)
    return {
      document: failedDocument,
      message,
    }
  }
}

async function failDocumentWriting(documentId: string, jobId: string, message: string): Promise<DocumentBlueprint | null> {
  return mutateDocumentWithRetry(documentId, (document) => {
    let updatedDocument = updateDocumentWritingState(document, 'failed', {
      jobId,
      errorMessage: message,
    })

    for (const sectionId of getDraftableSectionIds(updatedDocument)) {
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

async function restartDocumentWritingState(
  documentId: string,
  jobId: string,
  now: string,
): Promise<DocumentBlueprint | null> {
  return mutateDocumentWithRetry(documentId, (document) => {
    let restartedDocument = updateDocumentWritingState(document, 'collecting', {
      jobId,
      startedAt: now,
      updatedAt: now,
      errorMessage: undefined,
    })

    for (const sectionId of getDraftableSectionIds(restartedDocument)) {
      restartedDocument = updateDocumentSectionWritingState(restartedDocument, sectionId, 'drafting', {
        jobId,
        updatedAt: now,
      })
    }

    return restartedDocument
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
  const supplementaryMaps: SupplementaryDataMaps = {
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

  try {
    await mutateDocumentWithRetry(documentId, (currentDocument) => updateDocumentWritingState(currentDocument, 'drafting', {
      jobId,
    }), 3, {
      expectedJobId: jobId,
    })

    const draftableSectionIds = getDraftableSectionIds(document)
    let latestPatchedDocument: DocumentBlueprint | null = null

    for (const sectionId of draftableSectionIds) {
      if (sectionId === 'methods') {
        const patched = await patchDocumentSectionSafely(documentId, jobId, sectionId, async (section, currentDocument) => {
          const basePatch = buildMethodsSectionPatch(currentDocument.projectId, section, historyById, currentDocument.language)
          return buildWriterBackedSectionPatch(currentDocument, section, historyById, supplementaryMaps, basePatch)
        })
        latestPatchedDocument = patched.document ?? latestPatchedDocument
        continue
      }

      if (sectionId === 'results') {
        await mutateDocumentWithRetry(documentId, (currentDocument) => updateDocumentWritingState(currentDocument, 'patching', {
          jobId,
        }), 3, {
          expectedJobId: jobId,
        })

        const patched = await patchDocumentSectionSafely(documentId, jobId, sectionId, async (section, currentDocument) => {
          const basePatch = buildResultsSectionPatch(currentDocument.projectId, section, historyById, supplementaryMaps, currentDocument.language)
          return buildWriterBackedSectionPatch(currentDocument, section, historyById, supplementaryMaps, basePatch)
        })
        latestPatchedDocument = patched.document ?? latestPatchedDocument
        continue
      }

      const patched = await patchDocumentSectionSafely(documentId, jobId, sectionId, (section, currentDocument) => (
        buildNarrativeSectionPatch(currentDocument, section, historyById, supplementaryMaps)
      ))
      latestPatchedDocument = patched.document ?? latestPatchedDocument
    }

    await mutateDocumentWithRetry(documentId, (currentDocument) => updateDocumentWritingState(currentDocument, 'patching', {
      jobId,
    }), 3, {
      expectedJobId: jobId,
    })

    const latestDocument = latestPatchedDocument
      ?? await loadDocumentBlueprint(documentId)
    if (!latestDocument) {
      return null
    }

    const failedSections = draftableSectionIds
      .map((sectionId) => latestDocument.writingState?.sectionStates[sectionId])
      .filter((sectionState) => sectionState?.status === 'failed')

    if (failedSections.length > 0) {
      const message = failedSections
        .map((sectionState) => sectionState?.message)
        .filter((value): value is string => Boolean(value))
        .join(' ')
      throw new Error(message || '문서 초안 생성에 실패했습니다.')
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
    try {
      await failDocumentWriting(documentId, jobId, message)
    } catch (failError) {
      if (failError instanceof DocumentWritingJobStaleError) {
        return null
      }
      throw failError
    }
    return null
  }
}

export function ensureDocumentWriting(documentId: string): Promise<DocumentBlueprint | null> {
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
  const runningJob = runningDocumentJobs.get(documentId)
  if (runningJob) {
    return runningJob
  }

  const restartJob = (async (): Promise<DocumentBlueprint | null> => {
    const nextJobId = generateId('docjob')
    const now = new Date().toISOString()
    const restartedDocument = await restartDocumentWritingState(documentId, nextJobId, now)
    if (!restartedDocument) {
      return null
    }

    return runDocumentWriting(documentId)
  })()
    .finally(() => {
      runningDocumentJobs.delete(documentId)
    })

  runningDocumentJobs.set(documentId, restartJob)
  return restartJob
}
