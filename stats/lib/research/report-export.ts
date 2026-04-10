/**
 * 프로젝트 보고서 마크다운/HTML 생성
 *
 * 선택된 entity들을 순서대로 마크다운으로 렌더하고,
 * 클립보드 복사 또는 HTML 파일 다운로드를 지원한다.
 *
 * 기존 paper-templates.ts의 fmtP(), fmt()를 재활용.
 */

import { downloadTextFile } from '@/lib/utils/download-file'
import { buildProteinInterpretationSectionMarkdown, loadGeneticsHistory } from '@/lib/genetics'
import type { ResolvedEntity } from './entity-resolver'
import { escapeHtml } from '@/lib/utils/html-escape'
import type { ProjectReport, ReportSection, RenderedContent } from './report-types'
import { generateAnalysisContent, generateBlastContent } from './report-apa-format'

// ── 보고서 생성 ──

/** 선택된 entity들로 ProjectReport 생성 */
export function buildReport(
  title: string,
  projectId: string,
  entities: ResolvedEntity[],
  language: 'ko' | 'en' = 'ko',
): ProjectReport {
  const sections: ReportSection[] = entities.map((entity, i) => ({
    ref: entity.ref,
    order: i,
    include: true,
    rendered: renderEntityContent(entity),
  }))

  return {
    title,
    projectId,
    language,
    sections,
    generatedAt: new Date().toISOString(),
  }
}

// ── 종류별 렌더 ──

function renderEntityContent(entity: ResolvedEntity): RenderedContent {
  if (!entity.loaded) {
    return { heading: entity.summary.title, body: '*(원본이 삭제되었습니다)*' }
  }

  switch (entity.ref.entityKind) {
    case 'analysis':
      return renderAnalysis(entity)
    case 'figure':
      return renderFigure(entity)
    case 'blast-result':
      return renderBlast(entity)
    case 'protein-result':
      return renderProtein(entity)
    default:
      return renderGeneric(entity)
  }
}

function renderAnalysis(entity: ResolvedEntity): RenderedContent {
  if (entity.rawData?.kind === 'analysis') {
    return generateAnalysisContent(entity.summary.title, entity.rawData)
  }
  return {
    heading: entity.summary.title,
    body: entity.summary.subtitle ?? '',
  }
}

function renderFigure(entity: ResolvedEntity): RenderedContent {
  const lines: string[] = []
  if (entity.summary.subtitle) {
    lines.push(`차트 유형: ${entity.summary.subtitle}`)
  }
  lines.push(`*(Graph Studio에서 차트 이미지를 내보내기 하세요)*`)

  return {
    heading: entity.summary.title,
    body: lines.join('\n'),
  }
}

function renderBlast(entity: ResolvedEntity): RenderedContent {
  if (entity.rawData?.kind === 'blast-result') {
    return generateBlastContent(entity.summary.title, entity.rawData)
  }
  const lines: string[] = []
  if (entity.summary.subtitle) lines.push(entity.summary.subtitle)
  if (entity.summary.badge) lines.push(`판정: ${entity.summary.badge.label}`)
  return {
    heading: entity.summary.title,
    body: lines.join('\n'),
  }
}

function renderProtein(entity: ResolvedEntity): RenderedContent {
  if (entity.rawData?.kind === 'protein-result') {
    const snapshotMarkdown = loadProteinReportSnapshot(entity.ref.entityId, entity.summary.title)
    return {
      heading: entity.summary.title,
      body: snapshotMarkdown
        ?? buildProteinInterpretationSectionMarkdown({
          analysisName: entity.rawData.analysisName,
          accession: entity.rawData.accession ?? null,
          result: {
            molecularWeight: entity.rawData.molecularWeight,
            isoelectricPoint: entity.rawData.isoelectricPoint,
            isStable: entity.rawData.isStable,
            sequenceLength: entity.rawData.sequenceLength,
          },
        }),
    }
  }

  return {
    heading: entity.summary.title,
    body: entity.summary.subtitle ?? '',
  }
}

function loadProteinReportSnapshot(entityId: string, sectionHeading: string): string | null {
  const entry = loadGeneticsHistory('protein').find((item) => item.id === entityId)
  if (!entry || entry.type !== 'protein') return null
  return normalizeProteinReportSnapshot(entry.reportMarkdown, sectionHeading)
}

function normalizeProteinReportSnapshot(reportMarkdown: string | undefined, sectionHeading: string): string | null {
  if (!reportMarkdown) return null

  const trimmed = reportMarkdown.trim()
  if (!trimmed) return null

  const withoutHeading = trimmed.replace(/^#\s+.+?\r?\n(?:\r?\n)?/, '')
  if (withoutHeading.trim()) return deepenMarkdownHeadingLevels(withoutHeading.trim())

  const fallback = trimmed.replace(new RegExp(`^#\\s+${escapeRegExp(sectionHeading)}\\s*$`, 'm'), '').trim()
  return fallback ? deepenMarkdownHeadingLevels(fallback) : null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function deepenMarkdownHeadingLevels(markdown: string): string {
  return markdown.replace(/^(#{2,6})(\s+)/gm, (match, hashes: string, space: string) => {
    if (hashes.length >= 6) return match
    return `${hashes}#${space}`
  })
}

function renderGeneric(entity: ResolvedEntity): RenderedContent {
  return {
    heading: entity.summary.title,
    body: entity.summary.subtitle ?? '',
  }
}

// ── 마크다운 출력 ──

/** 보고서를 마크다운 문자열로 변환 */
export function reportToMarkdown(report: ProjectReport): string {
  const lines: string[] = []

  lines.push(`# ${report.title}`)
  lines.push('')
  lines.push(`> 생성: ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}`)
  lines.push('')

  const included = report.sections
    .filter(s => s.include)
    .sort((a, b) => a.order - b.order)

  for (const section of included) {
    if (!section.rendered) continue
    lines.push(`## ${section.rendered.heading}`)
    lines.push('')
    if (section.rendered.body) {
      lines.push(section.rendered.body)
      lines.push('')
    }
    if (section.rendered.tables) {
      for (const table of section.rendered.tables) {
        lines.push(renderMarkdownTable(table.headers, table.rows, table.caption))
        lines.push('')
      }
    }
  }

  return lines.join('\n')
}

/** 마크다운 테이블 렌더 */
function renderMarkdownTable(headers: string[], rows: string[][], caption?: string): string {
  const lines: string[] = []
  if (caption) lines.push(`**${caption}**\n`)
  lines.push(`| ${headers.join(' | ')} |`)
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`)
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`)
  }
  return lines.join('\n')
}

// ── 내보내기 ──

/** 마크다운을 클립보드에 복사 */
export async function copyReportToClipboard(report: ProjectReport): Promise<void> {
  const md = reportToMarkdown(report)
  await navigator.clipboard.writeText(md)
}

/** HTML 파일 다운로드 */
export function downloadReportAsHtml(report: ProjectReport): void {
  const md = reportToMarkdown(report)
  // 간단한 마크다운→HTML 변환 (헤더, 볼드, 이탤릭, 테이블)
  const html = markdownToSimpleHtml(md)
  const fullHtml = `<!DOCTYPE html>
<html lang="${report.language}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(report.title)}</title>
<style>
body { font-family: 'Noto Sans KR', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
 h2 { border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 32px; }
 h3, h4, h5, h6 { margin-top: 24px; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f5f5f5; font-weight: 600; }
blockquote { border-left: 3px solid #ddd; margin: 0; padding: 8px 16px; color: #666; }
em { font-style: italic; }
</style>
</head>
<body>
${html}
</body>
</html>`

  const safeName = report.title.replace(/[^a-zA-Z0-9가-힣 ]/g, '').trim() || 'report'
  downloadTextFile(fullHtml, `${safeName}.html`, 'text/html;charset=utf-8')
}

/** 간단한 마크다운→HTML 변환 (라이브러리 없이, 파일 다운로드 전용) */
function markdownToSimpleHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []

  // 테이블 상태 머신: 행 수집 → 비테이블 행 만나면 flush
  let theadRow: string | null = null
  let tbodyRows: string[] = []
  let headerRowPending = false

  function flushTable(): void {
    if (!theadRow && tbodyRows.length === 0) return
    out.push('<table>')
    if (theadRow) out.push(`<thead>${theadRow}</thead>`)
    if (tbodyRows.length > 0) out.push(`<tbody>${tbodyRows.join('\n')}</tbody>`)
    out.push('</table>')
    theadRow = null
    tbodyRows = []
    headerRowPending = false
  }

  for (const line of lines) {
    // 헤더
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushTable()
      const level = headingMatch[1].length
      out.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`)
      continue
    }
    // blockquote
    if (line.startsWith('> ')) { flushTable(); out.push(`<blockquote>${escapeHtml(line.slice(2))}</blockquote>`); continue }
    // 테이블 구분선 (|---|) → 이전 행이 헤더였음을 표시
    if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(line)) { headerRowPending = true; continue }
    // 테이블 행
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim())
      if (!headerRowPending) {
        theadRow = `<tr>${cells.map(c => `<th>${formatInline(escapeHtml(c))}</th>`).join('')}</tr>`
      } else {
        tbodyRows.push(`<tr>${cells.map(c => `<td>${formatInline(escapeHtml(c))}</td>`).join('')}</tr>`)
      }
      continue
    }
    // 비테이블 행 → 테이블 종료
    flushTable()
    // 빈 줄
    if (!line.trim()) continue
    // 일반 텍스트
    out.push(`<p>${formatInline(escapeHtml(line))}</p>`)
  }

  flushTable()
  return out.join('\n')
}

function formatInline(text: string): string {
  // **bold** → <strong>
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}
