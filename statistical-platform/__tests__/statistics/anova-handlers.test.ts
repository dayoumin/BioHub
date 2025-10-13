/**
 * 분산분석(ANOVA) 핸들러 단위 테스트
 */

import { createAnovaHandlers } from '@/lib/statistics/calculator-handlers/anova'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'

describe('분산분석(ANOVA) 핸들러 테스트', () => {
  // Mock Pyodide 서비스
  const createMockPyodideService = () => ({
    oneWayANOVA: jest.fn<() => Promise<any>>().mockResolvedValue({
      fStatistic: 8.45,
      pValue: 0.003,
      ssBetween: 125.4,
      ssWithin: 78.2,
      ssTotal: 203.6,
      dfBetween: 2,
      dfWithin: 15,
      dfTotal: 17,
      msBetween: 62.7,
      msWithin: 5.21,
      etaSquared: 0.62
    }),
    twoWayANOVA: jest.fn<() => Promise<any>>().mockResolvedValue({
      ssFactor1: 45.2,
      ssFactor2: 32.8,
      ssInteraction: 18.5,
      ssError: 25.3,
      dfFactor1: 1,
      dfFactor2: 2,
      dfInteraction: 2,
      dfError: 12,
      fFactor1: 21.4,
      fFactor2: 7.76,
      fInteraction: 4.38,
      pFactor1: 0.0005,
      pFactor2: 0.007,
      pInteraction: 0.036
    }),
    manova: jest.fn<() => Promise<any>>().mockResolvedValue({
      wilksLambda: 0.354,
      fStatistic: 4.25,
      df1: 4,
      df2: 22,
      pValue: 0.011
    }),
    performTukeyHSD: jest.fn<() => Promise<any>>().mockResolvedValue({
      comparisons: [
        { group1: 'A', group2: 'B', meanDiff: 3.5, lower: 0.8, upper: 6.2, pValue: 0.008 },
        { group1: 'A', group2: 'C', meanDiff: 5.2, lower: 2.5, upper: 7.9, pValue: 0.0003 },
        { group1: 'B', group2: 'C', meanDiff: 1.7, lower: -1.0, upper: 4.4, pValue: 0.254 }
      ]
    }),
    performBonferroni: jest.fn<() => Promise<any>>().mockResolvedValue({
      comparisons: [
        { group1: 'A', group2: 'B', meanDiff: 3.5, tStatistic: 2.8, pValue: 0.012, pAdjusted: 0.036 },
        { group1: 'A', group2: 'C', meanDiff: 5.2, tStatistic: 4.1, pValue: 0.0008, pAdjusted: 0.0024 },
        { group1: 'B', group2: 'C', meanDiff: 1.7, tStatistic: 1.3, pValue: 0.211, pAdjusted: 0.633 }
      ]
    }),
    gamesHowellTest: jest.fn<() => Promise<any>>().mockResolvedValue({
      comparisons: [
        { group1: 'A', group2: 'B', meanDiff: 3.5, tStatistic: 2.65, df: 8.4, pValue: 0.029 },
        { group1: 'A', group2: 'C', meanDiff: 5.2, tStatistic: 3.87, df: 7.2, pValue: 0.006 },
        { group1: 'B', group2: 'C', meanDiff: 1.7, tStatistic: 1.12, df: 9.1, pValue: 0.292 }
      ]
    })
  })

  const mockContext: CalculatorContext = {
    pyodideService: createMockPyodideService() as any
  }

  const handlers = createAnovaHandlers(mockContext)

  describe('일원 분산분석 (One-Way ANOVA)', () => {
    const testData = [
      { group: 'A', value: 10 },
      { group: 'A', value: 12 },
      { group: 'A', value: 14 },
      { group: 'B', value: 15 },
      { group: 'B', value: 18 },
      { group: 'B', value: 20 },
      { group: 'C', value: 22 },
      { group: 'C', value: 25 },
      { group: 'C', value: 28 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.oneWayANOVA(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('일원 분산분석')
    })

    test('ANOVA 분산분석표', async () => {
      const result = await handlers.oneWayANOVA(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const anovaTable = result.data?.tables?.find(t => t.name === 'ANOVA 분산분석표')
      expect(anovaTable?.data).toHaveLength(3) // Between, Within, Total
      expect(anovaTable?.data?.[0]).toHaveProperty('F')
      expect(anovaTable?.data?.[0]).toHaveProperty('p-value')
    })

    test('효과크기 (η²) 계산', async () => {
      const result = await handlers.oneWayANOVA(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const etaMetric = result.data?.metrics?.find(m => m.name === 'η² (Eta-squared)')
      expect(etaMetric).toBeDefined()
      expect(etaMetric?.value).toBe('0.6200') // Mock = 0.62
    })

    test('그룹별 기술통계', async () => {
      const result = await handlers.oneWayANOVA(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const descTable = result.data?.tables?.find(t => t.name === '그룹별 기술통계')
      expect(descTable?.data).toHaveLength(3) // 3 groups
      expect(descTable?.data?.[0]).toHaveProperty('평균')
      expect(descTable?.data?.[0]).toHaveProperty('표준편차')
    })

    test('파라미터 누락 시 에러', async () => {
      const result = await handlers.oneWayANOVA(testData, {
        groupColumn: 'group'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('측정값')
    })

    test('최소 그룹 수 검증', async () => {
      const result = await handlers.oneWayANOVA(
        [
          { group: 'A', value: 10 },
          { group: 'A', value: 12 }
        ],
        {
          groupColumn: 'group',
          valueColumn: 'value'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 2개')
    })
  })

  describe('이원 분산분석 (Two-Way ANOVA)', () => {
    const testData = [
      { factor1: 'Low', factor2: 'A', value: 10 },
      { factor1: 'Low', factor2: 'A', value: 12 },
      { factor1: 'Low', factor2: 'B', value: 15 },
      { factor1: 'Low', factor2: 'B', value: 18 },
      { factor1: 'High', factor2: 'A', value: 20 },
      { factor1: 'High', factor2: 'A', value: 22 },
      { factor1: 'High', factor2: 'B', value: 25 },
      { factor1: 'High', factor2: 'B', value: 28 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.twoWayANOVA(testData, {
        factor1Column: 'factor1',
        factor2Column: 'factor2',
        valueColumn: 'value',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.interpretation).toContain('이원 분산분석')
    })

    test('주효과와 상호작용 분석', async () => {
      const result = await handlers.twoWayANOVA(testData, {
        factor1Column: 'factor1',
        factor2Column: 'factor2',
        valueColumn: 'value'
      })

      const anovaTable = result.data?.tables?.[0]
      expect(anovaTable?.data).toHaveLength(4) // Factor1, Factor2, Interaction, Error
      expect(anovaTable?.data?.[0]?.['변동원']).toBe('factor1')
      expect(anovaTable?.data?.[1]?.['변동원']).toBe('factor2')
      expect(anovaTable?.data?.[2]?.['변동원']).toContain('×')
    })

    test('모든 효과 F 통계량 표시', async () => {
      const result = await handlers.twoWayANOVA(testData, {
        factor1Column: 'factor1',
        factor2Column: 'factor2',
        valueColumn: 'value'
      })

      const metrics = result.data?.metrics
      expect(metrics?.find(m => m.name === 'factor1 F')).toBeDefined()
      expect(metrics?.find(m => m.name === 'factor2 F')).toBeDefined()
      expect(metrics?.find(m => m.name === '상호작용 F')).toBeDefined()
    })

    test('파라미터 누락 시 에러', async () => {
      const result = await handlers.twoWayANOVA(testData, {
        factor1Column: 'factor1',
        valueColumn: 'value'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('요인2')
    })
  })

  describe('다변량 분산분석 (MANOVA)', () => {
    const testData = [
      { group: 'A', dep1: 10, dep2: 15 },
      { group: 'A', dep1: 12, dep2: 18 },
      { group: 'B', dep1: 15, dep2: 20 },
      { group: 'B', dep1: 18, dep2: 22 },
      { group: 'C', dep1: 20, dep2: 25 },
      { group: 'C', dep1: 22, dep2: 28 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.manova(testData, {
        groupColumn: 'group',
        dependentColumns: ['dep1', 'dep2'],
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.interpretation).toContain('MANOVA')
    })

    test("Wilks' Lambda 표시", async () => {
      const result = await handlers.manova(testData, {
        groupColumn: 'group',
        dependentColumns: ['dep1', 'dep2']
      })

      const wilksMetric = result.data?.metrics?.find(m => m.name === "Wilks' Lambda")
      expect(wilksMetric).toBeDefined()
      expect(wilksMetric?.value).toBe('0.3540') // Mock = 0.354
    })

    test('최소 종속변수 수 검증', async () => {
      const result = await handlers.manova(testData, {
        groupColumn: 'group',
        dependentColumns: ['dep1']
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 2개')
    })
  })

  describe('Tukey HSD 사후검정', () => {
    const testData = [
      { group: 'A', value: 10 },
      { group: 'A', value: 12 },
      { group: 'B', value: 15 },
      { group: 'B', value: 18 },
      { group: 'C', value: 20 },
      { group: 'C', value: 22 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.tukeyHSD(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.interpretation).toContain('Tukey HSD')
    })

    test('쌍별 비교 테이블', async () => {
      const result = await handlers.tukeyHSD(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const pairwiseTable = result.data?.tables?.[0]
      expect(pairwiseTable?.data).toHaveLength(3) // 3C2 = 3 comparisons
      expect(pairwiseTable?.data?.[0]).toHaveProperty('평균차')
      expect(pairwiseTable?.data?.[0]).toHaveProperty('하한')
      expect(pairwiseTable?.data?.[0]).toHaveProperty('상한')
    })

    test('유의한 차이 개수', async () => {
      const result = await handlers.tukeyHSD(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      const sigMetric = result.data?.metrics?.find(m => m.name === '유의한 차이')
      expect(sigMetric).toBeDefined()
      expect(sigMetric?.value).toContain('개')
    })

    test('최소 그룹 수 검증', async () => {
      const result = await handlers.tukeyHSD(
        [
          { group: 'A', value: 10 },
          { group: 'A', value: 12 },
          { group: 'B', value: 15 },
          { group: 'B', value: 18 }
        ],
        {
          groupColumn: 'group',
          valueColumn: 'value'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 3개')
    })
  })

  describe('Bonferroni 사후검정', () => {
    const testData = [
      { group: 'A', value: 10 },
      { group: 'A', value: 12 },
      { group: 'B', value: 15 },
      { group: 'B', value: 18 },
      { group: 'C', value: 20 },
      { group: 'C', value: 22 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.bonferroni(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.interpretation).toContain('Bonferroni')
    })

    test('보정 p-value 표시', async () => {
      const result = await handlers.bonferroni(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const pairwiseTable = result.data?.tables?.[0]
      expect(pairwiseTable?.data?.[0]).toHaveProperty('보정 p-value')
    })

    test('보정 계수 표시', async () => {
      const result = await handlers.bonferroni(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const corrMetric = result.data?.metrics?.find(m => m.name === '보정 계수')
      expect(corrMetric).toBeDefined()
      expect(corrMetric?.value).toBe('3') // 3C2 = 3 comparisons
    })
  })

  describe('Games-Howell 사후검정', () => {
    const testData = [
      { group: 'A', value: 10 },
      { group: 'A', value: 12 },
      { group: 'B', value: 15 },
      { group: 'B', value: 18 },
      { group: 'C', value: 20 },
      { group: 'C', value: 22 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.gamesHowell(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.interpretation).toContain('Games-Howell')
    })

    test('자유도 표시', async () => {
      const result = await handlers.gamesHowell(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const pairwiseTable = result.data?.tables?.[0]
      expect(pairwiseTable?.data?.[0]).toHaveProperty('자유도')
    })

    test('등분산 가정 불필요 명시', async () => {
      const result = await handlers.gamesHowell(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const assumptionMetric = result.data?.metrics?.find(m => m.name === '등분산 가정')
      expect(assumptionMetric?.value).toBe('불필요')
    })

    test('해석에 등분산 언급', async () => {
      const result = await handlers.gamesHowell(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      expect(result.data?.interpretation).toContain('등분산 가정이 필요없어')
    })
  })

  describe('공통 유틸리티 통합', () => {
    test('extractGroupedData 사용 확인', async () => {
      const testData = [
        { group: 'A', value: 10 },
        { group: 'A', value: 12 },
        { group: 'A', value: 'invalid' },
        { group: 'B', value: 15 },
        { group: 'B', value: 18 }
      ]

      const result = await handlers.oneWayANOVA(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      expect(result.success).toBe(true)
      expect(mockContext.pyodideService.oneWayANOVA).toHaveBeenCalled()
    })

    test('formatPValue 적용 확인', async () => {
      const result = await handlers.oneWayANOVA(
        [
          { group: 'A', value: 10 },
          { group: 'A', value: 12 },
          { group: 'B', value: 15 },
          { group: 'B', value: 18 }
        ],
        {
          groupColumn: 'group',
          valueColumn: 'value'
        }
      )

      const pMetric = result.data?.metrics?.find(m => m.name === 'p-value')
      expect(pMetric?.value).toBe('0.0030') // Mock pValue = 0.003
    })

    test('interpretEffectSize 적용 확인', async () => {
      const result = await handlers.oneWayANOVA(
        [
          { group: 'A', value: 10 },
          { group: 'A', value: 12 },
          { group: 'B', value: 15 },
          { group: 'B', value: 18 }
        ],
        {
          groupColumn: 'group',
          valueColumn: 'value'
        }
      )

      const effectMetric = result.data?.metrics?.find(m => m.name === '효과크기')
      expect(effectMetric).toBeDefined()
      // Mock η² = 0.62 → √0.62 = 0.787 → '중간'
      expect(effectMetric?.value).toBe('중간')
    })
  })
})
