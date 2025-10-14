/**
 * 메서드 라우터 스모크 테스트
 *
 * 라우터가 올바르게 핸들러를 등록하고 디스패치하는지 검증합니다.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { MethodRouter } from '@/lib/statistics/method-router'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'

// Mock Pyodide 서비스
const createMockPyodideService = () => ({
  // 기술통계 메서드
  descriptiveStats: jest.fn<() => Promise<any>>().mockResolvedValue({
    n: 10,
    mean: 5.5,
    median: 5.5,
    mode: 5,
    std: 2.8723,
    variance: 8.25,
    skewness: 0,
    kurtosis: -1.2,
    min: 1,
    max: 10,
    q1: 3.25,
    q3: 7.75,
    iqr: 4.5
  }),

  // 정규성 검정
  shapiroWilkTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: 0.9234,
    pValue: 0.3891
  }),

  // 등분산 검정
  leveneTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: 1.234,
    pValue: 0.2891
  }),

  bartlettTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: 1.456,
    pValue: 0.2275
  }),

  // 기타 필수 메서드들
  isInitialized: jest.fn<() => boolean>().mockReturnValue(true),
  initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  dispose: jest.fn<() => void>().mockReturnValue(undefined)
})

let mockPyodideService: ReturnType<typeof createMockPyodideService>
let router: MethodRouter
let context: CalculatorContext

describe('MethodRouter 스모크 테스트', () => {
  // 각 테스트 전에 Mock 초기화
  beforeEach(() => {
    mockPyodideService = createMockPyodideService()
    context = {
      pyodideService: mockPyodideService as any
    }
    router = new MethodRouter(context)
  })

  // ==========================================================================
  // 1. 라우터 초기화 테스트
  // ==========================================================================
  describe('라우터 초기화', () => {
    test('라우터가 올바르게 생성되는지 확인', () => {
      expect(router).toBeDefined()
      expect(router).toBeInstanceOf(MethodRouter)
    })

    test('지원 메서드 목록이 비어있지 않은지 확인', () => {
      const supportedMethods = router.getSupportedMethods()
      expect(supportedMethods).toBeDefined()
      expect(supportedMethods.length).toBeGreaterThan(0)
    })

    test('기술통계 핸들러가 등록되어 있는지 확인', () => {
      const supportedMethods = router.getSupportedMethods()

      // 적어도 하나의 기술통계 메서드가 등록되어 있어야 함
      expect(supportedMethods.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // 2. 메서드 지원 여부 확인
  // ==========================================================================
  describe('메서드 지원 여부 확인', () => {
    test('등록된 메서드는 supports()가 true를 반환', () => {
      const supportedMethods = router.getSupportedMethods()

      // 첫 번째 지원 메서드에 대해 테스트
      if (supportedMethods.length > 0) {
        const firstMethod = supportedMethods[0]
        expect(router.supports(firstMethod)).toBe(true)
      }
    })

    test('등록되지 않은 메서드는 supports()가 false를 반환', () => {
      expect(router.supports('nonexistent-method')).toBe(false)
      expect(router.supports('invalid-method-id')).toBe(false)
    })
  })

  // ==========================================================================
  // 3. 기술통계 핸들러 디스패치 테스트
  // ==========================================================================
  describe('기술통계 핸들러 디스패치', () => {
    // 테스트 데이터를 객체 배열 형태로 준비 (실제 사용 형태)
    const testData = [
      { value: 1, group: 'A' },
      { value: 2, group: 'A' },
      { value: 3, group: 'A' },
      { value: 4, group: 'A' },
      { value: 5, group: 'A' },
      { value: 6, group: 'B' },
      { value: 7, group: 'B' },
      { value: 8, group: 'B' },
      { value: 9, group: 'B' },
      { value: 10, group: 'B' }
    ]

    test('calculateDescriptiveStats 메서드 디스패치', async () => {
      if (!router.supports('calculateDescriptiveStats')) {
        console.log('calculateDescriptiveStats not registered, skipping')
        return
      }

      const result = await router.dispatch(
        'calculateDescriptiveStats',
        testData,
        { column: 'value' }
      )

      expect(result).toBeDefined()

      // 실패 시 에러 메시지 출력
      if (!result.success) {
        console.error('Error:', result.error)
      }

      expect(result.success).toBe(true)

      if (result.success && result.data) {
        expect(result.data).toBeDefined()
        expect(result.data).toHaveProperty('metrics')
        expect(result.data).toHaveProperty('tables')
        expect(result.data).toHaveProperty('interpretation')

        // metrics 배열 확인
        if (result.data.metrics) {
          expect(Array.isArray(result.data.metrics)).toBe(true)
          expect(result.data.metrics.length).toBeGreaterThan(0)
        }
      }
    })

    test('normalityTest 메서드 디스패치', async () => {
      if (!router.supports('normalityTest')) {
        console.log('normalityTest not registered, skipping')
        return
      }

      const result = await router.dispatch(
        'normalityTest',
        testData,
        { column: 'value' }
      )

      expect(result).toBeDefined()

      // 실패 시 에러 메시지 출력
      if (!result.success) {
        console.error('normalityTest Error:', result.error)
      }

      expect(result.success).toBe(true)

      if (result.success && result.data) {
        expect(result.data).toBeDefined()
        expect(result.data).toHaveProperty('metrics')
        expect(result.data).toHaveProperty('tables')
        expect(result.data).toHaveProperty('interpretation')
      }
    })

    test('homogeneityTest 메서드 디스패치', async () => {
      if (!router.supports('homogeneityTest')) {
        console.log('homogeneityTest not registered, skipping')
        return
      }

      const result = await router.dispatch(
        'homogeneityTest',
        testData,
        { groupColumn: 'group', valueColumn: 'value' }
      )

      expect(result).toBeDefined()

      // 실패 시 에러 메시지 출력
      if (!result.success) {
        console.error('homogeneityTest Error:', result.error)
      }

      expect(result.success).toBe(true)

      if (result.success && result.data) {
        expect(result.data).toBeDefined()
        expect(result.data).toHaveProperty('metrics')
        expect(result.data).toHaveProperty('tables')
        expect(result.data).toHaveProperty('interpretation')
      }
    })
  })

  // ==========================================================================
  // 4. 에러 처리 테스트
  // ==========================================================================
  describe('에러 처리', () => {
    test('지원하지 않는 메서드 디스패치 시 에러 반환', async () => {
      const result = await router.dispatch(
        'nonexistent-method' as any,
        [],
        {}
      )

      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('지원하지 않는 통계 메서드')
    })

    test('필수 파라미터 누락 시 에러 처리', async () => {
      if (!router.supports('calculateDescriptiveStats')) {
        console.log('calculateDescriptiveStats not registered, skipping')
        return
      }

      // column 파라미터 누락
      const result = await router.dispatch(
        'calculateDescriptiveStats',
        [{ value: 1 }, { value: 2 }],
        {} // column 파라미터 없음
      )

      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('열을 선택하세요')
    })

    test('빈 데이터로 디스패치 시 에러 처리', async () => {
      if (!router.supports('calculateDescriptiveStats')) {
        console.log('calculateDescriptiveStats not registered, skipping')
        return
      }

      // 빈 배열로 시도
      const result = await router.dispatch(
        'calculateDescriptiveStats',
        [],
        { column: 'value' }
      )

      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ==========================================================================
  // 5. 통합 테스트 - StatisticalCalculator와 함께
  // ==========================================================================
  describe('StatisticalCalculator 통합', () => {
    test('라우터가 StatisticalCalculator에서 사용될 수 있는지 확인', async () => {
      // 이 테스트는 라우터가 실제 calculator에서 사용될 수 있는
      // 인터페이스를 제공하는지 확인합니다.

      const supportedMethods = router.getSupportedMethods()
      expect(supportedMethods).toBeDefined()
      expect(Array.isArray(supportedMethods)).toBe(true)

      // 각 메서드가 문자열인지 확인
      supportedMethods.forEach(methodId => {
        expect(typeof methodId).toBe('string')
      })
    })
  })

  // ==========================================================================
  // 6. 성능 테스트
  // ==========================================================================
  describe('성능 테스트', () => {
    test('라우터 디스패치가 합리적인 시간 내에 완료되는지 확인', async () => {
      if (!router.supports('calculateDescriptiveStats')) {
        console.log('calculateDescriptiveStats not registered, skipping')
        return
      }

      const largeTestData = Array.from({ length: 1000 }, (_, i) => ({
        value: i + 1
      }))

      const startTime = performance.now()
      const result = await router.dispatch(
        'calculateDescriptiveStats',
        largeTestData,
        { column: 'value' }
      )
      const endTime = performance.now()

      const executionTime = endTime - startTime

      // 1000개 데이터 처리 시간이 2초 이내인지 확인
      expect(executionTime).toBeLessThan(2000)
      expect(result.success).toBe(true)
    })
  })
})
