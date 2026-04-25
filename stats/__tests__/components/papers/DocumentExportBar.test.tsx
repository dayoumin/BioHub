import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DocumentExportBar, { documentToHtml } from '@/components/papers/DocumentExportBar'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '@/lib/research/document-blueprint-types'
import {
  buildDocumentQualitySnapshot,
  deriveDocumentQualitySummary,
  type DocumentQualityReport,
  type DocumentReviewFinding,
} from '@/lib/research/document-quality-types'
import { buildRenderableDocument } from '@/lib/research/document-support-renderer'

const mockDownloadBlob = vi.fn()
const mockDocumentToDocx = vi.fn(async (_doc: DocumentBlueprint) => undefined)
const mockDocumentToHwpx = vi.fn(async (_doc: DocumentBlueprint) => undefined)
vi.mock('@/lib/services/export/export-data-builder', () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}))

vi.mock('@/lib/services/export/document-docx-export', () => ({
  documentToDocx: (doc: DocumentBlueprint) => mockDocumentToDocx(doc),
  hasVisibleContent: () => true,
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

function makeFinding(overrides: Partial<DocumentReviewFinding> = {}): DocumentReviewFinding {
  return {
    id: 'finding-1',
    reportId: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    ruleId: 'export.critical',
    category: 'format',
    severity: 'critical',
    status: 'open',
    title: '중요 점검 항목',
    message: '내보내기 전 확인이 필요합니다.',
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  }
}

function makeQualityReport(
  document: DocumentBlueprint,
  findings: DocumentReviewFinding[] = [],
): DocumentQualityReport {
  return {
    id: 'report-1',
    documentId: document.id,
    projectId: document.projectId,
    status: 'completed',
    snapshot: buildDocumentQualitySnapshot(document, {
      ruleEngineVersion: 'document-preflight-rules:v1',
    }),
    findings,
    summary: deriveDocumentQualitySummary(findings),
    generatedAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

describe('DocumentExportBar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockDownloadBlob.mockClear()
    mockDocumentToDocx.mockClear()
    mockDocumentToHwpx.mockClear()
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

  it('shows a missing preflight warning and runs the preflight action from the export area', async () => {
    const user = userEvent.setup()
    const doc = makeDocument('초기 문서', '본문')
    const onRunPreflight = vi.fn()

    render(
      <DocumentExportBar
        document={doc}
        preflightFreshness="missing"
        onRunPreflight={onRunPreflight}
      />,
    )

    expect(screen.getByText('점검 전')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '점검 실행' }))

    expect(onRunPreflight).toHaveBeenCalledTimes(1)
  })

  it('requires confirmation before exporting without a fresh preflight report', async () => {
    const user = userEvent.setup()
    const doc = makeDocument('초기 문서', '본문')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <DocumentExportBar
        document={doc}
        preflightFreshness="stale"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(confirmSpy).toHaveBeenCalledWith('문서가 점검 이후 변경되었습니다. 그래도 내보낼까요?')
    expect(mockDocumentToDocx).not.toHaveBeenCalled()
  })

  it('allows export after confirming unresolved critical findings', async () => {
    const user = userEvent.setup()
    const doc = makeDocument('초기 문서', '본문')
    const report = makeQualityReport(doc, [makeFinding()])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <DocumentExportBar
        document={doc}
        qualityReport={report}
        preflightFreshness="fresh"
      />,
    )

    expect(screen.getByText('중요 항목 남음')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(mockDocumentToDocx).toHaveBeenCalledTimes(1)
  })

  it('downloads the preflight report as a sidecar JSON file', async () => {
    const user = userEvent.setup()
    const doc = makeDocument('초기 문서', '본문')
    const report = makeQualityReport(doc)

    render(
      <DocumentExportBar
        document={doc}
        qualityReport={report}
        preflightFreshness="fresh"
      />,
    )

    await user.click(screen.getByRole('button', { name: '점검 리포트' }))

    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, filename] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(blob.type).toBe('application/json')
    expect(filename).toBe('초기 문서_preflight-report.json')
  })

  it('resolves inline citation markdown before DOCX export', async () => {
    const user = userEvent.setup()
    const doc = makeDocument('인용 문서', '배경은 [(Smith & Jones, 2021)](citation:cit_1)에 근거한다.')

    render(<DocumentExportBar document={doc} />)

    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(mockDocumentToDocx).toHaveBeenCalledTimes(1)
    const exportedDoc = mockDocumentToDocx.mock.calls[0]?.[0] as DocumentBlueprint
    expect(exportedDoc.sections[0]?.content).toBe('배경은 (Smith & Jones, 2021)에 근거한다.')
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

  it('keeps section support notes out of manuscript HTML export', async () => {
    const user = userEvent.setup()
    const now = new Date().toISOString()
    const doc: DocumentBlueprint = {
      id: 'doc-1',
      projectId: 'project-1',
      preset: 'paper',
      title: '문헌 메모 문서',
      language: 'ko',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: 'Marine Ecology Review',
            summary: '핵심 비교 메모',
            excerpt: '초록에서 발췌한 차이 설명',
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }

    render(<DocumentExportBar document={doc} />)

    await user.click(screen.getByRole('button', { name: 'HTML 다운로드' }))

    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const rendered = buildRenderableDocument(doc)
    expect(rendered.sections[0]?.content).toBe('')
  })

  it('escapes manuscript text before HTML export', () => {
    const now = new Date().toISOString()
    const doc = buildRenderableDocument({
      id: 'doc-1',
      projectId: 'project-1',
      preset: 'paper',
      title: '<Unsafe title>',
      language: 'ko',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '<script>alert(1)</script>\n\nA & B',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: '<img src=x onerror=alert(1)>',
            summary: '<script>alert(1)</script>',
            excerpt: 'A & B',
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    })

    const html = documentToHtml(doc)

    expect(html).toContain('&lt;Unsafe title&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('A &amp; B')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
  })
})
