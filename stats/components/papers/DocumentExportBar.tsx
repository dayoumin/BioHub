'use client'

import { useCallback, useState } from 'react'
import { Copy, Download, FileDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'

interface DocumentExportBarProps {
  document: DocumentBlueprint
}

function documentToMarkdown(doc: DocumentBlueprint): string {
  const lines: string[] = []
  lines.push(`# ${doc.title}`)
  if (doc.authors?.length) {
    lines.push('', doc.authors.join(', '))
  }
  lines.push('')

  for (const section of doc.sections) {
    lines.push(`## ${section.title}`)
    lines.push('')
    if (section.content) {
      lines.push(section.content)
    }
    if (section.tables?.length) {
      for (const table of section.tables) {
        lines.push('')
        lines.push(`**${table.caption}**`)
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
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

function documentToHtml(doc: DocumentBlueprint): string {
  const md = documentToMarkdown(doc)
  // 간단한 마크다운 → HTML 변환 (h1, h2, h3, bold, italic, table, p)
  const html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^\| (.+) \|$/gm, (_, row: string) => {
      const cells = row.split(' | ')
      return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join('')}</tr>`
    })
    .replace(/^\| [-| ]+\|$/gm, '')

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
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
  </style>
</head>
<body><p>${html}</p></body>
</html>`
}

export default function DocumentExportBar({ document: doc }: DocumentExportBarProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopyMarkdown = useCallback(async () => {
    const md = documentToMarkdown(doc)
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [doc])

  const handleDownloadHtml = useCallback(() => {
    const html = documentToHtml(doc)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [doc])

  return (
    <div className="flex items-center gap-2 border-t pt-3">
      <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-1.5">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? '복사됨' : '마크다운 복사'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadHtml} className="gap-1.5">
        <Download className="w-4 h-4" />
        HTML 다운로드
      </Button>
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <FileDown className="w-4 h-4" />
        DOCX (Phase 4)
      </Button>
    </div>
  )
}
