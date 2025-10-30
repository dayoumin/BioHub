/**
 * Wilcoxon Signed-Rank Test 테스트
 *
 * 목적: wilcoxonSignedRankTest 메서드가 Python Worker와 올바르게 연결되고
 *       SciPy의 wilcoxon 함수를 정확히 호출하는지 검증
 */

import { pyodideStats } from '@/lib/services/pyodide-statistics'

describe('Wilcoxon Signed-Rank Test', () => {
  beforeAll(async () => {
    // Pyodide 초기화 (최대 30초 대기)
    await pyodideStats.initialize()
  }, 30000)

  it('should calculate Wilcoxon test with paired data', async () => {
    // 샘플 데이터: 약물 투여 전후 혈압 변화
    const before = [145, 150, 148, 152, 149, 147, 151, 146, 150, 148]
    const after = [138, 142, 140, 145, 141, 139, 143, 138, 142, 140]

    const result = await pyodideStats.wilcoxonSignedRankTest(before, after)

    // 기본 필드 검증
    expect(result).toHaveProperty('statistic')
    expect(result).toHaveProperty('pValue')
    expect(result).toHaveProperty('nobs')
    expect(result).toHaveProperty('zScore')
    expect(result).toHaveProperty('medianDiff')

    // 타입 검증
    expect(typeof result.statistic).toBe('number')
    expect(typeof result.pValue).toBe('number')
    expect(typeof result.nobs).toBe('number')
    expect(typeof result.zScore).toBe('number')
    expect(typeof result.medianDiff).toBe('number')

    // 값 범위 검증
    expect(result.pValue).toBeGreaterThanOrEqual(0)
    expect(result.pValue).toBeLessThanOrEqual(1)
    expect(result.nobs).toBe(10)

    // 효과크기 검증
    expect(result.effectSize).toHaveProperty('value')
    expect(result.effectSize).toHaveProperty('interpretation')
    expect(typeof result.effectSize.value).toBe('number')
    expect(['작은 효과크기', '중간 효과크기', '큰 효과크기']).toContain(
      result.effectSize.interpretation
    )

    // 기술통계 검증
    expect(result.descriptives).toHaveProperty('before')
    expect(result.descriptives).toHaveProperty('after')
    expect(result.descriptives).toHaveProperty('differences')

    // before 통계
    expect(result.descriptives.before.median).toBeCloseTo(149, 1)
    expect(result.descriptives.before.mean).toBeCloseTo(148.6, 1)

    // after 통계
    expect(result.descriptives.after.median).toBeCloseTo(140.5, 1)
    expect(result.descriptives.after.mean).toBeCloseTo(140.8, 1)

    // differences 통계 + counts
    expect(result.descriptives.differences).toHaveProperty('median')
    expect(result.descriptives.differences).toHaveProperty('positive')
    expect(result.descriptives.differences).toHaveProperty('negative')
    expect(result.descriptives.differences).toHaveProperty('ties')

    // 모든 차이가 양수여야 함 (before > after)
    expect(result.descriptives.differences.positive).toBe(10)
    expect(result.descriptives.differences.negative).toBe(0)
    expect(result.descriptives.differences.ties).toBe(0)

    // 통계적 유의성 확인 (기대: p < 0.05)
    expect(result.pValue).toBeLessThan(0.05)
  }, 10000)

  it('should handle data with ties', async () => {
    const before = [100, 105, 100, 110, 108, 100]
    const after = [100, 100, 95, 105, 103, 98]

    const result = await pyodideStats.wilcoxonSignedRankTest(before, after)

    expect(result.descriptives.differences.ties).toBeGreaterThan(0)
    expect(result.descriptives.differences.positive +
           result.descriptives.differences.negative +
           result.descriptives.differences.ties).toBe(result.nobs)
  })

  it('should handle negative differences', async () => {
    // 역방향: after > before
    const before = [50, 55, 52, 58]
    const after = [60, 65, 62, 68]

    const result = await pyodideStats.wilcoxonSignedRankTest(before, after)

    // 모든 차이가 음수여야 함
    expect(result.descriptives.differences.negative).toBe(4)
    expect(result.descriptives.differences.positive).toBe(0)
    expect(result.medianDiff).toBeLessThan(0)
  })

  it('should reject with insufficient data', async () => {
    const before = [100]
    const after = [105]

    await expect(
      pyodideStats.wilcoxonSignedRankTest(before, after)
    ).rejects.toThrow(/at least 2/)
  })

  it('should have consistent result structure with WilcoxonResult interface', async () => {
    const before = [10, 12, 11, 13, 14]
    const after = [8, 10, 9, 11, 12]

    const result = await pyodideStats.wilcoxonSignedRankTest(before, after)

    // WilcoxonResult 인터페이스와 정확히 일치하는지 확인
    const expectedKeys = [
      'statistic',
      'pValue',
      'nobs',
      'zScore',
      'medianDiff',
      'effectSize',
      'descriptives'
    ]

    expectedKeys.forEach(key => {
      expect(result).toHaveProperty(key)
    })

    // effectSize 구조
    expect(result.effectSize).toHaveProperty('value')
    expect(result.effectSize).toHaveProperty('interpretation')

    // descriptives 구조
    expect(result.descriptives).toHaveProperty('before')
    expect(result.descriptives).toHaveProperty('after')
    expect(result.descriptives).toHaveProperty('differences')

    // differences는 positive, negative, ties를 포함해야 함
    expect(result.descriptives.differences).toHaveProperty('positive')
    expect(result.descriptives.differences).toHaveProperty('negative')
    expect(result.descriptives.differences).toHaveProperty('ties')
    expect(result.descriptives.differences).toHaveProperty('median')
    expect(result.descriptives.differences).toHaveProperty('mean')
  })
})
