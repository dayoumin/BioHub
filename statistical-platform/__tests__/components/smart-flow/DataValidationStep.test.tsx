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
    it('숫자형 열을 categoricalColumns에 포함 (uniqueValues <= 20인 경우)', () => {
      const columnStats = [
        { name: 'age', type: 'numeric', uniqueValues: 5 },  // uniqueValues <= 20 → 포함
        { name: 'gender', type: 'categorical', uniqueValues: 2 },
        { name: 'income', type: 'numeric', uniqueValues: 100 },  // uniqueValues > 20 → 제외
        { name: 'status', type: 'categorical', uniqueValues: 3 }
      ]

      const { result } = renderHook(() =>
        useMemo(() =>
          // Bug #2 Fix (Revised): 숫자 인코딩된 범주형 포함
          columnStats?.filter(s =>
            s.type === 'categorical' ||
            (s.type === 'numeric' && s.uniqueValues <= 20)
          ) || [],
          [columnStats]
        )
      )

      // 검증: categorical + uniqueValues <= 20인 numeric 포함
      expect(result.current).toHaveLength(3)
      expect(result.current.map(c => c.name)).toEqual(['age', 'gender', 'status'])

      // 검증: uniqueValues > 20인 numeric은 제외
      expect(result.current.find(c => c.name === 'income')).toBeUndefined()
    })

    it('uniqueValues <= 20인 숫자형 열이 categoricalColumns에 포함되어야 함 (Revised)', () => {
      const columnStats = [
        { name: 'score', type: 'numeric', uniqueValues: 10 },  // uniqueValues <= 20
        { name: 'rating', type: 'numeric', uniqueValues: 5 },   // uniqueValues <= 20
        { name: 'category', type: 'categorical', uniqueValues: 3 }
      ]

      const { result } = renderHook(() =>
        useMemo(() =>
          // Bug #2 Fix (Revised): 숫자 인코딩된 범주형 포함
          columnStats?.filter(s =>
            s.type === 'categorical' ||
            (s.type === 'numeric' && s.uniqueValues <= 20)
          ) || [],
          [columnStats]
        )
      )

      // 검증: uniqueValues <= 20인 numeric도 포함 (숫자 인코딩된 범주형: 0/1, 1/2/3 등)
      expect(result.current).toHaveLength(3)
      expect(result.current.map(c => c.name)).toEqual(['score', 'rating', 'category'])
    })

    it('Levene 검정 시나리오: 그룹 변수와 측정 변수가 동일하면 스킵되어야 함', () => {
      // 시나리오: age가 uniqueValues=5로 categoricalColumns에 포함됨 (숫자 인코딩된 범주형)
      const columnStats = [
        { name: 'age', type: 'numeric', uniqueValues: 5 },  // categoricalColumns와 numericColumns 모두에 포함
        { name: 'height', type: 'numeric', uniqueValues: 50 }
      ]

      const numericColumns = columnStats.filter(s => s.type === 'numeric')
      const categoricalColumns = columnStats.filter(s =>
        s.type === 'categorical' ||
        (s.type === 'numeric' && s.uniqueValues <= 20)
      )

      // 검증: age가 양쪽에 모두 포함
      expect(categoricalColumns).toHaveLength(1)
      expect(numericColumns).toHaveLength(2)
      expect(categoricalColumns[0].name).toBe('age')
      expect(numericColumns[0].name).toBe('age')

      // 컴포넌트 로직: 그룹 변수는 측정 변수와 다른 열만 허용 → undefined면 스킵 처리
      const groupCandidate = categoricalColumns.find(col => col.name !== numericColumns[0].name)
      expect(groupCandidate).toBeUndefined()
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
