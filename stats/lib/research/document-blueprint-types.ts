/**
 * DocumentBlueprint 타입 정의 + 변환 유틸
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §2.2
 * 구현 계획: Phase 1
 */

import type { PaperTable } from '@/lib/services/paper-draft/paper-types'
import type { GraphProject } from '@/types/graph-studio'

// ── 프리셋 ──

export type DocumentPreset = 'paper' | 'report' | 'custom'

// ── 표 ──

/** 정규화된 문서 표 — PaperTable과 ReportTable 양쪽 수용 */
export interface DocumentTable {
  id?: string
  caption: string
  headers: string[]
  rows: string[][]
  /** PaperTable 원본 HTML (내보내기 품질 유지) */
  htmlContent?: string
}

// ── Figure ──

export interface FigureRef {
  entityId: string
  label: string
  caption: string
}

// ── 섹션 ──

export interface DocumentSection {
  id: string
  title: string
  content: string
  sourceRefs: string[]
  tables?: DocumentTable[]
  figures?: FigureRef[]
  editable: boolean
  generatedBy: 'template' | 'llm' | 'user'
}

// ── 메타데이터 ──

export interface PaperMetadata {
  targetJournal?: string
}

export interface ReportMetadata {
  organization?: string
}

export type DocumentMetadata =
  | PaperMetadata
  | ReportMetadata
  | Record<string, unknown>

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
  createdAt: string
  updatedAt: string
}

// ── 변환 유틸 ──

/**
 * PaperTable → DocumentTable 변환
 *
 * paper-tables.ts의 plainText는 \t + \n 형식으로 생성됨을 전제.
 * 컬럼 수 불일치 시 빈 셀로 채움.
 */
export function convertPaperTable(pt: PaperTable): DocumentTable {
  const lines = pt.plainText.split('\n').filter(Boolean)
  const headers = lines.length > 0 ? lines[0].split('\t') : []
  const rows = lines.slice(1).map(line => {
    const cells = line.split('\t')
    while (cells.length < headers.length) cells.push('')
    return cells
  })
  return {
    id: pt.id,
    caption: pt.title,
    headers,
    rows,
    htmlContent: pt.htmlContent,
  }
}

/**
 * GraphProject → FigureRef 변환
 *
 * GraphProject에 caption 필드가 없으므로 name + chartType으로 생성.
 */
export function buildFigureRef(gp: GraphProject, index: number): FigureRef {
  const chartType = gp.chartSpec?.chartType ?? ''
  return {
    entityId: gp.id,
    label: `Figure ${index + 1}`,
    caption: chartType ? `${gp.name} (${chartType})` : gp.name,
  }
}

/** 고유 문서 ID 생성 */
export function generateDocumentId(): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `doc_${Date.now()}_${random}`
}
