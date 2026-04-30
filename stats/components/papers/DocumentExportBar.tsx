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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ALLOWED_TABLE_HTML_TAGS = new Set([
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'p',
  'strong',
  'em',
  'span',
  'br',
  'sup',
  'sub',
])

const ALLOWED_TABLE_HTML_ATTRIBUTES = new Set([
  'colspan',
  'rowspan',
  'scope',
  'align',
])

function isSafeTableAttribute(name: string, value: string): boolean {
  if (!ALLOWED_TABLE_HTML_ATTRIBUTES.has(name)) {
    return false
  }
  if ((name === 'colspan' || name === 'rowspan') && !/^[1-9]\d{0,2}$/.test(value)) {
    return false
  }
  if (name === 'scope' && !['col', 'row', 'colgroup', 'rowgroup'].includes(value)) {
    return false
  }
  if (name === 'align' && !['left', 'center', 'right'].includes(value)) {
    return false
  }
  return true
}

function sanitizeTableHtml(value: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(value)
  }

  const parsed = new DOMParser().parseFromString(value, 'text/html')
  const sanitizeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '')
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const element = node as Element
    const tagName = element.tagName.toLowerCase()
    const children = Array.from(element.childNodes).map(sanitizeNode).join('')
    if (!ALLOWED_TABLE_HTML_TAGS.has(tagName)) {
      return children
    }

    const attributes = Array.from(element.attributes)
      .map((attribute) => ({
        name: attribute.name.toLowerCase(),
        value: attribute.value.toLowerCase(),
        rawValue: attribute.value,
      }))
      .filter((attribute) => isSafeTableAttribute(attribute.name, attribute.value))
      .map((attribute) => ` ${attribute.name}="${escapeHtml(attribute.rawValue)}"`)
      .join('')

    if (tagName === 'br' || tagName === 'col') {
      return `<${tagName}${attributes}>`
    }
    return `<${tagName}${attributes}>${children}</${tagName}>`
  }

  return Array.from(parsed.body.childNodes).map(sanitizeNode).join('')
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
  const caption = escapeHtml(table.caption)
  if (table.htmlContent) return `<p><strong>${caption}</strong></p>${provenanceHtml}${sanitizeTableHtml(table.htmlContent)}`
  if (table.headers.length === 0) return ''
  const thead = `<thead><tr>${table.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${table.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
  return `<p><strong>${caption}</strong></p>${provenanceHtml}<table>${thead}${tbody}</table>`
}

function documentToHtml(doc: DocumentBlueprint): string {
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

export default function DocumentExportBar({ document: doc, onBeforeExport }: DocumentExportBarProps): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)
  const [hwpxLoading, setHwpxLoading] = useState(false)

  const hasContent = useMemo(
    () => doc.sections.some(s => hasVisibleContent(s)),
    [doc.sections],
  )
  const canExport = hasContent || Boolean(onBeforeExport)

  const resolveExportDocument = useCallback(async (): Promise<DocumentBlueprint> => {
    const prepared = await onBeforeExport?.()
    return prepared ?? doc
  }, [doc, onBeforeExport])

  const handleCopyMarkdown = useCallback(async () => {
    try {
      const exportDoc = await resolveExportDocument()
      const md = documentToMarkdown(exportDoc)
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('클립보드에 복사할 수 없습니다')
    }
  }, [resolveExportDocument])

  const handleDownloadHtml = useCallback(async () => {
    try {
      const exportDoc = await resolveExportDocument()
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
      <Button variant="outline" size="sm" onClick={handleCopyMarkdown} disabled={!canExport} className="gap-1.5">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '복사됨' : '마크다운 복사'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadHtml} disabled={!canExport} className="gap-1.5">
        <Download className="w-4 h-4" />
        HTML 다운로드
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!canExport || docxLoading}
        onClick={handleDownloadDocx}
        className="gap-1.5"
      >
        {docxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {docxLoading ? '생성 중...' : 'DOCX 다운로드'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!canExport || hwpxLoading}
        onClick={handleDownloadHwpx}
        className="gap-1.5"
      >
        {hwpxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {hwpxLoading ? '생성 중...' : 'HWPX 다운로드'}
      </Button>
    </div>
  )
}
