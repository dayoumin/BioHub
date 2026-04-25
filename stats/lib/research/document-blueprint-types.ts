/**
 * DocumentBlueprint 타입 정의 + 변환 유틸
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §2.2
 * 구현 계획: Phase 1
 */

import type { PaperTable } from '@/lib/services/paper-draft/paper-types'
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

export interface DocumentSectionBlueprintDefinition {
  id?: string
  title: string
  editable?: boolean
  generatedBy: 'template' | 'llm' | 'user'
}

// ── 섹션 ──

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

export interface PaperMetadata {
  targetJournal?: string
  sectionBlueprints?: DocumentSectionBlueprintDefinition[]
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
  })

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

export function normalizeDocumentBlueprint(document: DocumentBlueprint): DocumentBlueprint {
  return {
    ...document,
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
