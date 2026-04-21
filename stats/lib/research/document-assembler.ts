/**
 * DocumentBlueprint 조립 엔진
 *
 * 설계서: stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md §3-4
 * 구현 계획: Phase 1
 *
 * 전략: resolveEntities() 비경유, HistoryRecord 직접 접근 (§3.2)
 */

import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { ProjectEntityRef } from '@biohub/types'
import type { GraphProject } from '@/types/graph-studio'
import type { BlastEntryLike } from './entity-resolver'
import type { CitationRecord } from './citation-types'
import { citationKey } from './citation-types'
import { buildCitationString } from './citation-apa-formatter'
import { generateFigurePatternSummary } from './paper-package-assembler'
import type {
  DocumentBlueprint,
  DocumentPreset,
  DocumentSection,
  DocumentTable,
  FigureRef,
  DocumentMetadata,
  DocumentSourceRef,
} from './document-blueprint-types'
import {
  buildDocumentTableId,
  convertPaperTable,
  buildFigureRef,
  createDocumentSourceRef,
  getGraphPrimaryAnalysisId,
  generateDocumentId,
} from './document-blueprint-types'
import { createEmptySections } from './document-preset-registry'

// ── 데이터 로더 인터페이스 (테스트 용이성) ──

export interface AssemblerDataSources {
  /** 프로젝트 소속 entity ref 목록 */
  entityRefs: ProjectEntityRef[]
  /** 전체 분석 히스토리 (필터링 전) */
  allHistory: HistoryRecord[]
  /** 전체 Graph Studio 프로젝트 */
  allGraphProjects: GraphProject[]
  /** genetics 히스토리 (BLAST 결과 조립용, entity-loader blastHistory) */
  blastHistory?: BlastEntryLike[]
  /** 프로젝트에 저장된 인용 목록 */
  citations?: CitationRecord[]
}

export interface AssembleOptions {
  projectId: string
  preset: DocumentPreset
  language: 'ko' | 'en'
  title: string
  authors?: string[]
  metadata?: DocumentMetadata
}

// ── 내부 유틸 ──

/** 프로젝트 소속 분석 히스토리만 필터링 */
function filterProjectHistory(
  entityRefs: ProjectEntityRef[],
  allHistory: HistoryRecord[],
): HistoryRecord[] {
  const analysisIds = new Set(
    entityRefs
      .flatMap((ref) => {
        if (ref.entityKind === 'analysis') {
          return [ref.entityId]
        }
        return (ref.provenanceEdges ?? [])
          .filter((edge) => edge.targetKind === 'analysis')
          .map((edge) => edge.targetId)
      }),
  )
  return allHistory.filter(h => analysisIds.has(h.id))
}

/** 프로젝트 소속 그래프 프로젝트만 필터링 */
function filterProjectFigures(
  entityRefs: ProjectEntityRef[],
  allGraphProjects: GraphProject[],
): GraphProject[] {
  const figureIds = new Set(
    entityRefs
      .filter(ref => ref.entityKind === 'figure')
      .map(ref => ref.entityId),
  )
  return allGraphProjects.filter(gp => figureIds.has(gp.id))
}

/** Methods 섹션 텍스트 병합 */
function mergeMethods(records: HistoryRecord[], language: 'ko' | 'en'): string {
  const parts: string[] = []

  for (const record of records) {
    const draft = record.paperDraft
    if (!draft?.methods) continue

    const methodName = record.method?.name ?? record.name
    parts.push(`### ${methodName}\n\n${draft.methods}`)
  }

  return parts.join('\n\n')
}

function mergeDocumentSourceRefs(
  refs: ReadonlyArray<DocumentSourceRef>,
): DocumentSourceRef[] {
  const merged = new Map<string, DocumentSourceRef>()
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.sourceId}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, ref)
      continue
    }
    if (existing.kind === 'unknown' && ref.kind !== 'unknown') {
      merged.set(key, ref)
    }
  }
  return Array.from(merged.values())
}

function getFigurePrimaryAnalysisId(
  figureRef: ProjectEntityRef | undefined,
  graph: GraphProject,
): string | undefined {
  const provenanceAnalysisId = figureRef?.provenanceEdges
    ?.find((edge) => edge.targetKind === 'analysis')
    ?.targetId

  return provenanceAnalysisId ?? getGraphPrimaryAnalysisId(graph)
}

/** Results 섹션 텍스트 + 표 + Figure 병합 */
function mergeResults(
  entityRefs: ProjectEntityRef[],
  records: HistoryRecord[],
  figures: GraphProject[],
  allHistory: HistoryRecord[],
  language: 'ko' | 'en',
): { content: string; tables: DocumentTable[]; figureRefs: FigureRef[] } {
  const parts: string[] = []
  const tables: DocumentTable[] = []
  const historyById = new Map(allHistory.map((record) => [record.id, record]))
  const figureRefById = new Map(
    entityRefs
      .filter((ref) => ref.entityKind === 'figure')
      .map((ref) => [ref.entityId, ref] as const),
  )

  for (const record of records) {
    const draft = record.paperDraft
    if (!draft) continue

    const methodName = record.method?.name ?? record.name

    if (draft.results) {
      parts.push(`### ${methodName}\n\n${draft.results}`)
    }

    if (draft.tables) {
      for (const pt of draft.tables) {
        tables.push(convertPaperTable(pt, {
          sourceAnalysisId: record.id,
          sourceAnalysisLabel: methodName,
        }))
      }
    }
  }

  const figureRefs = figures.map((gp, i) => {
    const relatedAnalysisId = getFigurePrimaryAnalysisId(figureRefById.get(gp.id), gp)
    const linkedRecord = relatedAnalysisId ? historyById.get(relatedAnalysisId) : undefined
    return buildFigureRef(gp, i, {
      relatedAnalysisId,
      relatedAnalysisLabel: linkedRecord?.method?.name ?? linkedRecord?.name,
      patternSummary: generateFigurePatternSummary(gp, linkedRecord),
    })
  })

  if (figureRefs.length > 0) {
    const figureSection = language === 'ko' ? '\n\n### 그림' : '\n\n### Figures'
    const figureLines = figureRefs.map((figureRef) => {
      const lines = [`- **${figureRef.label}**: ${figureRef.caption}`]
      if (figureRef.relatedAnalysisLabel) {
        lines.push(`  - ${language === 'ko' ? '관련 분석' : 'Related analysis'}: ${figureRef.relatedAnalysisLabel}`)
      }
      if (figureRef.patternSummary) {
        lines.push(`  - ${language === 'ko' ? '패턴 요약' : 'Pattern summary'}: ${figureRef.patternSummary}`)
      }
      return lines.join('\n')
    })
    parts.push(`${figureSection}\n\n${figureLines.join('\n')}`)
  }

  return { content: parts.join('\n\n'), tables, figureRefs }
}

function mergeBlastResults(
  entityRefs: ProjectEntityRef[],
  blastHistory: BlastEntryLike[],
): string {
  const blastIds = new Set(
    entityRefs
      .filter(ref => ref.entityKind === 'blast-result')
      .map(ref => ref.entityId),
  )
  if (blastIds.size === 0) return ''

  const blastRecords = blastHistory.filter(h => blastIds.has(h.id))
  const parts: string[] = []

  for (const entry of blastRecords) {
    const rd = entry.resultData
    if (!rd) continue

    const description = rd.description ?? ''
    const topHits = rd.topHits ?? []

    const lines = [`### BLAST: ${entry.sampleName}`, '', description]

    if (topHits.length > 0) {
      lines.push('')
      lines.push('| Species | Identity | Accession |')
      lines.push('|---------|----------|-----------|')
      for (const hit of topHits.slice(0, 5)) {
        const pct = hit.identity > 1 ? hit.identity : hit.identity * 100
        lines.push(`| ${hit.species} | ${pct.toFixed(1)}% | ${hit.accession} |`)
      }
    }

    parts.push(lines.join('\n'))
  }

  return parts.join('\n\n')
}

/** References 섹션 텍스트 = 사용자 인용 + 소프트웨어 인용 */
function buildReferencesContent(
  citations: CitationRecord[],
  language: 'ko' | 'en',
): string {
  const software =
    language === 'ko'
      ? [
          '### 소프트웨어',
          '',
          '- BioHub (https://biohub.ecomarin.workers.dev/) — 통계 분석 및 논문 초안 생성',
          '- SciPy (Virtanen et al., 2020) — 통계 검정 라이브러리',
        ].join('\n')
      : [
          '### Software',
          '',
          '- BioHub (https://biohub.ecomarin.workers.dev/) — Statistical analysis and paper draft generation',
          '- SciPy (Virtanen et al., 2020) — Statistical testing library',
        ].join('\n')

  if (citations.length === 0) return software

  // defense-in-depth: citationKey 기준 중복 제거
  const seen = new Set<string>()
  const unique = citations.filter(c => {
    const key = citationKey(c.item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const header = language === 'ko' ? '### 참고문헌' : '### References'
  const cited = unique
    .map((c, i) => `${i + 1}. ${buildCitationString(c.item)}`)
    .join('\n')

  return `${header}\n\n${cited}\n\n${software}`
}

// ── 공개 API ──

/**
 * 프로젝트 데이터를 기반으로 DocumentBlueprint 조립
 *
 * @param options - 조립 옵션
 * @param sources - 데이터 소스 (DI로 주입, 테스트 용이)
 */
export function assembleDocument(
  options: AssembleOptions,
  sources: AssemblerDataSources,
): DocumentBlueprint {
  const { projectId, preset, language, title, authors, metadata } = options

  const sections = createEmptySections(preset, language)

  const projectHistory = filterProjectHistory(sources.entityRefs, sources.allHistory)
  const projectFigures = filterProjectFigures(sources.entityRefs, sources.allGraphProjects)

  // Methods 섹션 채우기
  const methodsSection = sections.find(s => s.id === 'methods')
  if (methodsSection) {
    const methodsContent = mergeMethods(projectHistory, language)
    if (methodsContent) {
      methodsSection.content = methodsContent
      methodsSection.generatedBy = 'template'
      methodsSection.sourceRefs = projectHistory.map((h) => createDocumentSourceRef('analysis', h.id, {
        label: h.method?.name ?? h.name,
      }))
    }
  }

  // Results 섹션 채우기
  const resultsSection = sections.find(s => s.id === 'results')
  if (resultsSection) {
    const { content, tables, figureRefs } = mergeResults(
      sources.entityRefs,
      projectHistory,
      projectFigures,
      sources.allHistory,
      language,
    )

    // BLAST 결과 추가
    const blastContent = mergeBlastResults(sources.entityRefs, sources.blastHistory ?? [])
    const fullContent = [content, blastContent].filter(Boolean).join('\n\n')

    if (fullContent) {
      resultsSection.content = fullContent
      resultsSection.generatedBy = 'template'
      resultsSection.sourceRefs = mergeDocumentSourceRefs([
        ...projectHistory.map((h) => createDocumentSourceRef('analysis', h.id, {
          label: h.method?.name ?? h.name,
        })),
        ...projectFigures.map((gp) => createDocumentSourceRef('figure', gp.id, {
          label: gp.name,
        })),
      ])
    }
    if (tables.length > 0) resultsSection.tables = tables
    if (figureRefs.length > 0) resultsSection.figures = figureRefs
  }

  // References 섹션 기본값
  const refsSection = sections.find(s => s.id === 'references')
  if (refsSection && !refsSection.content) {
    refsSection.content = buildReferencesContent(sources.citations ?? [], language)
    refsSection.generatedBy = 'template'
  }

  const now = new Date().toISOString()

  return {
    id: generateDocumentId(),
    projectId,
    preset,
    title,
    authors,
    language,
    sections,
    metadata: metadata ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 기존 문서에 새 분석 결과 반영 (재조립)
 *
 * 사용자가 편집한 섹션(generatedBy: 'user')은 보존하고,
 * template 섹션만 다시 생성하여 교체.
 */
export function reassembleDocument(
  existing: DocumentBlueprint,
  sources: AssemblerDataSources,
): DocumentBlueprint {
  const freshSections = assembleDocument(
    {
      projectId: existing.projectId,
      preset: existing.preset,
      language: existing.language,
      title: existing.title,
      authors: existing.authors,
      metadata: existing.metadata,
    },
    sources,
  ).sections

  const mergeTables = (
    freshTables: DocumentTable[] | undefined,
    existingTables: DocumentTable[] | undefined,
  ): DocumentTable[] | undefined => {
    const merged = new Map<string, DocumentTable>()

    for (const table of freshTables ?? []) {
      const key = table.id ?? buildDocumentTableId(table)
      merged.set(key, table)
    }

    for (const table of existingTables ?? []) {
      const key = table.id ?? buildDocumentTableId(table)
      if (!merged.has(key)) {
        merged.set(key, table)
      }
    }

    return merged.size > 0 ? Array.from(merged.values()) : undefined
  }

  const mergeFigures = (
    freshFigures: FigureRef[] | undefined,
    existingFigures: FigureRef[] | undefined,
  ): FigureRef[] | undefined => {
    const merged = new Map<string, FigureRef>()

    for (const figure of freshFigures ?? []) {
      merged.set(figure.entityId, figure)
    }

    for (const figure of existingFigures ?? []) {
      if (!merged.has(figure.entityId)) {
        merged.set(figure.entityId, figure)
      }
    }

    return merged.size > 0 ? Array.from(merged.values()) : undefined
  }

  const mergeStructuredSectionFields = (
    baseSection: DocumentSection,
    existingSection: DocumentSection,
    freshSection: DocumentSection | undefined,
  ): DocumentSection => {
    if (!freshSection) return existingSection

    const tables = mergeTables(freshSection.tables, existingSection.tables)
    const figures = mergeFigures(freshSection.figures, existingSection.figures)
    const preservedSourceRefs = mergeDocumentSourceRefs([
      ...freshSection.sourceRefs,
      ...existingSection.sourceRefs,
      ...(tables ?? []).flatMap((table) => (
        table.sourceAnalysisId
          ? [createDocumentSourceRef('analysis', table.sourceAnalysisId, {
              label: table.sourceAnalysisLabel,
            })]
          : []
      )),
      ...(figures ?? []).map((figure) => (
        createDocumentSourceRef('figure', figure.entityId, {
          label: figure.label,
        })
      )),
    ])

    return {
      ...baseSection,
      sourceRefs: preservedSourceRefs,
      tables,
      figures,
    }
  }

  const merged: DocumentSection[] = existing.sections.map(existingSection => {
    const fresh = freshSections.find(s => s.id === existingSection.id)

    // 사용자 작성 또는 LLM 생성 섹션은 본문을 보존하되 구조화 메타는 최신화
    if (existingSection.generatedBy !== 'template') {
      return mergeStructuredSectionFields(existingSection, existingSection, fresh)
    }

    // template 섹션도 본문은 최신 조립 결과로 교체하되 사용자가 추가한 구조화 sidecar는 보존
    if (!fresh) {
      return existingSection
    }

    return mergeStructuredSectionFields(fresh, existingSection, fresh)
  })

  const nowMs = Date.now()
  const existingMs = new Date(existing.updatedAt).getTime()
  const updatedAt = new Date(Math.max(nowMs, existingMs + 1)).toISOString()

  return {
    ...existing,
    sections: merged,
    updatedAt,
  }
}
