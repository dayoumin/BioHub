import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'

const {
  mockListProjectEntityRefs,
  mockGetAllHistory,
  mockListGraphProjects,
  mockLoadDocumentBlueprint,
  mockSaveDocumentBlueprint,
  mockRetryDocumentWriting,
} = vi.hoisted(() => ({
  mockListProjectEntityRefs: vi.fn(),
  mockGetAllHistory: vi.fn(),
  mockListGraphProjects: vi.fn(),
  mockLoadDocumentBlueprint: vi.fn(),
  mockSaveDocumentBlueprint: vi.fn(),
  mockRetryDocumentWriting: vi.fn(),
}))

vi.mock('../project-storage', () => ({
  listProjectEntityRefs: (projectId: string) => mockListProjectEntityRefs(projectId),
}))

vi.mock('@/lib/utils/storage', () => ({
  getAllHistory: () => mockGetAllHistory(),
}))

vi.mock('@/lib/graph-studio', () => ({
  listProjects: () => mockListGraphProjects(),
}))

vi.mock('../document-blueprint-storage', () => ({
  loadDocumentBlueprint: (documentId: string) => mockLoadDocumentBlueprint(documentId),
  saveDocumentBlueprint: (blueprint: DocumentBlueprint) => mockSaveDocumentBlueprint(blueprint),
}))

vi.mock('../document-writing-orchestrator', () => ({
  retryDocumentWriting: (documentId: string) => mockRetryDocumentWriting(documentId),
}))

import { createDocumentWritingSession, startWritingSession } from '../document-writing-session'

describe('createDocumentWritingSession', () => {
  beforeEach(() => {
    mockListProjectEntityRefs.mockReset()
    mockGetAllHistory.mockReset()
    mockListGraphProjects.mockReset()
    mockLoadDocumentBlueprint.mockReset()
    mockSaveDocumentBlueprint.mockReset()
    mockRetryDocumentWriting.mockReset()

    mockListProjectEntityRefs.mockReturnValue([
      {
        projectId: 'proj_1',
        entityKind: 'analysis',
        entityId: 'analysis_1',
        label: '일원분산분석',
        provenanceEdges: [],
      },
      {
        projectId: 'proj_1',
        entityKind: 'analysis',
        entityId: 'analysis_2',
        label: '상관분석',
        provenanceEdges: [],
      },
      {
        projectId: 'proj_1',
        entityKind: 'figure',
        entityId: 'figure_1',
        label: 'Figure A',
        provenanceEdges: [{ targetKind: 'analysis', targetId: 'analysis_1', role: 'uses' }],
      },
      {
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_1',
        label: 'Shannon diversity — sample.csv',
        provenanceEdges: [],
      },
      {
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'shared_1',
        label: 'Shared bio result',
        provenanceEdges: [],
      },
      {
        projectId: 'proj_1',
        entityKind: 'protein-result',
        entityId: 'shared_1',
        label: 'Shared protein result',
        provenanceEdges: [],
      },
    ])
    mockGetAllHistory.mockResolvedValue([
      { id: 'analysis_1', name: 'ANOVA', method: { name: 'ANOVA' } },
      { id: 'analysis_2', name: 'Correlation', method: { name: 'Correlation' } },
    ])
    mockListGraphProjects.mockReturnValue([
      {
        id: 'figure_1',
        name: 'Treatment comparison',
        chartSpec: { chartType: 'bar' },
        sourceRefs: [{ kind: 'analysis', sourceId: 'analysis_1', label: 'ANOVA' }],
      },
    ])
    mockSaveDocumentBlueprint.mockImplementation(async (blueprint: DocumentBlueprint) => blueprint)
    mockLoadDocumentBlueprint.mockResolvedValue(null)
    mockRetryDocumentWriting.mockResolvedValue(null)
  })

  it('creates an idle blank document for manual blank mode', async () => {
    const result = await startWritingSession({
      mode: 'manual-blank',
      projectId: 'proj_1',
      title: '빈 문서',
    })

    expect(result.title).toBe('빈 문서')
    expect(result.writingState?.status).toBe('idle')
    expect(result.sections.some((section) => (section.sourceRefs?.length ?? 0) > 0)).toBe(false)
  })

  it('uses custom section blueprints for manual blank mode', async () => {
    const result = await startWritingSession({
      mode: 'manual-blank',
      projectId: 'proj_1',
      title: '커스텀 문서',
      metadata: {
        sectionBlueprints: [
          { id: 'introduction', title: '서론', generatedBy: 'user' },
          { id: 'literature-review', title: '문헌 동향', generatedBy: 'user' },
          { id: 'results', title: '결과', generatedBy: 'template' },
          { id: 'conclusion', title: '결론', generatedBy: 'user' },
        ],
      },
    })

    expect(result.sections.map((section) => section.id)).toEqual([
      'introduction',
      'literature-review',
      'results',
      'conclusion',
    ])
    expect(result.metadata.sectionBlueprints).toHaveLength(4)
  })

  it('attaches initial section support bindings without starting drafting for manual blank mode', async () => {
    const result = await startWritingSession({
      mode: 'manual-blank',
      projectId: 'proj_1',
      title: '문헌 메모 문서',
      initialSectionSupportBindings: {
        introduction: [{
          sourceKind: 'citation-record',
          sourceId: 'cit_1',
          role: 'background',
          summary: '배경 문헌',
        }],
        discussion: [{
          sourceKind: 'deep-research-note',
          sourceId: 'note_1',
          role: 'interpretation',
          summary: '해석 메모',
          citationIds: ['cit_1'],
        }],
      },
    })

    expect(result.writingState?.status).toBe('idle')
    expect(result.writingState?.sectionStates).toEqual({})
    expect(result.sections.find((section) => section.id === 'introduction')?.sectionSupportBindings).toEqual([{
      id: expect.any(String),
      sourceKind: 'citation-record',
      sourceId: 'cit_1',
      role: 'background',
      summary: '배경 문헌',
      included: true,
      origin: 'user',
    }])
    expect(result.sections.find((section) => section.id === 'discussion')?.sectionSupportBindings).toEqual([{
      id: expect.any(String),
      sourceKind: 'deep-research-note',
      sourceId: 'note_1',
      role: 'interpretation',
      summary: '해석 메모',
      citationIds: ['cit_1'],
      included: true,
      origin: 'user',
    }])
  })

  it('creates a blank paper document with selected source bindings', async () => {
    const result = await createDocumentWritingSession({
      projectId: 'proj_1',
      title: '결과 문서',
      sourceEntityIds: {
        analysisIds: ['analysis_1'],
        figureIds: ['figure_1'],
      },
    })

    expect(mockSaveDocumentBlueprint).toHaveBeenCalledTimes(1)
    expect(result.title).toBe('결과 문서')
    expect(result.sections.map((section) => section.id)).toEqual([
      'introduction',
      'methods',
      'results',
      'discussion',
      'references',
    ])

    const methodsSection = result.sections.find((section) => section.id === 'methods')
    const resultsSection = result.sections.find((section) => section.id === 'results')

    expect(methodsSection?.content).toBe('')
    expect(methodsSection?.sourceRefs).toEqual([
      { kind: 'analysis', sourceId: 'analysis_1', label: 'ANOVA' },
    ])
    expect(resultsSection?.content).toBe('')
    expect(resultsSection?.sourceRefs).toEqual([
      { kind: 'analysis', sourceId: 'analysis_1', label: 'ANOVA' },
      { kind: 'figure', sourceId: 'figure_1', label: 'Treatment comparison' },
    ])
    expect(resultsSection?.figures).toEqual([
      {
        entityId: 'figure_1',
        label: 'Figure 1',
        caption: 'Treatment comparison (bar)',
        chartType: 'bar',
        relatedAnalysisId: 'analysis_1',
        relatedAnalysisLabel: 'ANOVA',
        patternSummary: undefined,
      },
    ])
  })

  it('marks the document as collecting and section drafting immediately', async () => {
    const result = await createDocumentWritingSession({
      projectId: 'proj_1',
      title: '그래프 문서',
    })

    expect(result.writingState?.status).toBe('collecting')
    expect(result.writingState?.jobId).toBeTruthy()
    expect(result.writingState?.startedAt).toBeTruthy()
    expect(result.writingState?.sectionStates.methods?.status).toBe('drafting')
    expect(result.writingState?.sectionStates.results?.status).toBe('drafting')
  })

  it('infers analysis bindings from selected figures when no analysis ids are passed', async () => {
    const result = await createDocumentWritingSession({
      projectId: 'proj_1',
      title: '그래프 문서',
      sourceEntityIds: {
        figureIds: ['figure_1'],
      },
    })

    const methodsSection = result.sections.find((section) => section.id === 'methods')
    const resultsSection = result.sections.find((section) => section.id === 'results')

    expect(methodsSection?.sourceRefs).toEqual([
      { kind: 'analysis', sourceId: 'analysis_1', label: 'ANOVA' },
    ])
    expect(resultsSection?.sourceRefs).toEqual([
      { kind: 'analysis', sourceId: 'analysis_1', label: 'ANOVA' },
      { kind: 'figure', sourceId: 'figure_1', label: 'Treatment comparison' },
    ])
  })

  it('binds supplementary entity refs into the results section when explicit entity ids are passed', async () => {
    const result = await createDocumentWritingSession({
      projectId: 'proj_1',
      title: '보조 결과 문서',
      sourceEntityIds: {
        entityIds: ['bio_1'],
      },
    })

    const methodsSection = result.sections.find((section) => section.id === 'methods')
    const resultsSection = result.sections.find((section) => section.id === 'results')

    expect(methodsSection?.sourceRefs).toEqual([])
    expect(resultsSection?.sourceRefs).toEqual([
      { kind: 'supplementary', sourceId: 'bio_1', label: 'Shannon diversity — sample.csv' },
    ])
  })

  it('rejects ambiguous supplementary entity ids instead of binding multiple kinds', async () => {
    await expect(createDocumentWritingSession({
      projectId: 'proj_1',
      title: '보조 결과 문서',
      sourceEntityIds: {
        entityIds: ['shared_1'],
      },
    })).rejects.toThrow('선택한 결과를 문서 초안 자료로 연결하지 못했습니다.')
  })

  it('retries an existing document when retry mode is requested', async () => {
    const existingDocument: DocumentBlueprint = {
      id: 'doc_retry',
      projectId: 'proj_1',
      preset: 'paper',
      title: '재시도 문서',
      language: 'ko',
      sections: [],
      metadata: {},
      writingState: {
        status: 'failed',
        sectionStates: {},
      },
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    }

    mockLoadDocumentBlueprint.mockResolvedValue(existingDocument)
    mockRetryDocumentWriting.mockResolvedValue({
      ...existingDocument,
      writingState: {
        status: 'collecting',
        jobId: 'job_retry',
        sectionStates: {},
      },
    })

    const result = await startWritingSession({
      mode: 'retry',
      documentId: 'doc_retry',
    })

    expect(mockRetryDocumentWriting).toHaveBeenCalledWith('doc_retry')
    expect(result.writingState?.status).toBe('collecting')
  })

  it('throws when selected sources cannot be bound into the document', async () => {
    mockListGraphProjects.mockReturnValue([])

    await expect(createDocumentWritingSession({
      projectId: 'proj_1',
      title: '빈 문서',
      sourceEntityIds: {
        figureIds: ['figure_1'],
      },
    })).rejects.toThrow('선택한 결과를 문서 초안 자료로 연결하지 못했습니다.')
  })
})
