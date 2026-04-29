/**
 * paper-draft-service — generatePaperDraft 시뮬레이션
 *
 * 검증 범위:
 * 1. 한글 초안: postHocDisplay 옵션이 반환 draft에 저장된다
 * 2. postHocDisplay 미전달 시 'significant-only' 기본값 적용
 * 3. 영문 stub: postHocDisplay 포함 여부
 * 4. context가 그대로 draft.context에 저장된다 (재생성 시 유지 검증)
 */

import { describe, it, expect } from 'vitest'
import { generatePaperDraft, generatePaperDraftFromSchema } from '../paper-draft-service'
import type { DraftContext } from '../paper-types'
import type { ExportContext } from '@/lib/services/export/export-types'
import { buildStudySchema } from '../study-schema'

// ─── 픽스처 ───────────────────────────────────────────────────────────────────

const draftCtx: DraftContext = {
  variableLabels: { body_len: '체장', weight: '체중' },
  variableUnits: { body_len: 'cm', weight: 'g' },
  groupLabels: { M: '수컷', F: '암컷' },
  dependentVariable: '체장',
  researchContext: '양식 어류의 성별에 따른 성장 차이 비교',
}

function makeExportCtx(overrides: Partial<ExportContext['analysisResult']> = {}): ExportContext {
  return {
    analysisResult: {
      method: 'two-sample-t',
      statistic: 2.45,
      pValue: 0.021,
      df: 28,
      effectSize: 0.89,
      confidence: { lower: 0.34, upper: 4.06, level: 0.95 },
      interpretation: '유의한 차이',
      groupStats: [
        { name: 'M', mean: 13.1, std: 2.8, n: 15 },
        { name: 'F', mean: 15.3, std: 2.1, n: 15 },
      ],
      ...overrides,
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
    dataInfo: null,
    rawDataRows: null,
  }
}

function makeReadySchemaParams(exportCtx: ExportContext): Parameters<typeof buildStudySchema>[0] {
  return {
    exportContext: exportCtx,
    draftContext: draftCtx,
    methodId: exportCtx.analysisResult.canonicalMethodId ?? exportCtx.analysisResult.method,
    variableMapping: {
      dependentVar: 'body_len',
      groupVar: 'sex',
    },
    researchQuestion: '사료 처리에 따라 체장이 달라지는가?',
    dataDescription: '대조군과 처리군 각 15개체의 체장을 비교했다.',
    assumptionDecision: '가정 검정 결과를 확인하고 해당 검정을 유지했다.',
    language: 'ko',
  }
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('generatePaperDraft — postHocDisplay 보존', () => {
  it('"significant-only" 옵션이 반환 draft에 포함된다', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'significant-only' }
    )

    expect(draft.postHocDisplay).toBe('significant-only')
  })

  it('"all" 옵션이 반환 draft에 포함된다', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'all' }
    )

    expect(draft.postHocDisplay).toBe('all')
  })

  it('postHocDisplay 미전달 시 "significant-only"가 기본값으로 설정된다', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko' }  // postHocDisplay 없음
    )

    expect(draft.postHocDisplay).toBe('significant-only')
  })

  it('영문 템플릿도 postHocDisplay를 포함한다', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'en', postHocDisplay: 'all' }
    )

    expect(draft.language).toBe('en')
    expect(draft.postHocDisplay).toBe('all')
    expect(draft.methods).toBeNull()
    expect(draft.methodsReadiness?.status).toBe('blocked')
  })

  it('영문 stub: postHocDisplay 미전달 → 기본값 "significant-only"', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'en' }
    )

    expect(draft.postHocDisplay).toBe('significant-only')
  })
})

describe('generatePaperDraft — context 보존 (재생성 시 유지)', () => {
  it('draft.context가 입력 draftCtx와 동일하다', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'significant-only' }
    )

    expect(draft.context).toStrictEqual(draftCtx)
    expect(draft.context.dependentVariable).toBe('체장')
    expect(draft.context.variableLabels['body_len']).toBe('체장')
    expect(draft.context.groupLabels['M']).toBe('수컷')
  })

  it('draft.language가 options.language와 일치한다', () => {
    const ko = generatePaperDraft(makeExportCtx(), draftCtx, 'two-sample-t', { language: 'ko' })
    const en = generatePaperDraft(makeExportCtx(), draftCtx, 'two-sample-t', { language: 'en' })

    expect(ko.language).toBe('ko')
    expect(en.language).toBe('en')
  })

  it('discussion은 항상 null이다 (Phase B 미구현)', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'significant-only' }
    )

    expect(draft.discussion).toBeNull()
    expect(draft.model).toBeNull()
  })

  it('draft.studySchema에 생성 입력 스키마를 보존한다', () => {
    const draft = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'significant-only' }
    )

    expect(draft.studySchema?.analysis.methodId).toBe('two-sample-t')
    expect(draft.studySchema?.reporting.dependentVariableLabel).toBe('체장')
    expect(draft.methodsReadiness?.status).toBe('blocked')
    expect(draft.methodsReadiness?.canGenerateDraft).toBe(false)
    expect(draft.resultsReadiness?.status).toBe('ready')
    expect(draft.results).not.toBeNull()
    expect(draft.captionsReadiness?.status).toBe('ready')
    expect(draft.captions).not.toBeNull()
  })

  it('StudySchema 기반 생성 경로가 동일한 context를 복원해 사용한다', () => {
    const exportCtx = makeExportCtx()
    const schema = buildStudySchema({
      exportContext: exportCtx,
      draftContext: draftCtx,
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'body_len',
        groupVar: 'sex',
      },
      language: 'ko',
    })

    const draft = generatePaperDraftFromSchema(
      exportCtx,
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )

    expect(draft.context.dependentVariable).toBe('체장')
    expect(draft.context.variableLabels.body_len).toBe('체장')
    expect(draft.studySchema?.variables.map((variable) => variable.columnKey)).toEqual(['body_len', 'weight', 'sex'])
  })

  it('StudySchema와 현재 분석 결과가 다르면 혼합 초안을 생성하지 않는다', () => {
    const exportCtx = makeExportCtx()
    const schema = buildStudySchema({
      exportContext: exportCtx,
      draftContext: draftCtx,
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'body_len',
        groupVar: 'sex',
      },
      language: 'ko',
    })

    expect(() => generatePaperDraftFromSchema(
      makeExportCtx({ statistic: 9.99 }),
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )).toThrow('StudySchema와 현재 분석 결과가 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  })

  it('StudySchema와 현재 분석 방법이 다르면 혼합 초안을 생성하지 않는다', () => {
    const exportCtx = makeExportCtx({
      method: 'two-sample-t',
      canonicalMethodId: 'two-sample-t',
      displayMethodName: '독립표본 t-검정',
    })
    const schema = buildStudySchema({
      exportContext: exportCtx,
      draftContext: draftCtx,
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'body_len',
        groupVar: 'sex',
      },
      language: 'ko',
    })

    expect(() => generatePaperDraftFromSchema(
      makeExportCtx({
        method: 'one-way-anova',
        canonicalMethodId: 'one-way-anova',
        displayMethodName: '일원분산분석',
      }),
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )).toThrow('StudySchema와 현재 분석 방법이 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  })

  it('StudySchema와 현재 데이터 소스가 다르면 혼합 초안을 생성하지 않는다', () => {
    const exportCtx: ExportContext = {
      ...makeExportCtx(),
      dataInfo: {
        fileName: 'growth.csv',
        totalRows: 30,
        columnCount: 3,
        variables: ['body_len', 'weight', 'sex'],
      },
    }
    const schema = buildStudySchema({
      exportContext: exportCtx,
      draftContext: draftCtx,
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'body_len',
        groupVar: 'sex',
      },
      language: 'ko',
    })

    expect(() => generatePaperDraftFromSchema(
      {
        ...exportCtx,
        dataInfo: {
          fileName: 'different.csv',
          totalRows: 30,
          columnCount: 3,
          variables: ['body_len', 'weight', 'sex'],
        },
      },
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )).toThrow('StudySchema와 현재 데이터 소스가 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  })

  it('StudySchema 언어와 요청 언어가 다르면 혼합 초안을 생성하지 않는다', () => {
    const exportCtx = makeExportCtx()
    const schema = buildStudySchema({
      exportContext: exportCtx,
      draftContext: draftCtx,
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'body_len',
        groupVar: 'sex',
      },
      language: 'ko',
    })

    expect(() => generatePaperDraftFromSchema(
      exportCtx,
      schema,
      { language: 'en', postHocDisplay: 'significant-only' },
    )).toThrow('StudySchema 언어와 요청 언어가 일치하지 않아 논문 초안을 생성할 수 없습니다.')
  })
})

describe('generatePaperDraft — 히스토리 복원 후 재생성 시뮬레이션', () => {
  it('저장된 draft에서 context/postHocDisplay 복원 후 동일 결과를 재생성할 수 있다', () => {
    // 1. 최초 생성
    const original = generatePaperDraft(
      makeExportCtx(),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'all' }
    )
    expect(original.postHocDisplay).toBe('all')

    // 2. 히스토리에서 복원 (postHocDisplay 포함)
    const restoredContext = original.context
    const restoredOptions = {
      language: original.language,
      postHocDisplay: original.postHocDisplay ?? 'significant-only',  // fallback 적용
    }
    expect(restoredOptions.postHocDisplay).toBe('all')

    // 3. 복원된 context/options로 재생성
    const regenerated = generatePaperDraft(
      makeExportCtx(),
      restoredContext,
      'two-sample-t',
      { language: restoredOptions.language, postHocDisplay: restoredOptions.postHocDisplay }
    )

    expect(regenerated.postHocDisplay).toBe('all')
    expect(regenerated.context).toStrictEqual(draftCtx)
  })

  it('구버전 데이터(postHocDisplay=undefined) 복원 시 fallback으로 재생성 가능하다', () => {
    // 1. 구버전 draft (postHocDisplay 없음)
    const compatDraft = {
      context: draftCtx,
      language: 'ko' as const,
      postHocDisplay: undefined as unknown as 'significant-only' | 'all',
    }

    // 2. 컴포넌트 fallback 시뮬레이션
    const restoredOptions = {
      language: compatDraft.language,
      postHocDisplay: compatDraft.postHocDisplay ?? 'significant-only',
    }
    expect(restoredOptions.postHocDisplay).toBe('significant-only')

    // 3. fallback 옵션으로 재생성
    const regenerated = generatePaperDraft(
      makeExportCtx(),
      compatDraft.context,
      'two-sample-t',
      { language: restoredOptions.language, postHocDisplay: restoredOptions.postHocDisplay }
    )

    expect(regenerated.postHocDisplay).toBe('significant-only')
    expect(regenerated.methods).toBeNull()
    expect(regenerated.methodsReadiness?.status).toBe('blocked')
  })

  it('핵심 통계량이 없으면 Results 초안을 생성하지 않는다', () => {
    const draft = generatePaperDraft(
      makeExportCtx({ statistic: Number.NaN }),
      draftCtx,
      'two-sample-t',
      { language: 'ko', postHocDisplay: 'significant-only' },
    )

    expect(draft.results).toBeNull()
    expect(draft.resultsReadiness?.status).toBe('blocked')
    expect(draft.resultsReadiness?.blockingGateRules).toEqual(['missing-core-statistic'])
  })
})

describe('generatePaperDraft — Methods/Results 생성 게이트 시뮬레이션', () => {
  it('가정 위반 판단 메모가 없으면 Methods 초안은 생성하되 문서 반영 전 검토 상태로 둔다', () => {
    const exportCtx = makeExportCtx()
    const schema = {
      ...buildStudySchema({
        ...makeReadySchemaParams(exportCtx),
        assumptionDecision: undefined,
      }),
      assumptions: [
        {
          category: 'normality' as const,
          testName: 'Shapiro-Wilk',
          statistic: 0.83,
          pValue: 0.004,
          passed: false,
        },
      ],
    }

    const draft = generatePaperDraftFromSchema(
      exportCtx,
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )

    expect(draft.methods).not.toBeNull()
    expect(draft.methodsReadiness?.status).toBe('needs-review')
    expect(draft.methodsReadiness?.canGenerateDraft).toBe(true)
    expect(draft.methodsReadiness?.shouldReviewBeforeInsert).toBe(true)
    expect(draft.methodsReadiness?.reviewGateRules).toContain('missing-assumption-decision')
  })

  it('결측값이 있는데 처리 방식이 없으면 Methods 초안은 생성하되 검토 gate를 남긴다', () => {
    const exportCtx = makeExportCtx()
    const schema = buildStudySchema({
      ...makeReadySchemaParams(exportCtx),
      missingDataHandling: undefined,
      validationResults: {
        isValid: true,
        totalRows: 30,
        columnCount: 3,
        missingValues: 2,
        duplicateRows: 0,
        dataType: 'tabular',
        variables: ['body_len', 'weight', 'sex'],
        warnings: [],
        errors: [],
      },
    })

    const draft = generatePaperDraftFromSchema(
      exportCtx,
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )

    expect(draft.methods).not.toBeNull()
    expect(draft.methodsReadiness?.status).toBe('needs-review')
    expect(draft.methodsReadiness?.canGenerateDraft).toBe(true)
    expect(draft.methodsReadiness?.reviewGateRules).toContain('missing-data-handling')
  })

  it('사후검정 결과가 있는데 보정 방법이 없으면 Methods는 막고 Results는 검토 상태로만 생성한다', () => {
    const exportCtx = makeExportCtx({
      method: 'one-way-anova',
      canonicalMethodId: 'one-way-anova',
      displayMethodName: '일원분산분석',
      statistic: 5.42,
      pValue: 0.009,
      postHoc: [
        { group1: 'M', group2: 'F', pvalue: 0.012, significant: true },
        { group1: 'M', group2: 'control', pvalue: 0.031, significant: true },
      ],
      postHocMethod: undefined,
    })
    const schema = buildStudySchema(makeReadySchemaParams(exportCtx))

    const draft = generatePaperDraftFromSchema(
      exportCtx,
      schema,
      { language: 'ko', postHocDisplay: 'significant-only' },
    )

    expect(draft.methods).toBeNull()
    expect(draft.methodsReadiness?.status).toBe('blocked')
    expect(draft.methodsReadiness?.canGenerateDraft).toBe(false)
    expect(draft.methodsReadiness?.blockingGateRules).toContain('missing-post-hoc-method')
    expect(draft.results).not.toBeNull()
    expect(draft.resultsReadiness?.status).toBe('needs-review')
    expect(draft.resultsReadiness?.canGenerateDraft).toBe(true)
    expect(draft.resultsReadiness?.reviewGateRules).toContain('missing-post-hoc-method')
  })
})
