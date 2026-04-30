import type {
  DocumentTable,
  FigureRef,
} from '@/lib/research/document-blueprint-types'

function buildAnalysisLine(label: string | undefined, id: string | undefined): string | null {
  if (label) {
    return id
      ? `관련 분석: ${label} (ID: ${id})`
      : `관련 분석: ${label}`
  }
  if (id) {
    return `관련 분석 ID: ${id}`
  }
  return null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getTableProvenanceLines(table: DocumentTable): string[] {
  const lines: string[] = []
  const analysisLine = buildAnalysisLine(table.sourceAnalysisLabel, table.sourceAnalysisId)
  if (analysisLine) {
    lines.push(analysisLine)
  }
  return lines
}

export function getFigureProvenanceLines(figure: FigureRef): string[] {
  const lines: string[] = []
  const analysisLine = buildAnalysisLine(figure.relatedAnalysisLabel, figure.relatedAnalysisId)
  if (analysisLine) {
    lines.push(analysisLine)
  }
  if (figure.patternSummary) {
    lines.push(`패턴 요약: ${figure.patternSummary}`)
  }
  return lines
}

export function renderMarkdownProvenanceLines(lines: readonly string[]): string[] {
  return lines.map((line) => `- ${line}`)
}

export function renderHtmlProvenance(lines: readonly string[]): string {
  if (lines.length === 0) {
    return ''
  }
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
}
