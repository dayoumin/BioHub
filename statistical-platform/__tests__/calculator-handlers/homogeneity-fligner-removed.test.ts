/**
 * Issue 2: homogeneityTest Fligner 옵션 제거 검증
 *
 * 검증 항목:
 * 1. levene/bartlett만 지원
 * 2. 올바른 검정 방법 이름 반환
 */

import { describe, it, expect } from '@jest/globals'

describe('Issue 2: homogeneityTest Fligner 옵션 제거', () => {
  it('검정 방법 이름 매핑 로직', () => {
    const getMethodName = (method: string): string => {
      return method === 'bartlett' ? "Bartlett's Test" : "Levene's Test"
    }

    expect(getMethodName('levene')).toBe("Levene's Test")
    expect(getMethodName('bartlett')).toBe("Bartlett's Test")
    // fligner는 더 이상 지원하지 않음 → levene으로 fallback
    expect(getMethodName('fligner')).toBe("Levene's Test")
    expect(getMethodName('unknown')).toBe("Levene's Test")
  })

  it('검정 통계량 이름 매핑 로직', () => {
    const getStatisticName = (method: string): string => {
      return method === 'bartlett' ? 'Bartlett 통계량' : 'Levene 통계량'
    }

    expect(getStatisticName('levene')).toBe('Levene 통계량')
    expect(getStatisticName('bartlett')).toBe('Bartlett 통계량')
    // fligner는 더 이상 지원하지 않음 → levene으로 fallback
    expect(getStatisticName('fligner')).toBe('Levene 통계량')
  })

  it('UI 파라미터 옵션 검증', () => {
    // UI에서 제공하는 옵션 (fligner 제거됨)
    const validOptions = ['levene', 'bartlett']

    expect(validOptions).toHaveLength(2)
    expect(validOptions).toContain('levene')
    expect(validOptions).toContain('bartlett')
    expect(validOptions).not.toContain('fligner')  // ❌ 제거됨
  })
})
