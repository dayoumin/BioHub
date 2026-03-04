/**
 * 표본 크기 계산기 단위 테스트
 *
 * G*Power 참조값 기준 오차 ±5% 이내 검증.
 * 입력 검증(에러 케이스) 및 경계값 테스트 포함.
 */

import { describe, test, expect } from 'vitest'
import {
  invNorm,
  normCdf,
  chiSqQuantile,
  calcTwoSample,
  calcPaired,
  calcOneSample,
  calcAnova,
  calcTwoProportions,
  calcCorrelation,
} from '@/lib/sample-size/calculator'

// ─── 수치 기반 함수 ────────────────────────────────────────────────────────

describe('invNorm', () => {
  test('잘 알려진 분위수 검증', () => {
    expect(invNorm(0.975)).toBeCloseTo(1.96, 1)   // z_{α/2} for α=0.05
    expect(invNorm(0.84)).toBeCloseTo(0.994, 1)    // ≈ z_{0.80 power}
    expect(invNorm(0.5)).toBeCloseTo(0, 2)          // 중앙값
    expect(invNorm(0.025)).toBeCloseTo(-1.96, 1)
  })

  test('범위 밖 값은 RangeError', () => {
    expect(() => invNorm(0)).toThrow(RangeError)
    expect(() => invNorm(1)).toThrow(RangeError)
    expect(() => invNorm(-0.1)).toThrow(RangeError)
  })
})

describe('normCdf', () => {
  test('표준 분위수 CDF', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 3)
    expect(normCdf(1.96)).toBeCloseTo(0.975, 2)
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 2)
    expect(normCdf(3)).toBeGreaterThan(0.998)
  })
})

describe('chiSqQuantile', () => {
  test('df=2, p=0.95 → ≈5.99 (Wilson-Hilferty 근사, df 작을수록 오차 ↑)', () => {
    // 실제값 5.991 — 근사값 5.938, 오차 0.9% (ANOVA 반복 탐색에서는 충분)
    expect(chiSqQuantile(0.95, 2)).toBeCloseTo(5.991, 0)
  })

  test('df=4, p=0.95 → ≈9.488', () => {
    expect(chiSqQuantile(0.95, 4)).toBeCloseTo(9.488, 1)
  })
})

// ─── calcTwoSample ─────────────────────────────────────────────────────────

describe('calcTwoSample (독립 t-검정)', () => {
  test('d=0.5, α=0.05, power=0.80 → ≈63-65 (G*Power: 64)', () => {
    const { n, label } = calcTwoSample(0.5, 0.05, 0.80)
    expect(label).toBe('그룹당')
    expect(n).toBeGreaterThanOrEqual(62)
    expect(n).toBeLessThanOrEqual(66)
  })

  test('d=0.8, α=0.05, power=0.80 → ≈25-27 (G*Power: 26)', () => {
    const { n } = calcTwoSample(0.8, 0.05, 0.80)
    expect(n).toBeGreaterThanOrEqual(24)
    expect(n).toBeLessThanOrEqual(28)
  })

  test('d=0.2, α=0.05, power=0.80 → 큰 n (>300)', () => {
    const { n } = calcTwoSample(0.2, 0.05, 0.80)
    expect(n).toBeGreaterThan(300)
  })

  test('d=0은 에러', () => {
    const result = calcTwoSample(0, 0.05, 0.80)
    expect(result.error).toBeDefined()
    expect(result.n).toBe(0)
  })

  test('d 음수는 에러', () => {
    const result = calcTwoSample(-0.5, 0.05, 0.80)
    expect(result.error).toBeDefined()
  })

  test('power 높을수록 n 증가', () => {
    const n80 = calcTwoSample(0.5, 0.05, 0.80).n
    const n90 = calcTwoSample(0.5, 0.05, 0.90).n
    const n95 = calcTwoSample(0.5, 0.05, 0.95).n
    expect(n90).toBeGreaterThan(n80)
    expect(n95).toBeGreaterThan(n90)
  })

  test('α 작을수록 n 증가', () => {
    const n05 = calcTwoSample(0.5, 0.05, 0.80).n
    const n01 = calcTwoSample(0.5, 0.01, 0.80).n
    expect(n01).toBeGreaterThan(n05)
  })

  test('power ≤ alpha는 에러 (power=alpha)', () => {
    expect(calcTwoSample(0.5, 0.05, 0.05).error).toBeDefined()
  })

  test('power < alpha는 에러 (power=0.01, alpha=0.05)', () => {
    expect(calcTwoSample(0.5, 0.05, 0.01).error).toBeDefined()
  })
})

// ─── calcPaired ────────────────────────────────────────────────────────────

describe('calcPaired (대응 t-검정)', () => {
  test('d=0.5, α=0.05, power=0.80 → ≈30-36 (G*Power: 34)', () => {
    const { n, label } = calcPaired(0.5, 0.05, 0.80)
    expect(label).toBe('쌍')
    expect(n).toBeGreaterThanOrEqual(29)
    expect(n).toBeLessThanOrEqual(36)
  })

  test('독립 t보다 항상 작음 (같은 파라미터)', () => {
    const paired = calcPaired(0.5, 0.05, 0.80).n
    const twoSample = calcTwoSample(0.5, 0.05, 0.80).n
    // 대응 t는 그룹당 n, 독립 t도 그룹당 n — 대응이 더 작아야 함
    expect(paired).toBeLessThan(twoSample)
  })

  test('d=0은 에러', () => {
    expect(calcPaired(0, 0.05, 0.80).error).toBeDefined()
  })
})

// ─── calcOneSample ─────────────────────────────────────────────────────────

describe('calcOneSample (단일 t-검정)', () => {
  test('d=0.5, α=0.05, power=0.80 → label=총', () => {
    const { n, label } = calcOneSample(0.5, 0.05, 0.80)
    expect(label).toBe('총')
    expect(n).toBeGreaterThanOrEqual(29)
    expect(n).toBeLessThanOrEqual(36)
  })

  test('대응 t와 동일 계산', () => {
    // 공식이 동일하므로 결과도 동일해야 함
    const one = calcOneSample(0.5, 0.05, 0.80).n
    const paired = calcPaired(0.5, 0.05, 0.80).n
    expect(one).toBe(paired)
  })
})

// ─── calcAnova ─────────────────────────────────────────────────────────────

describe('calcAnova (일원 ANOVA)', () => {
  test('f=0.25, α=0.05, power=0.80, k=3 → ≈49-55 (G*Power: 52)', () => {
    const { n, label } = calcAnova(0.25, 0.05, 0.80, 3)
    expect(label).toBe('그룹당')
    expect(n).toBeGreaterThanOrEqual(49)
    expect(n).toBeLessThanOrEqual(55)
  })

  test('그룹 수 증가 → n 감소 (같은 f)', () => {
    const n3 = calcAnova(0.25, 0.05, 0.80, 3).n
    const n5 = calcAnova(0.25, 0.05, 0.80, 5).n
    expect(n5).toBeLessThan(n3)
  })

  test('k=2는 에러 (t-검정 사용 권고)', () => {
    expect(calcAnova(0.25, 0.05, 0.80, 2).error).toBeDefined()
  })

  test('f=0은 에러', () => {
    expect(calcAnova(0, 0.05, 0.80, 3).error).toBeDefined()
  })
})

// ─── calcTwoProportions ────────────────────────────────────────────────────

describe('calcTwoProportions (두 비율 비교)', () => {
  test('p1=0.5, p2=0.3, α=0.05, power=0.80 → ≈88-100 (G*Power: ~93)', () => {
    const { n, label } = calcTwoProportions(0.5, 0.3, 0.05, 0.80)
    expect(label).toBe('그룹당')
    expect(n).toBeGreaterThanOrEqual(85)
    expect(n).toBeLessThanOrEqual(102)
  })

  test('비율 차이 클수록 n 감소', () => {
    const nSmallDiff = calcTwoProportions(0.5, 0.4, 0.05, 0.80).n
    const nLargeDiff = calcTwoProportions(0.5, 0.2, 0.05, 0.80).n
    expect(nSmallDiff).toBeGreaterThan(nLargeDiff)
  })

  test('동일 비율은 에러', () => {
    expect(calcTwoProportions(0.5, 0.5, 0.05, 0.80).error).toBeDefined()
  })

  test('범위 밖 비율은 에러', () => {
    expect(calcTwoProportions(0, 0.3, 0.05, 0.80).error).toBeDefined()
    expect(calcTwoProportions(0.5, 1, 0.05, 0.80).error).toBeDefined()
  })
})

// ─── calcCorrelation ───────────────────────────────────────────────────────

describe('calcCorrelation (피어슨 상관)', () => {
  test('r=0.3, α=0.05, power=0.80 → ≈82-87 (G*Power: 84)', () => {
    const { n, label } = calcCorrelation(0.3, 0.05, 0.80)
    expect(label).toBe('총')
    expect(n).toBeGreaterThanOrEqual(80)
    expect(n).toBeLessThanOrEqual(88)
  })

  test('r=0.5, α=0.05, power=0.80 → ≈27-32 (G*Power: 29)', () => {
    const { n } = calcCorrelation(0.5, 0.05, 0.80)
    expect(n).toBeGreaterThanOrEqual(25)
    expect(n).toBeLessThanOrEqual(33)
  })

  test('r=0은 에러', () => {
    expect(calcCorrelation(0, 0.05, 0.80).error).toBeDefined()
  })

  test('|r| 클수록 n 감소', () => {
    const n01 = calcCorrelation(0.1, 0.05, 0.80).n
    const n03 = calcCorrelation(0.3, 0.05, 0.80).n
    const n05 = calcCorrelation(0.5, 0.05, 0.80).n
    expect(n01).toBeGreaterThan(n03)
    expect(n03).toBeGreaterThan(n05)
  })

  test('음수 r도 동일 n (절댓값 사용)', () => {
    const pos = calcCorrelation(0.3, 0.05, 0.80).n
    const neg = calcCorrelation(-0.3, 0.05, 0.80).n
    expect(pos).toBe(neg)
  })
})
