import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentEditor from '@/components/papers/DocumentEditor'
import type { BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'
import type { GeneticsHistoryEntry } from '@/lib/genetics/analysis-history'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '@/lib/research/document-blueprint-types'
import type { AssemblerDataSources } from '@/lib/research/document-assembler'
import type { CitationRecord } from '@/lib/research/citation-types'
import {
  buildDocumentQualitySnapshot,
  buildDocumentSectionQualityHash,
  deriveDocumentQualitySummary,
  type DocumentQualityReport,
  type DocumentReviewFinding,
  type DocumentReviewFindingStatus,
} from '@/lib/research/document-quality-types'
import {
  buildSourceEvidenceIndex,
  buildSourceSnapshotHashes,
} from '@/lib/research/document-source-evidence'

const {
  mockDocumentToDocx,
  mockSaveDocumentBlueprint,
  mockLoadDocumentBlueprint,
  mockReassembleDocument,
  mockListCitationsByProject,
  mockListProjectEntityRefs,
  mockListGraphProjects,
  mockEnsureDocumentWriting,
  mockRetryDocumentWriting,
  mockGetLatestDocumentQualityReport,
  mockSaveDocumentQualityReport,
  mockUpdateDocumentQualityFindingStatus,
  mockRunDocumentPreflightRules,
  mockRouterPush,
  mockSerialize,
  mockDeserialize,
  mockSetValue,
  mockPlateOnChangeRef,
  mockLoadBioToolHistory,
  mockLoadGeneticsHistory,
  BIO_HISTORY_CHANGE_EVENT,
  GENETICS_HISTORY_CHANGE_EVENT,
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} = vi.hoisted(() => ({
  mockDocumentToDocx: vi.fn(async (_doc: DocumentBlueprint) => undefined),
  mockSaveDocumentBlueprint: vi.fn(async (doc: DocumentBlueprint) => doc),
  mockLoadDocumentBlueprint: vi.fn<() => Promise<DocumentBlueprint | null>>(),
  mockReassembleDocument: vi.fn<(doc: DocumentBlueprint) => DocumentBlueprint>(),
  mockListCitationsByProject: vi.fn<(projectId: string) => Promise<CitationRecord[]>>(),
  mockListProjectEntityRefs: vi.fn(),
  mockListGraphProjects: vi.fn(),
  mockEnsureDocumentWriting: vi.fn(async (_documentId: string) => null),
  mockRetryDocumentWriting: vi.fn(async (_documentId: string) => null),
  mockGetLatestDocumentQualityReport: vi.fn<(documentId: string) => Promise<DocumentQualityReport | null>>(),
  mockSaveDocumentQualityReport: vi.fn<(report: DocumentQualityReport) => Promise<DocumentQualityReport>>(),
  mockUpdateDocumentQualityFindingStatus: vi.fn<(
    reportId: string,
    findingId: string,
    status: DocumentReviewFindingStatus,
  ) => Promise<DocumentQualityReport>>(),
  mockRunDocumentPreflightRules: vi.fn<(document: DocumentBlueprint, options: { reportId: string; generatedAt: string }) => DocumentQualityReport>(),
  mockRouterPush: vi.fn(),
  mockSerialize: vi.fn(() => 'serialized editor content'),
  mockDeserialize: vi.fn(() => [{ type: 'p', children: [{ text: 'loaded nodes' }] }]),
  mockSetValue: vi.fn(),
  mockPlateOnChangeRef: { current: null as (() => void) | null },
  mockLoadBioToolHistory: vi.fn<() => BioToolHistoryEntry[]>(() => []),
  mockLoadGeneticsHistory: vi.fn<() => GeneticsHistoryEntry[]>(() => []),
  BIO_HISTORY_CHANGE_EVENT: 'bio-tools-history-changed',
  GENETICS_HISTORY_CHANGE_EVENT: 'genetics-history-changed',
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT: 'document-blueprints-changed',
  RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT: 'research-project-citations-changed',
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT: 'research-project-entity-refs-changed',
}))

vi.mock('platejs/react', () => ({
  usePlateEditor: () => ({
    children: [{ type: 'p', children: [{ text: 'editor children' }] }],
    api: {
      markdown: {
        serialize: mockSerialize,
        deserialize: mockDeserialize,
      },
    },
    tf: {
      setValue: mockSetValue,
      insertNodes: vi.fn(),
    },
  }),
}))

vi.mock('@/components/papers/PlateEditor', () => ({
  default: ({ onChange }: { onChange: () => void }) => {
    mockPlateOnChangeRef.current = onChange
    return (
      <button type="button" data-testid="paper-plate-editor" onClick={onChange}>
        editor
      </button>
    )
  },
}))

vi.mock('@/components/papers/plate-plugins', () => ({
  paperPlugins: [],
  EQUATION_KEY: 'equation',
  INLINE_EQUATION_KEY: 'inline-equation',
}))

vi.mock('@/components/papers/equation-element', () => ({
  EquationElement: () => null,
  InlineEquationElement: () => null,
}))

vi.mock('@/components/papers/DocumentSectionList', () => ({
  default: ({ sections, activeSectionId }: { sections: Array<{ id: string; title: string }>; activeSectionId: string | null }) => (
    <div data-testid="document-section-list">
      {sections.map((section) => (
        <div
          key={section.id}
          data-active={section.id === activeSectionId ? 'true' : 'false'}
        >
          {section.title}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/papers/MaterialPalette', () => ({
  default: ({
    citations,
    onDeleteCitation,
  }: {
    citations: Array<{ id: string }>
    onDeleteCitation: (id: string) => void
  }) => (
    <div data-testid="material-palette">
      <span>Citations: {citations.length}</span>
      {citations.map((citation) => (
        <button
          key={citation.id}
          type="button"
          onClick={() => onDeleteCitation(citation.id)}
        >
          delete {citation.id}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/lib/research/document-blueprint-storage', () => ({
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  DocumentBlueprintConflictError: class DocumentBlueprintConflictError extends Error {
    latestDocument: DocumentBlueprint

    constructor(latestDocument: DocumentBlueprint) {
      super('문서가 다른 탭에서 먼저 변경되었습니다.')
      this.latestDocument = latestDocument
    }
  },
  loadDocumentBlueprint: (_documentId: string) => mockLoadDocumentBlueprint(),
  saveDocumentBlueprint: (document: DocumentBlueprint) => mockSaveDocumentBlueprint(document),
}))

vi.mock('@/lib/research/document-assembler', () => ({
  applyReferencesSectionContent: (document: DocumentBlueprint) => document,
  reassembleDocument: (document: DocumentBlueprint, _sources: AssemblerDataSources) =>
    mockReassembleDocument(document),
}))

vi.mock('@/lib/research/document-writing-orchestrator', () => ({
  ensureDocumentWriting: (documentId: string) => mockEnsureDocumentWriting(documentId),
  retryDocumentWriting: (documentId: string) => mockRetryDocumentWriting(documentId),
}))

vi.mock('@/lib/research/document-quality-storage', () => ({
  DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT: 'document-quality-reports-changed',
  getLatestDocumentQualityReport: (documentId: string) => mockGetLatestDocumentQualityReport(documentId),
  saveDocumentQualityReport: (report: DocumentQualityReport) => mockSaveDocumentQualityReport(report),
  updateDocumentQualityFindingStatus: (
    reportId: string,
    findingId: string,
    status: DocumentReviewFindingStatus,
  ) =>
    mockUpdateDocumentQualityFindingStatus(reportId, findingId, status),
}))

vi.mock('@/lib/research/document-preflight-rules', () => ({
  DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION: 'document-preflight-rules:v1',
  runDocumentPreflightRules: (
    document: DocumentBlueprint,
    options: { reportId: string; generatedAt: string },
  ) => mockRunDocumentPreflightRules(document, options),
}))

vi.mock('@/lib/research/project-storage', () => ({
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
  listProjectEntityRefs: () => mockListProjectEntityRefs(),
  loadResearchProject: () => null,
}))

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({
    analysisHistory: [],
  }),
}))

vi.mock('@/lib/graph-studio/project-storage', () => ({
  GRAPH_PROJECTS_CHANGED_EVENT: 'graph-studio-projects-changed',
  listProjects: () => mockListGraphProjects(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/lib/genetics/analysis-history', () => ({
  HISTORY_CHANGE_EVENT: GENETICS_HISTORY_CHANGE_EVENT,
  loadAnalysisHistory: () => [],
  loadGeneticsHistory: () => mockLoadGeneticsHistory(),
}))

vi.mock('@/lib/bio-tools/bio-tool-history', () => ({
  BIO_HISTORY_CHANGE_EVENT,
  loadBioToolHistory: () => mockLoadBioToolHistory(),
}))

vi.mock('@/lib/research/citation-storage', () => ({
  RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT,
  listCitationsByProject: (projectId: string) => mockListCitationsByProject(projectId),
  deleteCitation: vi.fn(async () => undefined),
}))

vi.mock('@/lib/services/export/document-docx-export', () => ({
  documentToDocx: (document: DocumentBlueprint) => mockDocumentToDocx(document),
  hasVisibleContent: () => true,
}))

vi.mock('@/lib/services/export/document-hwpx-export', () => ({
  documentToHwpx: vi.fn(async () => undefined),
}))

vi.mock('@/lib/services/export/export-data-builder', () => ({
  downloadBlob: vi.fn(),
}))

function makeDocument(
  content: string,
  overrides: Partial<DocumentBlueprint> = {},
): DocumentBlueprint {
  const now = new Date().toISOString()
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: '테스트 문서',
    language: 'ko',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    writingState: {
      status: 'idle',
      sectionStates: {},
    },
    sections: [
      {
        id: 'results',
        title: '결과',
        content,
        sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
        editable: true,
        generatedBy: 'user',
      },
    ],
    ...overrides,
  }
}

function makeQualityReport(
  document: DocumentBlueprint,
  overrides: Partial<DocumentQualityReport> = {},
): DocumentQualityReport {
  const generatedAt = overrides.generatedAt ?? new Date().toISOString()
  const findings = overrides.findings ?? []
  return {
    id: overrides.id ?? 'dqreport-1',
    documentId: document.id,
    projectId: document.projectId,
    status: 'completed',
    snapshot: buildDocumentQualitySnapshot(document, {
      ruleEngineVersion: 'document-preflight-rules:v1',
      sourceSnapshotHashes: buildSourceSnapshotHashes(buildSourceEvidenceIndex(document)),
    }),
    findings,
    summary: deriveDocumentQualitySummary(findings),
    generatedAt,
    updatedAt: overrides.updatedAt ?? generatedAt,
    ...overrides,
  }
}

function makeReviewFinding(overrides: Partial<DocumentReviewFinding> = {}): DocumentReviewFinding {
  return {
    id: 'finding-1',
    reportId: 'dqreport-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    ruleId: 'table.caption.missing',
    category: 'format',
    severity: 'warning',
    status: 'open',
    title: 'Missing table caption',
    message: 'Caption is missing.',
    sectionId: 'results',
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  }
}

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function flushEditorRemoteValueGuard(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('DocumentEditor export freshness', () => {
  beforeEach(() => {
    mockDocumentToDocx.mockClear()
    mockSaveDocumentBlueprint.mockClear()
    mockLoadDocumentBlueprint.mockReset()
    mockReassembleDocument.mockReset()
    mockListCitationsByProject.mockReset()
    mockListProjectEntityRefs.mockReset()
    mockListGraphProjects.mockReset()
    mockEnsureDocumentWriting.mockClear()
    mockRetryDocumentWriting.mockClear()
    mockGetLatestDocumentQualityReport.mockReset()
    mockSaveDocumentQualityReport.mockReset()
    mockUpdateDocumentQualityFindingStatus.mockReset()
    mockRunDocumentPreflightRules.mockReset()
    mockRouterPush.mockReset()
    mockSerialize.mockClear()
    mockDeserialize.mockClear()
    mockSetValue.mockClear()
    mockPlateOnChangeRef.current = null
    mockLoadBioToolHistory.mockReset()
    mockLoadGeneticsHistory.mockReset()
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => true),
    })

    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('이전 내용'))
    mockListCitationsByProject.mockResolvedValue([])
    mockListProjectEntityRefs.mockReturnValue([])
    mockListGraphProjects.mockReturnValue([])
    mockLoadBioToolHistory.mockReturnValue([])
    mockLoadGeneticsHistory.mockReturnValue([])
    mockGetLatestDocumentQualityReport.mockResolvedValue(null)
    mockSaveDocumentQualityReport.mockImplementation(async (report: DocumentQualityReport) => report)
    mockUpdateDocumentQualityFindingStatus.mockImplementation(async (_reportId, findingId, status) => {
      const report = await mockGetLatestDocumentQualityReport('doc-1')
      if (!report) {
        throw new Error('Report not found')
      }
      const findings = report.findings.map((finding) => (
        finding.id === findingId
          ? {
              ...finding,
              status,
              ignoredReason: status === 'ignored' ? '사용자가 이번 점검에서 예외로 표시했습니다.' : undefined,
              updatedAt: '2026-04-25T03:00:00.000Z',
            }
          : finding
      ))
      return {
        ...report,
        findings,
        summary: deriveDocumentQualitySummary(findings),
        updatedAt: '2026-04-25T03:00:00.000Z',
      }
    })
    mockRunDocumentPreflightRules.mockImplementation((
      document: DocumentBlueprint,
      options: { reportId: string; generatedAt: string },
    ) => makeQualityReport(document, {
      id: options.reportId,
      generatedAt: options.generatedAt,
      updatedAt: options.generatedAt,
    }))
    mockReassembleDocument.mockImplementation((doc: DocumentBlueprint) => ({
      ...doc,
      updatedAt: '2026-04-13T00:00:00.000Z',
      sections: doc.sections.map((section) => (
        section.id === 'results'
          ? { ...section, content: 'linked materials 기준 최신 내용' }
          : section
      )),
    }))
  })

  it('exports the reassembled document after linked materials change even when the editor is idle', async () => {
    const user = userEvent.setup()

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getAllByText('결과')).toHaveLength(2)

    act(() => {
      window.dispatchEvent(new CustomEvent(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, {
        detail: { projectIds: ['project-1'] },
      }))
    })

    await screen.findByText('프로젝트 분석 또는 그래프가 변경되었습니다.')

    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    await waitFor(() => {
      expect(mockDocumentToDocx).toHaveBeenCalledTimes(1)
    })

    const [exportedDoc] = mockDocumentToDocx.mock.calls[0] as [DocumentBlueprint]
    expect(exportedDoc.sections[0]?.content).toBe('linked materials 기준 최신 내용')
    expect(exportedDoc.sections[0]?.content).not.toBe('이전 내용')

    expect(mockReassembleDocument).toHaveBeenCalledTimes(1)
    expect(mockSerialize).not.toHaveBeenCalled()
  })

  it('runs preflight from the right rail and saves the latest report', async () => {
    const user = userEvent.setup()

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await user.click(screen.getAllByRole('button', { name: '점검 실행' })[0] as HTMLElement)

    await waitFor(() => {
      expect(mockRunDocumentPreflightRules).toHaveBeenCalledTimes(1)
      expect(mockSaveDocumentQualityReport).toHaveBeenCalledTimes(1)
    })

    const [documentArg, optionsArg] = mockRunDocumentPreflightRules.mock.calls[0] as [
      DocumentBlueprint,
      { reportId: string; generatedAt: string },
    ]
    expect(documentArg.id).toBe('doc-1')
    expect(optionsArg.reportId).toMatch(/^dqreport_/)
    await waitFor(() => {
      expect(screen.getAllByText('점검 통과').length).toBeGreaterThan(0)
    })
  })

  it('requires confirmation before exporting with a missing preflight report', async () => {
    const user = userEvent.setup()
    const confirmMock = vi.fn(() => false)
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: confirmMock,
    })

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getAllByText('점검 전').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(confirmMock).toHaveBeenCalledWith('최신 문서 점검 결과가 없습니다. 그래도 내보낼까요?')
    expect(mockDocumentToDocx).not.toHaveBeenCalled()
  })

  it('treats a fresh preflight report as stale when linked materials need reassembly before export', async () => {
    const user = userEvent.setup()
    const initialDocument = makeDocument('이전 내용')
    const confirmMock = vi.fn(() => false)
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: confirmMock,
    })
    mockLoadDocumentBlueprint.mockResolvedValue(initialDocument)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(initialDocument))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')

    act(() => {
      window.dispatchEvent(new CustomEvent(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, {
        detail: { projectIds: ['project-1'] },
      }))
    })

    await screen.findByText('프로젝트 분석 또는 그래프가 변경되었습니다.')
    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(confirmMock).toHaveBeenCalledWith('문서가 점검 이후 변경되었습니다. 그래도 내보낼까요?')
    expect(mockDocumentToDocx).not.toHaveBeenCalled()
  })

  it('treats a report as stale when the current source evidence snapshot differs', async () => {
    const user = userEvent.setup()
    const currentDocument = makeDocument('이전 내용', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '이전 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'user',
          tables: [
            {
              id: 'table-1',
              caption: 'Updated table',
              headers: ['F'],
              rows: [['4.2']],
              sourceAnalysisId: 'analysis-1',
            },
          ],
        },
      ],
    })
    const reportBaseDocument = makeDocument('이전 내용', {
      sections: [
        {
          ...currentDocument.sections[0],
          tables: [
            {
              id: 'table-1',
              caption: 'Original table',
              headers: ['F'],
              rows: [['4.2']],
              sourceAnalysisId: 'analysis-1',
            },
          ],
        },
      ],
    })
    const confirmMock = vi.fn(() => false)
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: confirmMock,
    })
    mockLoadDocumentBlueprint.mockResolvedValue(currentDocument)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(reportBaseDocument, {
      snapshot: {
        ...buildDocumentQualitySnapshot(currentDocument, {
          ruleEngineVersion: 'document-preflight-rules:v1',
          sourceSnapshotHashes: buildSourceSnapshotHashes(buildSourceEvidenceIndex(reportBaseDocument)),
        }),
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await user.click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    expect(confirmMock).toHaveBeenCalledWith('문서가 점검 이후 변경되었습니다. 그래도 내보낼까요?')
    expect(mockDocumentToDocx).not.toHaveBeenCalled()
  })

  it('opens the finding section from the preflight panel', async () => {
    const user = userEvent.setup()
    const document = makeDocument('서론 내용', {
      sections: [
        {
          id: 'intro',
          title: '서론',
          content: '서론 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'results',
          title: '결과',
          content: '결과 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'user',
        },
      ],
    })
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          sectionId: 'results',
          title: 'Missing table caption',
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await screen.findByText('Missing table caption')
    await user.click(screen.getByRole('button', { name: 'Missing table caption 섹션으로 이동' }))

    const sectionList = screen.getByTestId('document-section-list')
    const activeEntry = sectionList.querySelector('[data-active="true"]')
    expect(activeEntry).toHaveTextContent('결과')
  })

  it('ignores preflight finding navigation when the section no longer exists', async () => {
    const user = userEvent.setup()
    const document = makeDocument('서론 내용', {
      sections: [
        {
          id: 'intro',
          title: '서론',
          content: '서론 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'user',
        },
      ],
    })
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          sectionId: 'missing-section',
          title: 'Missing section finding',
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await screen.findByText('Missing section finding')
    await user.click(screen.getByRole('button', { name: 'Missing section finding 섹션으로 이동' }))

    const sectionList = screen.getByTestId('document-section-list')
    const activeEntry = sectionList.querySelector('[data-active="true"]')
    expect(activeEntry).toHaveTextContent('서론')
  })

  it('marks a fresh preflight finding as ignored and refreshes the panel summary', async () => {
    const user = userEvent.setup()
    const document = makeDocument('결과 내용')
    const report = makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          severity: 'critical',
          title: 'Missing table caption',
        }),
      ],
    })
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(report)

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await screen.findByText('Missing table caption')
    expect(screen.getByText('수정 필요')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '무시' }))

    await waitFor(() => {
      expect(mockUpdateDocumentQualityFindingStatus).toHaveBeenCalledWith(report.id, 'finding-1', 'ignored')
    })
    expect(screen.getAllByText('무시됨').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('사용자가 이번 점검에서 예외로 표시했습니다.')).toBeInTheDocument()
    expect(screen.getByText('통과')).toBeInTheDocument()
  })

  it('does not update finding status when the preflight report is stale', async () => {
    const user = userEvent.setup()
    const document = makeDocument('최신 결과 내용')
    const staleReport = makeQualityReport(makeDocument('이전 결과 내용'), {
      findings: [
        makeReviewFinding({
          title: 'Missing table caption',
        }),
      ],
    })
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(staleReport)

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await screen.findByText('Missing table caption')
    const ignoreButton = screen.getByRole('button', { name: '무시' })
    expect(ignoreButton).toBeDisabled()

    await user.click(ignoreButton)

    expect(mockUpdateDocumentQualityFindingStatus).not.toHaveBeenCalled()
  })

  it('opens a navigable preflight evidence source', async () => {
    const user = userEvent.setup()
    const document = makeDocument('결과 내용')
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'Analysis evidence finding',
          evidence: [
            {
              label: 'analysis evidence',
              sourceKind: 'analysis',
              sourceId: 'analysis-1',
            },
          ],
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('analysis evidence')
    await user.click(screen.getByRole('button', { name: '원본' }))

    expect(mockRouterPush).toHaveBeenCalledWith('/?history=analysis-1')
  })

  it('opens a figure preflight evidence source', async () => {
    const user = userEvent.setup()
    const document = makeDocument('결과 내용')
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'Figure evidence finding',
          evidence: [
            {
              label: 'figure evidence',
              sourceKind: 'figure',
              sourceId: 'figure-1',
            },
          ],
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('figure evidence')
    await user.click(screen.getByRole('button', { name: '원본' }))

    expect(mockRouterPush).toHaveBeenCalledWith('/graph-studio?project=figure-1')
  })

  it('opens supplementary preflight evidence through Bio-Tools history fallback', async () => {
    const user = userEvent.setup()
    const document = makeDocument('결과 내용')
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockListProjectEntityRefs.mockReturnValue([])
    mockLoadBioToolHistory.mockReturnValue([
      { id: 'bio-1', toolId: 'fst', toolNameEn: 'Fst', toolNameKo: 'Fst', csvFileName: 'fst.csv', columnConfig: {}, results: {}, createdAt: Date.now() },
    ])
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'Bio evidence finding',
          evidence: [
            {
              label: 'bio evidence',
              sourceKind: 'supplementary',
              sourceId: 'bio-1',
            },
          ],
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('bio evidence')
    await user.click(screen.getByRole('button', { name: '원본' }))

    expect(mockRouterPush).toHaveBeenCalledWith('/bio-tools?tool=fst&history=bio-1')
  })

  it('opens supplementary preflight evidence through genetics history fallback', async () => {
    const user = userEvent.setup()
    const document = makeDocument('결과 내용')
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockListProjectEntityRefs.mockReturnValue([])
    mockLoadGeneticsHistory.mockReturnValue([
      { id: 'protein-1', type: 'protein', analysisName: '단백질 해석', sequenceLength: 146, molecularWeight: 16000, isoelectricPoint: 6.8, isStable: true, createdAt: Date.now() },
    ])
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'Protein evidence finding',
          evidence: [
            {
              label: 'protein evidence',
              sourceKind: 'supplementary',
              sourceId: 'protein-1',
            },
          ],
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('protein evidence')
    await user.click(screen.getByRole('button', { name: '원본' }))

    expect(mockRouterPush).toHaveBeenCalledWith('/genetics/protein?history=protein-1')
  })

  it('does not render source navigation for unsupported preflight evidence kinds', async () => {
    const document = makeDocument('결과 내용')
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'Artifact evidence finding',
          evidence: [
            {
              label: 'table-1',
              sourceKind: 'document-artifact',
              sourceId: 'table-1',
            },
          ],
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('table-1')

    expect(screen.queryByRole('button', { name: '원본' })).not.toBeInTheDocument()
  })

  it('applies an auto-applicable preflight suggestion to the active section content', async () => {
    const user = userEvent.setup()
    const document = makeDocument('The p value is 0.04.')
    const section = document.sections[0]
    if (!section) {
      throw new Error('missing section fixture')
    }
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'P-value suggestion',
          sectionId: 'results',
          targetRange: {
            startOffset: 15,
            endOffset: 19,
            sectionHash: buildDocumentSectionQualityHash(section),
          },
          suggestion: {
            replacementText: '0.038',
            canAutoApply: true,
            requiresUserConfirmation: false,
          },
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('P-value suggestion')
    await user.click(screen.getByRole('button', { name: '선택 적용' }))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600))
    })

    expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    const savedDocument = mockSaveDocumentBlueprint.mock.calls.at(-1)?.[0] as DocumentBlueprint | undefined
    expect(savedDocument?.sections[0]?.content).toBe('The p value is 0.038.')
    expect(savedDocument?.sections[0]?.plateValue).toBeUndefined()
    expect(mockSetValue).toHaveBeenCalled()
  })

  it('does not apply a preflight suggestion when the section hash is stale', async () => {
    const user = userEvent.setup()
    const document = makeDocument('The p value is 0.04.')
    mockLoadDocumentBlueprint.mockResolvedValue(document)
    mockGetLatestDocumentQualityReport.mockResolvedValue(makeQualityReport(document, {
      findings: [
        makeReviewFinding({
          title: 'Stale suggestion',
          sectionId: 'results',
          targetRange: {
            startOffset: 15,
            endOffset: 19,
            sectionHash: 'stale-hash',
          },
          suggestion: {
            replacementText: '0.038',
            canAutoApply: true,
            requiresUserConfirmation: false,
          },
        }),
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('Stale suggestion')
    await user.click(screen.getByRole('button', { name: '선택 적용' }))

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).not.toHaveBeenCalled()
    })
  })

  it('shows document and section drafting badges when writing state exists', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('초안 내용', {
      writingState: {
        status: 'drafting',
        jobId: 'job_1',
        sectionStates: {
          results: {
            status: 'drafting',
            jobId: 'job_1',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('초안 작성 중')
    expect(screen.getByText('섹션 작성 중')).toBeInTheDocument()
  })

  it('summarizes completed writing when some sections were preserved', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('draft', {
      sections: [
        {
          id: 'results',
          title: 'Results',
          content: 'draft',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'llm',
        },
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'user',
        },
      ],
      writingState: {
        status: 'completed',
        jobId: 'job_1',
        sectionStates: {
          results: {
            status: 'patched',
            jobId: 'job_1',
          },
          methods: {
            status: 'skipped',
            jobId: 'job_1',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    expect(await screen.findByText('\uC77C\uBD80 \uBC18\uC601 (1/2)')).toBeInTheDocument()
  })

  it('summarizes failed writing when some sections were already patched', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('draft', {
      sections: [
        {
          id: 'results',
          title: 'Results',
          content: 'draft',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'llm',
        },
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'template',
        },
      ],
      writingState: {
        status: 'failed',
        jobId: 'job_1',
        errorMessage: 'failed',
        sectionStates: {
          results: {
            status: 'patched',
            jobId: 'job_1',
          },
          methods: {
            status: 'failed',
            jobId: 'job_1',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    expect(await screen.findByText('\uC77C\uBD80 \uC2E4\uD328 (1/2 \uBC18\uC601)')).toBeInTheDocument()
  })

  it('starts background writing when a collecting document is opened', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('초안 내용', {
      writingState: {
        status: 'collecting',
        jobId: 'job_collecting',
        sectionStates: {
          methods: {
            status: 'drafting',
            jobId: 'job_collecting',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    expect(await screen.findByText('자료 수집 중')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockEnsureDocumentWriting).toHaveBeenCalledWith('doc-1')
    })
  })

  it('immediately saves section ownership when the user edits during drafting', async () => {
    const user = userEvent.setup()

    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('초안 내용', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '초안 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'template',
        },
      ],
      writingState: {
        status: 'drafting',
        jobId: 'job_1',
        sectionStates: {
          results: {
            status: 'drafting',
            jobId: 'job_1',
          },
          methods: {
            status: 'drafting',
            jobId: 'job_1',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('초안 작성 중')
    await user.click(screen.getByTestId('paper-plate-editor'))

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls[0]?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.generatedBy).toBe('user')
    expect(savedDocument.writingState?.status).toBe('drafting')
    expect(savedDocument.writingState?.sectionStates.results?.status).toBe('skipped')
    expect(savedDocument.writingState?.sectionStates.methods?.status).toBe('drafting')
    expect(savedDocument.writingState?.jobId).toBe('job_1')
    expect(savedDocument.writingState?.sectionStates.results?.jobId).toBe('job_1')
  })

  it('lets the user stop automatic writing from the section banner', async () => {
    const user = userEvent.setup()

    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('초안 내용', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '초안 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'template',
        },
      ],
      writingState: {
        status: 'drafting',
        jobId: 'job_1',
        sectionStates: {
          results: {
            status: 'drafting',
            jobId: 'job_1',
          },
          methods: {
            status: 'drafting',
            jobId: 'job_1',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    expect(await screen.findByText('이 섹션은 자동으로 작성 중입니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이 섹션 중단' }))

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls[0]?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.generatedBy).toBe('user')
    expect(savedDocument.writingState?.status).toBe('drafting')
    expect(savedDocument.writingState?.sectionStates.results?.status).toBe('skipped')
    expect(savedDocument.writingState?.sectionStates.methods?.status).toBe('drafting')
    expect(savedDocument.writingState?.jobId).toBe('job_1')
    expect(savedDocument.writingState?.sectionStates.results?.jobId).toBe('job_1')
  })

  it('flushes pending editor changes before retrying a failed writing job', async () => {
    const user = userEvent.setup()

    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('초안 내용', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '초안 내용',
          sourceRefs: [createDocumentSourceRef('analysis', 'analysis-1')],
          editable: true,
          generatedBy: 'user',
        },
      ],
      writingState: {
        status: 'failed',
        jobId: 'job_failed',
        errorMessage: 'failed',
        sectionStates: {
          results: {
            status: 'failed',
            jobId: 'job_failed',
          },
        },
      },
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('작성 실패')
    await user.click(screen.getByTestId('paper-plate-editor'))
    await user.click(screen.getByRole('button', { name: '재시도' }))

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
      expect(mockRetryDocumentWriting).toHaveBeenCalledWith('doc-1')
    })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls[0]?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.content).toBe('serialized editor content')
  })

  it('flushes pending editor content before manual reassemble', async () => {
    const user = userEvent.setup()

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')

    await user.click(screen.getByTestId('paper-plate-editor'))
    await user.click(screen.getByRole('button', { name: '재조립' }))

    await waitFor(() => {
      expect(mockReassembleDocument).toHaveBeenCalledTimes(1)
    })

    expect(mockSerialize).toHaveBeenCalled()
    const [reassembledDoc] = mockReassembleDocument.mock.calls[0] as [DocumentBlueprint]
    expect(reassembledDoc.sections[0]?.content).toBe('serialized editor content')
  })

  it('reloads citations and marks the document for reassembly when citations change', async () => {
    mockListCitationsByProject
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'cit-1',
          projectId: 'project-1',
          item: {
            id: 'paper-1',
            source: 'openalex',
            title: 'Citation title',
            authors: ['Kim'],
            year: 2024,
            url: 'https://example.com/paper-1',
            searchedName: 'Species',
          },
          addedAt: '2026-04-13T00:00:00.000Z',
        },
      ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await waitFor(() => {
      expect(screen.getByText('Citations: 0')).toBeInTheDocument()
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, {
        detail: { projectId: 'project-1' },
      }))
    })

    await waitFor(() => {
      expect(mockListCitationsByProject).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Citations: 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '재조립 필요' })).toBeInTheDocument()
    })
  })

  it('marks supplementary documents for reassembly when bio-tool history changes', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('보조 결과 링크 확인', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '보조 결과 링크 확인',
          sourceRefs: [
            createDocumentSourceRef('supplementary', 'bio-1', { label: 'Fst 분석' }),
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')

    act(() => {
      window.dispatchEvent(new Event(BIO_HISTORY_CHANGE_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '재조립 필요' })).toBeInTheDocument()
    })
  })

  it('marks supplementary documents for reassembly when genetics history changes', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('보조 결과 링크 확인', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '보조 결과 링크 확인',
          sourceRefs: [
            createDocumentSourceRef('supplementary', 'protein-1', { label: '단백질 해석' }),
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')

    act(() => {
      window.dispatchEvent(new Event(GENETICS_HISTORY_CHANGE_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '재조립 필요' })).toBeInTheDocument()
    })
  })

  it('ignores stale citation reload responses when newer citation changes finish first', async () => {
    const firstReload = createDeferred<CitationRecord[]>()
    const secondReload = createDeferred<CitationRecord[]>()

    mockListCitationsByProject.mockReset()
    mockListCitationsByProject
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => firstReload.promise)
      .mockImplementationOnce(() => secondReload.promise)

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await waitFor(() => {
      expect(screen.getByText('Citations: 0')).toBeInTheDocument()
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, {
        detail: { projectId: 'project-1' },
      }))
      window.dispatchEvent(new CustomEvent(RESEARCH_PROJECT_CITATIONS_CHANGED_EVENT, {
        detail: { projectId: 'project-1' },
      }))
    })

    await waitFor(() => {
      expect(mockListCitationsByProject).toHaveBeenCalledTimes(3)
    })

    await act(async () => {
      secondReload.resolve([
        {
          id: 'cit-latest',
          projectId: 'project-1',
          item: {
            id: 'paper-latest',
            source: 'openalex',
            title: 'Latest citation',
            authors: ['Lee'],
            year: 2025,
            url: 'https://example.com/latest',
            searchedName: 'Species',
          },
          addedAt: '2026-04-13T00:00:00.000Z',
        },
      ])
      await secondReload.promise
    })

    await waitFor(() => {
      expect(screen.getByText('Citations: 1')).toBeInTheDocument()
    })

    await act(async () => {
      firstReload.resolve([])
      await firstReload.promise
    })

    await waitFor(() => {
      expect(screen.getByText('Citations: 1')).toBeInTheDocument()
    })

    expect(screen.queryByText('Citations: 0')).not.toBeInTheDocument()
    expect(mockListCitationsByProject).toHaveBeenCalledTimes(3)

    await userEvent.setup().click(screen.getByRole('button', { name: 'DOCX 다운로드' }))

    await waitFor(() => {
      expect(mockDocumentToDocx).toHaveBeenCalledTimes(1)
    })
    expect(mockListCitationsByProject).toHaveBeenCalledTimes(3)
  })

  it('exposes round-trip source actions for linked analyses and figures', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('원본 링크 확인', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '원본 링크 확인',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'analysis-1'),
            createDocumentSourceRef('figure', 'figure-1'),
          ],
          editable: true,
          generatedBy: 'user',
          tables: [
            {
              id: 'table-1',
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
    }))
    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-1' },
      { entityKind: 'figure', entityId: 'figure-1' },
    ])
    mockListGraphProjects.mockReturnValue([
      { id: 'figure-1', name: 'Figure Project' },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getByRole('button', { name: /통계.*원본 분석/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /그래프.*figure project/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '통계 열기' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Graph Studio' })).toBeInTheDocument()
    expect(screen.getAllByText('관련 분석: T-Test')).toHaveLength(2)
    expect(screen.getByText('패턴 요약: B가 A보다 높음')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: '통계 열기' })[0]!)
    expect(mockRouterPush).toHaveBeenCalledWith('/?history=analysis-1')
  })

  it('shows supplementary source actions for linked bio and genetics results', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('보조 결과 링크 확인', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '보조 결과 링크 확인',
          sourceRefs: [
            createDocumentSourceRef('supplementary', 'bio-1', { label: 'Fst 분석' }),
            createDocumentSourceRef('supplementary', 'protein-1', { label: '단백질 해석' }),
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'bio-tool-result', entityId: 'bio-1', label: 'Fst 분석' },
      { entityKind: 'protein-result', entityId: 'protein-1', label: '단백질 해석' },
    ])
    mockLoadBioToolHistory.mockReturnValue([
      { id: 'bio-1', toolId: 'fst', toolNameEn: 'Fst', toolNameKo: 'Fst', csvFileName: 'fst.csv', columnConfig: {}, results: {}, createdAt: Date.now() },
    ])
    mockLoadGeneticsHistory.mockReturnValue([
      { id: 'protein-1', type: 'protein', analysisName: '단백질 해석', sequenceLength: 146, molecularWeight: 16000, isoelectricPoint: 6.8, isStable: true, createdAt: Date.now() },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getByRole('button', { name: /Bio-Tools.*Fst 분석/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /단백질 해석.*단백질 해석/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Bio-Tools.*Fst 분석/i }))
    expect(mockRouterPush).toHaveBeenCalledWith('/bio-tools?tool=fst&history=bio-1')

    await userEvent.click(screen.getByRole('button', { name: /단백질 해석.*단백질 해석/i }))
    expect(mockRouterPush).toHaveBeenCalledWith('/genetics/protein?history=protein-1')
  })

  it('keeps supplementary source actions visible even when project entity refs are stale', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('보조 결과 fallback', {
      sections: [
        {
          id: 'results',
          title: '결과',
          content: '보조 결과 fallback',
          sourceRefs: [
            createDocumentSourceRef('supplementary', 'protein-1', { label: '단백질 해석' }),
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListProjectEntityRefs.mockReturnValue([])
    mockLoadGeneticsHistory.mockReturnValue([
      { id: 'protein-1', type: 'protein', analysisName: '단백질 해석', sequenceLength: 146, molecularWeight: 16000, isoelectricPoint: 6.8, isStable: true, createdAt: Date.now() },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    const link = screen.getByRole('button', { name: /단백질 해석.*단백질 해석/i })
    expect(link).toBeInTheDocument()

    await userEvent.click(link)
    expect(mockRouterPush).toHaveBeenCalledWith('/genetics/protein?history=protein-1')
  })

  it('opens the section requested from the document route', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('섹션 이동', {
      sections: [
        {
          id: 'intro',
          title: '서론',
          content: '서론 본문',
          sourceRefs: [],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'results',
          title: '결과',
          content: '결과 본문',
          sourceRefs: [],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))

    render(<DocumentEditor documentId="doc-1" initialSectionId="results" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    const sectionList = screen.getByTestId('document-section-list')
    const activeEntry = sectionList.querySelector('[data-active="true"]')
    expect(activeEntry).toHaveTextContent('결과')
  })

  it('lets the user detach literature support from the active section without deleting the citation', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('문헌 연결', {
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '문헌 연결',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: 'Marine Ecology Review',
            citationIds: ['cit_1'],
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListCitationsByProject.mockResolvedValue([
      {
        id: 'cit_1',
        projectId: 'project-1',
        item: {
          id: 'paper-1',
          source: 'openalex',
          title: 'Marine Ecology Review',
          authors: ['Kim'],
          year: 2025,
          url: 'https://example.com/paper-1',
          searchedName: 'Species',
        },
        addedAt: '2026-04-13T00:00:00.000Z',
      },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getByText('섹션 작성 근거')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: '섹션에서 해제' }))

    await waitFor(() => {
      expect(screen.queryByText('섹션 작성 근거')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('material-palette')).toHaveTextContent('Citations: 1')
  })

  it('deleting a project citation also clears section evidence bindings', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('문헌 연결 [Kim, 2025](citation:cit_1)', {
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '문헌 연결 [Kim, 2025](citation:cit_1)',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: 'Marine Ecology Review',
            citationIds: ['cit_1'],
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListCitationsByProject.mockResolvedValue([
      {
        id: 'cit_1',
        projectId: 'project-1',
        item: {
          id: 'paper-1',
          source: 'openalex',
          title: 'Marine Ecology Review',
          authors: ['Kim'],
          year: 2025,
          url: 'https://example.com/paper-1',
          searchedName: 'Species',
        },
        addedAt: '2026-04-13T00:00:00.000Z',
      },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getByText('섹션 작성 근거')).toBeInTheDocument()
    await screen.findByText('Citations: 1')

    await userEvent.setup().click(screen.getByRole('button', { name: 'delete cit_1' }))

    await waitFor(() => {
      expect(screen.getByTestId('material-palette')).toHaveTextContent('Citations: 0')
      expect(screen.queryByText('섹션 작성 근거')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      const savedDocument = mockSaveDocumentBlueprint.mock.calls.at(-1)?.[0]
      expect(savedDocument?.sections[0]?.sectionSupportBindings).toBeUndefined()
    })
    expect(mockSetValue).toHaveBeenCalled()
  })

  it('lets the user duplicate a literature card to capture another claim from the same citation', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('문헌 연결', {
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '문헌 연결',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: 'Marine Ecology Review',
            citationIds: ['cit_1'],
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListCitationsByProject.mockResolvedValue([
      {
        id: 'cit_1',
        projectId: 'project-1',
        item: {
          id: 'paper-1',
          source: 'openalex',
          title: 'Marine Ecology Review',
          authors: ['Kim'],
          year: 2025,
          url: 'https://example.com/paper-1',
          searchedName: 'Species',
        },
        addedAt: '2026-04-13T00:00:00.000Z',
      },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    expect(screen.getAllByLabelText('핵심 메모')).toHaveLength(1)

    await userEvent.setup().click(screen.getByRole('button', { name: '같은 문헌 근거 추가' }))

    await waitFor(() => {
      expect(screen.getAllByLabelText('핵심 메모')).toHaveLength(2)
    })
  })

  it('keeps the remaining memo card when one duplicated literature card is detached', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('문헌 연결', {
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '문헌 연결',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: 'Marine Ecology Review',
            citationIds: ['cit_1'],
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListCitationsByProject.mockResolvedValue([
      {
        id: 'cit_1',
        projectId: 'project-1',
        item: {
          id: 'paper-1',
          source: 'openalex',
          title: 'Marine Ecology Review',
          authors: ['Kim'],
          year: 2025,
          url: 'https://example.com/paper-1',
          searchedName: 'Species',
        },
        addedAt: '2026-04-13T00:00:00.000Z',
      },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await userEvent.setup().click(screen.getByRole('button', { name: '같은 문헌 근거 추가' }))

    await waitFor(() => {
      expect(screen.getAllByLabelText('핵심 메모')).toHaveLength(2)
    })

    await userEvent.setup().click(screen.getAllByRole('button', { name: '섹션에서 해제' })[0]!)

    await waitFor(() => {
      expect(screen.getAllByLabelText('핵심 메모')).toHaveLength(1)
    })
  })

  it('preserves separate memo cards when a role change moves onto an already used role', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('문헌 연결', {
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '문헌 연결',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'dsb_1',
              sourceKind: 'citation-record',
              sourceId: 'cit_1',
              role: 'comparison',
              label: 'Marine Ecology Review',
              citationIds: ['cit_1'],
              included: true,
              origin: 'user',
            },
            {
              id: 'dsb_2',
              sourceKind: 'citation-record',
              sourceId: 'cit_1',
              role: 'interpretation',
              label: 'Marine Ecology Review',
              citationIds: ['cit_1'],
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListCitationsByProject.mockResolvedValue([
      {
        id: 'cit_1',
        projectId: 'project-1',
        item: {
          id: 'paper-1',
          source: 'openalex',
          title: 'Marine Ecology Review',
          authors: ['Kim'],
          year: 2025,
          url: 'https://example.com/paper-1',
          searchedName: 'Species',
        },
        addedAt: '2026-04-13T00:00:00.000Z',
      },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')

    const moveToComparisonButton = screen.getAllByRole('button', { name: '비교' })
      .find((button) => !button.hasAttribute('disabled'))
    expect(moveToComparisonButton).toBeDefined()

    await userEvent.setup().click(moveToComparisonButton as HTMLElement)

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    }, { timeout: 4_000 })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls.at(-1)?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.sectionSupportBindings).toEqual([
      expect.objectContaining({ id: 'dsb_1', role: 'comparison' }),
      expect.objectContaining({ id: 'dsb_2', role: 'comparison' }),
    ])
    expect(screen.getAllByLabelText('핵심 메모')).toHaveLength(2)
  })

  it('saves edited support notes on blur so claim and excerpt can be curated per card', async () => {
    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('문헌 연결', {
      sections: [
        {
          id: 'discussion',
          title: '고찰',
          content: '문헌 연결',
          sourceRefs: [],
          sectionSupportBindings: [{
            id: 'dsb_1',
            sourceKind: 'citation-record',
            sourceId: 'cit_1',
            role: 'comparison',
            label: 'Marine Ecology Review',
            citationIds: ['cit_1'],
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))
    mockListCitationsByProject.mockResolvedValue([
      {
        id: 'cit_1',
        projectId: 'project-1',
        item: {
          id: 'paper-1',
          source: 'openalex',
          title: 'Marine Ecology Review',
          authors: ['Kim'],
          year: 2025,
          url: 'https://example.com/paper-1',
          searchedName: 'Species',
        },
        addedAt: '2026-04-13T00:00:00.000Z',
      },
    ])

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')

    const noteInput = screen.getByLabelText('핵심 메모')
    const excerptInput = screen.getByLabelText('발췌 메모')

    fireEvent.change(noteInput, { target: { value: '핵심 주장 메모' } })
    fireEvent.blur(noteInput)
    fireEvent.change(excerptInput, { target: { value: '초록에서 발췌한 비교 문장' } })
    fireEvent.blur(excerptInput)

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    }, { timeout: 4_000 })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls.at(-1)?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.sectionSupportBindings).toEqual([
      expect.objectContaining({
        id: 'dsb_1',
        summary: '핵심 주장 메모',
        excerpt: '초록에서 발췌한 비교 문장',
      }),
    ])
  })

  it('serializes autosave writes so an older save cannot overtake newer content', async () => {
    const firstSave = createDeferred<void>()
    const secondSave = createDeferred<void>()

    mockSerialize
      .mockReturnValueOnce('첫 번째 저장 내용')
      .mockReturnValueOnce('두 번째 저장 내용')

    let saveCallCount = 0
    mockSaveDocumentBlueprint.mockImplementation(async (doc: DocumentBlueprint) => {
      saveCallCount += 1
      if (saveCallCount === 1) {
        await firstSave.promise
        return doc
      }
      await secondSave.promise
      return doc
    })

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await flushEditorRemoteValueGuard()

    vi.useFakeTimers()
    try {
      act(() => {
        screen.getByTestId('paper-plate-editor').click()
      })
      await act(async () => {
        vi.advanceTimersByTime(2_000)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mockSaveDocumentBlueprint).toHaveBeenCalledTimes(1)

      act(() => {
        screen.getByTestId('paper-plate-editor').click()
      })
      await act(async () => {
        vi.advanceTimersByTime(2_000)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mockSaveDocumentBlueprint).toHaveBeenCalledTimes(1)

      await act(async () => {
        firstSave.resolve(undefined)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mockSaveDocumentBlueprint).toHaveBeenCalledTimes(2)

      expect(mockSerialize).toHaveBeenCalledTimes(2)

      await act(async () => {
        secondSave.resolve(undefined)
        await Promise.resolve()
        await Promise.resolve()
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('reloads the latest saved document when the same document changes externally and there are no local edits', async () => {
    const latestDocument = makeDocument('외부 최신 내용', {
      updatedAt: '2026-04-21T00:00:01.000Z',
    })
    mockLoadDocumentBlueprint
      .mockResolvedValueOnce(makeDocument('기존 내용'))
      .mockResolvedValueOnce(latestDocument)

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await flushEditorRemoteValueGuard()
    mockDeserialize.mockClear()
    mockSetValue.mockClear()
    mockSetValue.mockImplementationOnce(() => {
      setTimeout(() => {
        mockPlateOnChangeRef.current?.()
      }, 0)
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, {
        detail: {
          projectId: 'project-1',
          documentId: 'doc-1',
          action: 'saved',
          updatedAt: latestDocument.updatedAt,
        },
      }))
    })

    await waitFor(() => {
      expect(mockLoadDocumentBlueprint).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(mockDeserialize).toHaveBeenCalledWith('\uC678\uBD80 \uCD5C\uC2E0 \uB0B4\uC6A9')
      expect(mockSetValue).toHaveBeenCalled()
    })

    await flushEditorRemoteValueGuard()

    expect(mockSaveDocumentBlueprint).not.toHaveBeenCalled()
    expect(screen.queryByText('다른 탭에서 이 문서가 먼저 저장되었습니다.')).not.toBeInTheDocument()
  })

  it('surfaces a conflict banner and stops autosave when a newer external document arrives during local edits', async () => {
    const latestDocument = makeDocument('외부 최신 내용', {
      updatedAt: '2026-04-21T00:00:02.000Z',
    })
    mockLoadDocumentBlueprint
      .mockResolvedValueOnce(makeDocument('기존 내용'))
      .mockResolvedValueOnce(latestDocument)

    render(<DocumentEditor documentId="doc-1" onBack={vi.fn()} />)

    await screen.findByText('테스트 문서')
    await flushEditorRemoteValueGuard()

    act(() => {
      screen.getByTestId('paper-plate-editor').click()
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, {
        detail: {
          projectId: 'project-1',
          documentId: 'doc-1',
          action: 'saved',
          updatedAt: latestDocument.updatedAt,
        },
      }))
    })

    await screen.findByText('다른 탭에서 이 문서가 먼저 저장되었습니다.')
    expect(screen.getByText('충돌')).toBeInTheDocument()

    vi.useFakeTimers()
    try {
      await act(async () => {
        vi.advanceTimersByTime(2_000)
        await Promise.resolve()
        await Promise.resolve()
      })
    } finally {
      vi.useRealTimers()
    }

    expect(mockSaveDocumentBlueprint).not.toHaveBeenCalled()
  })
})
