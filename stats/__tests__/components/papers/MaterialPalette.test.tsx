import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import MaterialPalette from '@/components/papers/MaterialPalette'

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
        onInsertAnalysis={onInsertAnalysis}
        onInsertFigure={onInsertFigure}
        citations={[]}
        onDeleteCitation={onDeleteCitation}
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
        onInsertAnalysis={vi.fn()}
        onInsertFigure={vi.fn()}
        citations={[]}
        onDeleteCitation={vi.fn()}
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
})
