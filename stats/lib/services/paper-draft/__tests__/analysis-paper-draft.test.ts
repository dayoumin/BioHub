import { describe, expect, it } from 'vitest'
import type { ExportContext } from '@/lib/services/export/export-types'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'
import type { DraftContext } from '../paper-types'
import { generateAnalysisPaperDraft, isReusableAnalysisStudySchema } from '../analysis-paper-draft'

function makeExportContext(): ExportContext {
  return {
    analysisResult: {
      method: 'two-sample-t',
      canonicalMethodId: 'two-sample-t',
      displayMethodName: '독립표본 t-검정',
      statistic: 2.45,
      statisticName: 't',
      pValue: 0.021,
      df: 28,
      effectSize: 0.89,
      confidence: { lower: 0.34, upper: 4.06, level: 0.95 },
      interpretation: '유의한 차이',
      groupStats: [
        { name: 'control', mean: 13.1, std: 2.8, n: 15 },
        { name: 'treated', mean: 15.3, std: 2.1, n: 15 },
      ],
      postHoc: [],
      coefficients: [],
    },
    statisticalResult: {
      testName: '독립표본 t-검정',
      statistic: 2.45,
      pValue: 0.021,
      statisticName: 't',
    } as never,
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
      variables: ['group', 'length', 'weight'],
    },
    rawDataRows: null,
  }
}

function makeDraftContext(): DraftContext {
  return {
    variableLabels: { group: '처리군', length: '체장', weight: '체중' },
    variableUnits: { length: 'cm', weight: 'g' },
    groupLabels: { control: '대조군', treated: '처리군' },
    dependentVariable: '체장',
    researchContext: '사료 처리에 따른 체장 차이 비교',
  }
}

const variableMapping: VariableMapping = {
  dependentVar: 'length',
  groupVar: 'group',
  variables: ['length', 'weight'],
}

describe('generateAnalysisPaperDraft', () => {
  it('reuses cached StudySchema only when the analysis input fingerprint is unchanged', () => {
    const exportContext = makeExportContext()
    const draftContext = makeDraftContext()
    const original = generateAnalysisPaperDraft(
      exportContext,
      draftContext,
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        historyId: 'hist_1',
        dataDescription: 'growth.csv',
      },
    )

    expect(isReusableAnalysisStudySchema(
      exportContext,
      draftContext,
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        historyId: 'hist_1',
        dataDescription: 'growth.csv',
        studySchema: original.studySchema,
      },
    )).toBe(true)
    expect(isReusableAnalysisStudySchema(
      exportContext,
      {
        ...draftContext,
        variableLabels: {
          ...draftContext.variableLabels,
          length: '전장',
        },
      },
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        historyId: 'hist_1',
        dataDescription: 'growth.csv',
        studySchema: original.studySchema,
      },
    )).toBe(false)
  })

  it('keeps regenerated output materially equivalent when reusable StudySchema is unchanged', () => {
    const exportContext = makeExportContext()
    const draftContext = makeDraftContext()
    const original = generateAnalysisPaperDraft(
      exportContext,
      draftContext,
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        historyId: 'hist_1',
        dataDescription: 'growth.csv',
      },
    )
    const regenerated = generateAnalysisPaperDraft(
      exportContext,
      draftContext,
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        historyId: 'hist_1',
        dataDescription: 'growth.csv',
        studySchema: original.studySchema,
      },
    )

    expect(regenerated.methods).toBe(original.methods)
    expect(regenerated.results).toBe(original.results)
    expect(regenerated.studySchema).toBe(original.studySchema)
  })

  it('rebuilds cached StudySchema when user-confirmed Methods context changes', () => {
    const exportContext = makeExportContext()
    const draftContext = makeDraftContext()
    const original = generateAnalysisPaperDraft(
      exportContext,
      draftContext,
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        researchQuestion: '기존 연구 질문',
        dataDescription: '기존 데이터 설명',
      },
    )

    const regenerated = generateAnalysisPaperDraft(
      exportContext,
      draftContext,
      'two-sample-t',
      { language: 'ko' },
      {
        variableMapping,
        researchQuestion: '변경된 연구 질문',
        dataDescription: '변경된 데이터 설명',
        studySchema: original.studySchema,
      },
    )

    expect(regenerated.studySchema?.study.researchQuestion).toBe('변경된 연구 질문')
    expect(regenerated.studySchema?.study.dataDescription).toBe('변경된 데이터 설명')
    expect(regenerated.studySchema?.source.sourceFingerprint).not.toBe(original.studySchema?.source.sourceFingerprint)
  })
})
