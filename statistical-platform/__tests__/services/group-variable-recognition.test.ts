/**
 * 그룹 변수 인식 버그 수정 테스트
 *
 * 버그: Smart Flow에서 독립표본 t-검정 실행 시 그룹 변수가 인식되지 않음
 * 원인: AnalysisExecutionStep의 useEffect가 variableMapping 업데이트 전에 실행
 * 수정: variableMapping 유효성 검사 후 분석 실행
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock data - 독립표본 t-검정용 테스트 데이터
const createTestData = () => [
  { ID: 1, '성별': '수', '체중_g': 175, '체장_cm': 70 },
  { ID: 2, '성별': '수', '체중_g': 178, '체장_cm': 75 },
  { ID: 3, '성별': '수', '체중_g': 180, '체장_cm': 72 },
  { ID: 4, '성별': '수', '체중_g': 165, '체장_cm': 68 },
  { ID: 5, '성별': '수', '체중_g': 172, '체장_cm': 71 },
  { ID: 6, '성별': '암', '체중_g': 162, '체장_cm': 55 },
  { ID: 7, '성별': '암', '체중_g': 155, '체장_cm': 52 },
  { ID: 8, '성별': '암', '체중_g': 158, '체장_cm': 54 },
  { ID: 9, '성별': '암', '체중_g': 160, '체장_cm': 56 },
  { ID: 10, '성별': '암', '체중_g': 157, '체장_cm': 53 },
]

describe('그룹 변수 인식 테스트', () => {
  describe('prepareData 함수 시뮬레이션', () => {
    /**
     * prepareData 로직 시뮬레이션
     * statistical-executor.ts의 prepareData 메서드와 동일한 로직
     */
    const simulatePrepareData = (
      data: Array<Record<string, unknown>>,
      variables: Record<string, unknown>
    ) => {
      // getGroup 함수 시뮬레이션
      const getGroup = (): string | undefined => {
        return (variables.group || variables.groupVar) as string | undefined
      }

      // getDependent 함수 시뮬레이션
      const getDependent = (): string[] => {
        const dep = variables.dependent || variables.dependentVar
        if (!dep) return []
        return Array.isArray(dep) ? dep as string[] : [dep as string]
      }

      const group = getGroup()
      const dependent = getDependent()

      const result: {
        group: string | undefined
        dependent: string[]
        groups?: unknown[]
        byGroup?: Record<string, number[]>
      } = {
        group,
        dependent
      }

      // 그룹변수로 데이터 분할
      if (group) {
        const groups = [...new Set(data.map(row => row[group]))]
        result.groups = groups
        result.byGroup = {}

        groups.forEach(grp => {
          result.byGroup![String(grp)] = data
            .filter(row => row[group] === grp)
            .map(row => {
              const val = dependent.length > 0 ?
                Number(row[dependent[0]]) :
                Object.values(row).find(v => !isNaN(Number(v)))
              return typeof val === 'number' ? val : Number(val)
            })
            .filter((v: number) => !isNaN(v))
        })
      }

      return result
    }

    it('올바른 variableMapping으로 그룹이 정확히 분할되어야 함', () => {
      const data = createTestData()
      const variableMapping = {
        groupVar: '성별',
        dependentVar: '체중_g'
      }

      const result = simulatePrepareData(data, variableMapping)

      // 그룹 변수가 올바르게 추출되었는지 확인
      expect(result.group).toBe('성별')
      expect(result.dependent).toEqual(['체중_g'])

      // 그룹이 2개로 분할되었는지 확인
      expect(result.groups).toBeDefined()
      expect(result.groups).toHaveLength(2)
      expect(result.groups).toContain('수')
      expect(result.groups).toContain('암')

      // 각 그룹에 5개씩 데이터가 있는지 확인
      expect(result.byGroup).toBeDefined()
      expect(result.byGroup!['수']).toHaveLength(5)
      expect(result.byGroup!['암']).toHaveLength(5)

      // 수컷 그룹의 체중 데이터 확인
      expect(result.byGroup!['수']).toEqual([175, 178, 180, 165, 172])
      // 암컷 그룹의 체중 데이터 확인
      expect(result.byGroup!['암']).toEqual([162, 155, 158, 160, 157])
    })

    it('빈 variableMapping으로는 그룹이 분할되지 않아야 함', () => {
      const data = createTestData()
      const emptyMapping = {}

      const result = simulatePrepareData(data, emptyMapping)

      // 그룹 변수가 없어야 함
      expect(result.group).toBeUndefined()
      expect(result.groups).toBeUndefined()
      expect(result.byGroup).toBeUndefined()
    })

    it('groupVar 대신 group을 사용해도 동작해야 함', () => {
      const data = createTestData()
      const variableMapping = {
        group: '성별',
        dependent: '체중_g'
      }

      const result = simulatePrepareData(data, variableMapping)

      expect(result.group).toBe('성별')
      expect(result.groups).toHaveLength(2)
    })

    it('존재하지 않는 컬럼명을 사용하면 모든 값이 undefined가 됨', () => {
      const data = createTestData()
      const variableMapping = {
        groupVar: '없는컬럼',
        dependentVar: '체중_g'
      }

      const result = simulatePrepareData(data, variableMapping)

      // 그룹은 추출되지만 모든 행이 undefined 그룹에 속함
      expect(result.group).toBe('없는컬럼')
      expect(result.groups).toBeDefined()
      expect(result.groups).toHaveLength(1) // [undefined]
    })
  })

  describe('variableMapping 유효성 검사', () => {
    /**
     * AnalysisExecutionStep의 hasValidMapping 로직 시뮬레이션
     */
    const hasValidMapping = (variableMapping: unknown): boolean => {
      return !!(variableMapping && (
        (variableMapping as Record<string, unknown>).groupVar ||
        (variableMapping as Record<string, unknown>).dependentVar ||
        (variableMapping as Record<string, unknown>).variables
      ))
    }

    it('groupVar가 있으면 유효함', () => {
      expect(hasValidMapping({ groupVar: '성별' })).toBe(true)
    })

    it('dependentVar가 있으면 유효함', () => {
      expect(hasValidMapping({ dependentVar: '체중_g' })).toBe(true)
    })

    it('variables가 있으면 유효함', () => {
      expect(hasValidMapping({ variables: ['var1', 'var2'] })).toBe(true)
    })

    it('빈 객체는 유효하지 않음', () => {
      expect(hasValidMapping({})).toBe(false)
    })

    it('null은 유효하지 않음', () => {
      expect(hasValidMapping(null)).toBe(false)
    })

    it('undefined는 유효하지 않음', () => {
      expect(hasValidMapping(undefined)).toBe(false)
    })

    it('관련 없는 속성만 있으면 유효하지 않음', () => {
      expect(hasValidMapping({ foo: 'bar', baz: 123 })).toBe(false)
    })
  })

  describe('t-검정 그룹 검증 시뮬레이션', () => {
    /**
     * executeTTest의 그룹 검증 로직 시뮬레이션
     */
    const validateTTestGroups = (byGroup: Record<string, number[]> | undefined) => {
      if (!byGroup) {
        return { valid: false, error: 't-검정을 위한 그룹 데이터가 없습니다' }
      }

      const groupNames = Object.keys(byGroup)
      if (groupNames.length !== 2) {
        return {
          valid: false,
          error: `t-검정을 위해 정확히 2개 그룹이 필요합니다. 현재: ${groupNames.length}개`
        }
      }

      const group1 = byGroup[groupNames[0]] || []
      const group2 = byGroup[groupNames[1]] || []

      if (group1.length < 2 || group2.length < 2) {
        return {
          valid: false,
          error: `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: 그룹 "${groupNames[0]}": ${group1.length}개, 그룹 "${groupNames[1]}": ${group2.length}개`
        }
      }

      return { valid: true, group1, group2, groupNames }
    }

    it('올바른 그룹 데이터로 검증 통과', () => {
      const byGroup = {
        '수': [175, 178, 180, 165, 172],
        '암': [162, 155, 158, 160, 157]
      }

      const result = validateTTestGroups(byGroup)

      expect(result.valid).toBe(true)
      expect(result.group1).toHaveLength(5)
      expect(result.group2).toHaveLength(5)
    })

    it('그룹이 1개만 있으면 실패', () => {
      const byGroup = {
        '수': [175, 178, 180, 165, 172]
      }

      const result = validateTTestGroups(byGroup)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('정확히 2개 그룹이 필요')
    })

    it('그룹 데이터가 없으면 실패', () => {
      const result = validateTTestGroups(undefined)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('그룹 데이터가 없습니다')
    })

    it('한 그룹의 데이터가 2개 미만이면 실패', () => {
      const byGroup = {
        '수': [175],  // 1개만 있음
        '암': [162, 155, 158, 160, 157]
      }

      const result = validateTTestGroups(byGroup)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('최소 2개 이상의 관측치')
    })

    it('빈 그룹이 있으면 실패 (버그 재현)', () => {
      // 이전 버그 상황: variableMapping이 빈 객체일 때
      // group이 undefined → byGroup 미설정 → independent 사용
      // → group1: dependent (30개), group2: independent[0] (0개)
      const byGroup = {
        '그룹 1': [175, 178, 180],  // dependent에서 온 데이터
        '그룹 2': []  // independent[0]이 비어있음
      }

      const result = validateTTestGroups(byGroup)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('그룹 "그룹 2": 0개')
    })
  })

  describe('전체 플로우 시뮬레이션', () => {
    it('올바른 variableMapping으로 전체 플로우 성공', () => {
      // 1. 데이터 준비
      const data = createTestData()

      // 2. 변수 매핑 (GroupComparisonSelector에서 반환)
      const variableMapping = {
        groupVar: '성별',
        dependentVar: '체중_g'
      }

      // 3. hasValidMapping 체크 (AnalysisExecutionStep)
      const hasValidMapping = !!(variableMapping && (
        (variableMapping as Record<string, unknown>).groupVar ||
        (variableMapping as Record<string, unknown>).dependentVar
      ))
      expect(hasValidMapping).toBe(true)

      // 4. prepareData 시뮬레이션 (StatisticalExecutor)
      const group = variableMapping.groupVar
      const dependent = [variableMapping.dependentVar]
      const groups = [...new Set(data.map(row => row[group]))]

      expect(groups).toHaveLength(2)
      expect(groups).toContain('수')
      expect(groups).toContain('암')

      // 5. 그룹별 데이터 분할
      const byGroup: Record<string, number[]> = {}
      groups.forEach(grp => {
        byGroup[String(grp)] = data
          .filter(row => row[group] === grp)
          .map(row => Number(row[dependent[0]]))
          .filter(v => !isNaN(v))
      })

      expect(byGroup['수']).toHaveLength(5)
      expect(byGroup['암']).toHaveLength(5)

      // 6. t-검정 검증 통과
      const groupNames = Object.keys(byGroup)
      expect(groupNames.length).toBe(2)
      expect(byGroup[groupNames[0]].length).toBeGreaterThanOrEqual(2)
      expect(byGroup[groupNames[1]].length).toBeGreaterThanOrEqual(2)

      // 성공!
      console.log('전체 플로우 시뮬레이션 성공:', {
        groups: groupNames,
        '수': byGroup['수'],
        '암': byGroup['암']
      })
    })

    it('빈 variableMapping으로 전체 플로우 실패 (이전 버그)', () => {
      const data = createTestData()

      // 빈 variableMapping (이전 버그 상황)
      const variableMapping = {}

      // hasValidMapping이 false
      const hasValidMapping = !!(variableMapping && (
        (variableMapping as Record<string, unknown>).groupVar ||
        (variableMapping as Record<string, unknown>).dependentVar
      ))

      // 수정된 코드에서는 여기서 분석이 실행되지 않음
      expect(hasValidMapping).toBe(false)

      // 이전에는 hasValidMapping 체크 없이 바로 실행되어 오류 발생
      // 이제는 유효한 mapping이 올 때까지 대기
    })
  })
})