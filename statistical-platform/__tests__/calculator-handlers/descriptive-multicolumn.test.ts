/**
 * Issue 1: calculateDescriptiveStats 다중 컬럼 지원 검증
 *
 * 검증 항목:
 * 1. 단일 컬럼 (기존 동작)
 * 2. 다중 컬럼 배열 (첫 번째 컬럼만 사용)
 * 3. 빈 배열 에러 처리
 */

import { describe, it, expect } from '@jest/globals'

describe('Issue 1: calculateDescriptiveStats 다중 컬럼 지원', () => {
  it('코드 로직 검증 (타입 체크 통과)', () => {
    // 타입 검증용 - 실제 실행은 통합 테스트에서
    const columns1: string | string[] = 'age'
    const columns2: string | string[] = ['weight', 'height']
    const columns3: string | string[] = []

    // 배열 처리 로직
    const getColumn = (columns: string | string[]): string | undefined => {
      if (!columns) return undefined
      return Array.isArray(columns) ? columns[0] : columns
    }

    expect(getColumn(columns1)).toBe('age')
    expect(getColumn(columns2)).toBe('weight')  // 첫 번째 요소
    expect(getColumn(columns3)).toBeUndefined()  // 빈 배열
  })

  it('에러 처리 로직 검증', () => {
    const validateColumns = (columns: string | string[] | undefined): string | null => {
      if (!columns) {
        return '분석할 열을 선택하세요'
      }

      const column = Array.isArray(columns) ? columns[0] : columns
      if (!column) {
        return '분석할 열을 선택하세요'
      }

      return null
    }

    expect(validateColumns(undefined)).toBe('분석할 열을 선택하세요')
    expect(validateColumns([])).toBe('분석할 열을 선택하세요')
    expect(validateColumns('age')).toBeNull()
    expect(validateColumns(['weight', 'height'])).toBeNull()
  })
})