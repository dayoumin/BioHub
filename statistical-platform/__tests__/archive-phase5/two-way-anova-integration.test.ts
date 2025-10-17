/**
 * Two-Way ANOVA Integration Test
 *
 * Worker 3 two_way_anova 함수 통합 테스트
 */

import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

describe('Two-Way ANOVA Integration Test', () => {
  let pyodideStats: PyodideStatisticsService

  beforeAll(async () => {
    pyodideStats = PyodideStatisticsService.getInstance()

    // Debug: Check available methods
    console.log('=== Available methods on pyodideStats ===')
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(pyodideStats)).filter(m => m.includes('way') || m.includes('ANOVA') || m.includes('anova')))
    console.log('Has twoWayAnova?', typeof pyodideStats.twoWayAnova)
    console.log('Has twoWayANOVA?', typeof (pyodideStats as any).twoWayANOVA)

    await pyodideStats.initialize()
  }, 60000)

  test('기본 Two-Way ANOVA 테스트', async () => {
    // 테스트 데이터: 2x2 설계 (Factor1: A/B, Factor2: X/Y)
    const testData = [
      { factor1: 'A', factor2: 'X', value: 10 },
      { factor1: 'A', factor2: 'X', value: 12 },
      { factor1: 'A', factor2: 'Y', value: 15 },
      { factor1: 'A', factor2: 'Y', value: 17 },
      { factor1: 'B', factor2: 'X', value: 20 },
      { factor1: 'B', factor2: 'X', value: 22 },
      { factor1: 'B', factor2: 'Y', value: 25 },
      { factor1: 'B', factor2: 'Y', value: 27 }
    ]

    const result = await pyodideStats.twoWayAnova(testData)

    // 결과 구조 검증
    expect(result).toHaveProperty('factor1')
    expect(result).toHaveProperty('factor2')
    expect(result).toHaveProperty('interaction')
    expect(result).toHaveProperty('residual')
    expect(result).toHaveProperty('anovaTable')

    // factor1 검증
    expect(result.factor1).toHaveProperty('fStatistic')
    expect(result.factor1).toHaveProperty('pValue')
    expect(result.factor1).toHaveProperty('df')
    expect(typeof result.factor1.fStatistic).toBe('number')
    expect(typeof result.factor1.pValue).toBe('number')
    expect(typeof result.factor1.df).toBe('number')

    // factor2 검증
    expect(result.factor2).toHaveProperty('fStatistic')
    expect(result.factor2).toHaveProperty('pValue')
    expect(result.factor2).toHaveProperty('df')

    // interaction 검증
    expect(result.interaction).toHaveProperty('fStatistic')
    expect(result.interaction).toHaveProperty('pValue')
    expect(result.interaction).toHaveProperty('df')

    // residual 검증
    expect(result.residual).toHaveProperty('df')
    expect(typeof result.residual.df).toBe('number')

    // 통계적 유의성 확인 (p-value 범위)
    expect(result.factor1.pValue).toBeGreaterThanOrEqual(0)
    expect(result.factor1.pValue).toBeLessThanOrEqual(1)

    console.log('✅ Two-Way ANOVA 결과:')
    console.log(`  Factor1: F=${result.factor1.fStatistic.toFixed(4)}, p=${result.factor1.pValue.toFixed(4)}, df=${result.factor1.df}`)
    console.log(`  Factor2: F=${result.factor2.fStatistic.toFixed(4)}, p=${result.factor2.pValue.toFixed(4)}, df=${result.factor2.df}`)
    console.log(`  Interaction: F=${result.interaction.fStatistic.toFixed(4)}, p=${result.interaction.pValue.toFixed(4)}, df=${result.interaction.df}`)
    console.log(`  Residual df: ${result.residual.df}`)
  }, 30000)

  test('3x3 설계 Two-Way ANOVA', async () => {
    // 더 복잡한 3x3 설계
    const testData = [
      // Factor1=Low, Factor2=Cold
      { factor1: 'Low', factor2: 'Cold', value: 10 },
      { factor1: 'Low', factor2: 'Cold', value: 11 },
      // Factor1=Low, Factor2=Warm
      { factor1: 'Low', factor2: 'Warm', value: 15 },
      { factor1: 'Low', factor2: 'Warm', value: 16 },
      // Factor1=Low, Factor2=Hot
      { factor1: 'Low', factor2: 'Hot', value: 20 },
      { factor1: 'Low', factor2: 'Hot', value: 21 },
      // Factor1=Medium, Factor2=Cold
      { factor1: 'Medium', factor2: 'Cold', value: 12 },
      { factor1: 'Medium', factor2: 'Cold', value: 13 },
      // Factor1=Medium, Factor2=Warm
      { factor1: 'Medium', factor2: 'Warm', value: 17 },
      { factor1: 'Medium', factor2: 'Warm', value: 18 },
      // Factor1=Medium, Factor2=Hot
      { factor1: 'Medium', factor2: 'Hot', value: 22 },
      { factor1: 'Medium', factor2: 'Hot', value: 23 },
      // Factor1=High, Factor2=Cold
      { factor1: 'High', factor2: 'Cold', value: 14 },
      { factor1: 'High', factor2: 'Cold', value: 15 },
      // Factor1=High, Factor2=Warm
      { factor1: 'High', factor2: 'Warm', value: 19 },
      { factor1: 'High', factor2: 'Warm', value: 20 },
      // Factor1=High, Factor2=Hot
      { factor1: 'High', factor2: 'Hot', value: 24 },
      { factor1: 'High', factor2: 'Hot', value: 25 }
    ]

    const result = await (pyodideStats as any).twoWayANOVA(testData)

    // 자유도 검증 (3x3 설계)
    expect(result.factor1.df).toBe(2) // 3 levels - 1
    expect(result.factor2.df).toBe(2) // 3 levels - 1
    expect(result.interaction.df).toBe(4) // (3-1) * (3-1)

    console.log('✅ 3x3 Two-Way ANOVA 결과:')
    console.log(`  Factor1 df: ${result.factor1.df}`)
    console.log(`  Factor2 df: ${result.factor2.df}`)
    console.log(`  Interaction df: ${result.interaction.df}`)
    console.log(`  Residual df: ${result.residual.df}`)
  }, 30000)

  test('입력 검증: 최소 4개 샘플 필요', async () => {
    const invalidData = [
      { factor1: 'A', factor2: 'X', value: 10 },
      { factor1: 'A', factor2: 'Y', value: 15 },
      { factor1: 'B', factor2: 'X', value: 20 }
    ]

    await expect((pyodideStats as any).twoWayANOVA(invalidData)).rejects.toThrow(/at least 4 observations/)
  }, 30000)
})