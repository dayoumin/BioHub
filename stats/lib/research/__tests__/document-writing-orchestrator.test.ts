import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentBlueprint, GeneratedArtifactProvenance } from '../document-blueprint-types'
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
  mockSafelyBuildAnalysisWritingDraftFromHistory,
} = vi.hoisted(() => ({
  mockLoadDocumentBlueprint: vi.fn(),
  mockSaveDocumentBlueprint: vi.fn(),
  mockGetAllHistory: vi.fn(),
  mockLoadBioToolHistory: vi.fn(),
  mockLoadAnalysisHistory: vi.fn(),
  mockLoadGeneticsHistory: vi.fn(),
  mockListProjectEntityRefs: vi.fn(),
  mockSafelyBuildAnalysisWritingDraftFromHistory: vi.fn(),
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
  saveDocumentBlueprint: (document: DocumentBlueprint, options?: unknown) => mockSaveDocumentBlueprint(document, options),
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

vi.mock('../analysis-writing-draft', () => ({
  safelyBuildAnalysisWritingDraftFromHistory: (...args: unknown[]) => (
    mockSafelyBuildAnalysisWritingDraftFromHistory(...args)
  ),
}))

import { ensureDocumentWriting, regenerateDocumentSection, retryDocumentWriting } from '../document-writing-orchestrator'
import { createDocumentSourceRef } from '../document-blueprint-types'

function makeDocument(overrides: Partial<DocumentBlueprint> = {}): DocumentBlueprint {
  const now = '2026-04-24T00:00:00.000Z'
  return {
    id: 'doc_1',
    projectId: 'proj_1',
    preset: 'paper',
    title: '자료 작성 문서',
    language: 'ko',
    metadata: {},
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
    mockSafelyBuildAnalysisWritingDraftFromHistory.mockReset()

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
    mockSafelyBuildAnalysisWritingDraftFromHistory.mockReturnValue({
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
    const generatedArtifacts = (result?.metadata as { generatedArtifacts?: GeneratedArtifactProvenance[] }).generatedArtifacts ?? []
    expect(generatedArtifacts.map((artifact) => artifact.artifactKind)).toEqual(['methods', 'results'])
    expect(generatedArtifacts.every((artifact) => artifact.sourceRefs.some((sourceRef) => sourceRef.sourceId === 'hist_1'))).toBe(true)
  })

  it('does not insert needs-review drafts into document sections without confirmation', async () => {
    mockSafelyBuildAnalysisWritingDraftFromHistory.mockReturnValue({
      methods: '검토 필요 방법 초안',
      results: '결과 초안',
      captions: null,
      discussion: null,
      tables: [],
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
      methodsReadiness: {
        canGenerateDraft: true,
        shouldReviewBeforeInsert: true,
      } as never,
    })

    const result = await ensureDocumentWriting('doc_1')

    expect(result).toBeNull()
    expect(currentDocument.writingState?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.methods?.status).toBe('failed')
    expect(currentDocument.writingState?.sectionStates.methods?.message).toBe('사용자 확인이 필요한 초안이라 문서에 자동 반영하지 않았습니다.')
    expect(currentDocument.sections.find((section) => section.id === 'methods')?.content).toBe('')
    expect((currentDocument.metadata as { generatedArtifacts?: GeneratedArtifactProvenance[] }).generatedArtifacts).toBeUndefined()
  })

  it('records artifact provenance only for sources that produced draft content', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
            createDocumentSourceRef('analysis', 'hist_missing', { label: 'Missing analysis' }),
          ],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
            createDocumentSourceRef('analysis', 'hist_missing', { label: 'Missing analysis' }),
          ],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const result = await ensureDocumentWriting('doc_1')
    const generatedArtifacts = (result?.metadata as { generatedArtifacts?: GeneratedArtifactProvenance[] }).generatedArtifacts ?? []

    expect(generatedArtifacts).toHaveLength(2)
    expect(generatedArtifacts.flatMap((artifact) => artifact.sourceRefs.map((sourceRef) => sourceRef.sourceId))).toEqual([
      'hist_1',
      'hist_1',
    ])
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
    mockSafelyBuildAnalysisWritingDraftFromHistory
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
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
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
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

    const result = await ensureDocumentWriting('doc_1')

    expect(result?.writingState?.status).toBe('completed')
    expect(result?.sections.find((section) => section.id === 'methods')?.content).toContain('방법 초안')
    expect(result?.sections.find((section) => section.id === 'results')?.content).toContain('결과 초안')
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

  it('regenerates a single section and replaces user-edited body when requested', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '사용자가 고친 방법 문장',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'results',
          title: '결과',
          content: '기존 결과',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const regenerated = await regenerateDocumentSection('doc_1', 'methods', 'regenerate')
    const methods = regenerated?.sections.find((section) => section.id === 'methods')
    const results = regenerated?.sections.find((section) => section.id === 'results')

    expect(regenerated?.writingState?.status).toBe('completed')
    expect(regenerated?.writingState?.sectionStates.methods?.status).toBe('patched')
    expect(methods?.content).toContain('방법 초안')
    expect(methods?.content).not.toContain('사용자가 고친 방법 문장')
    expect(methods?.generatedBy).toBe('template')
    expect(results?.content).toBe('기존 결과')
  })

  it('refreshes a single section while preserving user-edited body', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '사용자가 고친 방법 문장',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'user',
        },
        {
          id: 'results',
          title: '결과',
          content: '기존 결과',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const refreshed = await regenerateDocumentSection('doc_1', 'methods', 'refresh-linked-sources')
    const methods = refreshed?.sections.find((section) => section.id === 'methods')

    expect(refreshed?.writingState?.status).toBe('completed')
    expect(refreshed?.writingState?.sectionStates.methods?.status).toBe('skipped')
    expect(refreshed?.writingState?.sectionStates.methods?.message).toContain('본문은 유지')
    expect(methods?.content).toBe('사용자가 고친 방법 문장')
    expect(methods?.generatedBy).toBe('user')
  })

  it('refreshes a template-owned section without replacing its body', async () => {
    currentDocument = makeDocument({
      sections: [
        {
          id: 'methods',
          title: '연구 방법',
          content: '기존 템플릿 방법 본문',
          plateValue: [{ type: 'p', children: [{ text: '기존 템플릿 방법 본문' }] }],
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
        {
          id: 'results',
          title: '결과',
          content: '기존 결과',
          sourceRefs: [createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' })],
          editable: true,
          generatedBy: 'template',
        },
      ],
    })

    const refreshed = await regenerateDocumentSection('doc_1', 'methods', 'refresh-linked-sources')
    const methods = refreshed?.sections.find((section) => section.id === 'methods')

    expect(refreshed?.writingState?.status).toBe('completed')
    expect(refreshed?.writingState?.sectionStates.methods?.status).toBe('skipped')
    expect(methods?.content).toBe('기존 템플릿 방법 본문')
    expect(methods?.plateValue).toEqual([{ type: 'p', children: [{ text: '기존 템플릿 방법 본문' }] }])
    expect(methods?.generatedBy).toBe('template')
    expect(methods?.sourceRefs.some((sourceRef) => sourceRef.sourceId === 'hist_1')).toBe(true)
  })

  it('rejects overlapping section regeneration jobs for the same document', async () => {
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

    const firstRun = regenerateDocumentSection('doc_1', 'methods', 'regenerate')
    await expect(regenerateDocumentSection('doc_1', 'results', 'refresh-linked-sources'))
      .rejects
      .toThrow('이미 다른 섹션 재생성이 진행 중입니다')

    pendingSave.resolve(currentDocument)
    await expect(firstRun).resolves.toBeTruthy()
  })

  it('reuses an active section regeneration job instead of starting full-document writing', async () => {
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

    const sectionRun = regenerateDocumentSection('doc_1', 'methods', 'regenerate')
    const documentRun = ensureDocumentWriting('doc_1')

    expect(documentRun).toBe(sectionRun)

    pendingSave.resolve(currentDocument)
    await expect(sectionRun).resolves.toBeTruthy()
  })

  it('marks section regeneration failed when source collection throws after drafting starts', async () => {
    mockGetAllHistory.mockRejectedValue(new Error('history unavailable'))

    const regenerated = await regenerateDocumentSection('doc_1', 'methods', 'regenerate')

    expect(regenerated?.writingState?.status).toBe('failed')
    expect(regenerated?.writingState?.sectionStates.methods?.status).toBe('failed')
    expect(regenerated?.writingState?.sectionStates.methods?.message).toBe('history unavailable')
  })

  it('stops destructive regeneration when the section body changes during the job', async () => {
    let historyRequested = false
    mockGetAllHistory.mockImplementation(async () => {
      if (!historyRequested) {
        historyRequested = true
        currentDocument = {
          ...currentDocument,
          sections: currentDocument.sections.map((section) => (
            section.id === 'methods'
              ? { ...section, content: '작업 중 사용자가 새로 입력한 방법 문장', generatedBy: 'user' as const }
              : section
          )),
        }
      }
      return [makeHistoryRecord()]
    })

    const regenerated = await regenerateDocumentSection('doc_1', 'methods', 'regenerate')
    const methods = regenerated?.sections.find((section) => section.id === 'methods')

    expect(regenerated?.writingState?.status).toBe('failed')
    expect(regenerated?.writingState?.sectionStates.methods?.status).toBe('failed')
    expect(regenerated?.writingState?.sectionStates.methods?.message).toContain('사용자 편집')
    expect(methods?.content).toBe('작업 중 사용자가 새로 입력한 방법 문장')
  })
})
