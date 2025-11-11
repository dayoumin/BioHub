/**
 * Statistical Tests Utility Functions - Unit Tests
 *
 * @description
 * statisticalTests.ts 모듈의 통계 계산 함수들에 대한 단위 테스트
 */

import {
  inverseErf,
  extractNumericData,
  calculateBasicStats,
  normalQuantile,
  generateTheoreticalQuantiles
} from '../statisticalTests'
import type { DataRow } from '@/types/smart-flow'

describe('statisticalTests.ts - Statistical Utility Functions', () => {
  describe('inverseErf', () => {
    it('경계값: x = 0이면 0을 반환해야 함', () => {
      expect(inverseErf(0)).toBeCloseTo(0, 5)
    })

    it('경계값: x = 1이면 Infinity를 반환해야 함', () => {
      expect(inverseErf(1)).toBe(Infinity)
    })

    it('경계값: x = -1이면 -Infinity를 반환해야 함', () => {
      expect(inverseErf(-1)).toBe(-Infinity)
    })

    it('양수: x = 0.5일 때 양수 값을 반환해야 함', () => {
      const result = inverseErf(0.5)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeCloseTo(0.4769, 2) // 이론적 근사값
    })

    it('음수: x = -0.5일 때 음수 값을 반환해야 함', () => {
      const result = inverseErf(-0.5)
      expect(result).toBeLessThan(0)
      expect(result).toBeCloseTo(-0.4769, 2)
    })

    it('대칭성: inverseErf(x) = -inverseErf(-x)', () => {
      const x = 0.3
      expect(inverseErf(x)).toBeCloseTo(-inverseErf(-x), 5)
    })

    it('범위 밖: |x| > 1이면 Infinity 또는 -Infinity', () => {
      expect(inverseErf(1.5)).toBe(Infinity)
      expect(inverseErf(-1.5)).toBe(-Infinity)
    })
  })

  describe('extractNumericData', () => {
    it('숫자 배열을 올바르게 추출해야 함', () => {
      const data: DataRow[] = [
        { age: 25, name: 'Alice' },
        { age: 30, name: 'Bob' },
        { age: 35, name: 'Charlie' }
      ]
      const result = extractNumericData(data, 'age')
      expect(result).toEqual([25, 30, 35])
    })

    it('문자열 숫자를 parseFloat로 변환해야 함', () => {
      const data: DataRow[] = [
        { score: '85.5' },
        { score: '90.0' },
        { score: '78.2' }
      ]
      const result = extractNumericData(data, 'score')
      expect(result).toEqual([85.5, 90.0, 78.2])
    })

    it('NaN 값을 필터링해야 함', () => {
      const data: DataRow[] = [
        { value: 10 },
        { value: 'not a number' },
        { value: 20 },
        { value: null },
        { value: 30 }
      ]
      const result = extractNumericData(data, 'value')
      expect(result).toEqual([10, 20, 30])
    })

    it('빈 배열을 반환해야 함 (컬럼이 없는 경우)', () => {
      const data: DataRow[] = [
        { name: 'Alice' },
        { name: 'Bob' }
      ]
      const result = extractNumericData(data, 'age')
      expect(result).toEqual([])
    })

    it('빈 배열을 반환해야 함 (모든 값이 NaN)', () => {
      const data: DataRow[] = [
        { value: 'abc' },
        { value: 'def' },
        { value: null }
      ]
      const result = extractNumericData(data, 'value')
      expect(result).toEqual([])
    })

    it('음수와 소수를 올바르게 처리해야 함', () => {
      const data: DataRow[] = [
        { temp: -5.2 },
        { temp: 0 },
        { temp: 3.7 },
        { temp: '-10.5' }
      ]
      const result = extractNumericData(data, 'temp')
      expect(result).toEqual([-5.2, 0, 3.7, -10.5])
    })
  })

  describe('calculateBasicStats', () => {
    it('기초 통계량을 올바르게 계산해야 함', () => {
      const values = [1, 2, 3, 4, 5]
      const result = calculateBasicStats(values)

      expect(result.mean).toBeCloseTo(3, 5)
      expect(result.std).toBeCloseTo(1.4142, 2) // √2
      expect(result.min).toBe(1)
      expect(result.max).toBe(5)
    })

    it('단일 값에 대해 올바르게 계산해야 함', () => {
      const values = [42]
      const result = calculateBasicStats(values)

      expect(result.mean).toBe(42)
      expect(result.std).toBe(0)
      expect(result.min).toBe(42)
      expect(result.max).toBe(42)
    })

    it('빈 배열에 대해 0을 반환해야 함', () => {
      const values: number[] = []
      const result = calculateBasicStats(values)

      expect(result.mean).toBe(0)
      expect(result.std).toBe(0)
      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
    })

    it('음수를 포함한 데이터를 올바르게 처리해야 함', () => {
      const values = [-5, -3, 0, 3, 5]
      const result = calculateBasicStats(values)

      expect(result.mean).toBeCloseTo(0, 5)
      expect(result.std).toBeGreaterThan(0)
      expect(result.min).toBe(-5)
      expect(result.max).toBe(5)
    })

    it('동일한 값들에 대해 표준편차 0을 반환해야 함', () => {
      const values = [7, 7, 7, 7, 7]
      const result = calculateBasicStats(values)

      expect(result.mean).toBe(7)
      expect(result.std).toBe(0)
      expect(result.min).toBe(7)
      expect(result.max).toBe(7)
    })

    it('소수를 올바르게 처리해야 함', () => {
      const values = [1.1, 2.2, 3.3, 4.4, 5.5]
      const result = calculateBasicStats(values)

      expect(result.mean).toBeCloseTo(3.3, 5)
      expect(result.min).toBeCloseTo(1.1, 5)
      expect(result.max).toBeCloseTo(5.5, 5)
    })
  })

  describe('normalQuantile', () => {
    it('중앙값: p = 0.5일 때 0을 반환해야 함', () => {
      expect(normalQuantile(0.5)).toBeCloseTo(0, 5)
    })

    it('상위 분위수: p = 0.975일 때 약 1.96을 반환해야 함', () => {
      expect(normalQuantile(0.975)).toBeCloseTo(1.96, 1)
    })

    it('하위 분위수: p = 0.025일 때 약 -1.96을 반환해야 함', () => {
      expect(normalQuantile(0.025)).toBeCloseTo(-1.96, 1)
    })

    it('대칭성: normalQuantile(p) = -normalQuantile(1-p)', () => {
      const p = 0.75
      expect(normalQuantile(p)).toBeCloseTo(-normalQuantile(1 - p), 5)
    })

    it('상위 1%: p = 0.99일 때 약 2.33을 반환해야 함', () => {
      expect(normalQuantile(0.99)).toBeCloseTo(2.33, 1)
    })

    it('하위 1%: p = 0.01일 때 약 -2.33을 반환해야 함', () => {
      expect(normalQuantile(0.01)).toBeCloseTo(-2.33, 1)
    })
  })

  describe('generateTheoreticalQuantiles', () => {
    it('지정된 개수만큼 분위수를 생성해야 함', () => {
      const quantiles = generateTheoreticalQuantiles(10)
      expect(quantiles).toHaveLength(10)
    })

    it('중앙값이 0에 가까워야 함 (홀수 개수)', () => {
      const quantiles = generateTheoreticalQuantiles(11)
      const median = quantiles[5] // 11개 중 6번째 (중앙)
      expect(median).toBeCloseTo(0, 1)
    })

    it('대칭적이어야 함', () => {
      const quantiles = generateTheoreticalQuantiles(10)
      const n = quantiles.length

      for (let i = 0; i < n / 2; i++) {
        expect(quantiles[i]).toBeCloseTo(-quantiles[n - 1 - i], 2)
      }
    })

    it('오름차순으로 정렬되어야 함', () => {
      const quantiles = generateTheoreticalQuantiles(20)

      for (let i = 1; i < quantiles.length; i++) {
        expect(quantiles[i]).toBeGreaterThan(quantiles[i - 1])
      }
    })

    it('첫 값은 음수, 마지막 값은 양수여야 함', () => {
      const quantiles = generateTheoreticalQuantiles(50)
      expect(quantiles[0]).toBeLessThan(0)
      expect(quantiles[49]).toBeGreaterThan(0)
    })

    it('단일 값: n = 1일 때 0을 반환해야 함', () => {
      const quantiles = generateTheoreticalQuantiles(1)
      expect(quantiles).toHaveLength(1)
      expect(quantiles[0]).toBeCloseTo(0, 5)
    })

    it('큰 샘플: n = 1000일 때도 정상 작동해야 함', () => {
      const quantiles = generateTheoreticalQuantiles(1000)
      expect(quantiles).toHaveLength(1000)
      expect(quantiles[0]).toBeLessThan(0)
      expect(quantiles[999]).toBeGreaterThan(0)
      expect(quantiles[499]).toBeCloseTo(0, 1) // 중앙값
    })
  })

  describe('Integration Test: Q-Q Plot Workflow', () => {
    it('전체 워크플로우: 데이터 추출 → 통계 계산 → 분위수 생성', () => {
      // Step 1: 데이터 추출
      const data: DataRow[] = [
        { score: 85 },
        { score: 90 },
        { score: 78 },
        { score: 92 },
        { score: 88 }
      ]
      const values = extractNumericData(data, 'score')
      expect(values).toHaveLength(5)

      // Step 2: 기초 통계 계산
      const stats = calculateBasicStats(values)
      expect(stats.mean).toBeGreaterThan(0)
      expect(stats.std).toBeGreaterThan(0)

      // Step 3: 이론적 분위수 생성
      const theoreticalQuantiles = generateTheoreticalQuantiles(values.length)
      expect(theoreticalQuantiles).toHaveLength(values.length)

      // Step 4: Q-Q Plot 데이터 검증
      const sortedValues = [...values].sort((a, b) => a - b)
      expect(sortedValues[0]).toBeLessThanOrEqual(sortedValues[4])

      // 이론적 선 계산
      const theoreticalLine = theoreticalQuantiles.map(
        q => stats.mean + q * stats.std
      )
      expect(theoreticalLine).toHaveLength(values.length)
    })
  })
})
