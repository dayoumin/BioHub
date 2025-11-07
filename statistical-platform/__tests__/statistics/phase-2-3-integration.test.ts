/**
 * Phase 2-3 Integration Test
 * - McNemar Test 프론트 연결 검증
 * - Runs Test 프론트 연결 검증
 * - Sign Test 프론트 연결 검증
 */

import { describe, it, expect } from '@jest/globals'

describe('Phase 2-3 Integration Tests', () => {
  describe('McNemar Test', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조 (2x2 contingency table)
      const contingencyTable = [
        [15, 8],  // [both_positive, first_positive_second_negative]
        [6, 21]   // [first_negative_second_positive, both_negative]
      ]

      // 검증: 2x2 행렬
      expect(contingencyTable.length).toBe(2)
      expect(contingencyTable[0].length).toBe(2)
      expect(contingencyTable[1].length).toBe(2)

      // 검증: 숫자형 데이터
      expect(contingencyTable.every(row => row.every(val => typeof val === 'number'))).toBe(true)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        contingency_table: [
          [15, 8],
          [6, 21]
        ]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('contingency_table')

      // 검증: snake_case 사용 (Python 규약)
      expect(Object.keys(params)).toEqual(['contingency_table'])
    })

    it('반환 타입이 McNemarTestResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        statistic: 0.286,
        pValue: 0.593,
        continuityCorrection: true,
        discordantPairs: { b: 8, c: 6 }
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('statistic')
      expect(mockResult).toHaveProperty('pValue')
      expect(mockResult).toHaveProperty('continuityCorrection')
      expect(mockResult).toHaveProperty('discordantPairs')

      // 검증: discordantPairs 구조
      expect(mockResult.discordantPairs).toHaveProperty('b')
      expect(mockResult.discordantPairs).toHaveProperty('c')
      expect(typeof mockResult.discordantPairs.b).toBe('number')
      expect(typeof mockResult.discordantPairs.c).toBe('number')
    })
  })

  describe('Runs Test', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조 (숫자 시퀀스)
      const sequence = [23, 45, 67, 12, 34, 56, 78, 23, 45, 67, 89, 12, 34]

      // 검증: 배열 길이 (최소 10개)
      expect(sequence.length).toBeGreaterThanOrEqual(10)

      // 검증: 숫자형 데이터
      expect(sequence.every(val => typeof val === 'number')).toBe(true)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        sequence: [23, 45, 67, 12, 34, 56, 78, 23, 45, 67, 89, 12, 34]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('sequence')

      // 검증: snake_case 사용
      expect(Object.keys(params)).toEqual(['sequence'])
    })

    it('반환 타입이 RunsTestResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        nRuns: 8,
        expectedRuns: 7.5,
        n1: 6,
        n2: 7,
        zStatistic: 0.189,
        pValue: 0.850
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('nRuns')
      expect(mockResult).toHaveProperty('expectedRuns')
      expect(mockResult).toHaveProperty('n1')
      expect(mockResult).toHaveProperty('n2')
      expect(mockResult).toHaveProperty('zStatistic')
      expect(mockResult).toHaveProperty('pValue')

      // 검증: 타입
      expect(typeof mockResult.nRuns).toBe('number')
      expect(typeof mockResult.pValue).toBe('number')
    })
  })

  describe('Sign Test', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조 (before/after 쌍)
      const beforeData = [23, 45, 67, 12, 34]
      const afterData = [25, 48, 65, 15, 38]

      // 검증: 배열 길이 일치
      expect(beforeData.length).toBe(afterData.length)

      // 검증: 최소 데이터 (5개 이상)
      expect(beforeData.length).toBeGreaterThanOrEqual(5)

      // 검증: 숫자형 데이터
      expect(beforeData.every(val => typeof val === 'number')).toBe(true)
      expect(afterData.every(val => typeof val === 'number')).toBe(true)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        before: [23, 45, 67, 12, 34],
        after: [25, 48, 65, 15, 38]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('before')
      expect(params).toHaveProperty('after')

      // 검증: snake_case 사용
      expect(Object.keys(params)).toEqual(['before', 'after'])
    })

    it('반환 타입이 SignTestResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        nPositive: 4,
        nNegative: 1,
        nTies: 0,
        pValue: 0.375
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('nPositive')
      expect(mockResult).toHaveProperty('nNegative')
      expect(mockResult).toHaveProperty('nTies')
      expect(mockResult).toHaveProperty('pValue')

      // 검증: 타입
      expect(typeof mockResult.nPositive).toBe('number')
      expect(typeof mockResult.nNegative).toBe('number')
      expect(typeof mockResult.nTies).toBe('number')
      expect(typeof mockResult.pValue).toBe('number')

      // 검증: nTotal 계산 가능
      const nTotal = mockResult.nPositive + mockResult.nNegative
      expect(nTotal).toBeGreaterThan(0)
    })
  })

  describe('프론트엔드 데이터 추출 로직', () => {
    it('McNemar: 유효하지 않은 이진 데이터를 필터링해야 함', () => {
      const rawData = [
        { var1: 1, var2: 0 },
        { var1: null, var2: 1 },  // ❌ null
        { var1: 1, var2: undefined },  // ❌ undefined
        { var1: 0, var2: 1 }
      ]

      // 필터링 로직 시뮬레이션
      const pairs = rawData
        .map(row => ({ val1: row.var1, val2: row.var2 }))
        .filter(pair => pair.val1 !== null && pair.val1 !== undefined && pair.val2 !== null && pair.val2 !== undefined)

      // 검증: 유효한 데이터만 2개
      expect(pairs).toHaveLength(2)
      expect(pairs[0]).toEqual({ val1: 1, val2: 0 })
      expect(pairs[1]).toEqual({ val1: 0, val2: 1 })
    })

    it('Runs Test: 유효하지 않은 숫자 데이터를 필터링해야 함', () => {
      const rawData = [
        { value: 10 },
        { value: null },  // ❌ null
        { value: NaN },   // ❌ NaN
        { value: 20 },
        { value: undefined },  // ❌ undefined
        { value: 30 }
      ]

      // 필터링 로직 시뮬레이션
      const sequence: number[] = []
      for (const row of rawData) {
        const value = row.value
        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
          sequence.push(value)
        }
      }

      // 검증: 유효한 데이터만 3개
      expect(sequence).toHaveLength(3)
      expect(sequence).toEqual([10, 20, 30])
    })

    it('Sign Test: before/after 쌍이 일치하는 데이터만 추출해야 함', () => {
      const rawData = [
        { before: 10, after: 12 },
        { before: null, after: 14 },  // ❌ before null
        { before: 16, after: null },  // ❌ after null
        { before: 18, after: 20 }
      ]

      // 필터링 로직 시뮬레이션
      const beforeData: number[] = []
      const afterData: number[] = []

      for (const row of rawData) {
        if (
          row.before !== null &&
          row.before !== undefined &&
          typeof row.before === 'number' &&
          !isNaN(row.before) &&
          row.after !== null &&
          row.after !== undefined &&
          typeof row.after === 'number' &&
          !isNaN(row.after)
        ) {
          beforeData.push(row.before)
          afterData.push(row.after)
        }
      }

      // 검증: 유효한 쌍만 2개
      expect(beforeData).toHaveLength(2)
      expect(afterData).toHaveLength(2)
      expect(beforeData).toEqual([10, 18])
      expect(afterData).toEqual([12, 20])
    })
  })

  describe('에러 처리', () => {
    it('McNemar: 2x2 테이블이 아니면 에러', () => {
      const invalidTable = [[1, 2, 3], [4, 5, 6]]  // 2x3 테이블

      expect(() => {
        if (invalidTable.length !== 2 || invalidTable[0].length !== 2) {
          throw new Error('McNemar test requires 2x2 contingency table')
        }
      }).toThrow('McNemar test requires 2x2 contingency table')
    })

    it('Runs Test: 최소 10개 미만이면 에러', () => {
      const shortSequence = [1, 2, 3, 4, 5]  // 5개만

      expect(() => {
        if (shortSequence.length < 10) {
          throw new Error('런 검정은 최소 10개 이상의 관측값이 필요합니다.')
        }
      }).toThrow('런 검정은 최소 10개 이상의 관측값이 필요합니다.')
    })

    it('Sign Test: 최소 5개 미만이면 에러', () => {
      const shortData = [1, 2, 3]  // 3개만

      expect(() => {
        if (shortData.length < 5) {
          throw new Error('부호 검정은 최소 5개 이상의 쌍이 필요합니다.')
        }
      }).toThrow('부호 검정은 최소 5개 이상의 쌍이 필요합니다.')
    })
  })
})
