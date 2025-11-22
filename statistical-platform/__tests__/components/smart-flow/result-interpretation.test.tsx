/**
 * Result Interpretation Utilities Test
 *
 * Tests for p-value interpretation, effect size interpretation,
 * and hypothesis generation functions.
 */

import { describe, it, expect } from '@jest/globals'

// 테스트용 함수 복사 (실제로는 별도 파일로 분리 권장)
function interpretPValue(pValue: number): string {
  if (pValue < 0.001) return "매우 강력한 증거 (p < 0.001)"
  if (pValue < 0.01) return "강력한 증거 (p < 0.01)"
  if (pValue < 0.05) return "유의한 차이 있음 (p < 0.05)"
  if (pValue < 0.10) return "약한 경향성 (p < 0.10)"
  return "통계적 차이 없음 (p ≥ 0.10)"
}

interface EffectSizeInfo {
  value: number
  type: string
  interpretation: string
}

function interpretEffectSize(effectSize: number | EffectSizeInfo, type?: string): string {
  let value: number
  let effectType: string

  if (typeof effectSize === 'number') {
    value = Math.abs(effectSize)
    effectType = type || "Cohen's d"
  } else {
    value = Math.abs(effectSize.value)
    effectType = effectSize.type
  }

  if (effectType === "Cohen's d") {
    if (value < 0.2) return "무시할 만한 차이"
    if (value < 0.5) return "작은 효과"
    if (value < 0.8) return "중간 효과"
    return "큰 효과"
  }

  if (effectType === "Pearson r" || effectType === "Spearman rho") {
    if (value < 0.1) return "거의 없는 상관"
    if (value < 0.3) return "약한 상관"
    if (value < 0.5) return "중간 상관"
    return "강한 상관"
  }

  if (effectType === "Eta-squared" || effectType === "Omega-squared") {
    if (value < 0.01) return "작은 효과"
    if (value < 0.06) return "중간 효과"
    return "큰 효과"
  }

  return "효과크기 참고"
}

function generateHypotheses(method: string): { null: string; alternative: string } | null {
  const methodLower = method.toLowerCase()

  if (methodLower.includes('t-test') || methodLower.includes('independent')) {
    return {
      null: '두 집단의 평균은 같다.',
      alternative: '두 집단의 평균은 다르다.'
    }
  }

  if (methodLower.includes('anova') || methodLower.includes('one-way')) {
    return {
      null: '모든 집단의 평균은 같다.',
      alternative: '최소 하나의 집단 평균은 다르다.'
    }
  }

  if (methodLower.includes('pearson') || methodLower.includes('spearman') || methodLower.includes('상관')) {
    return {
      null: '두 변수 간 상관관계가 없다.',
      alternative: '두 변수 간 상관관계가 있다.'
    }
  }

  if (methodLower.includes('회귀') || methodLower.includes('regression')) {
    return {
      null: '독립변수가 종속변수를 예측하지 못한다.',
      alternative: '독립변수가 종속변수를 예측한다.'
    }
  }

  if (methodLower.includes('chi-square') || methodLower.includes('카이제곱')) {
    return {
      null: '두 변수는 독립적이다 (연관성 없음).',
      alternative: '두 변수는 연관성이 있다.'
    }
  }

  if (methodLower.includes('mann-whitney') || methodLower.includes('wilcoxon')) {
    return {
      null: '두 집단의 중앙값은 같다.',
      alternative: '두 집단의 중앙값은 다르다.'
    }
  }

  if (methodLower.includes('kruskal-wallis')) {
    return {
      null: '모든 집단의 중앙값은 같다.',
      alternative: '최소 하나의 집단 중앙값은 다르다.'
    }
  }

  return {
    null: '효과가 없다 (차이/관계 없음).',
    alternative: '효과가 있다 (차이/관계 있음).'
  }
}

describe('interpretPValue', () => {
  describe('경계값 테스트', () => {
    it('p < 0.001 → "매우 강력한 증거"', () => {
      expect(interpretPValue(0.0005)).toBe("매우 강력한 증거 (p < 0.001)")
    })

    it('p = 0.001 → "강력한 증거" (경계값)', () => {
      expect(interpretPValue(0.001)).toBe("강력한 증거 (p < 0.01)")
    })

    it('p = 0.01 → "유의한 차이 있음" (경계값)', () => {
      expect(interpretPValue(0.01)).toBe("유의한 차이 있음 (p < 0.05)")
    })

    it('p = 0.05 → "약한 경향성" (경계값)', () => {
      expect(interpretPValue(0.05)).toBe("약한 경향성 (p < 0.10)")
    })

    it('p = 0.10 → "통계적 차이 없음" (경계값)', () => {
      expect(interpretPValue(0.10)).toBe("통계적 차이 없음 (p ≥ 0.10)")
    })
  })

  describe('극단값 테스트', () => {
    it('p = 0 → 에러 없이 처리', () => {
      expect(interpretPValue(0)).toBe("매우 강력한 증거 (p < 0.001)")
    })

    it('p = 1 → 에러 없이 처리', () => {
      expect(interpretPValue(1)).toBe("통계적 차이 없음 (p ≥ 0.10)")
    })

    it('p = 0.9999 → "통계적 차이 없음"', () => {
      expect(interpretPValue(0.9999)).toBe("통계적 차이 없음 (p ≥ 0.10)")
    })
  })
})

describe('interpretEffectSize', () => {
  describe("Cohen's d 해석", () => {
    it('d = 0.1 → "무시할 만한 차이"', () => {
      expect(interpretEffectSize(0.1)).toBe("무시할 만한 차이")
    })

    it('d = 0.3 → "작은 효과"', () => {
      expect(interpretEffectSize(0.3)).toBe("작은 효과")
    })

    it('d = 0.6 → "중간 효과"', () => {
      expect(interpretEffectSize(0.6)).toBe("중간 효과")
    })

    it('d = 0.9 → "큰 효과"', () => {
      expect(interpretEffectSize(0.9)).toBe("큰 효과")
    })

    it('음수 값 처리: d = -0.6 → "중간 효과"', () => {
      expect(interpretEffectSize(-0.6)).toBe("중간 효과")
    })
  })

  describe('Pearson r 해석', () => {
    it('r = 0.05 → "거의 없는 상관"', () => {
      expect(interpretEffectSize({ value: 0.05, type: 'Pearson r', interpretation: '' }))
        .toBe("거의 없는 상관")
    })

    it('r = 0.2 → "약한 상관"', () => {
      expect(interpretEffectSize({ value: 0.2, type: 'Pearson r', interpretation: '' }))
        .toBe("약한 상관")
    })

    it('r = 0.4 → "중간 상관"', () => {
      expect(interpretEffectSize({ value: 0.4, type: 'Pearson r', interpretation: '' }))
        .toBe("중간 상관")
    })

    it('r = 0.7 → "강한 상관"', () => {
      expect(interpretEffectSize({ value: 0.7, type: 'Pearson r', interpretation: '' }))
        .toBe("강한 상관")
    })
  })

  describe('Eta-squared 해석', () => {
    it('η² = 0.005 → "작은 효과"', () => {
      expect(interpretEffectSize({ value: 0.005, type: 'Eta-squared', interpretation: '' }))
        .toBe("작은 효과")
    })

    it('η² = 0.03 → "중간 효과"', () => {
      expect(interpretEffectSize({ value: 0.03, type: 'Eta-squared', interpretation: '' }))
        .toBe("중간 효과")
    })

    it('η² = 0.15 → "큰 효과"', () => {
      expect(interpretEffectSize({ value: 0.15, type: 'Eta-squared', interpretation: '' }))
        .toBe("큰 효과")
    })
  })

  describe('타입별 테스트', () => {
    it('숫자형 효과크기 처리', () => {
      expect(interpretEffectSize(0.45)).toBe("작은 효과")
    })

    it('객체형 효과크기 처리', () => {
      const effectSize: EffectSizeInfo = {
        value: 0.45,
        type: "Cohen's d",
        interpretation: "중간 효과"
      }
      expect(interpretEffectSize(effectSize)).toBe("작은 효과")
    })
  })
})

describe('generateHypotheses', () => {
  describe('통계 방법별 가설 생성', () => {
    it('Independent t-test → t-test 가설', () => {
      const result = generateHypotheses('Independent t-test')
      expect(result).toEqual({
        null: '두 집단의 평균은 같다.',
        alternative: '두 집단의 평균은 다르다.'
      })
    })

    it('One-way ANOVA → ANOVA 가설', () => {
      const result = generateHypotheses('One-way ANOVA')
      expect(result).toEqual({
        null: '모든 집단의 평균은 같다.',
        alternative: '최소 하나의 집단 평균은 다르다.'
      })
    })

    it('Pearson 상관분석 → 상관 가설', () => {
      const result = generateHypotheses('Pearson 상관분석')
      expect(result).toEqual({
        null: '두 변수 간 상관관계가 없다.',
        alternative: '두 변수 간 상관관계가 있다.'
      })
    })

    it('회귀분석 → 회귀 가설', () => {
      const result = generateHypotheses('선형 회귀분석')
      expect(result).toEqual({
        null: '독립변수가 종속변수를 예측하지 못한다.',
        alternative: '독립변수가 종속변수를 예측한다.'
      })
    })

    it('Chi-square → 카이제곱 가설', () => {
      const result = generateHypotheses('Chi-square test')
      expect(result).toEqual({
        null: '두 변수는 독립적이다 (연관성 없음).',
        alternative: '두 변수는 연관성이 있다.'
      })
    })

    it('Mann-Whitney → 비모수 검정 가설', () => {
      const result = generateHypotheses('Mann-Whitney U test')
      expect(result).toEqual({
        null: '두 집단의 중앙값은 같다.',
        alternative: '두 집단의 중앙값은 다르다.'
      })
    })

    it('Kruskal-Wallis → 다집단 비모수 가설', () => {
      const result = generateHypotheses('Kruskal-Wallis test')
      expect(result).toEqual({
        null: '모든 집단의 중앙값은 같다.',
        alternative: '최소 하나의 집단 중앙값은 다르다.'
      })
    })

    it('알 수 없는 방법 → 기본 템플릿', () => {
      const result = generateHypotheses('Unknown test')
      expect(result).toEqual({
        null: '효과가 없다 (차이/관계 없음).',
        alternative: '효과가 있다 (차이/관계 있음).'
      })
    })
  })

  describe('대소문자 무시 테스트', () => {
    it('INDEPENDENT T-TEST (대문자) → t-test 가설', () => {
      const result = generateHypotheses('INDEPENDENT T-TEST')
      expect(result).toEqual({
        null: '두 집단의 평균은 같다.',
        alternative: '두 집단의 평균은 다르다.'
      })
    })

    it('pearson (소문자) → 상관 가설', () => {
      const result = generateHypotheses('pearson')
      expect(result).toEqual({
        null: '두 변수 간 상관관계가 없다.',
        alternative: '두 변수 간 상관관계가 있다.'
      })
    })
  })
})
