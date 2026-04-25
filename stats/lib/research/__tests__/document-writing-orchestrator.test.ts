import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import type { HistoryRecord } from '@/lib/utils/storage-types'

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const {
  mockLoadDocumentBlueprint,
  mockSaveDocumentBlueprint,
  mockGetAllHistory,
  mockLoadBioToolHistory,
  mockLoadAnalysisHistory,
  mockLoadGeneticsHistory,
  mockListProjectEntityRefs,
  mockGeneratePaperDraft,
  mockConvertToStatisticalResult,
  mockResolveDocumentWriterSettings,
} = vi.hoisted(() => ({
  mockLoadDocumentBlueprint: vi.fn(),
  mockSaveDocumentBlueprint: vi.fn(),
  mockGetAllHistory: vi.fn(),
  mockLoadBioToolHistory: vi.fn(),
  mockLoadAnalysisHistory: vi.fn(),
  mockLoadGeneticsHistory: vi.fn(),
  mockListProjectEntityRefs: vi.fn(),
  mockGeneratePaperDraft: vi.fn(),
  mockConvertToStatisticalResult: vi.fn(),
  mockResolveDocumentWriterSettings: vi.fn(),
}))

vi.mock('../document-blueprint-storage', () => ({
  DocumentBlueprintConflictError: class DocumentBlueprintConflictError extends Error {
    latestDocument: DocumentBlueprint

    constructor(latestDocument: DocumentBlueprint) {
      super('conflict')
      this.latestDocument = latestDocument
    }
  },
  loadDocumentBlueprint: (documentId: string) => mockLoadDocumentBlueprint(documentId),
  saveDocumentBlueprint: (document: DocumentBlueprint) => mockSaveDocumentBlueprint(document),
}))

vi.mock('@/lib/utils/storage', () => ({
  getAllHistory: () => mockGetAllHistory(),
}))

vi.mock('@/lib/bio-tools', () => ({
  loadBioToolHistory: () => mockLoadBioToolHistory(),
}))

vi.mock('@/lib/genetics', () => ({
  loadAnalysisHistory: () => mockLoadAnalysisHistory(),
  loadGeneticsHistory: (type: string) => mockLoadGeneticsHistory(type),
}))

vi.mock('../project-storage', () => ({
  listProjectEntityRefs: () => mockListProjectEntityRefs(),
}))

vi.mock('@/lib/services', () => ({
  generatePaperDraft: (...args: unknown[]) => mockGeneratePaperDraft(...args),
}))

vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: (...args: unknown[]) => mockConvertToStatisticalResult(...args),
}))

vi.mock('../document-writer-engine-registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../document-writer-engine-registry')>()
  return {
    ...actual,
    resolveDocumentWriterSettings: (...args: unknown[]) => mockResolveDocumentWriterSettings(...args),
  }
})

import { ensureDocumentWriting, retryDocumentWriting } from '../document-writing-orchestrator'
import { createDocumentSourceRef } from '../document-blueprint-types'
import { DocumentBlueprintConflictError } from '../document-blueprint-storage'
import { applyReferencesSectionContent } from '../document-assembler'
import { buildRenderableDocument } from '../document-support-renderer'
import type { CitationRecord } from '../citation-types'

function makeDocument(overrides: Partial<DocumentBlueprint> = {}): DocumentBlueprint {
  const now = '2026-04-24T00:00:00.000Z'
  return {
    id: 'doc_1',
    projectId: 'proj_1',
    preset: 'paper',
    title: '자료 작성 문서',
    language: 'ko',
    metadata: { writerProvider: 'template' },
    createdAt: now,
    updatedAt: now,
    writingState: {
      status: 'collecting',
      jobId: 'job_1',
      sectionStates: {
        methods: { status: 'drafting', jobId: 'job_1' },
        results: { status: 'drafting', jobId: 'job_1' },
      },
    },
    sections: [
      {
        id: 'methods',
        title: '연구 방법',
        content: '',
        sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
        editable: true,
        generatedBy: 'template',
      },
      {
        id: 'results',
        title: '결과',
        content: '',
        sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
        editable: true,
        generatedBy: 'template',
      },
    ],
    ...overrides,
  }
}

function makeHistoryRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: 'hist_1',
    timestamp: Date.now(),
    name: 'ANOVA',
    purpose: 'ANOVA',
    analysisPurpose: 'ANOVA',
    method: {
      id: 'one-way-anova',
      name: 'ANOVA',
      category: 'anova',
    },
    variableMapping: {
      dependentVar: 'length',
      groupVar: 'group',
    },
    analysisOptions: {},
    dataFileName: 'test.csv',
    dataRowCount: 10,
    columnInfo: [
      { name: 'length', type: 'numeric' },
      { name: 'group', type: 'categorical' },
    ],
    results: {
      method: 'ANOVA',
      pValue: 0.01,
      statistic: 5.2,
      interpretation: '유의',
      groupStats: [
        { name: 'A', n: 5, mean: 10, std: 1 },
        { name: 'B', n: 5, mean: 12, std: 1.2 },
      ],
    },
    aiInterpretation: null,
    apaFormat: 'F(1, 8) = 5.2, p = .01',
    paperDraft: null,
    ...overrides,
  }
}

function makeCitationRecord(overrides: Partial<CitationRecord> = {}): CitationRecord {
  return {
    id: 'citation_intro',
    projectId: 'proj_1',
    item: {
      id: 'lit_intro',
      source: 'openalex',
      title: 'Foundational Survey',
      authors: ['Smith A', 'Jones B'],
      year: 2025,
      journal: 'Research Synthesis',
      url: 'https://example.com/foundational-survey',
      doi: '10.1000/foundational.2025',
      searchedName: 'foundational survey',
    },
    addedAt: '2026-04-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('document writing orchestrator', () => {
  let currentDocument: DocumentBlueprint

  beforeEach(() => {
    currentDocument = makeDocument()
    mockLoadDocumentBlueprint.mockReset()
    mockSaveDocumentBlueprint.mockReset()
    mockGetAllHistory.mockReset()
    mockLoadBioToolHistory.mockReset()
    mockLoadAnalysisHistory.mockReset()
    mockLoadGeneticsHistory.mockReset()
    mockListProjectEntityRefs.mockReset()
    mockGeneratePaperDraft.mockReset()
    mockConvertToStatisticalResult.mockReset()
    mockResolveDocumentWriterSettings.mockReset()

    mockLoadDocumentBlueprint.mockImplementation(async () => currentDocument)
    mockSaveDocumentBlueprint.mockImplementation(async (document: DocumentBlueprint) => {
      currentDocument = {
        ...document,
        updatedAt: new Date(Date.parse(currentDocument.updatedAt) + 1000).toISOString(),
      }
      return currentDocument
    })
    mockGetAllHistory.mockResolvedValue([makeHistoryRecord()])
    mockLoadBioToolHistory.mockReturnValue([])
    mockLoadAnalysisHistory.mockReturnValue([])
    mockLoadGeneticsHistory.mockReturnValue([])
    mockListProjectEntityRefs.mockReturnValue([])
    mockConvertToStatisticalResult.mockReturnValue({ pValue: 0.01 })
    mockResolveDocumentWriterSettings.mockReturnValue({
      provider: 'template',
      quality: 'balanced',
      engine: {
        id: 'test-template-writer',
        provider: 'template',
        writeSection: (request: {
          context: {
            citationIds: string[]
            sectionTitle: string
            supportItems?: Array<{ label: string; summary?: string }>
          }
        }) => ({
          content: [
            `### ${request.context.sectionTitle} Writing Input`,
            ...(request.context.supportItems ?? []).map((item) => (
              [item.label, item.summary].filter(Boolean).join(' - ')
            )),
          ].filter(Boolean).join('\n'),
          provider: 'template',
          citationIds: request.context.citationIds,
        }),
      },
    })
    mockGeneratePaperDraft.mockReturnValue({
      methods: '방법 초안',
      results: '결과 초안',
      captions: null,
      discussion: null,
      tables: [
        {
          id: 'test-result',
          title: '표 1. 검정 결과',
          htmlContent: '<table></table>',
          plainText: '항목\t값\nF\t5.2',
        },
      ],
      language: 'ko',
      postHocDisplay: 'significant-only',
      generatedAt: '2026-04-24T00:00:00.000Z',
      model: null,
      context: {
        variableLabels: { length: 'length', group: 'group' },
        variableUnits: {},
        groupLabels: { A: 'A', B: 'B' },
        dependentVariable: 'length',
      },
    })
  })

  it('patches methods and results sections, then marks the document completed', async () => {
    const result = await ensureDocumentWriting('doc_1')

    expect(result?.writingState?.status).toBe('completed')
    expect(result?.sections.find((section) => section.id === 'methods')?.content).toContain('방법 초안')
    expect(result?.sections.find((section) => section.id === 'results')?.content).toContain('결과 초안')
    expect(result?.sections.find((section) => section.id === 'results')?.tables?.[0]?.caption).toBe('표 1. 검정 결과')
    expect(result?.writingState?.sectionStates.methods?.status).toBe('patched')
    expect(result?.writingState?.sectionStates.results?.status).toBe('patched')
  })

  it('includes section support notes in generated section patches', async () => {
    currentDocument = makeDocument({
      language: 'en',
      sections: [
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          sectionSupportBindings: [
            {
              id: 'support_methods_1',
              sourceKind: 'citation-record',
              sourceId: 'citation_1',
              role: 'method-reference',
              label: 'Smith 2025',
              summary: 'Use this citation to justify the assay protocol.',
              excerpt: 'The protocol was validated for comparable samples.',
              citationIds: ['citation_1'],
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          sectionSupportBindings: [
            {
              id: 'support_results_1',
              sourceKind: 'deep-research-note',
              sourceId: 'note_1',
              role: 'interpretation',
              label: 'Meta-analysis note',
              summary: 'Compare the observed effect with recent pooled estimates.',
              excerpt: 'Recent studies report a similar directional effect.',
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const result = await ensureDocumentWriting('doc_1')
    const methodsContent = result?.sections.find((section) => section.id === 'methods')?.content ?? ''
    const resultsContent = result?.sections.find((section) => section.id === 'results')?.content ?? ''

    expect(methodsContent).toContain('Narrative Support Notes')
    expect(methodsContent).toContain('Smith 2025')
    expect(methodsContent).toContain('Use this citation to justify the assay protocol.')
    expect(resultsContent).toContain('Narrative Support Notes')
    expect(resultsContent).toContain('Meta-analysis note')
    expect(resultsContent).toContain('Compare the observed effect with recent pooled estimates.')
  })

  it('can patch support-only methods and results sections', async () => {
    currentDocument = makeDocument({
      language: 'en',
      sections: [
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'support_methods_only',
              sourceKind: 'citation-record',
              sourceId: 'citation_methods',
              role: 'method-reference',
              label: 'Protocol reference',
              summary: 'This source should be available even without analysis refs.',
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'support_results_only',
              sourceKind: 'deep-research-note',
              sourceId: 'note_results',
              role: 'comparison',
              label: 'Literature trend note',
              summary: 'This note can seed interpretation before result data is attached.',
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const result = await ensureDocumentWriting('doc_1')
    const methodsContent = result?.sections.find((section) => section.id === 'methods')?.content ?? ''
    const resultsContent = result?.sections.find((section) => section.id === 'results')?.content ?? ''

    expect(result?.writingState?.status).toBe('completed')
    expect(result?.writingState?.sectionStates.methods?.status).toBe('patched')
    expect(result?.writingState?.sectionStates.results?.status).toBe('patched')
    expect(methodsContent).toContain('Protocol reference')
    expect(resultsContent).toContain('Literature trend note')
  })

  it('drafts empty narrative sections from section-level support bindings', async () => {
    currentDocument = makeDocument({
      language: 'en',
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          content: '',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'support_intro_1',
              sourceKind: 'citation-record',
              sourceId: 'citation_intro',
              role: 'background',
              label: 'Foundational survey',
              summary: 'Use this to frame the research gap.',
              citationIds: ['citation_intro'],
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'discussion',
          title: 'Discussion',
          content: '',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'support_discussion_1',
              sourceKind: 'deep-research-note',
              sourceId: 'note_discussion',
              role: 'comparison',
              label: 'Recent comparison set',
              summary: 'Compare the result direction with recent literature.',
              excerpt: 'The recent literature reports compatible patterns.',
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    })

    const result = await ensureDocumentWriting('doc_1')
    const introduction = result?.sections.find((section) => section.id === 'introduction')
    const discussion = result?.sections.find((section) => section.id === 'discussion')

    expect(result?.writingState?.status).toBe('completed')
    expect(result?.writingState?.sectionStates.introduction?.status).toBe('patched')
    expect(result?.writingState?.sectionStates.discussion?.status).toBe('patched')
    expect(introduction?.generatedBy).toBe('template')
    expect(introduction?.content).toContain('Introduction Writing Input')
    expect(introduction?.content).toContain('Foundational survey')
    expect(discussion?.generatedBy).toBe('template')
    expect(discussion?.content).toContain('Discussion Writing Input')
    expect(discussion?.content).toContain('Recent comparison set')
  })

  it('preserves user-authored narrative bodies while refreshing writing state', async () => {
    currentDocument = makeDocument({
      language: 'en',
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          content: 'User-written introduction.',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'support_intro_existing',
              sourceKind: 'citation-record',
              sourceId: 'citation_intro_existing',
              role: 'background',
              label: 'Background citation',
              summary: 'This should not overwrite the authored body.',
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const result = await ensureDocumentWriting('doc_1')
    const introduction = result?.sections.find((section) => section.id === 'introduction')

    expect(result?.writingState?.sectionStates.introduction?.status).toBe('skipped')
    expect(introduction?.content).toBe('User-written introduction.')
    expect(introduction?.generatedBy).toBe('user')
  })

  it('simulates support citation to section draft to references without exporting support memo as body', async () => {
    currentDocument = makeDocument({
      language: 'en',
      sections: [
        {
          id: 'introduction',
          title: 'Introduction',
          content: '',
          sourceRefs: [],
          sectionSupportBindings: [
            {
              id: 'support_intro_citation',
              sourceKind: 'citation-record',
              sourceId: 'citation_intro',
              role: 'background',
              label: 'Foundational Survey',
              summary: 'Use this to frame the research gap.',
              citationIds: ['citation_intro'],
              included: true,
              origin: 'user',
            },
          ],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'references',
          title: 'References',
          content: '',
          sourceRefs: [],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const written = await ensureDocumentWriting('doc_1')
    const introduction = written?.sections.find((section) => section.id === 'introduction')
    const withReferences = applyReferencesSectionContent(written!, [makeCitationRecord()])
    const references = withReferences.sections.find((section) => section.id === 'references')
    const exportDocument = buildRenderableDocument(withReferences)
    const exportIntroduction = exportDocument.sections.find((section) => section.id === 'introduction')

    expect(written?.writingState?.status).toBe('completed')
    expect(introduction?.content).toContain('Introduction Writing Input')
    expect(introduction?.content).toContain('Foundational Survey')
    expect(introduction?.sectionSupportBindings?.some((binding) => (
      binding.sourceKind === 'citation-record'
      && binding.sourceId === 'citation_intro'
      && binding.included
    ))).toBe(true)
    expect(references?.content).toContain('10.1000/foundational.2025')
    expect(exportIntroduction?.content).toContain('Introduction Writing Input')
    expect(exportIntroduction?.content).not.toContain('Narrative Support Notes')
  })

  it('renders richer supplementary result summaries for linked bio and genetics entities', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
            createDocumentSourceRef('supplementary', 'bio_1', { label: 'Shannon diversity' }),
            createDocumentSourceRef('supplementary', 'blast_1', { label: 'Barcoding result' }),
            createDocumentSourceRef('supplementary', 'protein_1', { label: 'Protein result' }),
          ],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })
    mockListProjectEntityRefs.mockReturnValue([
      { projectId: 'proj_1', entityKind: 'bio-tool-result', entityId: 'bio_1', label: 'Shannon diversity', createdAt: '2026-04-24T00:00:00.000Z' },
      { projectId: 'proj_1', entityKind: 'blast-result', entityId: 'blast_1', label: 'Barcoding result', createdAt: '2026-04-24T00:00:00.000Z' },
      { projectId: 'proj_1', entityKind: 'protein-result', entityId: 'protein_1', label: 'Protein result', createdAt: '2026-04-24T00:00:00.000Z' },
    ])
    mockLoadBioToolHistory.mockReturnValue([
      {
        id: 'bio_1',
        toolId: 'shannon-diversity',
        toolNameEn: 'Shannon diversity',
        toolNameKo: '샤논 다양도',
        csvFileName: 'sample.csv',
        columnConfig: {},
        results: {},
        createdAt: Date.now(),
      },
    ])
    mockLoadAnalysisHistory.mockReturnValue([
      {
        id: 'blast_1',
        type: 'barcoding',
        sampleName: 'Sample-1',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: 'Thunnus albacares',
        topIdentity: 0.991,
        status: 'high',
        resultData: {
          status: 'high',
          title: '종 수준 동정 가능',
          description: 'Thunnus albacares와 99.1% 일치합니다.',
          topHits: [
            {
              species: 'Thunnus albacares',
              identity: 0.991,
              accession: 'ACC123',
              evalue: 1e-40,
              description: 'yellowfin tuna',
            },
          ],
          taxonAlert: {
            taxon: 'Thunnus',
            title: '참치류 COI 한계',
            description: '참치류는 COI 종 구분이 어렵습니다.',
            recommendation: 'D-loop 사용을 권장합니다.',
          },
          recommendedMarkers: [
            {
              name: 'D-loop',
              displayName: 'D-loop',
              reason: '추가 분해능',
              detail: '추가 확인',
            },
          ],
          nextActions: [],
        },
        createdAt: Date.now(),
      },
    ])
    mockLoadGeneticsHistory.mockImplementation((type: string) => {
      if (type === 'protein') {
        return [
          {
            id: 'protein_1',
            type: 'protein',
            analysisName: 'Protein properties',
            sequenceLength: 321,
            molecularWeight: 45678,
            isoelectricPoint: 6.5,
            isStable: true,
            reportMarkdown: '# Protein properties\n\n## UniProt Summary\n\n- Entry: P12345 (ABC_HUMAN)',
            createdAt: Date.now(),
          },
        ]
      }
      return []
    })

    const result = await ensureDocumentWriting('doc_1')
    const resultsContent = result?.sections.find((section) => section.id === 'results')?.content ?? ''

    expect(resultsContent).toContain('### 보조 결과')
    expect(resultsContent).toContain('샤논 다양도')
    expect(resultsContent).toContain('sample.csv')
    expect(resultsContent).toContain('#### Sample-1')
    expect(resultsContent).toContain('Thunnus albacares와 99.1% 일치합니다.')
    expect(resultsContent).toContain('분류군 주의')
    expect(resultsContent).toContain('D-loop')
    expect(resultsContent).toContain('Protein properties')
    expect(resultsContent).toContain('### UniProt Summary')
  })

  it('routes supplementary entities by project entity kind instead of sourceRef kind', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
            createDocumentSourceRef('figure', 'protein_1', { label: 'Protein result legacy kind' }),
          ],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })
    mockListProjectEntityRefs.mockReturnValue([
      { projectId: 'proj_1', entityKind: 'protein-result', entityId: 'protein_1', label: 'Protein result', createdAt: '2026-04-24T00:00:00.000Z' },
    ])
    mockLoadGeneticsHistory.mockImplementation((type: string) => {
      if (type === 'protein') {
        return [
          {
            id: 'protein_1',
            type: 'protein',
            analysisName: 'Protein properties',
            sequenceLength: 321,
            molecularWeight: 45678,
            isoelectricPoint: 6.5,
            isStable: true,
            reportMarkdown: '# Protein properties\n\n## UniProt Summary\n\n- Entry: P12345 (ABC_HUMAN)',
            createdAt: Date.now(),
          },
        ]
      }
      return []
    })

    const result = await ensureDocumentWriting('doc_1')
    const resultsContent = result?.sections.find((section) => section.id === 'results')?.content ?? ''

    expect(resultsContent).toContain('### 보조 결과')
    expect(resultsContent).toContain('Protein properties')
  })

  it('skips invalid analysis sources and still completes drafting with valid ones', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist_invalid', { label: 'Broken analysis' }),
            createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
          ],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist_invalid', { label: 'Broken analysis' }),
            createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
          ],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })
    mockGetAllHistory.mockResolvedValue([
      makeHistoryRecord({
        id: 'hist_invalid',
        method: null,
        results: null,
      }),
      makeHistoryRecord(),
    ])

    const result = await ensureDocumentWriting('doc_1')

    expect(result?.writingState?.status).toBe('completed')
    expect(result?.sections.find((section) => section.id === 'methods')?.content).toContain('방법 초안')
    expect(result?.sections.find((section) => section.id === 'results')?.content).toContain('결과 초안')
  })

  it('keeps drafting the remaining sections when one section fails', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_missing', { label: 'Missing analysis' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '',
          sourceRefs: [createDocumentSourceRef('supplementary', 'bio_1', { label: 'Shannon diversity' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })
    mockGetAllHistory.mockResolvedValue([makeHistoryRecord()])
    mockListProjectEntityRefs.mockReturnValue([
      { projectId: 'proj_1', entityKind: 'bio-tool-result', entityId: 'bio_1', label: 'Shannon diversity', createdAt: '2026-04-24T00:00:00.000Z' },
    ])
    mockLoadBioToolHistory.mockReturnValue([
      {
        id: 'bio_1',
        toolId: 'shannon-diversity',
        toolNameEn: 'Shannon diversity',
        toolNameKo: '샤논 다양도',
        csvFileName: 'sample.csv',
        columnConfig: {},
        results: {},
        createdAt: Date.now(),
      },
    ])

    const result = await ensureDocumentWriting('doc_1')

    expect(result).toBeNull()
    expect(currentDocument.writingState?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.methods?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.results?.status).toBe('patched')
    expect(currentDocument.sections.find((section) => section.id === 'methods')?.content).toBe('')
    expect(currentDocument.sections.find((section) => section.id === 'results')?.content).toContain('### 보조 결과')
    expect(currentDocument.sections.find((section) => section.id === 'results')?.content).toContain('샤논 다양도')
  })

  it('simulates partial section failure followed by retry recovery', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_missing', { label: 'Missing analysis' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const failed = await ensureDocumentWriting('doc_1')

    expect(failed).toBeNull()
    expect(currentDocument.writingState?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.methods?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.results?.status).toBe('patched')
    expect(currentDocument.sections.find((section) => section.id === 'results')?.content).toContain('결과 초안')

    mockGetAllHistory.mockResolvedValue([
      makeHistoryRecord({
        id: 'hist_missing',
        name: 'Recovered method source',
        method: {
          id: 'one-way-anova',
          name: 'Recovered method source',
          category: 'anova',
        },
      }),
      makeHistoryRecord(),
    ])

    const recovered = await retryDocumentWriting('doc_1')

    expect(recovered?.writingState?.status).toBe('completed')
    expect(recovered?.writingState?.sectionStates.methods?.status).toBe('patched')
    expect(recovered?.sections.find((section) => section.id === 'methods')?.content).toContain('Recovered method source')
    expect(recovered?.sections.find((section) => section.id === 'results')?.content).toContain('결과 초안')
  })

  it('applies writer override to methods and results while preserving structured artifacts', async () => {
    mockResolveDocumentWriterSettings.mockReturnValue({
      provider: 'api',
      quality: 'careful',
      engine: {
        id: 'test-api-writer',
        provider: 'api',
        writeSection: (request: { context: { sectionId: string; citationIds: string[] } }) => ({
          content: `LLM ${request.context.sectionId} body`,
          provider: 'api',
          citationIds: request.context.citationIds,
        }),
      },
    })
    currentDocument = makeDocument({
      language: 'en',
      metadata: {},
      sections: [
        {
          id: 'methods',
          title: 'Methods',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          sectionSupportBindings: [{
            id: 'support_methods_override',
            sourceKind: 'citation-record',
            sourceId: 'citation_methods',
            role: 'method-reference',
            label: 'Methods citation',
            citationIds: ['citation_methods'],
            included: true,
            origin: 'user',
          }],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const result = await ensureDocumentWriting('doc_1')
    const methods = result?.sections.find((section) => section.id === 'methods')
    const results = result?.sections.find((section) => section.id === 'results')

    expect(methods?.content).toBe('LLM methods body')
    expect(methods?.generatedBy).toBe('llm')
    expect(results?.content).toBe('LLM results body')
    expect(results?.generatedBy).toBe('llm')
    expect(results?.tables?.[0]?.caption).toBe('표 1. 검정 결과')
  })

  it('fails the document when linked sources resolve but produce no writable section content', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_missing', { label: 'Missing analysis' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_missing', { label: 'Missing analysis' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })
    mockGetAllHistory.mockResolvedValue([makeHistoryRecord()])

    const result = await ensureDocumentWriting('doc_1')

    expect(result).toBeNull()
    expect(currentDocument.writingState?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.methods?.status).toBe('failed')
    expect(currentDocument.writingState?.errorMessage).toContain('초안 내용을 생성하지 못했습니다')
  })

  it('marks the document failed and can recover on retry', async () => {
    const saveError = new Error('save failed')
    let saveAttempt = 0
    mockSaveDocumentBlueprint.mockImplementation(async (document: DocumentBlueprint) => {
      saveAttempt += 1
      if (saveAttempt === 1) {
        throw saveError
      }
      currentDocument = {
        ...document,
        updatedAt: new Date(Date.parse(currentDocument.updatedAt) + 1000).toISOString(),
      }
      return currentDocument
    })

    const failed = await ensureDocumentWriting('doc_1')
    expect(failed).toBeNull()
    expect(currentDocument.writingState?.status).toBe('failed')
    expect(currentDocument.writingState?.errorMessage).toBe('save failed')

    const recovered = await retryDocumentWriting('doc_1')
    expect(recovered?.writingState?.status).toBe('completed')
    expect(recovered?.sections.find((section) => section.id === 'methods')?.content).toContain('방법 초안')
  })

  it('retries restart state updates when retry hits a document conflict', async () => {
    const saveError = new Error('save failed')
    let saveAttempt = 0
    let retryConflictInjected = false

    mockSaveDocumentBlueprint.mockImplementation(async (document: DocumentBlueprint) => {
      saveAttempt += 1
      if (saveAttempt === 1) {
        throw saveError
      }
      if (!retryConflictInjected && document.writingState?.status === 'collecting' && document.writingState.jobId !== 'job_1') {
        retryConflictInjected = true
        currentDocument = {
          ...currentDocument,
          updatedAt: new Date(Date.parse(currentDocument.updatedAt) + 1000).toISOString(),
        }
        throw new DocumentBlueprintConflictError(currentDocument)
      }
      currentDocument = {
        ...document,
        updatedAt: new Date(Date.parse(currentDocument.updatedAt) + 1000).toISOString(),
      }
      return currentDocument
    })

    await ensureDocumentWriting('doc_1')
    expect(currentDocument.writingState?.status).toBe('failed')

    const recovered = await retryDocumentWriting('doc_1')

    expect(recovered?.writingState?.status).toBe('completed')
    expect(retryConflictInjected).toBe(true)
  })

  it('treats stale failure persistence as a no-op when a newer retry supersedes the run', async () => {
    let saveAttempt = 0
    mockSaveDocumentBlueprint.mockImplementation(async (document: DocumentBlueprint) => {
      saveAttempt += 1
      if (saveAttempt === 1) {
        throw new Error('save failed')
      }
      currentDocument = {
        ...document,
        updatedAt: new Date(Date.parse(currentDocument.updatedAt) + 1000).toISOString(),
      }
      return currentDocument
    })
    mockLoadDocumentBlueprint.mockImplementation(async () => {
      if (saveAttempt >= 1) {
        return {
          ...currentDocument,
          writingState: {
            ...currentDocument.writingState,
            status: 'collecting',
            jobId: 'job_newer',
            sectionStates: {
              methods: { status: 'drafting', jobId: 'job_newer' },
              results: { status: 'drafting', jobId: 'job_newer' },
            },
          },
        }
      }
      return currentDocument
    })

    await expect(ensureDocumentWriting('doc_1')).resolves.toBeNull()
  })

  it('reuses the in-flight job when retry is requested before the current run settles', async () => {
    const pendingSave = createDeferred<DocumentBlueprint>()
    let saveCallCount = 0
    mockSaveDocumentBlueprint.mockImplementation(async (document: DocumentBlueprint) => {
      saveCallCount += 1
      currentDocument = {
        ...document,
        updatedAt: new Date(Date.parse(currentDocument.updatedAt) + 1000).toISOString(),
      }
      if (saveCallCount === 1) {
        return pendingSave.promise
      }
      return currentDocument
    })

    const firstRun = ensureDocumentWriting('doc_1')
    const retryRun = retryDocumentWriting('doc_1')

    expect(retryRun).toBe(firstRun)

    pendingSave.resolve(currentDocument)

    const result = await retryRun
    expect(result?.writingState?.status).toBe('completed')
  })
})
