/**
 * Runs Test 중앙값 계산 검증
 * - 프론트엔드 중앙값이 Python np.median()과 동일한지 확인
 */

import { describe, it } from '@jest/globals'

describe('Runs Test - Median Calculation', () => {
  /**
   * 프론트엔드 중앙값 계산 함수 (runs-test/page.tsx Line 159-163)
   */
  function calculateMedian(sequence: number[]): number {
    const sortedSequence = [...sequence].sort((a, b) => a - b)
    return sortedSequence.length % 2 === 0
      ? (sortedSequence[sortedSequence.length / 2 - 1] + sortedSequence[sortedSequence.length / 2]) / 2
      : sortedSequence[Math.floor(sortedSequence.length / 2)]
  }

  it('홀수 길이: Python np.median()과 동일해야 함', () => {
    const sequence = [1, 3, 5, 7, 9]  // 5개 (홀수)

    const median = calculateMedian(sequence)

    // 검증: 중앙값 = 5 (3번째 요소)
    expect(median).toBe(5)
  })

  it('짝수 길이: Python np.median()과 동일해야 함 (평균)', () => {
    const sequence = [1, 2, 3, 4, 5, 6]  // 6개 (짝수)

    const median = calculateMedian(sequence)

    // 검증: 중앙값 = 3.5 (3과 4의 평균)
    expect(median).toBe(3.5)
  })

  it('정렬되지 않은 데이터도 올바르게 처리해야 함', () => {
    const sequence = [9, 1, 5, 3, 7]  // 정렬되지 않음

    const median = calculateMedian(sequence)

    // 검증: 정렬 후 [1, 3, 5, 7, 9] → 중앙값 = 5
    expect(median).toBe(5)
  })

  it('짝수 길이 + 정렬되지 않은 데이터', () => {
    const sequence = [10, 20, 5, 15, 25, 30]  // 6개, 정렬되지 않음

    const median = calculateMedian(sequence)

    // 검증: 정렬 후 [5, 10, 15, 20, 25, 30] → 중앙값 = (15 + 20) / 2 = 17.5
    expect(median).toBe(17.5)
  })

  it('중복 값이 있어도 올바르게 계산해야 함', () => {
    const sequence = [5, 5, 5, 10, 10]  // 5개, 중복 포함

    const median = calculateMedian(sequence)

    // 검증: 중앙값 = 5 (3번째 요소)
    expect(median).toBe(5)
  })

  it('최소 길이 (10개)에서도 올바르게 계산해야 함', () => {
    const sequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  // 10개 (짝수)

    const median = calculateMedian(sequence)

    // 검증: 중앙값 = (5 + 6) / 2 = 5.5
    expect(median).toBe(5.5)
  })

  describe('이진 분류 (중앙값 기준)', () => {
    it('중앙값보다 크거나 같으면 A, 작으면 B', () => {
      const sequence = [1, 2, 3, 4, 5]
      const median = calculateMedian(sequence)  // 3

      const binarySequence = sequence.map(val => val >= median ? 'A' : 'B')

      // 검증: [B, B, A, A, A]
      expect(binarySequence).toEqual(['B', 'B', 'A', 'A', 'A'])
    })

    it('짝수 길이에서 중앙값 경계 처리', () => {
      const sequence = [1, 2, 3, 4]
      const median = calculateMedian(sequence)  // 2.5

      const binarySequence = sequence.map(val => val >= median ? 'A' : 'B')

      // 검증: [B, B, A, A] (1, 2는 2.5 미만, 3, 4는 2.5 이상)
      expect(binarySequence).toEqual(['B', 'B', 'A', 'A'])
    })
  })

  describe('기존 방식 vs 수정된 방식 비교', () => {
    function oldMedian(sequence: number[]): number {
      const sorted = [...sequence].sort((a, b) => a - b)
      return sorted[Math.floor(sorted.length / 2)]
    }

    it('홀수 길이: 두 방식 모두 동일', () => {
      const sequence = [1, 3, 5, 7, 9]

      const newMedian = calculateMedian(sequence)
      const old = oldMedian(sequence)

      expect(newMedian).toBe(old)  // 둘 다 5
    })

    it('짝수 길이: 새 방식이 Python과 일치', () => {
      const sequence = [1, 2, 3, 4, 5, 6]

      const newMedian = calculateMedian(sequence)
      const old = oldMedian(sequence)

      // 새 방식: 3.5 (평균) ✅
      expect(newMedian).toBe(3.5)

      // 기존 방식: 4 (하위 중앙값) ❌
      expect(old).toBe(4)

      // 검증: 다르다
      expect(newMedian).not.toBe(old)
    })
  })
})
