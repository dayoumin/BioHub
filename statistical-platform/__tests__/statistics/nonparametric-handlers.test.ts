/**
 * 비모수 검정 핸들러 단위 테스트
 */

import { createNonparametricHandlers } from '@/lib/statistics/calculator-handlers/nonparametric'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'

describe('비모수 검정 핸들러 테스트', () => {
  // Mock Pyodide 서비스
  const createMockPyodideService = () => ({
    mannWhitneyU: jest.fn<() => Promise<any>>().mockResolvedValue({
      statistic: 25.5,
      pValue: 0.032,
      meanRank1: 8.5,
      meanRank2: 12.3
    }),
    wilcoxonSignedRank: jest.fn<() => Promise<any>>().mockResolvedValue({
      statistic: 15.0,
      pValue: 0.018
    }),
    kruskalWallis: jest.fn<() => Promise<any>>().mockResolvedValue({
      statistic: 12.45,
      df: 2,
      pValue: 0.002,
      meanRanks: { 'A': 5.2, 'B': 10.8, 'C': 15.3 }
    }),
    dunnTest: jest.fn<() => Promise<any>>().mockResolvedValue({
      comparisons: [
        { group1: 'A', group2: 'B', zStatistic: 2.3, pValue: 0.021, pAdjusted: 0.063 },
        { group1: 'A', group2: 'C', zStatistic: 3.5, pValue: 0.0005, pAdjusted: 0.0015 },
        { group1: 'B', group2: 'C', zStatistic: 1.2, pValue: 0.230, pAdjusted: 0.230 }
      ]
    }),
    chiSquareTest: jest.fn<() => Promise<any>>().mockResolvedValue({
      statistic: 8.75,
      df: 3,
      pValue: 0.033,
      expected: [25, 25, 25, 25],
      residuals: [1.2, -0.8, 0.5, -0.9]
    })
  })

  const mockContext: CalculatorContext = {
    pyodideService: createMockPyodideService() as any
  }

  const handlers = createNonparametricHandlers(mockContext)

  describe('Mann-Whitney U 검정', () => {
    const testData = [
      { group: 'A', value: 12 },
      { group: 'A', value: 15 },
      { group: 'A', value: 18 },
      { group: 'B', value: 20 },
      { group: 'B', value: 22 },
      { group: 'B', value: 25 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.mannWhitneyU(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05,
        alternative: 'two-sided'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('Mann-Whitney U')
    })

    test('파라미터 누락 시 에러', async () => {
      const result = await handlers.mannWhitneyU(testData, {
        groupColumn: 'group'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('측정값')
    })

    test('그룹 개수 검증', async () => {
      const invalidData = [
        { group: 'A', value: 12 },
        { group: 'A', value: 15 }
      ]

      const result = await handlers.mannWhitneyU(invalidData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('2개')
    })

    test('평균 순위 표시', async () => {
      const result = await handlers.mannWhitneyU(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const descTable = result.data?.tables?.find(t => t.name === '기술통계')
      expect(descTable?.data).toHaveLength(2)
      expect(descTable?.data?.[0]).toHaveProperty('평균 순위')
    })
  })

  describe('Wilcoxon 부호순위 검정', () => {
    const testData = [
      { before: 120, after: 115 },
      { before: 135, after: 130 },
      { before: 140, after: 132 },
      { before: 125, after: 120 },
      { before: 150, after: 145 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.wilcoxonSignedRank(testData, {
        column1: 'before',
        column2: 'after',
        alpha: 0.05,
        alternative: 'two-sided'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('Wilcoxon')
    })

    test('중앙값 차이 계산', async () => {
      const result = await handlers.wilcoxonSignedRank(testData, {
        column1: 'before',
        column2: 'after'
      })

      const metric = result.data?.metrics?.find(m => m.name === '중앙값 차이')
      expect(metric).toBeDefined()
      expect(metric?.value).toBeTruthy()
    })

    test('파라미터 누락 시 에러', async () => {
      const result = await handlers.wilcoxonSignedRank(testData, {
        column1: 'before'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('측정값')
    })

    test('데이터 부족 시 에러', async () => {
      const result = await handlers.wilcoxonSignedRank(
        [{ before: 10, after: 12 }, { before: 15, after: 13 }],
        {
          column1: 'before',
          column2: 'after'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 3개')
    })
  })

  describe('Kruskal-Wallis 검정', () => {
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
      const result = await handlers.kruskalWallis(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('Kruskal-Wallis')
    })

    test('그룹별 통계 테이블', async () => {
      const result = await handlers.kruskalWallis(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const groupTable = result.data?.tables?.find(t => t.name === '그룹별 통계')
      expect(groupTable?.data).toHaveLength(3)
      expect(groupTable?.data?.[0]).toHaveProperty('중앙값')
      expect(groupTable?.data?.[0]).toHaveProperty('평균 순위')
    })

    test('최소 그룹 수 검증', async () => {
      const invalidData = [
        { group: 'A', value: 10 },
        { group: 'A', value: 12 },
        { group: 'B', value: 15 },
        { group: 'B', value: 18 }
      ]

      const result = await handlers.kruskalWallis(invalidData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 3개')
    })

    test('H 통계량과 자유도 표시', async () => {
      const result = await handlers.kruskalWallis(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      const hMetric = result.data?.metrics?.find(m => m.name === 'H 통계량')
      const dfMetric = result.data?.metrics?.find(m => m.name === '자유도')
      expect(hMetric).toBeDefined()
      expect(dfMetric).toBeDefined()
    })
  })

  describe('Dunn 사후검정', () => {
    const testData = [
      { group: 'A', value: 10 },
      { group: 'A', value: 12 },
      { group: 'B', value: 15 },
      { group: 'B', value: 18 },
      { group: 'C', value: 22 },
      { group: 'C', value: 25 }
    ]

    test('정상 실행 - Bonferroni 보정', async () => {
      const result = await handlers.dunnTest(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05,
        correction: 'bonferroni'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.interpretation).toContain('Dunn')
    })

    test('쌍별 비교 테이블', async () => {
      const result = await handlers.dunnTest(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        correction: 'bonferroni'
      })

      const pairwiseTable = result.data?.tables?.[0]
      expect(pairwiseTable?.data).toHaveLength(3) // 3C2 = 3개 쌍
      expect(pairwiseTable?.data?.[0]).toHaveProperty('비교')
      expect(pairwiseTable?.data?.[0]).toHaveProperty('보정 p-value')
    })

    test('유의한 차이 개수 계산', async () => {
      const result = await handlers.dunnTest(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        alpha: 0.05
      })

      const sigMetric = result.data?.metrics?.find(m => m.name === '유의한 차이')
      expect(sigMetric).toBeDefined()
      expect(sigMetric?.value).toContain('개')
    })

    test('다중비교 보정 방법 표시', async () => {
      const result = await handlers.dunnTest(testData, {
        groupColumn: 'group',
        valueColumn: 'value',
        correction: 'holm'
      })

      expect(result.data?.interpretation).toContain('Holm')
    })
  })

  describe('Chi-Square 검정', () => {
    test('정상 실행 - 관찰빈도만', async () => {
      const result = await handlers.chiSquareTest([], {
        observed: [30, 20, 28, 22],
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('카이제곱')
    })

    test('기대빈도 포함', async () => {
      const result = await handlers.chiSquareTest([], {
        observed: [30, 20, 28, 22],
        expected: [25, 25, 25, 25]
      })

      expect(result.success).toBe(true)
      const freqTable = result.data?.tables?.find(t => t.name === '빈도표')
      expect(freqTable?.data).toHaveLength(4)
      expect(freqTable?.data?.[0]).toHaveProperty('기대빈도')
    })

    test('관찰빈도 누락 시 에러', async () => {
      const result = await handlers.chiSquareTest([], {
        alpha: 0.05
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('관찰빈도')
    })

    test('χ² 통계량과 자유도', async () => {
      const result = await handlers.chiSquareTest([], {
        observed: [30, 20, 28, 22]
      })

      const chiMetric = result.data?.metrics?.find(m => m.name === 'χ² 통계량')
      const dfMetric = result.data?.metrics?.find(m => m.name === '자유도')
      expect(chiMetric).toBeDefined()
      expect(dfMetric).toBeDefined()
    })

    test('잔차 계산 표시', async () => {
      const result = await handlers.chiSquareTest([], {
        observed: [30, 20, 28, 22]
      })

      const freqTable = result.data?.tables?.find(t => t.name === '빈도표')
      expect(freqTable?.data?.[0]).toHaveProperty('잔차')
    })
  })

  describe('공통 유틸리티 통합', () => {
    test('extractGroupedData 사용 확인', async () => {
      const testData = [
        { group: 'A', value: 10 },
        { group: 'A', value: 12 },
        { group: 'A', value: 'invalid' }, // 무효 데이터
        { group: 'B', value: 15 },
        { group: 'B', value: 18 }
      ]

      const result = await handlers.mannWhitneyU(testData, {
        groupColumn: 'group',
        valueColumn: 'value'
      })

      // 무효 데이터는 자동으로 필터링됨
      expect(result.success).toBe(true)
      expect(mockContext.pyodideService.mannWhitneyU).toHaveBeenCalled()
    })

    test('formatPValue 적용 확인', async () => {
      const result = await handlers.kruskalWallis(
        [
          { group: 'A', value: 10 },
          { group: 'A', value: 12 },
          { group: 'B', value: 15 },
          { group: 'B', value: 18 },
          { group: 'C', value: 22 },
          { group: 'C', value: 25 }
        ],
        {
          groupColumn: 'group',
          valueColumn: 'value'
        }
      )

      const pMetric = result.data?.metrics?.find(m => m.name === 'p-value')
      expect(pMetric?.value).toBe('0.0020') // Mock pValue = 0.002
    })

    test('interpretSignificance 적용 확인', async () => {
      const result = await handlers.mannWhitneyU(
        [
          { group: 'A', value: 10 },
          { group: 'A', value: 12 },
          { group: 'B', value: 15 },
          { group: 'B', value: 18 }
        ],
        {
          groupColumn: 'group',
          valueColumn: 'value',
          alpha: 0.05
        }
      )

      // Mock pValue = 0.032 < 0.05 → 유의
      expect(result.data?.interpretation).toContain('유의합니다')
    })
  })
})
