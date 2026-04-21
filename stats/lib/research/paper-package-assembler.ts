/**
 * Paper Package 조립 엔진
 * 설계서: docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md §4-3
 */

import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import type {
  PaperPackage,
  PackageItem,
  PackageAnalysisLink,
  PackageReference,
  AssemblyResult,
  ReferenceRole,
} from './paper-package-types'

export interface PackageDataSources {
  historyRecords: HistoryRecord[]
  graphProjects: GraphProject[]
}

// ── groupStats 추출 (defensive) ───────────────────────────

interface GroupStat {
  group: string
  mean?: number
  median?: number
  n?: number
}

function isGroupStat(v: unknown): v is GroupStat {
  return (
    typeof v === 'object' &&
    v !== null &&
    'group' in v &&
    typeof (v as Record<string, unknown>).group === 'string'
  )
}

function extractGroupStats(results: Record<string, unknown>): GroupStat[] | undefined {
  const raw = results['groupStats'] ?? results['group_stats']
  if (!Array.isArray(raw)) return undefined
  const filtered = raw.filter(isGroupStat)
  return filtered.length > 0 ? filtered : undefined
}

// ── generateFigurePatternSummary ──────────────────────────

export function generateFigurePatternSummary(
  _graph: GraphProject,
  historyRecord?: HistoryRecord,
): string | undefined {
  if (!historyRecord?.results) return undefined

  const stats = extractGroupStats(historyRecord.results as Record<string, unknown>)
  if (!stats || stats.length === 0) return undefined

  const sorted = [...stats].sort((a, b) => {
    const va = a.mean ?? a.median ?? 0
    const vb = b.mean ?? b.median ?? 0
    return vb - va
  })

  const parts = sorted.map(s => {
    const val = s.mean ?? s.median
    const label = s.mean !== undefined ? '평균' : '중앙값'
    return val !== undefined ? `${s.group}(${label} ${val})` : s.group
  })

  const hasMean = stats.some(s => s.mean !== undefined)
  return `그룹별 ${hasMean ? '평균' : '중앙값'}: ${parts.join(' > ')}.`
}

// ── 포맷 헬퍼 ────────────────────────────────────────────

function formatReference(ref: PackageReference, index: number, isKo: boolean): string {
  const entry = ref.manualEntry
  if (!entry) return `[${index + 1}] (Citation Store 연결 필요)`

  const base = `${entry.authors} (${entry.year}). ${entry.title}. ${entry.journal}`
  const vol = entry.volume ? `, ${entry.volume}` : ''
  const iss = entry.issue ? `(${entry.issue})` : ''
  const pages = entry.pages ? `, ${entry.pages}` : ''
  const doi = entry.doi ? `. ${entry.doi}` : ''

  const roleLabel: Record<ReferenceRole, string> = {
    methodology: '방법론 근거',
    comparison: '비교 데이터',
    background: '배경 이론',
    theory: '배경 이론',
    other: '기타',
  }

  const lines = [`- ${base}${vol}${iss}${pages}${doi} — [${roleLabel[ref.role]}]`]
  if (ref.summary) {
    lines.push(`  - 요약: ${ref.summary}`)
  } else if (ref.summaryStatus !== 'ready') {
    lines.push(isKo
      ? `  - ⚠ 요약 없음 — 이 문헌에 대한 서론 서술은 최소화하십시오.`
      : `  - ⚠ Summary missing — Minimize introduction text for this reference.`)
  }
  return lines.join('\n')
}

function getPackageItemAnalysisLinks(item: PackageItem): PackageAnalysisLink[] {
  if (item.analysisLinks && item.analysisLinks.length > 0) {
    return item.analysisLinks
      .filter((link) => link.sourceId.trim().length > 0)
      .map((link) => ({ sourceId: link.sourceId, label: link.label }))
  }

  if (item.analysisIds.length === 0) {
    return []
  }

  if (item.type === 'analysis') {
    return item.analysisIds.map((label) => ({ sourceId: item.sourceId, label }))
  }

  return []
}

function getPackageItemAnalysisLabels(item: PackageItem): string[] {
  if (item.analysisLinks && item.analysisLinks.length > 0) {
    return item.analysisLinks.map((link) => link.label)
  }
  return [...item.analysisIds]
}

function getPackageItemAnalysisSourceIds(item: PackageItem): string[] {
  const sourceIds = getPackageItemAnalysisLinks(item).map((link) => link.sourceId)
  return Array.from(new Set(sourceIds))
}

/** HistoryRecord에서 구조화된 분석 결과 JSON을 추출 (defensive) */
function serializeAnalysisItem(item: PackageItem, record: HistoryRecord): string {
  const methodName = record.method?.name ?? '분석'
  const r = (record.results ?? {}) as Record<string, unknown>
  const vm = record.variableMapping as Record<string, unknown> | null | undefined
  const analysisLinks = getPackageItemAnalysisLinks(item)

  // 변수 정보 추출 (VariableMapping 실제 필드: dependentVar, independentVar, groupVar 등)
  const dependent = vm?.['dependentVar']
  const independent = vm?.['independentVar'] ?? vm?.['groupVar']
  const groups = r['groups'] ?? r['groupNames']

  // 가정 검정 추출
  const assumptions = r['assumptions'] ?? r['assumptionTests']

  // 주요 결과 추출 (common patterns)
  const mainResult: Record<string, unknown> = {}
  for (const key of ['F', 't', 'chi2', 'U', 'H', 'W', 'z', 'r', 'df', 'p', 'p_value', 'pValue']) {
    if (r[key] !== undefined) mainResult[key] = r[key]
  }
  // fallback: nested result object
  if (Object.keys(mainResult).length === 0 && typeof r['result'] === 'object' && r['result'] !== null) {
    Object.assign(mainResult, r['result'] as Record<string, unknown>)
  }

  // 효과크기
  const effectSize = r['effectSize'] ?? r['effect_size']

  // 그룹 기술통계
  const groupStats = r['groupStats'] ?? r['group_stats']

  const json = JSON.stringify(
    {
      id: item.sourceId,
      sourceId: item.sourceId,
      sourceTitle: item.sourceTitle ?? undefined,
      sourceNavigateTo: item.sourceNavigateTo ?? undefined,
      method: methodName,
      analysisLabel: analysisLinks[0]?.label ?? undefined,
      sourceAnalysisIds: getPackageItemAnalysisSourceIds(item),
      label: item.label,
      section: item.section,
      dependent: dependent || undefined,
      independent: independent || undefined,
      groups: groups || undefined,
      assumptions: assumptions || undefined,
      result: Object.keys(mainResult).length > 0 ? mainResult : undefined,
      effectSize: effectSize || undefined,
      groupStats: groupStats || undefined,
      interpretation: record.paperDraft?.results ?? record.aiInterpretation ?? undefined,
      apaFormat: record.apaFormat ?? undefined,
    },
    null,
    2,
  )

  return `### [${item.label}] ${methodName}\n\`\`\`json\n${json}\n\`\`\``
}

function serializeFigureItem(item: PackageItem, isKo: boolean): string {
  const analysisLabels = getPackageItemAnalysisLabels(item)
  const analysisSourceIds = getPackageItemAnalysisSourceIds(item)
  const lines = [
    `### [${item.label}]`,
    `- **원본 ID**: ${item.sourceId}`,
    item.sourceTitle ? `- **${isKo ? '원본 제목' : 'Source title'}**: ${item.sourceTitle}` : null,
    item.sourceNavigateTo ? `- **${isKo ? '원본 링크' : 'Source link'}**: ${item.sourceNavigateTo}` : null,
    item.patternSummary ? `- **패턴 요약**: ${item.patternSummary}` : '- **패턴 요약**: (직접 입력 필요)',
  ]
  if (analysisLabels.length > 0) {
    lines.push(`- **${isKo ? '관련 분석' : 'Related analyses'}**: ${analysisLabels.join(', ')}`)
  }
  if (analysisSourceIds.length > 0) {
    lines.push(`- **${isKo ? '원본 분석 ID' : 'Source analysis IDs'}**: ${analysisSourceIds.join(', ')}`)
  }
  return lines.filter((line): line is string => Boolean(line)).join('\n')
}

// ── assemblePaperPackage ──────────────────────────────────

export function assemblePaperPackage(
  pkg: PaperPackage,
  sources: PackageDataSources,
): AssemblyResult {
  const warnings: string[] = []
  const sections: string[] = []

  const historyMap = new Map(sources.historyRecords.map(h => [h.id, h]))
  const graphMap = new Map(sources.graphProjects.map(g => [g.id, g]))

  const includedItems = pkg.items
    .filter(i => i.included)
    .sort((a, b) => a.order - b.order)

  const includedRefs = pkg.references.filter(r => r.included)

  // 1. 역할 + 핵심 규칙 (언어별 분기)
  const lang = pkg.journal.language
  const isKo = lang === 'ko'

  sections.push(isKo
    ? `# 연구 논문 작성 요청

## 역할
당신은 ${pkg.overview.purpose ? `"${pkg.overview.purpose}" 연구의` : ''} 학술 논문 작성 전문가입니다.
아래 제공된 통계 분석 결과와 문헌을 기반으로 완전한 논문 초고를 작성하십시오.

## 핵심 규칙
1. 아래 제시된 통계 수치를 **정확히 그대로** 인용하십시오. 반올림하거나 변경 금지.
2. 제시되지 않은 데이터, 분석, 문헌을 **절대 지어내지(hallucinate) 마십시오**.
3. 참고문헌은 아래 "참고문헌 목록"에 있는 것만 사용하십시오.
4. 모든 Table/Figure 번호는 지정된 번호를 그대로 따르십시오.
5. 상관관계를 인과관계로 서술하지 마십시오.
6. 유의하지 않은 결과(p >= α)도 반드시 보고하십시오.`
    : `# Research Paper Writing Request

## Role
You are an expert academic writer${pkg.overview.purpose ? ` for "${pkg.overview.purpose}" research` : ''}.
Write a complete manuscript draft based on the statistical analysis results and references provided below.

## Critical Rules
1. Cite all statistical values **exactly as presented**. Do not round or modify.
2. Do **not hallucinate** any data, analyses, or references not provided below.
3. Use only references listed in the "References" section below.
4. Follow Table/Figure numbering exactly as specified.
5. Do not imply causation from correlational findings.
6. Report non-significant results (p >= α) as well.`)

  // 2. 저널 설정 + 언어 규칙
  const journalLines = [
    isKo ? `## 저널 설정` : `## Journal Settings`,
    `- ${isKo ? '저널' : 'Journal'}: ${pkg.journal.name}`,
    `- ${isKo ? '스타일' : 'Style'}: ${pkg.journal.style}`,
    `- ${isKo ? '언어' : 'Language'}: ${isKo ? '한국어' : 'English'}`,
    `- ${isKo ? '구조' : 'Structure'}: ${pkg.journal.sections.join(' → ')}`,
  ]
  if (isKo && pkg.journal.writingStyle) {
    journalLines.push('', `## 한국어 작성 규칙`, `- 문체: ${pkg.journal.writingStyle}`, `- 통계 기호는 영문 이탤릭 유지 (*F*, *p*, *t*)`)
  }
  sections.push(journalLines.join('\n'))

  // 3. 연구 개요
  const overviewLines = [
    isKo ? `## 1. 연구 개요` : `## 1. Study Overview`,
    `- ${isKo ? '제목' : 'Title'}: ${pkg.overview.title}`,
    `- ${isKo ? '목적' : 'Objective'}: ${pkg.overview.purpose}`,
  ]
  if (pkg.overview.researchQuestion) overviewLines.push(`- ${isKo ? '연구 질문' : 'Research Question'}: ${pkg.overview.researchQuestion}`)
  if (pkg.overview.hypothesis) overviewLines.push(`- ${isKo ? '가설' : 'Hypothesis'}: ${pkg.overview.hypothesis}`)
  overviewLines.push(`- ${isKo ? '데이터' : 'Data'}: ${pkg.overview.dataDescription}`)
  sections.push(overviewLines.join('\n'))

  // 4. 분석 결과 (analysis 타입 아이템)
  const analysisItems = includedItems.filter(i => i.type === 'analysis')
  if (analysisItems.length > 0) {
    const analysisParts = [isKo ? '## 2. 분석 결과 (구조화 데이터)' : '## 2. Analysis Results (Structured Data)']
    for (const item of analysisItems) {
      const record = historyMap.get(item.sourceId)
      if (!record) {
        warnings.push(`[경고] ${item.label}: 분석 히스토리 레코드를 찾을 수 없음 (sourceId: ${item.sourceId})`)
        continue
      }
      analysisParts.push(serializeAnalysisItem(item, record))
    }
    sections.push(analysisParts.join('\n\n'))
  }

  // 5. 그래프 (figure 타입 아이템)
  const figureItems = includedItems.filter(i => i.type === 'figure')
  if (figureItems.length > 0) {
    const figureParts = [isKo ? '## 3. 그래프' : '## 3. Figures']
    for (const item of figureItems) {
      const graph = graphMap.get(item.sourceId)
      if (!graph) {
        warnings.push(`[경고] ${item.label}: Graph Studio 프로젝트를 찾을 수 없음 (sourceId: ${item.sourceId})`)
      }
      figureParts.push(serializeFigureItem(item, isKo))
    }
    sections.push(figureParts.join('\n\n'))
  }

  // 6. 참고문헌
  const missingRefs = includedRefs.filter(r => r.summaryStatus !== 'ready')
  if (missingRefs.length > 0) {
    warnings.push(`[경고] ${missingRefs.length}개 문헌의 요약이 없거나 미확인 상태입니다 (summaryStatus: missing/draft). 서론 hallucination 위험 있음.`)
  }
  if (includedRefs.length > 0) {
    const refParts = [isKo ? '## 4. 참고문헌 목록' : '## 4. References']
    includedRefs.forEach((ref, i) => refParts.push(formatReference(ref, i, isKo)))
    sections.push(refParts.join('\n'))
  }

  // 7. 추가 맥락
  const ctx = pkg.context
  const ctxFields = [
    ctx.priorWorkDiff && `- ${isKo ? '선행연구와 차이점' : 'Differences from prior work'}: ${ctx.priorWorkDiff}`,
    ctx.limitations && `- ${isKo ? '연구의 한계' : 'Limitations'}: ${ctx.limitations}`,
    ctx.highlights && `- ${isKo ? '강조할 발견' : 'Key findings to highlight'}: ${ctx.highlights}`,
    ctx.theoreticalImplications && `- ${isKo ? '이론적 시사점' : 'Theoretical implications'}: ${ctx.theoreticalImplications}`,
    ctx.practicalImplications && `- ${isKo ? '실무적 시사점' : 'Practical implications'}: ${ctx.practicalImplications}`,
    ctx.futureResearch && `- ${isKo ? '후속 연구 제안' : 'Future research directions'}: ${ctx.futureResearch}`,
  ].filter(Boolean)

  if (ctxFields.length > 0) {
    sections.push(`${isKo ? '## 5. 추가 맥락' : '## 5. Additional Context'}\n${ctxFields.join('\n')}`)
  }

  // 검증 체크리스트
  if (analysisItems.length > 0) {
    const checklist = [
      isKo ? '## 검증 체크리스트 (논문 완성 후 대조용)' : '## Verification Checklist',
      isKo ? '| 분석 | 레이블 | 원본 ID | 확인 |' : '| Analysis | Label | Source ID | Check |',
      '|------|--------|-----------|------|',
    ]
    for (const item of analysisItems) {
      checklist.push(
        `| ${item.label} | ${getPackageItemAnalysisLabels(item).join(', ')} | ${getPackageItemAnalysisSourceIds(item).join(', ')} | [ ] |`,
      )
    }
    sections.push(checklist.join('\n'))
  }

  const markdown = sections.join('\n\n---\n\n')
  const tokenEstimate = Math.ceil(markdown.length / 4)

  return { markdown, tokenEstimate, warnings }
}
