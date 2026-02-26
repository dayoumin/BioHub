/**
 * 비모수 메서드 라우팅 시뮬레이션 테스트
 *
 * 검증 항목:
 * 1. method-mapping.ts에서 4개 메서드의 category가 'nonparametric'인지 확인
 * 2. executeMethod() 호출 시 올바른 pyodide 함수가 호출되는지 검증
 * 3. chi-square 함수가 절대 호출되지 않는지 확인 (잘못된 라우팅 방지)
 * 4. chi-square-goodness는 여전히 chiSquareGoodnessTest를 호출하는지 확인
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { STATISTICAL_METHODS } from '@/lib/statistics/method-mapping'
import { StatisticalExecutor } from '@/lib/services/statistical-executor'

// pyodide-statistics 전체 mock
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    // 비모수 전용
    mcnemarTestWorker: vi.fn(),
    cochranQTestWorker: vi.fn(),
    binomialTestWorker: vi.fn(),
    oneSampleProportionTest: vi.fn(),
    // chi-square
    chiSquareIndependenceTest: vi.fn(),
    chiSquareGoodnessTest: vi.fn(),
    // 기타 (다른 경로에서 호출될 수 있는 것들 stub)
    kruskalWallis: vi.fn(),
    mannWhitney: vi.fn(),
    wilcoxonSignedRank: vi.fn(),
    signTestWorker: vi.fn(),
    runsTestWorker: vi.fn(),
    friedman: vi.fn(),
    ksTestTwoSample: vi.fn(),
    ksTestOneSample: vi.fn(),
    moodMedianTestWorker: vi.fn(),
  }
}))

import { pyodideStats } from '@/lib/services/pyodide-statistics'

// ─── 1. 카테고리 정의 단위 테스트 ───────────────────────────────────────────

describe('method-mapping.ts: category 정의 검증', () => {
  const TARGET_METHODS = ['binomial-test', 'proportion-test', 'mcnemar', 'cochran-q'] as const

  it.each(TARGET_METHODS)('%s의 category가 nonparametric이어야 한다', (id) => {
    const method = STATISTICAL_METHODS.find(m => m.id === id)
    expect(method, `${id}가 STATISTICAL_METHODS에 존재하지 않음`).toBeDefined()
    expect(method?.category).toBe('nonparametric')
  })

  it('chi-square-goodness의 category는 chi-square여야 한다', () => {
    const method = STATISTICAL_METHODS.find(m => m.id === 'chi-square-goodness')
    expect(method?.category).toBe('chi-square')
  })

  it('4개 메서드 모두 chi-square 카테고리가 아니어야 한다', () => {
    TARGET_METHODS.forEach(id => {
      const method = STATISTICAL_METHODS.find(m => m.id === id)
      expect(method?.category).not.toBe('chi-square')
    })
  })
})

// ─── 2. 라우팅 시뮬레이션 ──────────────────────────────────────────────────

describe('StatisticalExecutor: 비모수 라우팅 시뮬레이션', () => {
  let executor: StatisticalExecutor
  const mock = pyodideStats as unknown as Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    executor = new StatisticalExecutor()
    vi.clearAllMocks()
  })

  describe('mcnemar → mcnemarTestWorker 라우팅', () => {
    it('2×2 교차표 데이터로 mcnemarTestWorker를 호출해야 한다', async () => {
      mock.mcnemarTestWorker.mockResolvedValue({
        statistic: 3.2,
        pValue: 0.07,
        oddsRatio: 1.5
      })

      // 2×2 contingencyTable 직접 제공
      const data = [
        { before: 'yes', after: 'yes' },
        { before: 'yes', after: 'no' },
        { before: 'no', after: 'yes' },
        { before: 'no', after: 'no' },
        { before: 'yes', after: 'no' },
        { before: 'no', after: 'yes' },
      ]
      const variables = { independentVar: 'before', dependentVar: 'after' }
      const method = STATISTICAL_METHODS.find(m => m.id === 'mcnemar')!

      await executor.executeMethod(method, data, variables)

      // 올바른 함수 호출 확인
      expect(mock.mcnemarTestWorker).toHaveBeenCalledTimes(1)
      // chi-square 함수 미호출 확인
      expect(mock.chiSquareIndependenceTest).not.toHaveBeenCalled()
      expect(mock.chiSquareGoodnessTest).not.toHaveBeenCalled()
    })
  })

  describe('cochran-q → cochranQTestWorker 라우팅', () => {
    it('이진 행렬 데이터로 cochranQTestWorker를 호출해야 한다', async () => {
      mock.cochranQTestWorker.mockResolvedValue({
        qStatistic: 6.5,
        pValue: 0.039,
        df: 2
      })

      const data: Array<Record<string, unknown>> = []
      // arrays.independent 방식으로 데이터 전달 — prepareData 우회를 위해 executor 내부 경로 사용
      const variables = { independent: [['cond1', 'cond2', 'cond3']] }
      const method = STATISTICAL_METHODS.find(m => m.id === 'cochran-q')!

      await executor.executeMethod(method, data, variables)

      expect(mock.cochranQTestWorker).toHaveBeenCalledTimes(1)
      expect(mock.chiSquareIndependenceTest).not.toHaveBeenCalled()
      expect(mock.chiSquareGoodnessTest).not.toHaveBeenCalled()
    })
  })

  describe('binomial-test → binomialTestWorker 라우팅', () => {
    it('성공횟수/전체/확률로 binomialTestWorker를 호출해야 한다', async () => {
      mock.binomialTestWorker.mockResolvedValue({
        successCount: 7,
        totalCount: 10,
        pValue: 0.172,
        proportion: 0.7
      })

      const data: Array<Record<string, unknown>> = Array.from({ length: 10 }, (_, i) => ({
        result: i < 7 ? 'success' : 'fail'
      }))
      const variables = { successCount: 7, probability: 0.5, dependent: ['result'] }
      const method = STATISTICAL_METHODS.find(m => m.id === 'binomial-test')!

      await executor.executeMethod(method, data, variables)

      expect(mock.binomialTestWorker).toHaveBeenCalledTimes(1)
      expect(mock.chiSquareIndependenceTest).not.toHaveBeenCalled()
      expect(mock.chiSquareGoodnessTest).not.toHaveBeenCalled()

      // 인자 검증: (successCount, totalCount, probability) 형태
      const [successCount, totalCount, probability] = mock.binomialTestWorker.mock.calls[0]
      expect(typeof successCount).toBe('number')
      expect(typeof totalCount).toBe('number')
      expect(typeof probability).toBe('number')
    })
  })

  describe('proportion-test → oneSampleProportionTest 라우팅', () => {
    it('성공횟수/전체/귀무비율로 oneSampleProportionTest를 호출해야 한다', async () => {
      mock.oneSampleProportionTest.mockResolvedValue({
        zStatistic: 1.26,
        pValueExact: 0.207,
        sampleProportion: 0.6
      })

      const data = Array.from({ length: 10 }, (_, i) => ({ result: i < 6 ? 'yes' : 'no' }))
      const variables = { successCount: 6, nullProportion: '0.5', dependent: ['result'] }
      const method = STATISTICAL_METHODS.find(m => m.id === 'proportion-test')!

      await executor.executeMethod(method, data, variables)

      expect(mock.oneSampleProportionTest).toHaveBeenCalledTimes(1)
      expect(mock.chiSquareIndependenceTest).not.toHaveBeenCalled()
      expect(mock.chiSquareGoodnessTest).not.toHaveBeenCalled()

      // 인자: (successCount, totalCount, nullProportion)
      const [successCount, totalCount, nullProportion] = mock.oneSampleProportionTest.mock.calls[0]
      expect(typeof successCount).toBe('number')
      expect(typeof totalCount).toBe('number')
      expect(nullProportion).toBe(0.5)
    })
  })

  // ─── 3. chi-square-goodness는 여전히 올바른 경로를 사용 ─────────────────

  describe('chi-square-goodness → chiSquareGoodnessTest 라우팅 유지', () => {
    it('chi-square-goodness는 chiSquareGoodnessTest를 호출해야 한다', async () => {
      mock.chiSquareGoodnessTest.mockResolvedValue({
        statistic: 4.2,
        pValue: 0.04,
        df: 2
      })

      const data = [
        { color: 'red' }, { color: 'red' },
        { color: 'blue' }, { color: 'blue' }, { color: 'blue' },
        { color: 'green' }
      ]
      const variables = { dependentVar: 'color' }
      const method = STATISTICAL_METHODS.find(m => m.id === 'chi-square-goodness')!

      await executor.executeMethod(method, data, variables)

      // goodness 전용 함수 호출
      expect(mock.chiSquareGoodnessTest).toHaveBeenCalledTimes(1)
      // 독립성 검정 미호출
      expect(mock.chiSquareIndependenceTest).not.toHaveBeenCalled()
      // 비모수 함수 미호출
      expect(mock.mcnemarTestWorker).not.toHaveBeenCalled()
      expect(mock.binomialTestWorker).not.toHaveBeenCalled()

      // 인자: (observed[], expected | null)
      const [observed] = mock.chiSquareGoodnessTest.mock.calls[0]
      expect(Array.isArray(observed)).toBe(true)
      expect(observed).toHaveLength(3) // 3개 범주 (red, blue, green)
    })
  })
})
