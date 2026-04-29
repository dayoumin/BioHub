import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PackageBuilder from '@/components/papers/PackageBuilder'
import type { PaperPackage } from '@/lib/research/paper-package-types'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import { renderWithAppPreferences } from '@/test-utils/render-with-app-preferences'

const {
  mockLoadPackage,
  mockSavePackage,
  mockGetAllHistory,
  mockListProjects,
  mockListProjectEntityRefs,
  mockGenerateFigurePatternSummary,
  refsChangedEvent,
  graphProjectsChangedEvent,
  paperPackagesChangedEvent,
} = vi.hoisted(() => ({
  mockLoadPackage: vi.fn<() => Promise<PaperPackage | null>>(),
  mockSavePackage: vi.fn<(pkg: PaperPackage) => Promise<PaperPackage>>(async (pkg: PaperPackage) => pkg),
  mockGetAllHistory: vi.fn<() => Promise<HistoryRecord[]>>(),
  mockListProjects: vi.fn<() => GraphProject[]>(),
  mockListProjectEntityRefs: vi.fn(),
  mockGenerateFigurePatternSummary: vi.fn<() => string | undefined>(() => 'generated summary'),
  refsChangedEvent: 'research-project-entity-refs-changed',
  graphProjectsChangedEvent: 'graph-studio-projects-changed',
  paperPackagesChangedEvent: 'paper-packages-changed',
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
  PAPER_PACKAGES_CHANGED_EVENT: paperPackagesChangedEvent,
  PaperPackageConflictError: class PaperPackageConflictError extends Error {
    latestPackage: PaperPackage | null

    constructor(latestPackage: PaperPackage | null = null) {
      super('conflict')
      this.latestPackage = latestPackage
    }
  },
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
  GRAPH_PROJECTS_CHANGED_EVENT: graphProjectsChangedEvent,
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

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function openStep2(): Promise<void> {
  await screen.findByText('외부 AI 입력 패키지 조립')
  fireEvent.click(screen.getByRole('button', { name: '2' }))
}

describe('PackageBuilder refresh preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows figure pattern summaries as readonly generated fields and refreshes them while preserving user ordering and labels', async () => {
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

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await screen.findByDisplayValue('Custom Table Label')
    expect(screen.getByDisplayValue('Custom Figure Label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('fresh generated summary')).toBeInTheDocument()
    expect(screen.getByText('📊 분석 결과 기반 자동 생성')).toBeInTheDocument()
    expect(screen.getByLabelText('그래프 패턴 요약 (자동 생성)')).toHaveAttribute('readonly')
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked()
    const sourceLinks = screen.getAllByRole('link', { name: '원본 열기' })
    expect(sourceLinks).toHaveLength(2)
    expect(sourceLinks[0]).toHaveAttribute('href', '/?history=analysis-1')
    expect(sourceLinks[1]).toHaveAttribute('href', '/graph-studio?project=figure-1')
    expect(screen.getAllByRole('link', { name: 'ANAL-01' })[0]).toHaveAttribute('href', '/?history=analysis-1')

    act(() => {
      window.dispatchEvent(new Event(refsChangedEvent))
    })

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalled()
    })

    expect(screen.getByDisplayValue('Custom Table Label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Custom Figure Label')).toBeInTheDocument()
    expect(screen.getByDisplayValue('fresh generated summary')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked()
    expect(screen.getAllByRole('link', { name: 'ANAL-01' })[0]).toHaveAttribute('href', '/?history=analysis-1')
  })

  it('relinks figure lineage to the latest canonical analysis id and clears stale summaries before save', async () => {
    mockSavePackage.mockImplementation(async (pkg: PaperPackage) => pkg)
    mockLoadPackage.mockResolvedValue(createPackage({
      items: [
        {
          id: 'item-figure-1',
          type: 'figure',
          sourceId: 'figure-1',
          analysisIds: ['ANAL-01'],
          analysisLinks: [{ sourceId: 'analysis-1', label: 'ANAL-01' }],
          label: 'Figure 1',
          section: 'results',
          order: 0,
          included: true,
          patternSummary: 'stale summary',
        },
      ],
    }))

    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-2' },
      {
        entityKind: 'figure',
        entityId: 'figure-1',
        provenanceEdges: [
          { role: 'derived-from', targetKind: 'analysis', targetId: 'analysis-2', label: 'canonical edge' },
        ],
      },
    ])
    mockGetAllHistory.mockResolvedValue([createHistoryRecord('analysis-2', 'Relinked analysis')])
    mockListProjects.mockReturnValue([createGraphProject('figure-1', 'analysis-1')])
    mockGenerateFigurePatternSummary.mockImplementation(() => undefined)

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await waitFor(() => {
      expect(screen.queryByDisplayValue('stale summary')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    await waitFor(() => {
      expect(mockSavePackage).toHaveBeenCalled()
    })

    const savedPackage = mockSavePackage.mock.calls[mockSavePackage.mock.calls.length - 1]?.[0] as PaperPackage
    const savedFigure = savedPackage.items.find((item) => item.sourceId === 'figure-1')

    expect(savedFigure?.analysisIds).toEqual(['ANAL-01'])
    expect(savedFigure?.analysisLinks).toEqual([{ sourceId: 'analysis-2', label: 'ANAL-01' }])
    expect(savedFigure?.patternSummary).toBeUndefined()
  })

  it('uses graph source snapshots as the next canonical lineage fallback before compat analysisId', async () => {
    mockLoadPackage.mockResolvedValue(createPackage())
    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-2' },
      { entityKind: 'figure', entityId: 'figure-1' },
    ])
    mockGetAllHistory.mockResolvedValue([createHistoryRecord('analysis-2', 'Snapshot analysis')])
    mockListProjects.mockReturnValue([
      {
        ...createGraphProject('figure-1', 'analysis-compat'),
        sourceSnapshot: {
          capturedAt: '2026-04-14T00:00:00.000Z',
          rowCount: 12,
          columns: [],
          sourceRefs: [{ kind: 'analysis', sourceId: 'analysis-2', label: 'Snapshot canonical' }],
        },
      } as GraphProject,
    ])

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await screen.findByDisplayValue('Figure 1')
    expect(screen.getAllByRole('link', { name: 'ANAL-01' }).at(-1)).toHaveAttribute('href', '/?history=analysis-2')
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

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
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

  it('reconciles existing packages once on initial load before any refresh event', async () => {
    mockLoadPackage.mockResolvedValue(createPackage({
      items: [
        {
          id: 'item-figure-1',
          type: 'figure',
          sourceId: 'figure-1',
          analysisIds: ['analysis-1'],
          label: 'Figure 1',
          section: 'results',
          order: 0,
          included: true,
        },
      ],
    }))
    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-1' },
      { entityKind: 'figure', entityId: 'figure-1' },
    ])
    mockGetAllHistory.mockResolvedValue([createHistoryRecord('analysis-1', 'Latest analysis')])
    mockListProjects.mockReturnValue([createGraphProject('figure-1', 'analysis-1')])

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalledTimes(1)
    })
  })

  it('ignores refresh events from unrelated projects', async () => {
    mockLoadPackage.mockResolvedValue(createPackage())
    mockListProjectEntityRefs.mockImplementation((projectId: string) => (
      projectId === 'project-1'
        ? [
            { entityKind: 'analysis', entityId: 'analysis-1' },
            { entityKind: 'figure', entityId: 'figure-1' },
          ]
        : []
    ))
    mockGetAllHistory.mockResolvedValue([createHistoryRecord('analysis-1', 'Latest analysis')])
    mockListProjects.mockReturnValue([createGraphProject('figure-1', 'analysis-1')])

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalledTimes(1)
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(refsChangedEvent, {
        detail: { projectIds: ['other-project'], entityIds: ['analysis-9'] },
      }))
      window.dispatchEvent(new CustomEvent(graphProjectsChangedEvent, {
        detail: { projectIds: ['figure-9'] },
      }))
    })

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalledTimes(1)
    })
  })

  it('ignores an older recollection response when a newer refresh finishes first', async () => {
    const firstHistoryLoad = createDeferred<HistoryRecord[]>()

    mockLoadPackage.mockResolvedValue(createPackage({
      items: [
        {
          id: 'item-figure-1',
          type: 'figure',
          sourceId: 'figure-1',
          analysisIds: ['ANAL-01'],
          label: 'Figure 1',
          section: 'results',
          order: 0,
          included: true,
          patternSummary: 'stale summary',
        },
      ],
    }))
    mockListProjectEntityRefs.mockReturnValue([
      { entityKind: 'analysis', entityId: 'analysis-1' },
      { entityKind: 'figure', entityId: 'figure-1' },
    ])
    mockListProjects.mockReturnValue([createGraphProject('figure-1', 'analysis-1')])
    mockGenerateFigurePatternSummary
      .mockReturnValueOnce('Latest analysis')
      .mockReturnValueOnce('Older analysis')
    mockGetAllHistory
      .mockImplementationOnce(() => firstHistoryLoad.promise)
      .mockResolvedValueOnce([createHistoryRecord('analysis-1', 'Latest analysis')])

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalledTimes(1)
    })

    act(() => {
      window.dispatchEvent(new Event(refsChangedEvent))
    })

    await waitFor(() => {
      expect(mockGetAllHistory).toHaveBeenCalledTimes(2)
    })
    await screen.findByDisplayValue('Latest analysis')

    await act(async () => {
      firstHistoryLoad.resolve([createHistoryRecord('analysis-1', 'Older analysis')])
      await firstHistoryLoad.promise
    })

    expect(screen.getByDisplayValue('Latest analysis')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Older analysis')).not.toBeInTheDocument()
  })

  it('treats recollected package items as unsaved local changes when a newer package snapshot arrives', async () => {
    mockLoadPackage
      .mockResolvedValueOnce(createPackage({
        items: [
          {
            id: 'item-figure-1',
            type: 'figure',
            sourceId: 'figure-1',
            analysisIds: ['analysis-1'],
            label: 'Figure 1',
            section: 'results',
            order: 0,
            included: true,
          },
        ],
      }))
      .mockResolvedValueOnce(createPackage({
        updatedAt: '2026-04-14T00:00:00.000Z',
        items: [
          {
            id: 'item-figure-1',
            type: 'figure',
            sourceId: 'figure-1',
            analysisIds: ['ANAL-99'],
            label: 'Figure 1',
            section: 'results',
            order: 0,
            included: true,
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

    renderWithAppPreferences(<PackageBuilder packageId="pkg-1" onBack={vi.fn()} />)
    await openStep2()

    await screen.findByDisplayValue('fresh generated summary')

    await act(async () => {
      window.dispatchEvent(new CustomEvent(paperPackagesChangedEvent, {
        detail: { packageIds: ['pkg-1'] },
      }))
      await Promise.resolve()
    })

    await screen.findByText('다른 탭에서 이 패키지가 먼저 변경되었습니다.')
  })
})
