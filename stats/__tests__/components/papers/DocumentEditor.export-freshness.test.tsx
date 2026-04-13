import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentEditor from '@/components/papers/DocumentEditor'
import type { DocumentBlueprint } from '@/lib/research/document-blueprint-types'
import type { AssemblerDataSources } from '@/lib/research/document-assembler'

const {
  mockDocumentToDocx,
  mockSaveDocumentBlueprint,
  mockLoadDocumentBlueprint,
  mockReassembleDocument,
  mockSerialize,
  mockDeserialize,
  mockSetValue,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} = vi.hoisted(() => ({
  mockDocumentToDocx: vi.fn(async (_doc: DocumentBlueprint) => undefined),
  mockSaveDocumentBlueprint: vi.fn(async (_doc: DocumentBlueprint) => undefined),
  mockLoadDocumentBlueprint: vi.fn<() => Promise<DocumentBlueprint | null>>(),
  mockReassembleDocument: vi.fn<(doc: DocumentBlueprint) => DocumentBlueprint>(),
  mockSerialize: vi.fn(() => 'serialized editor content'),
  mockDeserialize: vi.fn(() => [{ type: 'p', children: [{ text: 'loaded nodes' }] }]),
  mockSetValue: vi.fn(),
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
  default: () => <div data-testid="paper-plate-editor" />,
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
  default: () => <div data-testid="material-palette" />,
}))

vi.mock('@/lib/research/document-blueprint-storage', () => ({
  loadDocumentBlueprint: (_documentId: string) => mockLoadDocumentBlueprint(),
  saveDocumentBlueprint: (document: DocumentBlueprint) => mockSaveDocumentBlueprint(document),
}))

vi.mock('@/lib/research/document-assembler', () => ({
  reassembleDocument: (document: DocumentBlueprint, _sources: AssemblerDataSources) =>
    mockReassembleDocument(document),
}))

vi.mock('@/lib/research/project-storage', () => ({
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
  listProjectEntityRefs: () => [],
}))

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({
    analysisHistory: [],
  }),
}))

vi.mock('@/lib/graph-studio/project-storage', () => ({
  GRAPH_PROJECTS_CHANGED_EVENT: 'graph-studio-projects-changed',
  listProjects: () => [],
}))

vi.mock('@/lib/genetics/analysis-history', () => ({
  loadAnalysisHistory: () => [],
}))

vi.mock('@/lib/research/citation-storage', () => ({
  listCitationsByProject: vi.fn(async () => []),
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

function makeDocument(content: string): DocumentBlueprint {
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
    sections: [
      {
        id: 'results',
        title: '결과',
        content,
        sourceRefs: ['analysis-1'],
        editable: true,
        generatedBy: 'user',
      },
    ],
  }
}

describe('DocumentEditor export freshness', () => {
  beforeEach(() => {
    mockDocumentToDocx.mockClear()
    mockSaveDocumentBlueprint.mockClear()
    mockLoadDocumentBlueprint.mockReset()
    mockReassembleDocument.mockReset()
    mockSerialize.mockClear()
    mockDeserialize.mockClear()
    mockSetValue.mockClear()

    mockLoadDocumentBlueprint.mockResolvedValue(makeDocument('이전 내용'))
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
})
