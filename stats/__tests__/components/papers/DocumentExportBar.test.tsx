import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DocumentExportBar from '@/components/papers/DocumentExportBar'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '@/lib/research/document-blueprint-types'

const mockDownloadBlob = vi.fn()
const mockDocumentToDocx = vi.fn(async (_doc: DocumentBlueprint) => undefined)
const mockDocumentToHwpx = vi.fn(async (_doc: DocumentBlueprint) => undefined)
const mockClipboardWriteText = vi.fn(async (_text: string) => undefined)
const mockHasVisibleContent = vi.fn((section: { content?: string; tables?: unknown[]; figures?: unknown[] }) => (
  Boolean(section.content || section.tables?.length || section.figures?.length)
))
vi.mock('@/lib/services/export/export-data-builder', () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}))

vi.mock('@/lib/services/export/document-docx-export', () => ({
  documentToDocx: (doc: DocumentBlueprint) => mockDocumentToDocx(doc),
  hasVisibleContent: (section: { content?: string; tables?: unknown[]; figures?: unknown[] }) => (
    mockHasVisibleContent(section)
  ),
}))

vi.mock('@/lib/services/export/document-hwpx-export', () => ({
  documentToHwpx: (doc: DocumentBlueprint) => mockDocumentToHwpx(doc),
}))

function makeDocument(title: string, content: string): DocumentBlueprint {
  const now = new Date().toISOString()
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title,
    language: 'ko',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: 'results',
        title: '결과',
        content,
        sourceRefs: [],
        editable: true,
        generatedBy: 'user',
      },
    ],
  }
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('DocumentExportBar', () => {
  beforeEach(() => {
    mockDownloadBlob.mockClear()
    mockDocumentToDocx.mockClear()
    mockDocumentToHwpx.mockClear()
    mockHasVisibleContent.mockClear()
    mockClipboardWriteText.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    })
  })

  it('uses the prepared document returned by onBeforeExport for HTML export', async () => {
    const user = userEvent.setup()
    const initialDoc = makeDocument('초기 문서', '이전 내용')
    const preparedDoc = makeDocument('최신 문서', '최신 내용')

    render(
      <DocumentExportBar
        document={initialDoc}
        onBeforeExport={async () => preparedDoc}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'HTML 다운로드' }))

    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [, filename] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(filename).toBe('최신 문서.html')
  })

  it('passes the prepared document to DOCX export', async () => {
    const user = userEvent.setup()
    const initialDoc = makeDocument('초기 문서', '이전 내용')
    const preparedDoc = makeDocument('최신 문서', '최신 내용')

    render(
      <DocumentExportBar
        document={initialDoc}
        onBeforeExport={() => preparedDoc}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(mockDocumentToDocx).toHaveBeenCalledWith(preparedDoc)
    expect(mockDocumentToDocx).not.toHaveBeenCalledWith(initialDoc)
  })

  it('enables export when the current document is empty but onBeforeExport can prepare content', async () => {
    const user = userEvent.setup()
    const initialDoc = makeDocument('빈 문서', '')
    const preparedDoc = makeDocument('재조립 문서', '재조립된 내용')

    render(
      <DocumentExportBar
        document={initialDoc}
        onBeforeExport={() => preparedDoc}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(mockDocumentToDocx).toHaveBeenCalledWith(preparedDoc)
  })

  it('passes the prepared document to HWPX export', async () => {
    const user = userEvent.setup()
    const initialDoc = makeDocument('초기 문서', '이전 내용')
    const preparedDoc = makeDocument('최신 문서', '최신 내용')

    render(
      <DocumentExportBar
        document={initialDoc}
        onBeforeExport={() => preparedDoc}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'HWPX 다운로드' }))

    expect(mockDocumentToHwpx).toHaveBeenCalledWith(preparedDoc)
    expect(mockDocumentToHwpx).not.toHaveBeenCalledWith(initialDoc)
  })

  it('uses the prepared document for markdown clipboard export', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    })
    const initialDoc = makeDocument('초기 문서', '이전 내용')
    const preparedDoc = makeDocument('최신 문서', '최신 내용')

    render(
      <DocumentExportBar
        document={initialDoc}
        onBeforeExport={() => preparedDoc}
      />,
    )

    await user.click(screen.getByRole('button', { name: '마크다운 복사' }))

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1)
    })
    const [markdown] = mockClipboardWriteText.mock.calls[0] as [string]
    expect(markdown).toContain('# 최신 문서')
    expect(markdown).toContain('최신 내용')
    expect(markdown).not.toContain('이전 내용')
  })

  it('escapes user content in HTML export', async () => {
    const user = userEvent.setup()
    const doc = makeDocument(
      '<script>alert("title")</script>',
      '### <img src=x onerror=alert(1)>\n\n**<script>alert("body")</script>**',
    )
    doc.authors = ['<img src=x onerror=alert("author")>']
    doc.sections[0] = {
      ...doc.sections[0],
      title: '<script>alert("section")</script>',
      tables: [
        {
          caption: '<img src=x onerror=alert("caption")>',
          headers: ['<script>alert("header")</script>'],
          rows: [['<img src=x onerror=alert("cell")>']],
          sourceAnalysisId: 'analysis-1',
          sourceAnalysisLabel: '<script>alert("analysis")</script>',
        },
      ],
      figures: [
        {
          entityId: 'figure-1',
          label: '<script>alert("figure")</script>',
          caption: '<img src=x onerror=alert("figure-caption")>',
          patternSummary: '<script>alert("pattern")</script>',
        },
      ],
    }

    render(<DocumentExportBar document={doc} />)

    await user.click(screen.getByRole('button', { name: 'HTML 다운로드' }))

    const [blob] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    const html = await readBlobText(blob)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toMatch(/<[^>]+\sonerror=/i)
    expect(html).toContain('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('downloads HTML for documents with structured provenance sidecars', async () => {
    const user = userEvent.setup()
    const now = new Date().toISOString()
    const doc: DocumentBlueprint = {
      id: 'doc-1',
      projectId: 'project-1',
      preset: 'paper',
      title: '근거 문서',
      language: 'ko',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '본문',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'analysis-1'),
            createDocumentSourceRef('figure', 'figure-1'),
          ],
          editable: true,
          generatedBy: 'user',
          tables: [
            {
              caption: 'Table 1',
              headers: ['A'],
              rows: [['1']],
              sourceAnalysisId: 'analysis-1',
              sourceAnalysisLabel: 'T-Test',
            },
          ],
          figures: [
            {
              entityId: 'figure-1',
              label: 'Figure 1',
              caption: 'Graph Caption',
              relatedAnalysisId: 'analysis-1',
              relatedAnalysisLabel: 'T-Test',
              patternSummary: 'B가 A보다 높음',
            },
          ],
        },
      ],
    }

    render(<DocumentExportBar document={doc} />)

    await user.click(screen.getByRole('button', { name: 'HTML 다운로드' }))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    expect(mockDownloadBlob.mock.calls[0]?.[1]).toBe('근거 문서.html')
  })
})
