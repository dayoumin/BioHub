/**
 * U1 네비게이션 계약 통일 + 변경 시점 무효화 테스트
 *
 * - canNavigateToStep / navigateToStep 규칙 일치
 * - 이전 단계 항상 이동 가능
 * - 전진 점프는 사전 마킹 필요 (isForwardSkip 우회 제거)
 * - updateVariableMappingWithInvalidation 변경 시 무효화
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

describe('U1: 네비게이션 계약 통일', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
    })
  })

  // ===== canNavigateToStep =====
  describe('canNavigateToStep', () => {
    it('현재 단계로 이동 허용', () => {
      act(() => { useAnalysisStore.getState().setCurrentStep(2) })
      expect(useAnalysisStore.getState().canNavigateToStep(2)).toBe(true)
    })

    it('이전 단계 항상 허용 (completedSteps 무관)', () => {
      act(() => { useAnalysisStore.getState().setCurrentStep(3) })
      const store = useAnalysisStore.getState()
      // completedSteps에 Step 1이 없어도 이동 가능
      expect(store.completedSteps).not.toContain(1)
      expect(store.canNavigateToStep(1)).toBe(true)
      expect(store.canNavigateToStep(2)).toBe(true)
    })

    it('중간 단계 모두 완료 시 전방 이동 허용', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(1)
        store.addCompletedStep(1)
        store.addCompletedStep(2)
      })
      expect(useAnalysisStore.getState().canNavigateToStep(3)).toBe(true)
    })

    it('중간 단계 미완료 시 전방 이동 불허 (목표만 완료돼도)', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(1)
        store.addCompletedStep(3)  // 목표만 완료, 중간(Step 2) 미완료
      })
      // shortcut 제거: 목표가 completedSteps에 있어도 중간 단계 미완료면 불허
      expect(useAnalysisStore.getState().canNavigateToStep(3)).toBe(false)
    })

    it('미완료 전방 단계 불허', () => {
      act(() => { useAnalysisStore.getState().setCurrentStep(1) })
      expect(useAnalysisStore.getState().canNavigateToStep(3)).toBe(false)
    })
  })

  // ===== navigateToStep — 우회 제거 =====
  describe('navigateToStep 우회 제거', () => {
    it('미완료 전방 단계로 이동 시도 → 무시됨', () => {
      act(() => { useAnalysisStore.getState().setCurrentStep(1) })
      act(() => { useAnalysisStore.getState().navigateToStep(3) })
      // isForwardSkip 우회 없으므로 이동 안 됨
      expect(useAnalysisStore.getState().currentStep).toBe(1)
    })

    it('사전 마킹 후 전방 이동 허용 (1→4, Step 1-3 모두 완료)', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(1)
        store.addCompletedStep(1)
        store.addCompletedStep(2)
        store.addCompletedStep(3)
      })
      act(() => { useAnalysisStore.getState().navigateToStep(4) })
      // Step 1-3 모두 완료 → Step 4 이동 허용
      expect(useAnalysisStore.getState().currentStep).toBe(4)
    })

    it('사전 마킹 포함한 정상 점프 (Quick 패턴)', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(1)
        store.addCompletedStep(1)
        store.addCompletedStep(2)
      })
      act(() => { useAnalysisStore.getState().navigateToStep(3) })
      expect(useAnalysisStore.getState().currentStep).toBe(3)
    })

    it('이전 단계로 이동 — 항상 허용', () => {
      act(() => { useAnalysisStore.getState().setCurrentStep(4) })
      act(() => { useAnalysisStore.getState().navigateToStep(1) })
      expect(useAnalysisStore.getState().currentStep).toBe(1)
    })

    it('전진 navigateToStep 시 현재 단계가 completedSteps에 추가됨', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(2)
        store.addCompletedStep(2)
      })
      act(() => { useAnalysisStore.getState().navigateToStep(3) })
      expect(useAnalysisStore.getState().completedSteps).toContain(2)
      expect(useAnalysisStore.getState().currentStep).toBe(3)
    })

    it('뒤로가기 시 현재 단계를 completedSteps에 추가하지 않음', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(2)
        // Step 2는 completedSteps에 없는 상태
      })
      act(() => { useAnalysisStore.getState().navigateToStep(1) })
      // 뒤로가기는 "포기"이므로 Step 2가 완료 처리되면 안 됨
      expect(useAnalysisStore.getState().completedSteps).not.toContain(2)
      expect(useAnalysisStore.getState().currentStep).toBe(1)
    })

    it('뒤로가기 후 미완료 전방 단계 접근 불가 (Hub no-method 시나리오)', () => {
      // Hub → addCompletedStep(1) → navigateToStep(2) → stepper로 Step 1
      act(() => {
        const store = useAnalysisStore.getState()
        store.setCurrentStep(1)
        store.addCompletedStep(1)
      })
      act(() => { useAnalysisStore.getState().navigateToStep(2) })
      expect(useAnalysisStore.getState().currentStep).toBe(2)

      // 뒤로가기: Step 2가 completedSteps에 추가되면 안 됨
      act(() => { useAnalysisStore.getState().navigateToStep(1) })
      expect(useAnalysisStore.getState().currentStep).toBe(1)
      expect(useAnalysisStore.getState().completedSteps).not.toContain(2)

      // Step 3 접근 불가 (Step 2 미완료)
      expect(useAnalysisStore.getState().canNavigateToStep(3)).toBe(false)
    })
  })
})

describe('U1-3: updateVariableMappingWithInvalidation', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
    })
  })

  it('변수 변경 시 results + assumptionResults null + completedSteps에서 Step 4 제거', () => {
    act(() => {
      const store = useAnalysisStore.getState()
      store.setResults({ method: 't-test', pValue: 0.05 } as never)
      store.setAssumptionResults({ normality: { passed: true } } as never)
      store.setVariableMapping({ dependentVar: 'A', groupVar: 'G' })
      store.addCompletedStep(1)
      store.addCompletedStep(2)
      store.addCompletedStep(3)
      store.addCompletedStep(4)
    })

    // before: results와 assumptionResults가 설정된 상태
    expect(useAnalysisStore.getState().results).not.toBeNull()
    expect(useAnalysisStore.getState().assumptionResults).not.toBeNull()
    expect(useAnalysisStore.getState().completedSteps).toContain(4)

    act(() => {
      useAnalysisStore.getState().updateVariableMappingWithInvalidation({
        dependentVar: 'B', groupVar: 'G'
      })
    })

    const store = useAnalysisStore.getState()
    expect(store.results).toBeNull()
    expect(store.assumptionResults).toBeNull()
    expect(store.variableMapping?.dependentVar).toBe('B')
    // completedSteps에서 Step 4가 제거됨
    expect(store.completedSteps).not.toContain(4)
    expect(store.completedSteps).toContain(1)
    expect(store.completedSteps).toContain(2)
    expect(store.completedSteps).toContain(3)
  })

  it('pruneCompletedStepsFrom: 지정 단계 이후만 제거', () => {
    act(() => {
      const store = useAnalysisStore.getState()
      store.addCompletedStep(1)
      store.addCompletedStep(2)
      store.addCompletedStep(3)
      store.addCompletedStep(4)
    })

    // before: 4개 모두 완료 상태
    expect(useAnalysisStore.getState().completedSteps).toEqual([1, 2, 3, 4])

    act(() => {
      useAnalysisStore.getState().pruneCompletedStepsFrom(3)
    })

    const store = useAnalysisStore.getState()
    expect(store.completedSteps).toEqual([1, 2])
    expect(store.completedSteps).toContain(1)
    expect(store.completedSteps).toContain(2)
    expect(store.completedSteps).not.toContain(3)
    expect(store.completedSteps).not.toContain(4)
  })

  it('순수 setVariableMapping은 results를 유지', () => {
    act(() => {
      const store = useAnalysisStore.getState()
      store.setResults({ method: 't-test', pValue: 0.05 } as never)
      store.setVariableMapping({ dependentVar: 'A', groupVar: 'G' })
    })

    act(() => {
      useAnalysisStore.getState().setVariableMapping({
        dependentVar: 'B', groupVar: 'G'
      })
    })

    const store = useAnalysisStore.getState()
    expect(store.results).not.toBeNull()
    expect(store.variableMapping?.dependentVar).toBe('B')
  })
})
