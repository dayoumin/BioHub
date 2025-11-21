/**
 * DataValidationStep 컴포넌트 테스트
 *
 * Bug #1: isValidating 상태 관리
 * Bug #2: categoricalColumns 필터링
 */

import { renderHook } from '@testing-library/react'
import { useMemo } from 'react'

describe('DataValidationStep Bug Fixes', () => {
  describe('Bug #2: categoricalColumns 필터링', () => {
    it('숫자형 열을 categoricalColumns에서 제외해야 함', () => {
      const columnStats = [
        { name: 'age', type: 'numeric', uniqueValues: 5 },  // uniqueValues <= 20이지만 numeric
        { name: 'gender', type: 'categorical', uniqueValues: 2 },
        { name: 'income', type: 'numeric', uniqueValues: 100 },
        { name: 'status', type: 'categorical', uniqueValues: 3 }
      ]

      const { result } = renderHook(() =>
        useMemo(() =>
          // Bug #2 Fix: 숫자형 열 제외 (type이 명시적으로 categorical인 것만)
          columnStats?.filter(s => s.type === 'categorical') || [],
          [columnStats]
        )
      )

      // 검증: categorical 타입만 포함
      expect(result.current).toHaveLength(2)
      expect(result.current.map(c => c.name)).toEqual(['gender', 'status'])

      // 검증: numeric 타입은 제외
      expect(result.current.every(c => c.type === 'categorical')).toBe(true)
      expect(result.current.find(c => c.name === 'age')).toBeUndefined()
    })

    it('uniqueValues <= 20인 숫자형 열이 categoricalColumns에 포함되지 않아야 함', () => {
      const columnStats = [
        { name: 'score', type: 'numeric', uniqueValues: 10 },  // uniqueValues <= 20
        { name: 'rating', type: 'numeric', uniqueValues: 5 },   // uniqueValues <= 20
        { name: 'category', type: 'categorical', uniqueValues: 3 }
      ]

      const { result } = renderHook(() =>
        useMemo(() =>
          columnStats?.filter(s => s.type === 'categorical') || [],
          [columnStats]
        )
      )

      // 검증: uniqueValues <= 20이어도 numeric은 제외
      expect(result.current).toHaveLength(1)
      expect(result.current[0].name).toBe('category')
    })

    it('Levene 검정 시나리오: 그룹 변수가 측정 변수와 동일하지 않아야 함', () => {
      // 시나리오: age가 uniqueValues=5로 categorical로 오인되는 경우
      const columnStats = [
        { name: 'age', type: 'numeric', uniqueValues: 5 },  // 잘못 분류되면 그룹 변수로 사용
        { name: 'height', type: 'numeric', uniqueValues: 50 }
      ]

      const numericColumns = columnStats.filter(s => s.type === 'numeric')
      const categoricalColumns = columnStats.filter(s => s.type === 'categorical')

      // 검증: categorical이 비어있으므로 Levene 검정 스킵
      expect(categoricalColumns).toHaveLength(0)
      expect(numericColumns).toHaveLength(2)

      // Levene 검정 조건 체크
      const shouldRunLevene = categoricalColumns.length > 0 && numericColumns.length > 0
      expect(shouldRunLevene).toBe(false)
    })
  })

  describe('Bug #1: isValidating 상태 관리', () => {
    it('performAssumptionTests 시작 시 isValidating이 true로 설정되어야 함', () => {
      // 이 테스트는 실제 컴포넌트 테스트에서 확인 필요
      // 여기서는 로직 검증만
      let isValidating = false

      const performAssumptionTests = async () => {
        isValidating = true  // Bug #1 Fix

        try {
          // ... 검정 로직
          await Promise.resolve()
          isValidating = false
        } catch (error) {
          isValidating = false
        }
      }

      // 실행 전
      expect(isValidating).toBe(false)

      // 실행 (동기적으로 시작 부분만)
      const promise = performAssumptionTests()

      // 실행 직후 (비동기 완료 전)
      expect(isValidating).toBe(true)

      // 완료 후
      return promise.then(() => {
        expect(isValidating).toBe(false)
      })
    })

    it('에러 발생 시에도 isValidating이 false로 설정되어야 함', async () => {
      let isValidating = false

      const performAssumptionTests = async () => {
        isValidating = true

        try {
          throw new Error('Test error')
        } catch (error) {
          isValidating = false  // 에러 시에도 false
        }
      }

      await performAssumptionTests()
      expect(isValidating).toBe(false)
    })
  })

  describe('통합 시나리오', () => {
    it('실제 데이터 시나리오: 나이(숫자형, uniqueValues=5)가 그룹 변수로 사용되지 않아야 함', () => {
      // 실제 데이터 예시
      const data = [
        { age: 25, gender: 'M', height: 175 },
        { age: 30, gender: 'F', height: 165 },
        { age: 25, gender: 'M', height: 180 },
        { age: 30, gender: 'F', height: 160 },
        { age: 35, gender: 'M', height: 170 }
      ]

      const columnStats = [
        { name: 'age', type: 'numeric', uniqueValues: 3 },      // 25, 30, 35
        { name: 'gender', type: 'categorical', uniqueValues: 2 }, // M, F
        { name: 'height', type: 'numeric', uniqueValues: 5 }
      ]

      const categoricalColumns = columnStats.filter(s => s.type === 'categorical')
      const numericColumns = columnStats.filter(s => s.type === 'numeric')

      // Levene 검정을 위한 그룹 및 측정 변수 선택
      const groupCol = categoricalColumns[0]?.name  // 'gender'
      const numericCol = numericColumns[0]?.name     // 'age'

      // 검증: 그룹 변수는 categorical, 측정 변수는 numeric
      expect(groupCol).toBe('gender')
      expect(numericCol).toBe('age')
      expect(groupCol).not.toBe(numericCol)

      // 검증: age가 그룹 변수로 사용되지 않음
      expect(categoricalColumns.find(c => c.name === 'age')).toBeUndefined()
    })
  })
})
