/**
 * MethodRouter 통합 테스트
 *
 * 실제 핸들러 등록 및 디스패치 검증
 */

import { MethodRouter } from '@/lib/statistics/method-router'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'

describe('MethodRouter Integration Tests', () => {
  let router: MethodRouter
  let mockContext: CalculatorContext

  beforeEach(() => {
    mockContext = {
      pyodideService: {
        cronbachAlpha: jest.fn(),
        chiSquareTest: jest.fn(),
        oneSampleProportionTest: jest.fn()
      } as any
    }
    router = new MethodRouter(mockContext)
  })

  describe('핸들러 등록 검증', () => {
    it('모든 핸들러가 정상 등록되어야 함', () => {
      const supportedMethods = router.getSupportedMethods()

      expect(supportedMethods.length).toBeGreaterThan(30)
      expect(supportedMethods).toContain('calculateDescriptiveStats')
      expect(supportedMethods).toContain('oneSampleTTest')
      expect(supportedMethods).toContain('cronbachAlpha')
      expect(supportedMethods).toContain('crosstabAnalysis')
      expect(supportedMethods).toContain('oneSampleProportionTest')
    })

    it('supports() 메서드가 정상 동작해야 함', () => {
      expect(router.supports('cronbachAlpha')).toBe(true)
      expect(router.supports('oneSampleProportionTest')).toBe(true)
      expect(router.supports('invalidMethod')).toBe(false)
    })
  })

  describe('타입 안전성 검증', () => {
    it('DataRow[] 타입으로 데이터를 전달해야 함', async () => {
      const data = [
        { q1: 5, q2: 4, q3: 5 },
        { q1: 3, q2: 3, q3: 4 }
      ]

      mockContext.pyodideService.cronbachAlpha = jest.fn().mockResolvedValue({
        alpha: 0.85,
        itemTotalCorrelations: [0.7, 0.8, 0.75]
      })

      const result = await router.dispatch('cronbachAlpha', data, {
        columns: ['q1', 'q2', 'q3']
      })

      expect(result.success).toBe(true)
      expect(mockContext.pyodideService.cronbachAlpha).toHaveBeenCalled()
    })

    it('올바른 파라미터 타입을 전달해야 함', async () => {
      const data = [
        { result: '앞면' },
        { result: '뒷면' },
        { result: '앞면' },
        { result: '앞면' },
        { result: '뒷면' },
        { result: '앞면' },
        { result: '앞면' },
        { result: '뒷면' },
        { result: '앞면' },
        { result: '앞면' }
      ]

      mockContext.pyodideService.oneSampleProportionTest = jest.fn().mockResolvedValue({
        sampleProportion: 0.7,
        nullProportion: 0.5,
        successCount: 7,
        totalCount: 10,
        zStatistic: 1.265,
        pValueExact: 0.344,
        pValueApprox: 0.206,
        confidenceInterval: { lower: 0.35, upper: 0.93, level: 0.95 },
        alternative: 'two-sided',
        alpha: 0.05,
        significant: false
      })

      const result = await router.dispatch('oneSampleProportionTest', data, {
        variable: 'result',
        successValue: '앞면',
        nullProportion: 0.5,
        alternative: 'two-sided'
      })

      expect(result.success).toBe(true)
      expect(mockContext.pyodideService.oneSampleProportionTest).toHaveBeenCalledWith(
        7, 10, 0.5, 'two-sided', 0.05
      )
    })
  })

  describe('에러 처리 검증', () => {
    it('지원하지 않는 메서드 호출 시 에러 반환', async () => {
      const result = await router.dispatch('invalidMethod' as any, [], {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('지원하지 않는 통계 메서드')
    })

    it('핸들러 실행 중 에러 발생 시 catch', async () => {
      mockContext.pyodideService.cronbachAlpha = jest.fn().mockRejectedValue(
        new Error('Pyodide 초기화 실패')
      )

      const result = await router.dispatch('cronbachAlpha', [{ q1: 5 }], {
        columns: ['q1', 'q2']
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Group 1-2 핸들러 통합 테스트', () => {
    it('cronbachAlpha 핸들러가 정상 동작해야 함', async () => {
      const data = [
        { q1: 5, q2: 4, q3: 5, q4: 4 },
        { q1: 3, q2: 3, q3: 4, q4: 3 },
        { q1: 4, q2: 5, q3: 5, q4: 5 }
      ]

      mockContext.pyodideService.cronbachAlpha = jest.fn().mockResolvedValue({
        alpha: 0.87,
        itemTotalCorrelations: [0.7, 0.8, 0.75, 0.65]
      })

      const result = await router.dispatch('cronbachAlpha', data, {
        columns: ['q1', 'q2', 'q3', 'q4']
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('신뢰도')
    })

    it('crosstabAnalysis 핸들러가 정상 동작해야 함', async () => {
      const data = [
        { gender: '남', preference: '좋아함' },
        { gender: '여', preference: '싫어함' },
        { gender: '남', preference: '좋아함' },
        { gender: '여', preference: '좋아함' }
      ]

      mockContext.pyodideService.chiSquareTest = jest.fn().mockResolvedValue({
        statistic: 2.5,
        pValue: 0.114,
        df: 1
      })

      const result = await router.dispatch('crosstabAnalysis', data, {
        rowVariable: 'gender',
        columnVariable: 'preference',
        performChiSquare: true
      })

      expect(result.success).toBe(true)
      expect(result.data?.tables).toBeDefined()
    })

    it('oneSampleProportionTest 핸들러가 정상 동작해야 함', async () => {
      const data = Array(50).fill({ coin: 'H' }).concat(Array(50).fill({ coin: 'T' }))

      mockContext.pyodideService.oneSampleProportionTest = jest.fn().mockResolvedValue({
        sampleProportion: 0.5,
        nullProportion: 0.5,
        successCount: 50,
        totalCount: 100,
        zStatistic: 0,
        pValueExact: 1.0,
        pValueApprox: 1.0,
        confidenceInterval: { lower: 0.40, upper: 0.60, level: 0.95 },
        alternative: 'two-sided',
        alpha: 0.05,
        significant: false
      })

      const result = await router.dispatch('oneSampleProportionTest', data, {
        variable: 'coin',
        successValue: 'H',
        nullProportion: 0.5,
        alternative: 'two-sided'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(3)
    })
  })

  describe('성능 테스트', () => {
    it('핸들러 조회가 O(1) 성능을 보여야 함', () => {
      const iterations = 10000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        router.supports('cronbachAlpha')
      }

      const endTime = performance.now()
      const avgTime = (endTime - startTime) / iterations

      expect(avgTime).toBeLessThan(0.01) // 10μs 이하
    })
  })
})
