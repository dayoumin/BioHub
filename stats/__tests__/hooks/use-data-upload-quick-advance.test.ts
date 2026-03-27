/**
 * use-data-upload — quick 분석 자동 전진 배치 로직 테스트
 *
 * 빠른 분석 모드에서 업로드 완료 시 사용되는
 * Zustand setState updater 함수의 정확성 검증.
 */

import { describe, it, expect } from 'vitest'

/**
 * use-data-upload.ts 내부의 setState updater 재현:
 * ```ts
 * useAnalysisStore.setState((state) => ({
 *   completedSteps: [...new Set([...state.completedSteps, 1, 2])],
 *   currentStep: 3,
 * }))
 * ```
 */
function quickAdvanceUpdater(state: { completedSteps: number[] }): {
  completedSteps: number[]
  currentStep: number
} {
  return {
    completedSteps: [...new Set([...state.completedSteps, 1, 2])],
    currentStep: 3,
  }
}

describe('quick advance setState updater', () => {
  it('빈 completedSteps → [1, 2] + currentStep=3', () => {
    const result = quickAdvanceUpdater({ completedSteps: [] })
    expect(result.completedSteps).toEqual([1, 2])
    expect(result.currentStep).toBe(3)
  })

  it('이미 Step 1 완료 → [1, 2] (중복 없음)', () => {
    const result = quickAdvanceUpdater({ completedSteps: [1] })
    expect(result.completedSteps).toEqual([1, 2])
    expect(result.currentStep).toBe(3)
  })

  it('이미 Step 1,2 완료 → [1, 2] (멱등)', () => {
    const result = quickAdvanceUpdater({ completedSteps: [1, 2] })
    expect(result.completedSteps).toEqual([1, 2])
    expect(result.currentStep).toBe(3)
  })

  it('다른 단계가 이미 있어도 보존 + 1,2 추가', () => {
    const result = quickAdvanceUpdater({ completedSteps: [4] })
    expect(result.completedSteps).toContain(1)
    expect(result.completedSteps).toContain(2)
    expect(result.completedSteps).toContain(4)
    expect(result.completedSteps).toHaveLength(3)
    expect(result.currentStep).toBe(3)
  })
})
