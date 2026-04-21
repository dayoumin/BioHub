'use client'

import { useCallback, useMemo, useState } from 'react'
import { Copy, Download, FileDown, Check, Loader2 } from 'lucide-react'
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

interface DocumentExportBarProps {
  document: DocumentBlueprint
  onBeforeExport?: () => void | DocumentBlueprint | undefined | Promise<void | DocumentBlueprint | undefined>
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
  if (table.htmlContent) return `<p><strong>${table.caption}</strong></p>${provenanceHtml}${table.htmlContent}`
  if (table.headers.length === 0) return ''
  const thead = `<thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${table.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
  return `<p><strong>${table.caption}</strong></p>${provenanceHtml}<table>${thead}${tbody}</table>`
}

function documentToHtml(doc: DocumentBlueprint): string {
  const parts: string[] = []
  parts.push(`<h1>${doc.title}</h1>`)
  if (doc.authors?.length) parts.push(`<p>${doc.authors.join(', ')}</p>`)

  for (const section of doc.sections) {
    if (!hasVisibleContent(section)) continue
    parts.push(`<h2>${section.title}</h2>`)
    if (section.content) {
      const contentHtml = section.content
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
        parts.push(`<p><em>${fig.label}: ${fig.caption}</em></p>${renderHtmlProvenance(getFigureProvenanceLines(fig))}`)
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="${doc.language}">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
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

export default function DocumentExportBar({ document: doc, onBeforeExport }: DocumentExportBarProps): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)
  const [hwpxLoading, setHwpxLoading] = useState(false)

  const hasContent = useMemo(
    () => doc.sections.some(s => hasVisibleContent(s)),
    [doc.sections],
  )

  const resolveExportDocument = useCallback(async (): Promise<DocumentBlueprint> => {
    const prepared = await onBeforeExport?.()
    return prepared ?? doc
  }, [doc, onBeforeExport])

  const handleCopyMarkdown = useCallback(async () => {
    const exportDoc = await resolveExportDocument()
    const md = documentToMarkdown(exportDoc)
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('클립보드에 복사할 수 없습니다')
    }
  }, [resolveExportDocument])

  const handleDownloadHtml = useCallback(async () => {
    const exportDoc = await resolveExportDocument()
    try {
      const html = documentToHtml(exportDoc)
      const blob = new Blob([html], { type: 'text/html' })
      const safeName = exportDoc.title.replace(/[/\\?%*:|"<>]/g, '_')
      downloadBlob(blob, `${safeName}.html`)
    } catch {
      toast.error('HTML 생성에 실패했습니다')
    }
  }, [resolveExportDocument])

  const handleDownloadDocx = useCallback(async () => {
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
  }, [resolveExportDocument])

  const handleDownloadHwpx = useCallback(async () => {
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
  }, [resolveExportDocument])

  return (
    <div className="flex items-center gap-2 border-t pt-3">
      <Button variant="outline" size="sm" onClick={handleCopyMarkdown} disabled={!hasContent} className="gap-1.5">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '복사됨' : '마크다운 복사'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadHtml} disabled={!hasContent} className="gap-1.5">
        <Download className="w-4 h-4" />
        HTML 다운로드
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasContent || docxLoading}
        onClick={handleDownloadDocx}
        className="gap-1.5"
      >
        {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {docxLoading ? '생성 중...' : 'DOCX 다운로드'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasContent || hwpxLoading}
        onClick={handleDownloadHwpx}
        className="gap-1.5"
      >
        {hwpxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {hwpxLoading ? '생성 중...' : 'HWPX 다운로드'}
      </Button>
    </div>
  )
}
