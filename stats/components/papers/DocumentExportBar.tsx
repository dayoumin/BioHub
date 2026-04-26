'use client'

import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/lib/services/export/export-data-builder'
import { documentToDocx, hasVisibleContent } from '@/lib/services/export/document-docx-export'
import { documentToHwpx } from '@/lib/services/export/document-hwpx-export'
import {
  getFigureProvenanceLines,
  getTableProvenanceLines,
  renderHtmlProvenance,
  renderMarkdownProvenanceLines,
} from '@/lib/services/export/document-provenance'
import type { DocumentBlueprint, DocumentTable } from '@/lib/research/document-blueprint-types'
import type {
  DocumentQualityFreshness,
  DocumentQualityReport,
} from '@/lib/research/document-quality-types'
import { resolveDocumentInlineCitations } from '@/lib/research/citation-csl'
import { buildRenderableDocument } from '@/lib/research/document-support-renderer'
import { cn } from '@/lib/utils'

interface DocumentExportBarProps {
  document: DocumentBlueprint
  onBeforeExport?: () => void | DocumentBlueprint | undefined | Promise<void | DocumentBlueprint | undefined>
  qualityReport?: DocumentQualityReport | null
  preflightFreshness?: DocumentQualityFreshness
  preflightPending?: boolean
  preflightPendingLabel?: string
  onRunPreflight?: () => void
}

interface ExportPreflightStatus {
  tone: 'ready' | 'warning' | 'danger'
  label: string
  message: string
  confirmMessage?: string
}

function getExportPreflightStatus(
  report: DocumentQualityReport | null | undefined,
  freshness: DocumentQualityFreshness | undefined,
): ExportPreflightStatus {
  if (!freshness && !report) {
    return {
      tone: 'ready',
      label: '점검 상태 없음',
      message: '문서 점검 정보 없이 내보냅니다.',
    }
  }

  const currentFreshness = freshness ?? 'missing'
  if (currentFreshness === 'missing') {
    return {
      tone: 'warning',
      label: '점검 전',
      message: '내보내기 전 문서 점검을 권장합니다.',
      confirmMessage: '최신 문서 점검 결과가 없습니다. 그래도 내보낼까요?',
    }
  }

  if (currentFreshness === 'stale') {
    return {
      tone: 'warning',
      label: '재점검 필요',
      message: '문서가 점검 이후 변경되었습니다.',
      confirmMessage: '문서가 점검 이후 변경되었습니다. 그래도 내보낼까요?',
    }
  }

  if (report?.summary.unresolvedCritical && report.summary.unresolvedCritical > 0) {
    return {
      tone: 'danger',
      label: '중요 항목 남음',
      message: `중요 점검 항목 ${report.summary.unresolvedCritical}개가 열려 있습니다.`,
      confirmMessage: '중요 점검 항목이 남아 있습니다. 그래도 내보낼까요?',
    }
  }

  if (report?.summary.openFindings && report.summary.openFindings > 0) {
    return {
      tone: 'warning',
      label: '검토 항목 남음',
      message: `열린 점검 항목 ${report.summary.openFindings}개가 있습니다.`,
    }
  }

  return {
    tone: 'ready',
    label: '점검 통과',
    message: '최신 점검 기준으로 내보낼 수 있습니다.',
  }
}

function documentToMarkdown(doc: DocumentBlueprint): string {
  const lines: string[] = []
  lines.push(`# ${doc.title}`)
  if (doc.authors?.length) {
    lines.push('', doc.authors.join(', '))
  }
  lines.push('')

  for (const section of doc.sections) {
    if (!hasVisibleContent(section)) continue
    lines.push(`## ${section.title}`)
    lines.push('')
    if (section.content) {
      lines.push(section.content)
    }
    if (section.tables?.length) {
      for (const table of section.tables) {
        lines.push('')
        lines.push(`**${table.caption}**`)
        lines.push(...renderMarkdownProvenanceLines(getTableProvenanceLines(table)))
        lines.push('')
        if (table.headers.length > 0) {
          lines.push(`| ${table.headers.join(' | ')} |`)
          lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`)
          for (const row of table.rows) {
            lines.push(`| ${row.join(' | ')} |`)
          }
        }
      }
    }
    if (section.figures?.length) {
      lines.push('')
      for (const fig of section.figures) {
        lines.push(`*${fig.label}: ${fig.caption}*`)
        lines.push(...renderMarkdownProvenanceLines(getFigureProvenanceLines(fig)))
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

function renderTableHtml(table: DocumentTable): string {
  const provenanceHtml = renderHtmlProvenance(getTableProvenanceLines(table))
  if (table.htmlContent) return `<p><strong>${escapeHtml(table.caption)}</strong></p>${provenanceHtml}${table.htmlContent}`
  if (table.headers.length === 0) return ''
  const thead = `<thead><tr>${table.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${table.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
  return `<p><strong>${escapeHtml(table.caption)}</strong></p>${provenanceHtml}<table>${thead}${tbody}</table>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getSafeFileName(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, '_')
}

export function documentToHtml(doc: DocumentBlueprint): string {
  const parts: string[] = []
  parts.push(`<h1>${escapeHtml(doc.title)}</h1>`)
  if (doc.authors?.length) parts.push(`<p>${doc.authors.map(escapeHtml).join(', ')}</p>`)

  for (const section of doc.sections) {
    if (!hasVisibleContent(section)) continue
    parts.push(`<h2>${escapeHtml(section.title)}</h2>`)
    if (section.content) {
      const contentHtml = escapeHtml(section.content)
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .split('\n\n')
        .map(p => p.startsWith('<h') ? p : `<p>${p}</p>`)
        .join('\n')
      parts.push(contentHtml)
    }
    if (section.tables?.length) {
      for (const table of section.tables) {
        parts.push(renderTableHtml(table))
      }
    }
    if (section.figures?.length) {
      for (const fig of section.figures) {
        parts.push(`<p><em>${escapeHtml(fig.label)}: ${escapeHtml(fig.caption)}</em></p>${renderHtmlProvenance(getFigureProvenanceLines(fig))}`)
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="${doc.language}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; line-height: 1.6; }
    h1 { text-align: center; }
    h2 { margin-top: 2em; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
${parts.join('\n')}
</body>
</html>`
}

export default function DocumentExportBar({
  document: doc,
  onBeforeExport,
  qualityReport = null,
  preflightFreshness,
  preflightPending = false,
  preflightPendingLabel,
  onRunPreflight,
}: DocumentExportBarProps): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)
  const [hwpxLoading, setHwpxLoading] = useState(false)

  const hasContent = useMemo(
    () => doc.sections.some(s => hasVisibleContent(s)),
    [doc.sections],
  )

  const exportPreflightStatus = useMemo(
    () => getExportPreflightStatus(qualityReport, preflightFreshness),
    [preflightFreshness, qualityReport],
  )

  const confirmExportPreflight = useCallback((): boolean => {
    if (!exportPreflightStatus.confirmMessage) {
      return true
    }
    return window.confirm(exportPreflightStatus.confirmMessage)
  }, [exportPreflightStatus.confirmMessage])

  const showPreflightAction = Boolean(preflightFreshness && preflightFreshness !== 'fresh' && onRunPreflight)

  const resolveExportDocument = useCallback(async (): Promise<DocumentBlueprint> => {
    const prepared = await onBeforeExport?.()
    return resolveDocumentInlineCitations(buildRenderableDocument(prepared ?? doc))
  }, [doc, onBeforeExport])

  const handleCopyMarkdown = useCallback(async () => {
    if (!confirmExportPreflight()) {
      return
    }
    const exportDoc = await resolveExportDocument()
    const md = documentToMarkdown(exportDoc)
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('클립보드에 복사할 수 없습니다')
    }
  }, [confirmExportPreflight, resolveExportDocument])

  const handleDownloadHtml = useCallback(async () => {
    if (!confirmExportPreflight()) {
      return
    }
    const exportDoc = await resolveExportDocument()
    try {
      const html = documentToHtml(exportDoc)
      const blob = new Blob([html], { type: 'text/html' })
      const safeName = getSafeFileName(exportDoc.title)
      downloadBlob(blob, `${safeName}.html`)
    } catch {
      toast.error('HTML 생성에 실패했습니다')
    }
  }, [confirmExportPreflight, resolveExportDocument])

  const handleDownloadPreflightReport = useCallback((): void => {
    if (!qualityReport) {
      return
    }
    const safeName = getSafeFileName(doc.title)
    const blob = new Blob([JSON.stringify(qualityReport, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, `${safeName}_preflight-report.json`)
  }, [doc.title, qualityReport])

  const handleDownloadDocx = useCallback(async () => {
    if (!confirmExportPreflight()) {
      return
    }
    setDocxLoading(true)
    try {
      const exportDoc = await resolveExportDocument()
      await documentToDocx(exportDoc)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'DOCX 생성에 실패했습니다'
      toast.error(message)
    } finally {
      setDocxLoading(false)
    }
  }, [confirmExportPreflight, resolveExportDocument])

  const handleDownloadHwpx = useCallback(async () => {
    if (!confirmExportPreflight()) {
      return
    }
    setHwpxLoading(true)
    try {
      const exportDoc = await resolveExportDocument()
      await documentToHwpx(exportDoc)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'HWPX 생성에 실패했습니다'
      toast.error(message)
    } finally {
      setHwpxLoading(false)
    }
  }, [confirmExportPreflight, resolveExportDocument])

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-xs',
          exportPreflightStatus.tone === 'ready' && 'bg-secondary-container text-secondary',
          exportPreflightStatus.tone === 'warning' && 'bg-surface-container-high text-on-surface-variant',
          exportPreflightStatus.tone === 'danger' && 'bg-destructive/10 text-destructive',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0 font-medium">{exportPreflightStatus.label}</span>
          {exportPreflightStatus.tone !== 'ready' && (
            <span className="truncate text-muted-foreground">{exportPreflightStatus.message}</span>
          )}
        </div>
        {showPreflightAction && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onRunPreflight?.()}
            disabled={preflightPending}
            className="h-7 shrink-0 rounded-full bg-surface px-3 text-[11px]"
          >
            {preflightPending ? (preflightPendingLabel ?? '점검 중...') : preflightFreshness === 'missing' ? '점검 실행' : '다시 점검'}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleCopyMarkdown} disabled={!hasContent} className="gap-1.5 rounded-full bg-surface">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? '복사됨' : '마크다운 복사'}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDownloadHtml} disabled={!hasContent} className="gap-1.5 rounded-full bg-surface">
          <Download className="w-4 h-4" />
          HTML 다운로드
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasContent || docxLoading}
          onClick={handleDownloadDocx}
          className="gap-1.5 rounded-full bg-surface"
        >
          {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {docxLoading ? '생성 중...' : 'DOCX 다운로드'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasContent || hwpxLoading}
          onClick={handleDownloadHwpx}
          className="gap-1.5 rounded-full bg-surface"
        >
          {hwpxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {hwpxLoading ? '생성 중...' : 'HWPX 다운로드'}
        </Button>
        {qualityReport && (
          <details className="ml-auto">
            <summary className="cursor-pointer list-none rounded-full px-2 text-[11px] text-muted-foreground hover:bg-surface">
              리포트 옵션
            </summary>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPreflightReport}
              className="mt-2 gap-1.5 rounded-full bg-surface"
            >
              <FileDown className="w-4 h-4" />
              점검 리포트
            </Button>
          </details>
        )}
      </div>
    </div>
  )
}
