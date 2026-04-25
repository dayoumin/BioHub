import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import MaterialPalette from '@/components/papers/MaterialPalette'
import type { CitationRecord } from '@/lib/research/citation-types'
import type { DocumentSectionSupportRole } from '@/lib/research/document-support-asset-types'

const { GRAPH_PROJECTS_CHANGED_EVENT } = vi.hoisted(() => ({
  GRAPH_PROJECTS_CHANGED_EVENT: 'graph-studio-projects-changed',
}))

const { RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT } = vi.hoisted(() => ({
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT: 'research-project-entity-refs-changed',
}))

const mockAnalysisHistory: Array<{
  id: string
  name: string
  method?: { name: string } | null
}> = []

let mockEntityRefs: Array<{ entityKind: 'analysis' | 'figure'; entityId: string }> = []
let mockGraphProjects: Array<{
  id: string
  name: string
  chartSpec: { chartType: string }
}> = []

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({
    analysisHistory: mockAnalysisHistory,
  }),
}))

vi.mock('@/lib/research/project-storage', () => ({
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
  listProjectEntityRefs: () => mockEntityRefs,
}))

vi.mock('@/lib/graph-studio/project-storage', () => ({
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects: () => mockGraphProjects,
}))

describe('MaterialPalette', () => {
  beforeEach(() => {
    mockAnalysisHistory.length = 0
    mockEntityRefs = []
    mockGraphProjects = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refreshes figure list when graph project save event fires', () => {
    mockEntityRefs = [
      { entityKind: 'figure', entityId: 'graph-1' },
    ]

    const onInsertAnalysis = vi.fn()
    const onInsertFigure = vi.fn()
    const onDeleteCitation = vi.fn()

    render(
      <MaterialPalette
        projectId="project-1"
        documentId="doc-1"
        activeSectionId="discussion"
        activeSectionTitle="고찰"
        onInsertAnalysis={onInsertAnalysis}
        onInsertFigure={onInsertFigure}
        citations={[]}
        onDeleteCitation={onDeleteCitation}
        onAttachCitationToSection={vi.fn()}
        onDetachCitationFromSection={vi.fn()}
        onInsertInlineCitation={vi.fn()}
        attachedCitationRoleCounts={new Map()}
      />,
    )

    expect(screen.queryByText('생존 곡선')).not.toBeInTheDocument()

    mockGraphProjects = [
      {
        id: 'graph-1',
        name: '생존 곡선',
        chartSpec: { chartType: 'km-curve' },
      },
    ]

    act(() => {
      window.dispatchEvent(new CustomEvent(GRAPH_PROJECTS_CHANGED_EVENT, {
        detail: { projectIds: ['graph-1'] },
      }))
    })

    expect(screen.getByText('생존 곡선')).toBeInTheDocument()
    expect(screen.getByText('km-curve')).toBeInTheDocument()
  })

  it('ignores unrelated graph project change events', () => {
    mockEntityRefs = [
      { entityKind: 'figure', entityId: 'graph-1' },
    ]

    render(
      <MaterialPalette
        projectId="project-1"
        documentId="doc-1"
        activeSectionId="discussion"
        activeSectionTitle="고찰"
        onInsertAnalysis={vi.fn()}
        onInsertFigure={vi.fn()}
        citations={[]}
        onDeleteCitation={vi.fn()}
        onAttachCitationToSection={vi.fn()}
        onDetachCitationFromSection={vi.fn()}
        onInsertInlineCitation={vi.fn()}
        attachedCitationRoleCounts={new Map()}
      />,
    )

    mockGraphProjects = [
      {
        id: 'graph-1',
        name: '생존 곡선',
        chartSpec: { chartType: 'km-curve' },
      },
    ]

    act(() => {
      window.dispatchEvent(new CustomEvent(GRAPH_PROJECTS_CHANGED_EVENT, {
        detail: { projectIds: ['other-graph'] },
      }))
    })

    expect(screen.queryByText('생존 곡선')).not.toBeInTheDocument()
  })

  it('builds literature search links with document and section context and attaches citations', async () => {
    const user = userEvent.setup()
    const citation: CitationRecord = {
      id: 'cit_1',
      projectId: 'project-1',
      addedAt: '2026-04-24T00:00:00.000Z',
      item: {
        id: 'lit_1',
        source: 'openalex',
        title: 'Marine Ecology Review',
        authors: ['Kim A'],
        year: 2025,
        url: 'https://example.com/paper',
        searchedName: 'test',
      },
    }
    const onAttachCitationToSection = vi.fn()
    const onInsertInlineCitation = vi.fn()

    render(
      <MaterialPalette
        projectId="project-1"
        documentId="doc-1"
        activeSectionId="discussion"
        activeSectionTitle="고찰"
        onInsertAnalysis={vi.fn()}
        onInsertFigure={vi.fn()}
        citations={[citation]}
        onDeleteCitation={vi.fn()}
        onAttachCitationToSection={onAttachCitationToSection}
        onDetachCitationFromSection={vi.fn()}
        onInsertInlineCitation={onInsertInlineCitation}
        attachedCitationRoleCounts={new Map()}
      />,
    )

    const pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => undefined)
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

    await user.click(screen.getByRole('button', { name: /더 추가/i }))

    const [, , url] = pushStateSpy.mock.calls[0] as [unknown, string, string]
    expect(url).toContain('tab=literature')
    expect(url).toContain('project=project-1')
    expect(url).toContain('documentId=doc-1')
    expect(url).toContain('sectionId=discussion')
    expect(url).toContain('sectionTitle=%EA%B3%A0%EC%B0%B0')
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(PopStateEvent))

    await user.click(screen.getByRole('button', { name: '비교' }))
    await user.click(screen.getByRole('button', { name: '비교 근거로 연결' }))
    await user.click(screen.getByRole('button', { name: '본문 인용 삽입' }))

    expect(onAttachCitationToSection).toHaveBeenCalledWith(citation, 'comparison')
    expect(onInsertInlineCitation).toHaveBeenCalledWith(citation, 'comparison')
  })

  it('shows role-specific attached state without blocking other roles', async () => {
    const user = userEvent.setup()
    const citation: CitationRecord = {
      id: 'cit_1',
      projectId: 'project-1',
      addedAt: '2026-04-24T00:00:00.000Z',
      item: {
        id: 'lit_1',
        source: 'openalex',
        title: 'Marine Ecology Review',
        authors: ['Kim A'],
        year: 2025,
        url: 'https://example.com/paper',
        searchedName: 'test',
      },
    }
    const onAttachCitationToSection = vi.fn()

    render(
      <MaterialPalette
        projectId="project-1"
        documentId="doc-1"
        activeSectionId="discussion"
        activeSectionTitle="고찰"
        onInsertAnalysis={vi.fn()}
        onInsertFigure={vi.fn()}
        citations={[citation]}
        onDeleteCitation={vi.fn()}
        onAttachCitationToSection={onAttachCitationToSection}
        onDetachCitationFromSection={vi.fn()}
        onInsertInlineCitation={vi.fn()}
        attachedCitationRoleCounts={new Map<string, Map<DocumentSectionSupportRole, number>>([
          ['cit_1', new Map<DocumentSectionSupportRole, number>([['comparison', 1]])],
        ])}
      />,
    )

    expect(screen.getByRole('button', { name: '비교 근거로 연결됨' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '해석' }))
    expect(screen.getByRole('button', { name: '해석 근거로 연결' })).not.toBeDisabled()
  })

  it('shows per-role attachment counts and detaches from the active section before deleting the citation', async () => {
    const user = userEvent.setup()
    const citation: CitationRecord = {
      id: 'cit_1',
      projectId: 'project-1',
      addedAt: '2026-04-24T00:00:00.000Z',
      item: {
        id: 'lit_1',
        source: 'openalex',
        title: 'Marine Ecology Review',
        authors: ['Kim A'],
        year: 2025,
        url: 'https://example.com/paper',
        searchedName: 'test',
      },
    }
    const onDeleteCitation = vi.fn()
    const onDetachCitationFromSection = vi.fn()

    render(
      <MaterialPalette
        projectId="project-1"
        documentId="doc-1"
        activeSectionId="discussion"
        activeSectionTitle="고찰"
        onInsertAnalysis={vi.fn()}
        onInsertFigure={vi.fn()}
        citations={[citation]}
        onDeleteCitation={onDeleteCitation}
        onAttachCitationToSection={vi.fn()}
        onDetachCitationFromSection={onDetachCitationFromSection}
        onInsertInlineCitation={vi.fn()}
        attachedCitationRoleCounts={new Map<string, Map<DocumentSectionSupportRole, number>>([
          ['cit_1', new Map<DocumentSectionSupportRole, number>([['comparison', 2]])],
        ])}
      />,
    )

    expect(screen.getByRole('button', { name: '비교 근거로 연결됨 (2)' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '비교 근거 해제' }))

    expect(onDetachCitationFromSection).toHaveBeenCalledWith(citation, 'comparison')
    expect(onDeleteCitation).not.toHaveBeenCalled()
  })
})
