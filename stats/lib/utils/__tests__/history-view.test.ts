import { describe, expect, it } from 'vitest'
import { isHistoryResultsView } from '../history-view'

describe('isHistoryResultsView', () => {
  it('히스토리 id와 결과만 있고 업로드 데이터가 없을 때 결과 보기 모드로 판단한다', () => {
    expect(
      isHistoryResultsView({
        currentHistoryId: 'history-1',
        results: {
          method: 'one-sample-t',
          statistic: 1.23,
          pValue: 0.04,
        } as never,
        uploadedData: null,
        validationResults: null,
      }),
    ).toBe(true)
  })

  it('업로드 데이터나 validation 결과가 남아 있으면 일반 세션으로 판단한다', () => {
    expect(
      isHistoryResultsView({
        currentHistoryId: 'history-1',
        results: {
          method: 'one-sample-t',
          statistic: 1.23,
          pValue: 0.04,
        } as never,
        uploadedData: [{ value: 1 }],
        validationResults: null,
      }),
    ).toBe(false)

    expect(
      isHistoryResultsView({
        currentHistoryId: 'history-1',
        results: {
          method: 'one-sample-t',
          statistic: 1.23,
          pValue: 0.04,
        } as never,
        uploadedData: null,
        validationResults: { isValid: true } as never,
      }),
    ).toBe(false)
  })
})
