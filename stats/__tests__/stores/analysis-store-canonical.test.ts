import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

describe('analysis-store canonical method id invariant', () => {
  beforeEach(() => {
    sessionStorage.clear()
    act(() => {
      useAnalysisStore.getState().reset()
    })
  })

  it("setSelectedMethod는 compat alias 't-test'를 canonical 'two-sample-t'로 정규화한다", () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 't-test',
        name: '독립표본 t-검정',
        description: '두 그룹 평균 비교',
        category: 't-test',
      })
    })

    const stored = useAnalysisStore.getState().selectedMethod
    expect(stored?.id).toBe('two-sample-t')
    expect(stored?.name).toBe('독립표본 t-검정')
    expect(stored?.category).toBe('t-test')
  })

  it("setSelectedMethod는 compat alias 'anova'를 canonical 'one-way-anova'로 정규화한다", () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'anova',
        name: '일원분산분석',
        description: '3개 이상 그룹 평균 비교',
        category: 'anova',
      })
    })

    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('one-way-anova')
  })

  it('이미 canonical인 id는 그대로 보존한다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'two-sample-t',
        name: '독립표본 t-검정',
        description: '',
        category: 't-test',
      })
    })

    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('two-sample-t')
  })

  it('unknown id는 변형 없이 그대로 저장한다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'unknown-method-xyz',
        name: 'Custom',
        description: '',
        category: 't-test',
      })
    })

    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('unknown-method-xyz')
  })

  it('null은 그대로 null로 저장한다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod(null)
    })

    expect(useAnalysisStore.getState().selectedMethod).toBeNull()
  })

  it('alias 정규화 시 원본 name은 보존되고 canonical entry의 name으로 덮어쓰지 않는다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'anova',
        name: '사용자 지정 라벨',
        description: '',
        category: 'anova',
      })
    })

    const stored = useAnalysisStore.getState().selectedMethod
    expect(stored?.id).toBe('one-way-anova')
    expect(stored?.name).toBe('사용자 지정 라벨')
  })
})
