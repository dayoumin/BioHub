import { act, render, screen, waitFor } from '@testing-library/react'
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
  mockRouterPush,
  mockSerialize,
  mockDeserialize,
  mockSetValue,
  mockLoadBioToolHistory,
  mockLoadGeneticsHistory,
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
  mockRouterPush: vi.fn(),
  mockSerialize: vi.fn(() => 'serialized editor content'),
  mockDeserialize: vi.fn(() => [{ type: 'p', children: [{ text: 'loaded nodes' }] }]),
  mockSetValue: vi.fn(),
  mockLoadBioToolHistory: vi.fn<() => BioToolHistoryEntry[]>(() => []),
  mockLoadGeneticsHistory: vi.fn<() => GeneticsHistoryEntry[]>(() => []),
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
  default: ({ onChange }: { onChange: () => void }) => (
    <button type="button" data-testid="paper-plate-editor" onClick={onChange}>
      editor
    </button>
  ),
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
  default: ({ citations }: { citations: Array<{ id: string }> }) => (
    <div data-testid="material-palette">Citations: {citations.length}</div>
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
  reassembleDocument: (document: DocumentBlueprint, _sources: AssemblerDataSources) =>
    mockReassembleDocument(document),
}))

vi.mock('@/lib/research/document-writing-orchestrator', () => ({
  ensureDocumentWriting: (documentId: string) => mockEnsureDocumentWriting(documentId),
  retryDocumentWriting: (documentId: string) => mockRetryDocumentWriting(documentId),
}))

vi.mock('@/lib/research/project-storage', () => ({
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
  listProjectEntityRefs: () => mockListProjectEntityRefs(),
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
  loadAnalysisHistory: () => [],
  loadGeneticsHistory: () => mockLoadGeneticsHistory(),
}))

vi.mock('@/lib/bio-tools/bio-tool-history', () => ({
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

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
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
    mockRouterPush.mockReset()
    mockSerialize.mockClear()
    mockDeserialize.mockClear()
    mockSetValue.mockClear()
    mockLoadBioToolHistory.mockReset()
    mockLoadGeneticsHistory.mockReset()

    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('이전 내용'))
    mockListCitationsByProject.mockResolvedValue([])
    mockListProjectEntityRefs.mockReturnValue([])
    mockListGraphProjects.mockReturnValue([])
    mockLoadBioToolHistory.mockReturnValue([])
    mockLoadGeneticsHistory.mockReturnValue([])
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
      ],
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
    await user.click(screen.getByTestId('paper-plate-editor'))

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls[0]?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.generatedBy).toBe('user')
    expect(savedDocument.writingState?.sectionStates.results?.status).toBe('skipped')
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
      ],
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

    expect(await screen.findByText('이 섹션은 자동으로 작성 중입니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '자동 작성 중단' }))

    await waitFor(() => {
      expect(mockSaveDocumentBlueprint).toHaveBeenCalled()
    })

    const savedDocument = mockSaveDocumentBlueprint.mock.calls[0]?.[0] as DocumentBlueprint
    expect(savedDocument.sections[0]?.generatedBy).toBe('user')
    expect(savedDocument.writingState?.sectionStates.results?.status).toBe('skipped')
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
