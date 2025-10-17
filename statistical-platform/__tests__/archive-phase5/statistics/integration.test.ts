/**
 * 통합 테스트 (Integration & E2E Tests)
 *
 * 전체 워크플로우 및 엣지 케이스를 검증합니다.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { StatisticalCalculator } from '@/lib/statistics/statistical-calculator'
import { MethodRouter } from '@/lib/statistics/method-router'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'

// Mock Pyodide 서비스
const createMockPyodideService = () => ({
  isInitialized: jest.fn<() => boolean>().mockReturnValue(true),
  initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  dispose: jest.fn<() => void>().mockReturnValue(undefined),

  // 일표본 t-검정
  oneSampleTTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: 2.345,
    pValue: 0.0234,
    df: 29,
    sampleMean: 105.2,
    std: 8.5,
    ci_lower: 102.1,
    ci_upper: 108.3,
    cohensD: 0.61
  }),

  // 독립표본 t-검정
  twoSampleTTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: -3.456,
    pValue: 0.0012,
    df: 58,
    mean1: 98.5,
    mean2: 105.3,
    std1: 7.2,
    std2: 8.9,
    ci_lower: -10.2,
    ci_upper: -3.4,
    cohensD: 0.82
  }),

  // 대응표본 t-검정
  pairedTTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: 4.123,
    pValue: 0.0003,
    df: 24,
    meanDiff: 5.6,
    stdDiff: 3.2,
    ci_lower: 3.1,
    ci_upper: 8.1,
    cohensD: 0.92
  }),

  // 기술통계
  descriptiveStats: jest.fn<() => Promise<any>>().mockResolvedValue({
    n: 30,
    mean: 100.5,
    median: 99.0,
    mode: 98,
    std: 8.5,
    variance: 72.25,
    min: 85,
    max: 118,
    q1: 94.5,
    q3: 106.5,
    iqr: 12.0,
    skewness: 0.23,
    kurtosis: -0.45
  }),

  // 정규성 검정
  shapiroWilkTest: jest.fn<() => Promise<any>>().mockResolvedValue({
    statistic: 0.9756,
    pValue: 0.6123
  })
})

describe('통합 테스트 (Integration Tests)', () => {
  let mockPyodideService: ReturnType<typeof createMockPyodideService>
  let context: CalculatorContext
  let router: MethodRouter

  beforeEach(() => {
    mockPyodideService = createMockPyodideService()
    context = {
      pyodideService: mockPyodideService as any
    }
    router = new MethodRouter(context)
  })

  // ==========================================================================
  // E2E 워크플로우 테스트
  // ==========================================================================
  describe('E2E 워크플로우', () => {
    test('StatisticalCalculator → Router → Handler 전체 플로우', async () => {
      // Given: 테스트 데이터
      const data = [
        { score: 95 },
        { score: 102 },
        { score: 98 },
        { score: 105 }
      ]

      // When: StatisticalCalculator를 통해 분석 실행
      const result = await StatisticalCalculator.calculate(
        'oneSampleTTest',
        data,
        { column: 'score', popmean: 100 }
      )

      // Then: 성공적으로 결과 반환
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.metrics).toBeDefined()
      expect(result.data.tables).toBeDefined()
      expect(result.data.interpretation).toBeDefined()
    })

    test('독립표본 t-검정 전체 플로우', async () => {
      // Given
      const data = [
        { group: 'A', value: 95 },
        { group: 'A', value: 98 },
        { group: 'B', value: 102 },
        { group: 'B', value: 105 }
      ]

      // When
      const result = await router.dispatch('twoSampleTTest' as any, data, {
        groupColumn: 'group',
        valueColumn: 'value'
      } as any)

      // Then
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(mockPyodideService.twoSampleTTest).toHaveBeenCalledWith(
        [95, 98],
        [102, 105],
        true
      )
    })

    test('대응표본 t-검정 전체 플로우', async () => {
      // Given
      const data = [
        { before: 100, after: 105 },
        { before: 95, after: 102 },
        { before: 98, after: 99 }
      ]

      // When
      const result = await router.dispatch('pairedTTest' as any, data, {
        column1: 'before',
        column2: 'after'
      } as any)

      // Then
      expect(result.success).toBe(true)
      expect(mockPyodideService.pairedTTest).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // 엣지 케이스 테스트
  // ==========================================================================
  describe('엣지 케이스 (Edge Cases)', () => {
    test('빈 배열 처리', async () => {
      // Given: 빈 데이터
      const data: any[] = []

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('데이터')
    })

    test('NaN 값 자동 제거', async () => {
      // Given: NaN 포함 데이터
      const data = [
        { score: NaN },
        { score: 100 },
        { score: NaN },
        { score: 105 },
        { score: 98 }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: NaN 제외하고 정상 실행
      expect(result.success).toBe(true)
      expect(mockPyodideService.oneSampleTTest).toHaveBeenCalledWith(
        [100, 105, 98],
        100
      )
    })

    test('null/undefined 값 처리', async () => {
      // Given
      const data = [
        { score: null },
        { score: 100 },
        { score: undefined },
        { score: 105 }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: null/undefined 제외하고 정상 실행
      expect(result.success).toBe(true)
    })

    test('문자열 숫자 자동 변환', async () => {
      // Given: 문자열 형태의 숫자
      const data = [
        { score: '100' },
        { score: '105' },
        { score: '98' }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: 문자열을 숫자로 변환하여 실행
      expect(result.success).toBe(true)
      expect(mockPyodideService.oneSampleTTest).toHaveBeenCalledWith(
        [100, 105, 98],
        100
      )
    })

    test('존재하지 않는 열 이름', async () => {
      // Given
      const data = [{ score: 100 }, { score: 105 }]

      // When: 잘못된 열 이름
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'nonexistent',
        popmean: 100
      } as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('최소 샘플 크기 미달', async () => {
      // Given: 1개 데이터 (최소 2개 필요)
      const data = [{ score: 100 }]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    test('필수 파라미터 누락', async () => {
      // Given
      const data = [{ score: 100 }, { score: 105 }]

      // When: popmean 누락
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score'
        // popmean 누락
      } as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toContain('파라미터')
    })

    test('독립표본 t-검정: 그룹 수 불일치', async () => {
      // Given: 3개 그룹 (2개만 필요)
      const data = [
        { group: 'A', value: 100 },
        { group: 'B', value: 105 },
        { group: 'C', value: 110 }
      ]

      // When
      const result = await router.dispatch('twoSampleTTest' as any, data, {
        groupColumn: 'group',
        valueColumn: 'value'
      } as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toContain('그룹')
    })
  })

  // ==========================================================================
  // 에러 시나리오 테스트
  // ==========================================================================
  describe('에러 시나리오', () => {
    test('지원하지 않는 메서드 호출', async () => {
      // Given: 존재하지 않는 메서드
      const data = [{ value: 100 }]

      // When
      const result = await router.dispatch('nonexistentMethod' as any, data, {} as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toContain('지원하지 않는')
    })

    test('Pyodide 서비스 에러 처리', async () => {
      // Given: Pyodide 에러 발생
      mockPyodideService.oneSampleTTest.mockRejectedValueOnce(
        new Error('Pyodide calculation failed')
      )

      const data = [{ score: 100 }, { score: 105 }]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: 에러 반환
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('데이터 타입 불일치', async () => {
      // Given: 완전히 잘못된 데이터
      const data = [
        { score: 'not a number' },
        { score: 'also not a number' }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: 에러 반환 (유효한 데이터 없음)
      expect(result.success).toBe(false)
    })
  })

  // ==========================================================================
  // 성능 테스트
  // ==========================================================================
  describe('성능 테스트', () => {
    test('대용량 데이터 처리 (1000개)', async () => {
      // Given: 1000개 데이터
      const data = Array.from({ length: 1000 }, (_, i) => ({
        score: 100 + Math.random() * 10
      }))

      // When
      const startTime = Date.now()
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)
      const duration = Date.now() - startTime

      // Then: 1초 이내 완료
      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000)
    })

    test('연속 요청 처리', async () => {
      // Given
      const data = [
        { score: 100 },
        { score: 105 },
        { score: 98 }
      ]

      // When: 10번 연속 요청
      const promises = Array.from({ length: 10 }, () =>
        router.dispatch('oneSampleTTest' as any, data, {
          column: 'score',
          popmean: 100
        } as any)
      )

      const results = await Promise.all(promises)

      // Then: 모두 성공
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })
  })

  // ==========================================================================
  // 데이터 형식 테스트
  // ==========================================================================
  describe('데이터 형식 테스트', () => {
    test('다양한 열 이름 지원', async () => {
      // Given: 특수 문자 포함 열 이름
      const data = [
        { 'test score': 100 },
        { 'test score': 105 }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'test score',
        popmean: 100
      } as any)

      // Then: 정상 처리
      expect(result.success).toBe(true)
    })

    test('혼합 데이터 타입 열', async () => {
      // Given: 숫자와 문자열 혼합
      const data = [
        { score: 100 },
        { score: '105' },
        { score: 98 },
        { score: 'invalid' },
        { score: 102 }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'score',
        popmean: 100
      } as any)

      // Then: 유효한 값만 사용
      expect(result.success).toBe(true)
      expect(mockPyodideService.oneSampleTTest).toHaveBeenCalledWith(
        [100, 105, 98, 102],
        100
      )
    })

    test('Boolean 값 처리', async () => {
      // Given: Boolean 값 (0, 1로 변환되어야 함)
      const data = [
        { flag: true },
        { flag: false },
        { flag: true }
      ]

      // When
      const result = await router.dispatch('oneSampleTTest' as any, data, {
        column: 'flag',
        popmean: 0.5
      } as any)

      // Then: Boolean을 숫자로 변환하여 처리
      expect(result.success).toBe(true)
    })
  })

  // ==========================================================================
  // 라우터 유틸리티 테스트
  // ==========================================================================
  describe('라우터 유틸리티', () => {
    test('지원 메서드 목록 조회', () => {
      const methods = router.getSupportedMethods()

      expect(methods).toBeDefined()
      expect(Array.isArray(methods)).toBe(true)
      expect(methods.length).toBeGreaterThan(0)

      // 알려진 메서드 포함 확인
      expect(methods).toContain('oneSampleTTest')
      expect(methods).toContain('twoSampleTTest')
      expect(methods).toContain('pairedTTest')
    })

    test('메서드 지원 여부 확인', () => {
      expect(router.supports('oneSampleTTest')).toBe(true)
      expect(router.supports('twoSampleTTest')).toBe(true)
      expect(router.supports('nonexistentMethod')).toBe(false)
    })
  })
})
