import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PackageBuilder from '@/components/papers/PackageBuilder'
import type { PaperPackage } from '@/lib/research/paper-package-types'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'

const {
  mockLoadPackage,
  mockSavePackage,
  mockGetAllHistory,
  mockListProjects,
  mockListProjectEntityRefs,
  mockGenerateFigurePatternSummary,
  refsChangedEvent,
} = vi.hoisted(() => ({
  mockLoadPackage: vi.fn<() => Promise<PaperPackage | null>>(),
  mockSavePackage: vi.fn(async (_pkg: PaperPackage) => undefined),
  mockGetAllHistory: vi.fn<() => Promise<HistoryRecord[]>>(),
  mockListProjects: vi.fn<() => GraphProject[]>(),
  mockListProjectEntityRefs: vi.fn(),
  mockGenerateFigurePatternSummary: vi.fn(() => 'generated summary'),
  refsChangedEvent: 'research-project-entity-refs-changed',
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/papers/PackagePreview', () => ({
  default: () => <div data-testid="package-preview" />,
}))

vi.mock('@/lib/research/paper-package-storage', () => ({
  loadPackage: (_packageId: string) => mockLoadPackage(),
  savePackage: (pkg: PaperPackage) => mockSavePackage(pkg),
}))

vi.mock('@/lib/research/paper-package-assembler', () => ({
  assemblePaperPackage: vi.fn(() => ({ markdown: '# Preview', tokenEstimate: 10, warnings: [] })),
  generateFigurePatternSummary: () => mockGenerateFigurePatternSummary(),
}))

vi.mock('@/lib/research/project-storage', () => ({
  listProjectEntityRefs: (projectId: string) => mockListProjectEntityRefs(projectId),
  loadResearchProject: vi.fn(() => null),
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT: refsChangedEvent,
}))

vi.mock('@/lib/graph-studio/project-storage', () => ({
  GRAPH_PROJECTS_CHANGED_EVENT: 'graph-studio-projects-changed',
  listProjects: () => mockListProjects(),
}))

vi.mock('@/lib/utils/storage', () => ({
  getAllHistory: () => mockGetAllHistory(),
}))

function createPackage(overrides: Partial<PaperPackage> = {}): PaperPackage {
  return {
    id: 'pkg-1',
    projectId: 'project-1',
    version: 1,
    overview: {
      title: '패키지 테스트',
      purpose: 'refresh 보존 검증',
      dataDescription: '설명',
    },
    items: [],
    references: [],
    journal: {
      id: 'kjfs',
      name: '한국수산과학회지',
      style: 'kjfs',
      sections: ['서론', '재료 및 방법', '결과', '고찰', '참고문헌'],
      language: 'ko',
      referenceFormat: '',
      referenceExample: '',
    },
    context: {},
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
    ...overrides,
  }
}

function createHistoryRecord(id: string, name: string): HistoryRecord {
  return {
    id,
    timestamp: Date.now(),
    name,
    projectId: 'project-1',
    purpose: '분석',
    method: {
      id: 't-test',
      name: 'T-Test',
      category: 't-test',
    },
    dataFileName: 'data.csv',
    dataRowCount: 12,
    results: { pValue: 0.01 },
  }
}

function createGraphProject(id: string, analysisId?: string): GraphProject {
  return {
    id,
    name: `graph-${id}`,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
    spec: {
      version: '1.0',
      chartType: 'scatter',
      data: { sourceId: 'pkg', columns: [] },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 144 },
    },
    dataPackageId: 'dp-1',
    analysisId,
  } as unknown as GraphProject
}

async function openStep2(): Promise<void> {
  await screen.findByText('AI 패키지 조립')
  fireEvent.click(screen.getByRole('button', { name: '2' }))
}

describe('PackageBuilder refresh preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves user edits when Step 2 refresh recollects linked sources', async () => {
    mockLoadPackage.mockResolvedValue(createPackage({
      items: [
        {
          id: 'item-analysis-1',
          type: 'analysis',
          sourceId: 'analysis-1',
          analysisIds: ['ANAL-01'],
          label: 'Custom Table Label',
          section: 'results',
          order: 0,
          included: false,
        },
        {
          id: 'item-figure-1',
          type: 'figure',
          sourceId: 'figure-1',
          analysisIds: ['analysis-1'],
          label: 'Custom Figure Label',
          section: 'results',
          order: 1,
          included: true,
          patternSummary: 'custom handwritten summary',
        },
      ],
    }))

    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-1' },
      { entityKind: 'figure', entityId: 'figure-1' },
    ])
    mockGetAllHistory.mockResolvedValue([createHistoryRecord('analysis-1', 'Latest analysis')])
    mockListProjects.mockReturnValue([createGraphProject('figure-1', 'analysis-1')])
    mockGenerateFigurePatternSummary.mockReturnValue('fresh generated summary')

    render(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await screen.findByDisplayValue('Custom Table Label')
    expect(screen.getByDisplayValue('Custom Figure Label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('custom handwritten summary')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked()

    act(() => {
      window.dispatchEvent(new Event(refsChangedEvent))
    })

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalled()
    })

    expect(screen.getByDisplayValue('Custom Table Label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Custom Figure Label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('custom handwritten summary')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('fresh generated summary')).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked()
  })

  it('keeps an existing item when its source is still referenced but temporarily unavailable during refresh', async () => {
    mockLoadPackage.mockResolvedValue(createPackage({
      items: [
        {
          id: 'item-analysis-missing',
          type: 'analysis',
          sourceId: 'analysis-2',
          analysisIds: ['ANAL-02'],
          label: 'Keep Me',
          section: 'results',
          order: 0,
          included: true,
        },
      ],
    }))

    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-2' },
    ])
    mockGetAllHistory.mockResolvedValue([])
    mockListProjects.mockReturnValue([])

    render(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await screen.findByDisplayValue('Keep Me')

    act(() => {
      window.dispatchEvent(new Event(refsChangedEvent))
    })

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalled()
    })

    expect(screen.getByDisplayValue('Keep Me')).toBeInTheDocument()
  })
})
