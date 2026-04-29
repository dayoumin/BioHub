/**
 * 통계 결과 표 생성기
 *
 * 분석 결과(AnalysisResult)에서 HTML 테이블 + 탭 구분 텍스트를 생성한다.
 * - 기술통계표: 그룹별 N, Mean, SD, Median
 * - 검정결과표: 통계량, df, p-value, 효과크기, 95% CI
 * - 사후검정표: 그룹 쌍별 비교, 평균차이, p-value, 유의성
 */

import type { AnalysisResult, GroupStats, PostHocResult, EffectSizeInfo } from '@/types/analysis'
import type { DraftContext, PaperTable } from './paper-types'
import { escapeHtml } from '@/lib/utils/html-escape'

// ─── 포맷 헬퍼 ────────────────────────────────────────────────────────

function fmt(n: number | undefined | null, digits = 2): string {
  if (n === undefined || n === null || !isFinite(n)) return '—'
  return n.toFixed(digits)
}

function fmtP(p: number): string {
  if (p < 0.001) return '< .001'
  return p.toFixed(3).replace(/^0\./, '.')
}

function fmtDf(df: number | [number, number] | undefined): string {
  if (df === undefined || df === null) return '—'
  if (Array.isArray(df)) return `(${df[0]}, ${df[1]})`
  return String(df)
}

function groupLabel(name: string | undefined, ctx: DraftContext): string {
  if (!name) return '—'
  return ctx.groupLabels[name] ?? ctx.variableLabels[name] ?? name
}

function esValue(es: number | EffectSizeInfo | undefined | null): number | undefined {
  if (es === undefined || es === null) return undefined
  if (typeof es === 'number') return es
  return es.value
}

function esType(es: number | EffectSizeInfo | undefined | null): string {
  if (es && typeof es === 'object' && 'type' in es) return es.type
  return 'Effect Size'
}

// ─── HTML 테이블 빌더 ──────────────────────────────────────────────

function htmlTable(headers: string[], rows: string[][], caption?: string): string {
  const thCells = headers.map(h => `<th style="padding:6px 12px;border-bottom:2px solid #333;text-align:left;font-weight:600">${escapeHtml(h)}</th>`).join('')
  const bodyRows = rows.map(row => {
    const cells = row.map(cell => `<td style="padding:4px 12px;border-bottom:1px solid #ddd">${escapeHtml(cell)}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const captionTag = caption ? `<caption style="text-align:left;font-weight:600;margin-bottom:8px;font-size:0.9em">${escapeHtml(caption)}</caption>` : ''

  return `<table style="border-collapse:collapse;width:100%;font-size:0.85em;font-family:serif">${captionTag}<thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
}

function plainTable(headers: string[], rows: string[][]): string {
  const lines = [headers.join('\t')]
  for (const row of rows) {
    lines.push(row.join('\t'))
  }
  return lines.join('\n')
}

// ─── 기술통계표 ────────────────────────────────────────────────────

function generateDescriptiveTable(
  result: AnalysisResult,
  ctx: DraftContext,
  lang: 'ko' | 'en',
): PaperTable | null {
  const groups = result.groupStats
  if (!groups || groups.length === 0) return null

  const isKo = lang === 'ko'
  const title = isKo ? '기술통계량' : 'Descriptive Statistics'
  const headers = isKo
    ? ['집단', 'N', '평균 (M)', '표준편차 (SD)', '중앙값 (Mdn)']
    : ['Group', 'N', 'Mean (M)', 'SD', 'Median (Mdn)']

  const rows = groups.map((g: GroupStats) => [
    groupLabel(g.name, ctx),
    String(g.n),
    fmt(g.mean),
    fmt(g.std),
    g.median !== undefined ? fmt(g.median) : '—',
  ])

  return {
    id: 'descriptive',
    title: isKo ? `표 1. ${title}` : `Table 1. ${title}`,
    htmlContent: htmlTable(headers, rows, isKo ? `표 1. ${title}` : `Table 1. ${title}`),
    plainText: plainTable(headers, rows),
  }
}

// ─── 검정결과표 ────────────────────────────────────────────────────

function generateTestResultTable(
  result: AnalysisResult,
  _ctx: DraftContext,
  lang: 'ko' | 'en',
): PaperTable {
  const isKo = lang === 'ko'
  const title = isKo ? '검정 결과' : 'Test Results'

  const es = esValue(result.effectSize)
  const esLabel = esType(result.effectSize)
  const ci = result.confidence

  const headers = isKo
    ? ['검정 방법', '통계량', '자유도', 'p-value', esLabel, '95% CI']
    : ['Test', 'Statistic', 'df', 'p-value', esLabel, '95% CI']

  const ciStr = ci ? `[${fmt(ci.lower)}, ${fmt(ci.upper)}]` : '—'
  const tableNum = result.groupStats && result.groupStats.length > 0 ? 2 : 1

  const rows = [[
    result.method,
    fmt(result.statistic, 3),
    fmtDf(result.df),
    fmtP(result.pValue),
    es !== undefined ? fmt(es, 3) : '—',
    ciStr,
  ]]

  return {
    id: 'test-result',
    title: isKo ? `표 ${tableNum}. ${title}` : `Table ${tableNum}. ${title}`,
    htmlContent: htmlTable(headers, rows, isKo ? `표 ${tableNum}. ${title}` : `Table ${tableNum}. ${title}`),
    plainText: plainTable(headers, rows),
  }
}

// ─── 사후검정표 ────────────────────────────────────────────────────

function generatePostHocTable(
  result: AnalysisResult,
  ctx: DraftContext,
  lang: 'ko' | 'en',
  postHocDisplay: 'significant-only' | 'all',
): PaperTable | null {
  const postHoc = result.postHoc
  if (!postHoc || postHoc.length === 0) return null

  const isKo = lang === 'ko'
  const title = result.postHocMethod
    ? isKo ? `사후검정 (${result.postHocMethod})` : `Post-hoc Comparisons (${result.postHocMethod})`
    : isKo ? '사후 비교' : 'Post-hoc Comparisons'

  const filtered = postHocDisplay === 'significant-only'
    ? postHoc.filter((ph: PostHocResult) => ph.significant)
    : postHoc

  if (filtered.length === 0) return null

  const headers = isKo
    ? ['비교 1', '비교 2', '평균 차이', 'p-value', '보정 p-value', '유의성']
    : ['Group 1', 'Group 2', 'Mean Diff', 'p-value', 'Adjusted p', 'Significant']

  const rows = filtered.map((ph: PostHocResult) => [
    groupLabel(String(ph.group1), ctx),
    groupLabel(String(ph.group2), ctx),
    ph.meanDiff !== undefined ? fmt(ph.meanDiff) : '—',
    fmtP(ph.pvalue),
    ph.pvalueAdjusted !== undefined ? fmtP(ph.pvalueAdjusted) : '—',
    ph.significant ? (isKo ? '***' : '***') : 'ns',
  ])

  const hasDescriptive = result.groupStats && result.groupStats.length > 0
  const tableNum = hasDescriptive ? 3 : 2

  return {
    id: 'post-hoc',
    title: isKo ? `표 ${tableNum}. ${title}` : `Table ${tableNum}. ${title}`,
    htmlContent: htmlTable(headers, rows, isKo ? `표 ${tableNum}. ${title}` : `Table ${tableNum}. ${title}`),
    plainText: plainTable(headers, rows),
  }
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * 분석 결과에서 통계 표 배열을 생성한다.
 * 데이터에 따라 0~3개의 표를 반환.
 */
export function generatePaperTables(
  result: AnalysisResult,
  ctx: DraftContext,
  lang: 'ko' | 'en',
  postHocDisplay: 'significant-only' | 'all' = 'significant-only',
): PaperTable[] {
  const tables: PaperTable[] = []

  const descriptive = generateDescriptiveTable(result, ctx, lang)
  if (descriptive) tables.push(descriptive)

  tables.push(generateTestResultTable(result, ctx, lang))

  const postHoc = generatePostHocTable(result, ctx, lang, postHocDisplay)
  if (postHoc) tables.push(postHoc)

  return tables
}
