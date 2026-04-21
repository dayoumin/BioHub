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
import { generatePaperDraft } from '../paper-draft-service'
import type { DraftContext } from '../paper-types'
import type { ExportContext } from '@/lib/services/export/export-types'

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
    expect(draft.methods).toContain('t-test')
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
    expect(regenerated.methods).toBeTruthy()
  })
})
