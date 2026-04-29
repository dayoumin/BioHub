import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResultsPaperDraft } from '../use-results-paper-draft'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { ExportContext } from '@/lib/services'
import type { ValidationResults } from '@/types/analysis'

const EXPORT_CONTEXT: ExportContext = {
  analysisResult: {
    method: 'Independent t-test',
    canonicalMethodId: 'two-sample-t',
    displayMethodName: '독립표본 t-검정',
    statistic: 2.45,
    statisticName: 't',
    pValue: 0.021,
    df: 28,
    effectSize: { value: 0.89, type: 'cohens-d', interpretation: 'large' },
    confidence: { lower: 0.34, upper: 4.06, level: 0.95 },
    interpretation: '유의한 차이',
    groupStats: [
      { name: 'M', mean: 13.1, std: 2.8, n: 15 },
      { name: 'F', mean: 15.3, std: 2.1, n: 15 },
    ],
  },
  statisticalResult: {
    testName: '독립표본 t-검정',
    statistic: 2.45,
    pValue: 0.021,
    statisticName: 't',
  },
  aiInterpretation: null,
  apaFormat: 't(28) = 2.45, p = .021',
  exportOptions: {
    includeInterpretation: false,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
  },
  dataInfo: {
    fileName: 'growth.csv',
    totalRows: 30,
    columnCount: 3,
    variables: ['body_len', 'weight', 'sex'],
  },
  rawDataRows: null,
}

const VALIDATION_RESULTS: ValidationResults = {
  isValid: true,
  totalRows: 30,
  columnCount: 3,
  missingValues: 1,
  duplicateRows: 0,
  dataType: 'mixed',
  variables: ['body_len', 'weight', 'sex'],
  errors: [],
  warnings: ['body_len 결측치 1개'],
}

describe('useResultsPaperDraft lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: 'history-growth-1',
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
      patchHistoryPaperDraft: vi.fn().mockResolvedValue(undefined),
      setLoadedPaperDraft: vi.fn(function (draft) {
        useHistoryStore.setState({ loadedPaperDraft: draft })
      }),
    })
  })

  it('generates, patches, restores, and language-regenerates a schema-backed paper draft', async () => {
    const patchHistoryPaperDraft = vi.fn().mockResolvedValue(undefined)
    useHistoryStore.setState({ patchHistoryPaperDraft })

    const { result } = renderHook(() =>
      useResultsPaperDraft({
        draftExportCtx: EXPORT_CONTEXT,
        selectedMethodId: 'two-sample-t',
        variableMapping: {
          dependentVar: 'body_len',
          groupVar: 'sex',
          variables: ['body_len', 'weight'],
        },
        validationResults: VALIDATION_RESULTS,
        analysisOptions: {
          confidenceLevel: 0.95,
          alternative: 'two-sided',
        },
        projectId: 'project-growth',
      }),
    )

    await act(async () => {
      result.current.handleDraftConfirm({
        variableLabels: {
          body_len: '체장',
          weight: '체중',
          sex: '성별',
        },
        variableUnits: {
          body_len: 'cm',
          weight: 'g',
        },
        groupLabels: {
          M: '수컷',
          F: '암컷',
        },
        dependentVariable: '체장',
        researchContext: '양식 어류의 성별에 따른 성장 차이 비교',
      }, {
        language: 'ko',
        postHocDisplay: 'significant-only',
      })
    })

    const firstDraft = result.current.paperDraft
    expect(firstDraft?.studySchema?.source.historyId).toBe('history-growth-1')
    expect(firstDraft?.studySchema?.source.projectId).toBe('project-growth')
    expect(firstDraft?.studySchema?.source.fileName).toBe('growth.csv')
    expect(firstDraft?.studySchema?.source.missingValues).toBe(1)
    expect(firstDraft?.studySchema?.variables).toEqual([
      expect.objectContaining({ columnKey: 'body_len', label: '체장', roles: ['dependent', 'variable'] }),
      expect.objectContaining({ columnKey: 'weight', label: '체중', roles: ['variable'] }),
      expect.objectContaining({ columnKey: 'sex', label: '성별', roles: ['group'] }),
    ])
    expect(firstDraft?.studySchema?.analysis.options).toEqual([
      { key: 'confidenceLevel', value: 0.95 },
      { key: 'alternative', value: 'two-sided' },
    ])
    expect(patchHistoryPaperDraft).toHaveBeenCalledWith(
      'history-growth-1',
      expect.objectContaining({
        studySchema: expect.objectContaining({
          source: expect.objectContaining({ historyId: 'history-growth-1' }),
        }),
      }),
    )

    await act(async () => {
      result.current.handleDraftLanguageChange('en')
    })

    const englishDraft = result.current.paperDraft
    expect(englishDraft?.language).toBe('en')
    expect(englishDraft?.studySchema?.language).toBe('en')
    expect(englishDraft?.studySchema?.source.historyId).toBe('history-growth-1')
    expect(englishDraft?.studySchema?.variables.find((variable) => variable.columnKey === 'body_len')?.label).toBe('체장')
  })
})
