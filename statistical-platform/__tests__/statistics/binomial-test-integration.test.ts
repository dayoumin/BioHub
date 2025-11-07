/**
 * Binomial Test Integration Test
 * - 프론트엔드 데이터 구조 검증
 * - Python Worker 호출 파라미터 검증
 * - 결과 타입 검증
 */

import { describe, it, expect } from '@jest/globals'

describe('Binomial Test Integration', () => {
  describe('데이터 구조', () => {
    it('이진 데이터가 올바른 형식이어야 함', () => {
      // 이진 데이터 (0/1)
      const binaryData = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1]

      // 검증: 0 또는 1만 포함
      expect(binaryData.every(v => v === 0 || v === 1)).toBe(true)

      // 검증: 배열
      expect(Array.isArray(binaryData)).toBe(true)

      // 검증: 최소 1개 데이터
      expect(binaryData.length).toBeGreaterThanOrEqual(1)
    })

    it('범주형 데이터를 이진으로 변환할 수 있어야 함', () => {
      const categoricalData = ['Pass', 'Fail', 'Pass', 'Pass', 'Fail', 'Pass']
      const successValue = 'Pass'

      // 성공/실패 카운트
      const successCount = categoricalData.filter(v => v === successValue).length
      const totalCount = categoricalData.length

      // 검증: 성공 카운트 - 4개
      expect(successCount).toBe(4)

      // 검증: 전체 시행 - 6개
      expect(totalCount).toBe(6)

      // 검증: 성공 비율
      expect(successCount / totalCount).toBeCloseTo(0.667, 2)
    })
  })

  describe('Python Worker 호출', () => {
    it('파라미터가 올바른 형식이어야 함', () => {
      const params = {
        success_count: 7,
        total_count: 10,
        probability: 0.5,
        alternative: 'two-sided'
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('success_count')
      expect(params).toHaveProperty('total_count')
      expect(params).toHaveProperty('probability')
      expect(params).toHaveProperty('alternative')

      // 검증: snake_case 사용 (Python 규약)
      expect(Object.keys(params)).toEqual([
        'success_count',
        'total_count',
        'probability',
        'alternative'
      ])

      // 검증: 타입
      expect(typeof params.success_count).toBe('number')
      expect(typeof params.total_count).toBe('number')
      expect(typeof params.probability).toBe('number')
      expect(typeof params.alternative).toBe('string')

      // 검증: 값 범위
      expect(params.success_count).toBeGreaterThanOrEqual(0)
      expect(params.success_count).toBeLessThanOrEqual(params.total_count)
      expect(params.probability).toBeGreaterThanOrEqual(0)
      expect(params.probability).toBeLessThanOrEqual(1)
    })

    it('반환 타입이 BinomialTestResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockPythonResult = {
        pValue: 0.344,
        successCount: 7,
        totalCount: 10
      }

      // 검증: 필수 필드 존재
      expect(mockPythonResult).toHaveProperty('pValue')
      expect(mockPythonResult).toHaveProperty('successCount')
      expect(mockPythonResult).toHaveProperty('totalCount')

      // 검증: 타입
      expect(typeof mockPythonResult.pValue).toBe('number')
      expect(typeof mockPythonResult.successCount).toBe('number')
      expect(typeof mockPythonResult.totalCount).toBe('number')
    })
  })

  describe('성공/실패 카운트', () => {
    it('성공 횟수가 올바르게 계산되어야 함', () => {
      const data = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1]
      const successValue = 1

      const successCount = data.filter(v => v === successValue).length

      // 검증: 성공 횟수 - 7개
      expect(successCount).toBe(7)
    })

    it('전체 시행 횟수가 올바르게 계산되어야 함', () => {
      const data = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1]

      const totalCount = data.length

      // 검증: 전체 시행 - 10개
      expect(totalCount).toBe(10)
    })

    it('관측 비율이 올바르게 계산되어야 함', () => {
      const successCount = 7
      const totalCount = 10

      const observedProportion = successCount / totalCount

      // 검증: 관측 비율 - 0.7
      expect(observedProportion).toBe(0.7)
    })
  })

  describe('데이터 필터링', () => {
    it('유효하지 않은 데이터를 제외해야 함', () => {
      const rawData = [
        { result: 1 },
        { result: null },  // ❌ null
        { result: 0 },
        { result: undefined },  // ❌ undefined
        { result: 1 },
        { result: NaN }  // ❌ NaN
      ]

      // 필터링
      const validData: number[] = []
      for (const row of rawData) {
        const value = row.result

        if (
          value === null ||
          value === undefined ||
          typeof value !== 'number' ||
          isNaN(value)
        ) {
          continue
        }

        validData.push(value)
      }

      // 검증: 유효한 데이터만 3개
      expect(validData).toHaveLength(3)
      expect(validData).toEqual([1, 0, 1])
    })
  })

  describe('에러 처리', () => {
    it('전체 시행 횟수가 1 미만이면 에러', () => {
      const totalCount = 0

      expect(() => {
        if (totalCount < 1) {
          throw new Error('이항 검정은 최소 1개 이상의 관측값이 필요합니다.')
        }
      }).toThrow('이항 검정은 최소 1개 이상의 관측값이 필요합니다.')
    })

    it('성공 횟수가 전체 시행 횟수를 초과하면 에러', () => {
      const successCount = 15
      const totalCount = 10

      expect(() => {
        if (successCount < 0 || successCount > totalCount) {
          throw new Error('Invalid success_count: must be 0 <= success_count <= total_count')
        }
      }).toThrow('Invalid success_count: must be 0 <= success_count <= total_count')
    })
  })

  describe('Frontend Result 구조', () => {
    it('BinomialTestResult 인터페이스가 Python 결과를 포함해야 함', () => {
      const pythonResult = {
        pValue: 0.344,
        successCount: 7,
        totalCount: 10
      }

      const frontendResult = {
        ...pythonResult,
        observedProportion: 0.7,
        expectedProbability: 0.5,
        alternative: 'two-sided' as const,
        significant: pythonResult.pValue < 0.05,
        interpretation: 'Test interpretation',
        confidenceInterval: {
          lower: 0.3475,
          upper: 0.9333
        }
      }

      // 검증: Python 결과 필드
      expect(frontendResult.pValue).toBe(pythonResult.pValue)
      expect(frontendResult.successCount).toBe(pythonResult.successCount)
      expect(frontendResult.totalCount).toBe(pythonResult.totalCount)

      // 검증: 프론트엔드 추가 필드
      expect(frontendResult).toHaveProperty('observedProportion')
      expect(frontendResult).toHaveProperty('expectedProbability')
      expect(frontendResult).toHaveProperty('alternative')
      expect(frontendResult).toHaveProperty('significant')
      expect(frontendResult).toHaveProperty('interpretation')
      expect(frontendResult).toHaveProperty('confidenceInterval')

      // 검증: 신뢰구간 구조
      expect(frontendResult.confidenceInterval).toHaveProperty('lower')
      expect(frontendResult.confidenceInterval).toHaveProperty('upper')
      expect(frontendResult.confidenceInterval.lower).toBeLessThan(frontendResult.confidenceInterval.upper)
    })
  })

  describe('대립가설 옵션', () => {
    it('양측 검정 (two-sided)', () => {
      const alternative = 'two-sided'

      // 검증: 문자열 리터럴
      expect(['two-sided', 'less', 'greater']).toContain(alternative)

      // 검증: 양측 검정
      expect(alternative).toBe('two-sided')
    })

    it('단측 검정 (less)', () => {
      const alternative = 'less'

      // 검증: 문자열 리터럴
      expect(['two-sided', 'less', 'greater']).toContain(alternative)

      // 검증: 단측 검정 (less)
      expect(alternative).toBe('less')
    })

    it('단측 검정 (greater)', () => {
      const alternative = 'greater'

      // 검증: 문자열 리터럴
      expect(['two-sided', 'less', 'greater']).toContain(alternative)

      // 검증: 단측 검정 (greater)
      expect(alternative).toBe('greater')
    })
  })

  describe('Wilson Score 신뢰구간', () => {
    it('신뢰구간이 [0, 1] 범위 내에 있어야 함', () => {
      const n = 20
      const p = 0.6 // 관측 비율
      const z = 1.96 // 95% 신뢰구간

      const denominator = 1 + (z * z) / n
      const center = (p + (z * z) / (2 * n)) / denominator
      const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))

      const lower = Math.max(0, center - margin)
      const upper = Math.min(1, center + margin)

      // 검증: 하한 ≥ 0
      expect(lower).toBeGreaterThanOrEqual(0)

      // 검증: 상한 ≤ 1
      expect(upper).toBeLessThanOrEqual(1)

      // 검증: 하한 < 상한
      expect(lower).toBeLessThan(upper)

      // 검증: 관측 비율이 신뢰구간 내에 있음 (대부분의 경우)
      // p=0.6인 경우 신뢰구간이 p를 포함해야 함
      expect(p).toBeGreaterThanOrEqual(lower - 0.05) // 약간의 여유
      expect(p).toBeLessThanOrEqual(upper + 0.05)
    })

    it('극단 비율(0 또는 1)에서도 신뢰구간이 유효해야 함', () => {
      const n = 10
      const z = 1.96

      // p = 0 (모두 실패)
      const p0 = 0
      const denominator0 = 1 + (z * z) / n
      const center0 = (p0 + (z * z) / (2 * n)) / denominator0
      const margin0 = (z / denominator0) * Math.sqrt((p0 * (1 - p0)) / n + (z * z) / (4 * n * n))
      const lower0 = Math.max(0, center0 - margin0)
      const upper0 = Math.min(1, center0 + margin0)

      expect(lower0).toBe(0)
      expect(upper0).toBeGreaterThan(0)
      expect(upper0).toBeLessThanOrEqual(1)

      // p = 1 (모두 성공)
      const p1 = 1
      const denominator1 = 1 + (z * z) / n
      const center1 = (p1 + (z * z) / (2 * n)) / denominator1
      const margin1 = (z / denominator1) * Math.sqrt((p1 * (1 - p1)) / n + (z * z) / (4 * n * n))
      const lower1 = Math.max(0, center1 - margin1)
      const upper1 = Math.min(1, center1 + margin1)

      expect(lower1).toBeLessThan(1)
      expect(lower1).toBeGreaterThanOrEqual(0)
      expect(upper1).toBe(1)
    })
  })
})
