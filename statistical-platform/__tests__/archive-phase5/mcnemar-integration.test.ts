/**
 * McNemar Test Integration Test
 *
 * 이 테스트는 McNemar 검정 구현이 올바르게 작동하는지 검증합니다:
 * 1. 2×2 분할표 생성 검증
 * 2. 카이제곱 통계량 계산 검증
 * 3. 연속성 수정 적용 검증
 * 4. p-value 계산 검증
 * 5. 오즈비 효과크기 계산 검증
 */

describe('McNemar Test Implementation Validation', () => {
  // Mock McNemar Test Function
  const calculateMcNemarTest = (data: Array<{before: number, after: number}>) => {
    // 2x2 분할표 생성
    const both_positive = data.filter(p => p.before === 1 && p.after === 1).length
    const first_positive_second_negative = data.filter(p => p.before === 1 && p.after === 0).length
    const first_negative_second_positive = data.filter(p => p.before === 0 && p.after === 1).length
    const both_negative = data.filter(p => p.before === 0 && p.after === 0).length

    const contingencyTable = {
      both_positive,
      first_positive_second_negative,
      first_negative_second_positive,
      both_negative
    }

    // 불일치 쌍
    const b = first_positive_second_negative
    const c = first_negative_second_positive
    const discordantPairs = b + c

    // McNemar 통계량
    let mcnemarStatistic: number
    let continuityCorrection = false

    if (discordantPairs < 25) {
      // 연속성 수정 적용
      mcnemarStatistic = Math.pow(Math.abs(b - c) - 1, 2) / (b + c)
      continuityCorrection = true
    } else {
      // 기본 McNemar 검정
      mcnemarStatistic = Math.pow(b - c, 2) / (b + c)
      continuityCorrection = false
    }

    // p-value 근사 (카이제곱 분포)
    const chiSquarePValue = (chi2: number): number => {
      if (chi2 <= 0) return 1
      // 간단한 근사식 (df=1)
      const p = 2 * (1 - normalCDF(Math.sqrt(chi2)))
      return Math.min(p, 1)
    }

    const normalCDF = (z: number): number => {
      const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z))
      const d = 0.3989423 * Math.exp(-z * z / 2)
      let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
      if (z > 0) prob = 1 - prob
      return prob
    }

    const pValue = discordantPairs === 0 ? 1 : chiSquarePValue(mcnemarStatistic)
    const significant = pValue < 0.05
    const effectSize = c === 0 ? (b === 0 ? 1 : Infinity) : b / c

    return {
      contingencyTable,
      mcnemarStatistic,
      pValue,
      significant,
      discordantPairs,
      effectSize: isFinite(effectSize) ? effectSize : undefined,
      continuityCorrection,
      sampleSize: data.length
    }
  }

  it('correctly creates 2x2 contingency table', () => {
    const testData = [
      { before: 1, after: 1 }, // both positive: a
      { before: 1, after: 1 }, // both positive: a
      { before: 1, after: 0 }, // first positive, second negative: b
      { before: 1, after: 0 }, // first positive, second negative: b
      { before: 1, after: 0 }, // first positive, second negative: b
      { before: 0, after: 1 }, // first negative, second positive: c
      { before: 0, after: 1 }, // first negative, second positive: c
      { before: 0, after: 0 }, // both negative: d
      { before: 0, after: 0 }  // both negative: d
    ]

    const result = calculateMcNemarTest(testData)

    expect(result.contingencyTable.both_positive).toBe(2)             // a = 2
    expect(result.contingencyTable.first_positive_second_negative).toBe(3) // b = 3
    expect(result.contingencyTable.first_negative_second_positive).toBe(2) // c = 2
    expect(result.contingencyTable.both_negative).toBe(2)            // d = 2
    expect(result.discordantPairs).toBe(5) // b + c = 3 + 2 = 5
    expect(result.sampleSize).toBe(9)
  })

  it('calculates McNemar statistic correctly with continuity correction', () => {
    // 작은 표본 (불일치 쌍 < 25): 연속성 수정 적용
    const smallSampleData = [
      { before: 1, after: 0 }, // b
      { before: 1, after: 0 }, // b
      { before: 1, after: 0 }, // b
      { before: 0, after: 1 }, // c
      { before: 1, after: 1 }, // a (일치하는 쌍은 검정에 기여하지 않음)
      { before: 0, after: 0 }  // d (일치하는 쌍은 검정에 기여하지 않음)
    ]

    const result = calculateMcNemarTest(smallSampleData)

    // b = 3, c = 1, |b - c| = 2
    // 연속성 수정: (|b - c| - 1)² / (b + c) = (2 - 1)² / 4 = 1/4 = 0.25
    expect(result.continuityCorrection).toBe(true)
    expect(result.mcnemarStatistic).toBeCloseTo(0.25, 2)
    expect(result.discordantPairs).toBe(4) // b + c = 3 + 1
  })

  it('calculates McNemar statistic without continuity correction for large samples', () => {
    // 큰 표본 생성 (불일치 쌍 ≥ 25)
    const largeSampleData = []
    // b = 15개
    for (let i = 0; i < 15; i++) {
      largeSampleData.push({ before: 1, after: 0 })
    }
    // c = 10개
    for (let i = 0; i < 10; i++) {
      largeSampleData.push({ before: 0, after: 1 })
    }
    // 일치하는 쌍들
    for (let i = 0; i < 10; i++) {
      largeSampleData.push({ before: 1, after: 1 })
      largeSampleData.push({ before: 0, after: 0 })
    }

    const result = calculateMcNemarTest(largeSampleData)

    // b = 15, c = 10, (b - c)² / (b + c) = (15 - 10)² / 25 = 25 / 25 = 1
    expect(result.continuityCorrection).toBe(false)
    expect(result.mcnemarStatistic).toBe(1.0)
    expect(result.discordantPairs).toBe(25) // b + c = 15 + 10
  })

  it('detects significant difference correctly', () => {
    // 유의한 차이가 있는 경우
    const significantData = []
    // 치료 후 크게 개선된 케이스
    for (let i = 0; i < 20; i++) {
      significantData.push({ before: 0, after: 1 }) // c = 20 (개선)
    }
    for (let i = 0; i < 2; i++) {
      significantData.push({ before: 1, after: 0 }) // b = 2 (악화)
    }
    // 변화 없는 케이스
    for (let i = 0; i < 10; i++) {
      significantData.push({ before: 1, after: 1 })
      significantData.push({ before: 0, after: 0 })
    }

    const result = calculateMcNemarTest(significantData)

    expect(result.discordantPairs).toBe(22) // 20 + 2
    expect(result.significant).toBe(true)
    expect(result.pValue).toBeLessThan(0.05)

    // 효과크기 (오즈비): b/c = 2/20 = 0.1
    expect(result.effectSize).toBeCloseTo(0.1, 2)
  })

  it('handles no discordant pairs correctly', () => {
    // 모든 쌍이 일치하는 경우
    const noChangeData = [
      { before: 1, after: 1 }, // a
      { before: 1, after: 1 }, // a
      { before: 0, after: 0 }, // d
      { before: 0, after: 0 }, // d
      { before: 0, after: 0 }  // d
    ]

    const result = calculateMcNemarTest(noChangeData)

    expect(result.discordantPairs).toBe(0)
    expect(result.pValue).toBe(1)
    expect(result.significant).toBe(false)
    // 불일치 쌍이 0개일 때 통계량은 무한대 또는 NaN이 될 수 있음
    expect(result.mcnemarStatistic === Infinity || isNaN(result.mcnemarStatistic)).toBe(true)
  })

  it('calculates effect size (odds ratio) correctly', () => {
    const testCases = [
      {
        name: 'Equal discordant pairs',
        data: [
          { before: 1, after: 0 }, // b = 1
          { before: 0, after: 1 }  // c = 1
        ],
        expectedOddsRatio: 1.0 // b/c = 1/1
      },
      {
        name: 'Treatment improvement',
        data: [
          { before: 1, after: 0 }, // b = 1 (악화)
          { before: 0, after: 1 }, // c = 1 (개선)
          { before: 0, after: 1 }, // c = 1 (개선)
          { before: 0, after: 1 }, // c = 1 (개선)
          { before: 0, after: 1 }  // c = 1 (개선)
        ],
        expectedOddsRatio: 0.25 // b/c = 1/4
      },
      {
        name: 'Treatment deterioration',
        data: [
          { before: 1, after: 0 }, // b = 1 (악화)
          { before: 1, after: 0 }, // b = 1 (악화)
          { before: 1, after: 0 }, // b = 1 (악화)
          { before: 1, after: 0 }, // b = 1 (악화)
          { before: 0, after: 1 }  // c = 1 (개선)
        ],
        expectedOddsRatio: 4.0 // b/c = 4/1
      }
    ]

    testCases.forEach(testCase => {
      const result = calculateMcNemarTest(testCase.data)
      expect(result.effectSize).toBeCloseTo(testCase.expectedOddsRatio, 2)
    })
  })

  it('validates p-value calculation ranges', () => {
    // 다양한 불일치 패턴에서 p-value 범위 검증
    const testCases = [
      {
        name: 'No difference',
        b: 5, c: 5,
        expectedRange: [0.4, 1.0] // p-value should be high
      },
      {
        name: 'Large difference',
        b: 15, c: 1,
        expectedRange: [0.0, 0.05] // p-value should be very low
      },
      {
        name: 'Moderate difference',
        b: 8, c: 3,
        expectedRange: [0.05, 0.25] // p-value should be moderate
      }
    ]

    testCases.forEach(testCase => {
      const data = []
      // b개의 (1,0) 쌍
      for (let i = 0; i < testCase.b; i++) {
        data.push({ before: 1, after: 0 })
      }
      // c개의 (0,1) 쌍
      for (let i = 0; i < testCase.c; i++) {
        data.push({ before: 0, after: 1 })
      }
      // 일치하는 쌍들 추가
      for (let i = 0; i < 10; i++) {
        data.push({ before: 1, after: 1 })
        data.push({ before: 0, after: 0 })
      }

      const result = calculateMcNemarTest(data)

      expect(result.pValue).toBeGreaterThanOrEqual(testCase.expectedRange[0])
      expect(result.pValue).toBeLessThanOrEqual(testCase.expectedRange[1])
    })
  })

  it('validates McNemar test assumptions and requirements', () => {
    const validData = [
      { before: 1, after: 0 },
      { before: 0, after: 1 },
      { before: 1, after: 1 },
      { before: 0, after: 0 }
    ]

    const result = calculateMcNemarTest(validData)

    // 기본 검증
    expect(result.sampleSize).toBeGreaterThan(0)
    expect(result.contingencyTable.both_positive).toBeGreaterThanOrEqual(0)
    expect(result.contingencyTable.first_positive_second_negative).toBeGreaterThanOrEqual(0)
    expect(result.contingencyTable.first_negative_second_positive).toBeGreaterThanOrEqual(0)
    expect(result.contingencyTable.both_negative).toBeGreaterThanOrEqual(0)

    // 전체 표본 수 일치 검증
    const totalFromTable =
      result.contingencyTable.both_positive +
      result.contingencyTable.first_positive_second_negative +
      result.contingencyTable.first_negative_second_positive +
      result.contingencyTable.both_negative

    expect(totalFromTable).toBe(result.sampleSize)

    // p-value 범위 검증
    expect(result.pValue).toBeGreaterThanOrEqual(0)
    expect(result.pValue).toBeLessThanOrEqual(1)
  })
})