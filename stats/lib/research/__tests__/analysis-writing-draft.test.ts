import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'
import type { ExportContext } from '@/lib/services/export/export-types'
import {
  buildStudySchemaSourceFingerprint,
  type StudySchema,
} from '@/lib/services/paper-draft/study-schema'

const {
  mockGeneratePaperDraft,
  mockConvertToStatisticalResult,
} = vi.hoisted(() => ({
  mockGeneratePaperDraft: vi.fn(),
  mockConvertToStatisticalResult: vi.fn(),
}))

vi.mock('@/lib/services/paper-draft/paper-draft-service', () => ({
  generatePaperDraft: (...args: unknown[]) => mockGeneratePaperDraft(...args),
}))

vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: (...args: unknown[]) => mockConvertToStatisticalResult(...args),
}))

import {
  buildAnalysisWritingDraftFromHistory,
  safelyBuildAnalysisWritingDraftFromHistory,
} from '../analysis-writing-draft'

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

function makeCachedDraft(overrides: Partial<PaperDraft> = {}): PaperDraft {
  return {
    methods: '저장된 방법 초안',
    results: '저장된 결과 초안',
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
    ...overrides,
  }
}

function makeStudySchema(overrides: Partial<StudySchema> = {}): StudySchema {
  const record = makeHistoryRecord()
  const draft = makeCachedDraft()
  const exportContext = makeExportContextFromRecord(record)
  return {
    version: 1,
    generatedAt: '2026-04-24T00:00:00.000Z',
    language: 'ko',
    study: { context: 'ANOVA', dataDescription: 'test.csv' },
    source: {
      historyId: 'hist_1',
      fileName: 'test.csv',
      variables: ['length', 'group'],
      warnings: [],
      errors: [],
      sourceFingerprint: buildStudySchemaSourceFingerprint({
        exportContext,
        draftContext: draft.context,
        methodId: 'one-way-anova',
        variableMapping: record.variableMapping ?? null,
        analysisOptions: record.analysisOptions,
        language: 'ko',
      }),
    },
    variables: [
      { columnKey: 'length', label: 'length', roles: ['dependent'] },
      { columnKey: 'group', label: 'group', roles: ['group'] },
    ],
    groups: [
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
    ],
    materials: {
      sources: [],
      sampling: {
        equipment: [],
        reagents: [],
      },
      prohibitedAutoClaims: [
        'equipment-name',
        'reagent-name',
        'ethics-approval',
        'collection-location',
        'storage-condition',
        'verified-species-identity',
      ],
      warnings: [],
      errors: [],
    },
    preprocessing: {
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
      steps: [],
      prohibitedAutoClaims: [
        'outlier-removal',
        'mcar',
        'mar',
        'variable-transform',
        'standardization',
        'exclusion-criteria',
      ],
      warnings: [],
      errors: [],
    },
    assumptions: [],
    analysis: {
      methodId: 'one-way-anova',
      methodName: 'ANOVA',
      statistic: 5.2,
      pValue: 0.01,
      postHocCount: 0,
      coefficientCount: 0,
      groupStatCount: 2,
      options: [],
    },
    reporting: {
      apaFormat: 'F(1, 8) = 5.2, p = .01',
      dependentVariableLabel: 'length',
    },
    issues: [],
    readiness: { methods: true, results: true, captions: true },
    ...overrides,
  }
}

function makeExportContextFromRecord(record: HistoryRecord): ExportContext {
  return {
    analysisResult: record.results as unknown as ExportContext['analysisResult'],
    statisticalResult: { pValue: 0.01 } as never,
    aiInterpretation: record.aiInterpretation ?? null,
    apaFormat: record.apaFormat ?? null,
    exportOptions: {
      includeInterpretation: false,
      includeRawData: false,
      includeMethodology: false,
      includeReferences: false,
      language: 'ko',
    },
    dataInfo: {
      fileName: record.dataFileName,
      totalRows: record.dataRowCount,
      columnCount: record.columnInfo?.length ?? 0,
      variables: record.columnInfo?.map((column) => column.name) ?? [],
    },
    rawDataRows: null,
  }
}

describe('analysis-writing-draft', () => {
  beforeEach(() => {
    mockGeneratePaperDraft.mockReset()
    mockConvertToStatisticalResult.mockReset()
    mockConvertToStatisticalResult.mockReturnValue({ pValue: 0.01 })
    mockGeneratePaperDraft.mockReturnValue(makeCachedDraft({
      methods: '방법 초안',
      results: '결과 초안',
    }))
  })

  it('builds a document-writing draft from history when cached paperDraft is absent', () => {
    const draft = buildAnalysisWritingDraftFromHistory(makeHistoryRecord(), 'ko')

    expect(draft.methods).toBe('방법 초안')
    expect(mockConvertToStatisticalResult).toHaveBeenCalled()
    expect(mockGeneratePaperDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dataInfo: expect.objectContaining({
          fileName: 'test.csv',
          totalRows: 10,
        }),
      }),
      expect.objectContaining({
        dependentVariable: 'length',
        researchContext: 'ANOVA',
      }),
      'one-way-anova',
      expect.objectContaining({
        language: 'ko',
        postHocDisplay: 'significant-only',
      }),
      expect.objectContaining({
        source: expect.objectContaining({
          historyId: 'hist_1',
          fileName: 'test.csv',
        }),
        variables: expect.arrayContaining([
          expect.objectContaining({ columnKey: 'length', roles: ['dependent'] }),
          expect.objectContaining({ columnKey: 'group', roles: ['group'] }),
        ]),
      }),
    )
  })

  it('returns null from the safe helper when history input is incomplete', () => {
    const draft = safelyBuildAnalysisWritingDraftFromHistory(
      makeHistoryRecord({
        method: null,
        results: null,
      }),
      'ko',
    )

    expect(draft).toBeNull()
  })

  it('regenerates a cached legacy paperDraft that has no studySchema', () => {
    const draft = buildAnalysisWritingDraftFromHistory(
      makeHistoryRecord({ paperDraft: makeCachedDraft({ studySchema: undefined }) }),
      'ko',
    )

    expect(draft.methods).toBe('방법 초안')
    expect(mockGeneratePaperDraft).toHaveBeenCalled()
  })

  it('reuses a cached paperDraft only when its studySchema matches the history source', () => {
    const cachedDraft = makeCachedDraft({
      studySchema: makeStudySchema(),
    })

    const draft = buildAnalysisWritingDraftFromHistory(
      makeHistoryRecord({ paperDraft: cachedDraft }),
      'ko',
    )

    expect(draft).toBe(cachedDraft)
    expect(mockGeneratePaperDraft).not.toHaveBeenCalled()
  })

  it('regenerates a cached paperDraft when its studySchema points to a different method', () => {
    const draft = buildAnalysisWritingDraftFromHistory(
      makeHistoryRecord({
        paperDraft: makeCachedDraft({
          studySchema: makeStudySchema({
            analysis: {
              ...makeStudySchema().analysis,
              methodId: 'different-method',
            },
          }),
        }),
      }),
      'ko',
    )

    expect(draft.methods).toBe('방법 초안')
    expect(mockGeneratePaperDraft).toHaveBeenCalled()
  })

  it('regenerates a cached paperDraft when the requested document language differs', () => {
    const draft = buildAnalysisWritingDraftFromHistory(
      makeHistoryRecord({
        paperDraft: makeCachedDraft({
          language: 'ko',
          studySchema: makeStudySchema(),
        }),
      }),
      'en',
    )

    expect(draft.methods).toBe('방법 초안')
    expect(mockGeneratePaperDraft).toHaveBeenCalled()
  })

  it('regenerates a cached paperDraft when confirmed labels change the schema fingerprint', () => {
    const record = makeHistoryRecord({
      paperDraft: makeCachedDraft({
        context: {
          variableLabels: { length: '체장', group: '처리군' },
          variableUnits: {},
          groupLabels: { A: '대조군', B: '처리군' },
          dependentVariable: '체장',
        },
        studySchema: makeStudySchema(),
      }),
    })

    const draft = buildAnalysisWritingDraftFromHistory(record, 'ko')

    expect(draft.methods).toBe('방법 초안')
    expect(mockGeneratePaperDraft).toHaveBeenCalled()
  })
})
