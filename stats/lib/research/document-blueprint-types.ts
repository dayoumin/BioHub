/**
 * DocumentBlueprint 타입 정의 + 변환 유틸
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §2.2
 * 구현 계획: Phase 1
 */

import type { PaperTable } from '@/lib/services/paper-draft/paper-types'
import type { StudySchema } from '@/lib/services/paper-draft/study-schema'
import type { GraphProject } from '@/types/graph-studio'
import { getGraphProjectAnalysisSourceRefs } from '@/lib/graph-studio/project-lineage'
import type { DocumentSectionSupportBinding } from './document-support-asset-types'
import { normalizeDocumentSectionSupportBindings } from './document-support-asset-types'

// ── 프리셋 ──

export type DocumentPreset = 'paper' | 'report' | 'custom'

export type DocumentSourceKind = 'analysis' | 'figure' | 'supplementary'

export type DocumentWritingStatus =
  | 'idle'
  | 'collecting'
  | 'drafting'
  | 'patching'
  | 'completed'
  | 'failed'

export type DocumentWritingSectionStatus =
  | 'idle'
  | 'drafting'
  | 'patched'
  | 'skipped'
  | 'failed'

export interface DocumentSourceRef {
  kind: DocumentSourceKind
  sourceId: string
  label?: string
}

export type LegacyDocumentSourceRef = string | DocumentSourceRef | {
  kind?: DocumentSourceKind | 'unknown'
  sourceId: string
  label?: string
}

// ── 표 ──

/** 정규화된 문서 표 — PaperTable과 ReportTable 양쪽 수용 */
export interface DocumentTable {
  id?: string
  caption: string
  headers: string[]
  rows: string[][]
  /** PaperTable 원본 HTML (내보내기 품질 유지) */
  htmlContent?: string
  sourceAnalysisId?: string
  sourceAnalysisLabel?: string
}

// ── Figure ──

export interface FigureRef {
  entityId: string
  label: string
  caption: string
  chartType?: string
  relatedAnalysisId?: string
  relatedAnalysisLabel?: string
  patternSummary?: string
}

// ── 섹션 ──

export interface DocumentSectionBlueprintDefinition {
  id?: string
  title: string
  editable?: boolean
  generatedBy: 'template' | 'llm' | 'user'
}

export type TargetJournalStylePreset = 'general' | 'imrad' | 'apa' | 'kci' | 'manual'

export interface TargetJournalRequirementProfileSnapshot {
  id: string
  version: string
  label: string
  stylePreset: TargetJournalStylePreset
  targetJournal?: string
  articleType?: string
  abstractWordLimit?: number
  mainTextWordLimit?: number
  referenceStyle?: string
  requiredStatements?: string[]
  figureTableRequirements?: string[]
  manualRequirements?: string[]
}

export interface DocumentSection {
  id: string
  title: string
  content: string
  /** Plate 에디터 Slate JSON (WYSIWYG 편집 시 생성, 없으면 content에서 역직렬화) */
  plateValue?: unknown
  sourceRefs: DocumentSourceRef[]
  sectionSupportBindings?: DocumentSectionSupportBinding[]
  tables?: DocumentTable[]
  figures?: FigureRef[]
  editable: boolean
  generatedBy: 'template' | 'llm' | 'user'
}

export interface DocumentWritingSectionState {
  status: DocumentWritingSectionStatus
  jobId?: string
  updatedAt?: string
  message?: string
}

export interface DocumentWritingState {
  status: DocumentWritingStatus
  jobId?: string
  startedAt?: string
  updatedAt?: string
  errorMessage?: string
  sectionStates: Record<string, DocumentWritingSectionState>
}

// ── 메타데이터 ──

export type GeneratedArtifactKind = 'methods' | 'results' | 'caption'

export interface GeneratedArtifactProvenance {
  artifactKind: GeneratedArtifactKind
  artifactId: string
  generatedAt: string
  generator: {
    type: 'template' | 'llm'
    id: string
    version?: string
  }
  sourceRefs: DocumentSourceRef[]
  options?: {
    language?: 'ko' | 'en'
    methodId?: string
    postHocDisplay?: 'significant-only' | 'all'
  }
}

export type DocumentAuthoringMode = 'single-source' | 'multi-source'

export type DocumentAuthoringSourceRole =
  | 'primary-analysis'
  | 'secondary-analysis'
  | 'figure'
  | 'supplementary'

export interface DocumentAuthoringSource {
  sourceRef: DocumentSourceRef
  role: DocumentAuthoringSourceRole
  label?: string
  studySchema?: StudySchema
  sourceFingerprint?: string
  generatedArtifactIds?: string[]
}

export interface DocumentAuthoringSectionPlan {
  sectionId: string
  sourceRefs: DocumentSourceRef[]
  generatedArtifactIds?: string[]
}

export interface DocumentAuthoringPlan {
  version: 1
  mode: DocumentAuthoringMode
  primarySourceRef?: DocumentSourceRef
  sources: DocumentAuthoringSource[]
  sectionPlans: DocumentAuthoringSectionPlan[]
  updatedAt?: string
}

export interface PaperMetadata {
  targetJournal?: string
  targetJournalProfile?: TargetJournalRequirementProfileSnapshot
  sectionBlueprints?: DocumentSectionBlueprintDefinition[]
  /**
   * Legacy single-analysis snapshot.
   * New multi-source documents should use authoringPlan.sources instead.
   */
  studySchema?: StudySchema
  authoringPlan?: DocumentAuthoringPlan
  generatedArtifacts?: GeneratedArtifactProvenance[]
}

export interface ReportMetadata {
  organization?: string
  sectionBlueprints?: DocumentSectionBlueprintDefinition[]
}

export type DocumentMetadata =
  | PaperMetadata
  | ReportMetadata
  | (Record<string, unknown> & {
    sectionBlueprints?: DocumentSectionBlueprintDefinition[]
    targetJournal?: string
    targetJournalProfile?: TargetJournalRequirementProfileSnapshot
    numericClaims?: unknown
  })

export function normalizeDocumentMetadata(
  metadata: DocumentMetadata | null | undefined,
): DocumentMetadata {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return {}
  }
  return { ...metadata }
}

// ── 문서 전체 ──

export interface DocumentBlueprint {
  id: string
  projectId: string
  preset: DocumentPreset
  title: string
  authors?: string[]
  language: 'ko' | 'en'
  sections: DocumentSection[]
  metadata: DocumentMetadata
  writingState?: DocumentWritingState
  createdAt: string
  updatedAt: string
}

export function normalizeDocumentWritingState(
  writingState: DocumentBlueprint['writingState'],
): DocumentWritingState {
  return {
    status: writingState?.status ?? 'idle',
    jobId: writingState?.jobId,
    startedAt: writingState?.startedAt,
    updatedAt: writingState?.updatedAt,
    errorMessage: writingState?.errorMessage,
    sectionStates: { ...(writingState?.sectionStates ?? {}) },
  }
}

function hashDocumentArtifact(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }
  return Math.abs(hash >>> 0).toString(36)
}

export function buildDocumentTableId(table: Pick<DocumentTable, 'caption' | 'headers' | 'rows' | 'sourceAnalysisId'>): string {
  const serialized = [
    table.sourceAnalysisId ?? 'manual',
    table.caption,
    table.headers.join('\u001f'),
    table.rows.map((row) => row.join('\u001f')).join('\u001e'),
  ].join('\u001d')
  return `table_${hashDocumentArtifact(serialized)}`
}

export function normalizeDocumentTable(table: DocumentTable): DocumentTable {
  return {
    ...table,
    id: table.id ?? buildDocumentTableId(table),
  }
}

export function createDocumentSourceRef(
  kind: DocumentSourceKind,
  sourceId: string,
  options?: { label?: string },
): DocumentSourceRef {
  return {
    kind,
    sourceId,
    label: options?.label,
  }
}

export function normalizeDocumentSourceRef(
  ref: LegacyDocumentSourceRef,
): DocumentSourceRef {
  if (typeof ref === 'string') {
    return createDocumentSourceRef('supplementary', ref)
  }
  return {
    kind: ref.kind === 'unknown' || !ref.kind ? 'supplementary' : ref.kind,
    sourceId: ref.sourceId,
    label: ref.label,
  }
}

export function getDocumentSourceId(ref: LegacyDocumentSourceRef): string {
  return typeof ref === 'string' ? ref : ref.sourceId
}

export function getDocumentSourceRefKey(ref: DocumentSourceRef): string {
  return `${ref.kind}:${ref.sourceId}`
}

function isDocumentAuthoringPlan(value: unknown): value is DocumentAuthoringPlan {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Partial<DocumentAuthoringPlan>
  return record.version === 1
    && Array.isArray(record.sources)
    && Array.isArray(record.sectionPlans)
}

export function getDocumentAuthoringPlan(
  metadata: DocumentMetadata | null | undefined,
): DocumentAuthoringPlan | undefined {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return undefined
  const candidate = (metadata as Partial<PaperMetadata>).authoringPlan
  return isDocumentAuthoringPlan(candidate) ? candidate : undefined
}

export function getStudySchemaSourceRef(studySchema: StudySchema): DocumentSourceRef {
  return createDocumentSourceRef(
    'analysis',
    studySchema.source.historyId ?? studySchema.source.sourceFingerprint,
    { label: studySchema.analysis.methodName },
  )
}

export function buildDocumentAuthoringPlanFromStudySchema(
  studySchema: StudySchema,
  existingPlan?: DocumentAuthoringPlan,
): DocumentAuthoringPlan {
  const sourceRef = getStudySchemaSourceRef(studySchema)
  const sourceKey = getDocumentSourceRefKey(sourceRef)
  const existingSources = existingPlan?.sources ?? []
  const existingPrimaryKey = existingPlan?.primarySourceRef
    ? getDocumentSourceRefKey(existingPlan.primarySourceRef)
    : undefined
  const updatedSource: DocumentAuthoringSource = {
    sourceRef,
    role: !existingPrimaryKey || existingPrimaryKey === sourceKey
      ? 'primary-analysis'
      : 'secondary-analysis',
    label: studySchema.analysis.methodName,
    studySchema,
    sourceFingerprint: studySchema.source.sourceFingerprint,
  }
  const sources = [
    ...existingSources.filter((source) => getDocumentSourceRefKey(source.sourceRef) !== sourceKey),
    updatedSource,
  ]
  const primarySourceRef = existingPlan?.primarySourceRef ?? sourceRef

  return {
    version: 1,
    mode: sources.length > 1 ? 'multi-source' : 'single-source',
    primarySourceRef,
    sources,
    sectionPlans: existingPlan?.sectionPlans ?? [],
    updatedAt: studySchema.generatedAt,
  }
}

function getAuthoringSourceRole(
  sourceRef: DocumentSourceRef,
  primarySourceKey: string | undefined,
): DocumentAuthoringSourceRole {
  if (sourceRef.kind === 'figure') return 'figure'
  if (sourceRef.kind === 'supplementary') return 'supplementary'
  return primarySourceKey === getDocumentSourceRefKey(sourceRef)
    ? 'primary-analysis'
    : 'secondary-analysis'
}

export function buildDocumentAuthoringPlanFromSourceRefs(
  sourceRefs: readonly DocumentSourceRef[],
  existingPlan?: DocumentAuthoringPlan,
  options?: {
    updatedAt?: string
  },
): DocumentAuthoringPlan {
  const dedupedSourceRefs = new Map<string, DocumentSourceRef>()
  for (const sourceRef of sourceRefs) {
    dedupedSourceRefs.set(getDocumentSourceRefKey(sourceRef), sourceRef)
  }

  const existingSourcesByKey = new Map(
    (existingPlan?.sources ?? []).map((source) => [
      getDocumentSourceRefKey(source.sourceRef),
      source,
    ] as const),
  )
  const primarySourceRef = existingPlan?.primarySourceRef
    ?? Array.from(dedupedSourceRefs.values()).find((sourceRef) => sourceRef.kind === 'analysis')
    ?? Array.from(dedupedSourceRefs.values())[0]
  const primarySourceKey = primarySourceRef ? getDocumentSourceRefKey(primarySourceRef) : undefined
  const sources = Array.from(dedupedSourceRefs.entries()).map(([sourceKey, sourceRef]) => {
    const existingSource = existingSourcesByKey.get(sourceKey)
    return {
      ...existingSource,
      sourceRef,
      role: getAuthoringSourceRole(sourceRef, primarySourceKey),
      label: sourceRef.label ?? existingSource?.label,
    }
  })

  return {
    version: 1,
    mode: sources.length > 1 ? 'multi-source' : 'single-source',
    primarySourceRef,
    sources,
    sectionPlans: existingPlan?.sectionPlans ?? [],
    updatedAt: options?.updatedAt ?? existingPlan?.updatedAt,
  }
}

export function buildGeneratedArtifactId(
  artifactKind: GeneratedArtifactKind,
  sourceRefs: readonly DocumentSourceRef[],
): string {
  const sourceKey = sourceRefs
    .map((sourceRef) => getDocumentSourceRefKey(sourceRef))
    .sort()
    .join('|')
  return `${artifactKind}_${hashDocumentArtifact(sourceKey || 'no-source')}`
}

export function createGeneratedArtifactProvenance(
  artifact: Omit<GeneratedArtifactProvenance, 'artifactId'> & {
    artifactId?: string
  },
): GeneratedArtifactProvenance {
  return {
    ...artifact,
    artifactId: artifact.artifactId ?? buildGeneratedArtifactId(
      artifact.artifactKind,
      artifact.sourceRefs,
    ),
  }
}

function dedupeStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values))
}

function getArtifactSectionId(artifactKind: GeneratedArtifactKind): string {
  return artifactKind === 'caption' ? 'captions' : artifactKind
}

export function upsertGeneratedArtifactProvenance(
  metadata: DocumentMetadata | null | undefined,
  artifact: GeneratedArtifactProvenance,
): DocumentMetadata {
  const normalizedMetadata = normalizeDocumentMetadata(metadata)
  const existingArtifacts = (normalizedMetadata as Partial<PaperMetadata>).generatedArtifacts ?? []
  const generatedArtifacts = [
    ...existingArtifacts.filter((item) => !(
      item.artifactKind === artifact.artifactKind
      && item.artifactId === artifact.artifactId
    )),
    artifact,
  ]
  const existingPlan = getDocumentAuthoringPlan(normalizedMetadata)
  const sourceKeys = new Set(artifact.sourceRefs.map((sourceRef) => getDocumentSourceRefKey(sourceRef)))

  if (!existingPlan) {
    return {
      ...normalizedMetadata,
      generatedArtifacts,
    }
  }

  const sectionId = getArtifactSectionId(artifact.artifactKind)
  const existingSectionPlan = existingPlan.sectionPlans.find((sectionPlan) => sectionPlan.sectionId === sectionId)
  const mergedSectionSourceRefs = new Map<string, DocumentSourceRef>()
  for (const sourceRef of [
    ...(existingSectionPlan?.sourceRefs ?? []),
    ...artifact.sourceRefs,
  ]) {
    mergedSectionSourceRefs.set(getDocumentSourceRefKey(sourceRef), sourceRef)
  }
  const sectionPlans = [
    ...existingPlan.sectionPlans.filter((sectionPlan) => sectionPlan.sectionId !== sectionId),
    {
      sectionId,
      sourceRefs: Array.from(mergedSectionSourceRefs.values()),
      generatedArtifactIds: dedupeStrings([
        ...(existingSectionPlan?.generatedArtifactIds ?? []),
        artifact.artifactId,
      ]),
    },
  ]

  return {
    ...normalizedMetadata,
    generatedArtifacts,
    authoringPlan: {
      ...existingPlan,
      sources: existingPlan.sources.map((source) => (
        sourceKeys.has(getDocumentSourceRefKey(source.sourceRef))
          ? {
              ...source,
              generatedArtifactIds: dedupeStrings([
                ...(source.generatedArtifactIds ?? []),
                artifact.artifactId,
              ]),
            }
          : source
      )),
      sectionPlans,
      updatedAt: artifact.generatedAt,
    },
  }
}

export function normalizeDocumentBlueprint(document: DocumentBlueprint): DocumentBlueprint {
  return {
    ...document,
    metadata: normalizeDocumentMetadata(document.metadata),
    writingState: normalizeDocumentWritingState(document.writingState),
    sections: document.sections.map((section) => {
      const sectionSupportBindings = normalizeDocumentSectionSupportBindings(section.sectionSupportBindings)
      return {
        ...section,
        sourceRefs: (section.sourceRefs ?? []).map((ref) => normalizeDocumentSourceRef(ref as LegacyDocumentSourceRef)),
        ...(sectionSupportBindings ? { sectionSupportBindings } : {}),
        tables: section.tables?.map((table) => normalizeDocumentTable(table)),
      }
    }),
  }
}

// ── 변환 유틸 ──

/**
 * PaperTable → DocumentTable 변환
 *
 * paper-tables.ts의 plainText는 \t + \n 형식으로 생성됨을 전제.
 * 컬럼 수 불일치 시 빈 셀로 채움.
 */
export function convertPaperTable(
  pt: PaperTable,
  options?: {
    sourceAnalysisId?: string
    sourceAnalysisLabel?: string
  },
): DocumentTable {
  const lines = pt.plainText.split('\n').filter(Boolean)
  const headers = lines.length > 0 ? lines[0].split('\t') : []
  const rows = lines.slice(1).map(line => {
    const cells = line.split('\t')
    while (cells.length < headers.length) cells.push('')
    return cells
  })
  return normalizeDocumentTable({
    id: pt.id,
    caption: pt.title,
    headers,
    rows,
    htmlContent: pt.htmlContent,
    sourceAnalysisId: options?.sourceAnalysisId,
    sourceAnalysisLabel: options?.sourceAnalysisLabel,
  })
}

/**
 * GraphProject → FigureRef 변환
 *
 * GraphProject에 caption 필드가 없으므로 name + chartType으로 생성한다.
 * 논문/문서 round-trip UX를 위해 관련 분석 메타데이터를 함께 보존한다.
 */
export function buildFigureRef(
  gp: GraphProject,
  index: number,
  options?: {
    relatedAnalysisId?: string
    relatedAnalysisLabel?: string
    patternSummary?: string
  },
): FigureRef {
  const chartType = gp.chartSpec?.chartType ?? ''
  return {
    entityId: gp.id,
    label: `Figure ${index + 1}`,
    caption: chartType ? `${gp.name} (${chartType})` : gp.name,
    chartType: chartType || undefined,
    relatedAnalysisId: options?.relatedAnalysisId,
    relatedAnalysisLabel: options?.relatedAnalysisLabel,
    patternSummary: options?.patternSummary,
  }
}

export function getGraphPrimaryAnalysisId(graph: GraphProject): string | undefined {
  return getGraphProjectAnalysisSourceRefs(graph)[0]?.sourceId
}

import { generateId } from '@/lib/utils/generate-id'

/** 고유 문서 ID 생성 */
export const generateDocumentId = (): string => generateId('doc')
