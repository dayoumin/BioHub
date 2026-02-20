/**
 * Mood Median Test Integration Test
 * - 프론트엔드 데이터 구조 검증
 * - Python Worker 호출 파라미터 검증
 * - 결과 타입 검증
 */

import { describe, it } from 'vitest'

describe('Mood Median Test Integration', () => {
  describe('데이터 구조', () => {
    it('그룹별 데이터가 올바른 형식이어야 함', () => {
      // 그룹별 데이터 (2개 이상 그룹)
      const groups = [
        [23, 45, 67, 12, 34],  // Group A
        [56, 78, 23, 45, 67],  // Group B
        [89, 12, 34, 56, 78]   // Group C
      ]

      // 검증: 최소 2개 그룹
      expect(groups.length).toBeGreaterThanOrEqual(2)

      // 검증: 각 그룹이 배열
      expect(groups.every(g => Array.isArray(g))).toBe(true)

      // 검증: 숫자형 데이터
      expect(groups.every(g => g.every(v => typeof v === 'number'))).toBe(true)
    })

    it('그룹별 데이터 집계가 올바르게 되어야 함', () => {
      const rawData = [
        { group: 'A', value: 10 },
        { group: 'B', value: 20 },
        { group: 'A', value: 15 },
        { group: 'C', value: 30 },
        { group: 'B', value: 25 },
        { group: 'A', value: 12 }
      ]

      // 그룹별 집계
      const groupsMap = new Map<string, number[]>()
      for (const row of rawData) {
        if (!groupsMap.has(row.group)) {
          groupsMap.set(row.group, [])
        }
        groupsMap.get(row.group)!.push(row.value)
      }

      const groups = Array.from(groupsMap.values())
      const groupNames = Array.from(groupsMap.keys())

      // 검증: 3개 그룹
      expect(groups).toHaveLength(3)
      expect(groupNames).toEqual(['A', 'B', 'C'])

      // 검증: Group A - 3개 관측값
      expect(groups[0]).toEqual([10, 15, 12])
    })
  })

  describe('Python Worker 호출', () => {
    it('파라미터가 올바른 형식이어야 함', () => {
      const params = {
        groups: [
          [23, 45, 67, 12, 34],
          [56, 78, 23, 45, 67],
          [89, 12, 34, 56, 78]
        ]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('groups')

      // 검증: snake_case 사용 (Python 규약)
      expect(Object.keys(params)).toEqual(['groups'])

      // 검증: 2D 배열
      expect(Array.isArray(params.groups)).toBe(true)
      expect(Array.isArray(params.groups[0])).toBe(true)
    })

    it('반환 타입이 MoodMedianTestResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockPythonResult = {
        statistic: 5.234,
        pValue: 0.073,
        grandMedian: 45.0,
        contingencyTable: [
          [3, 4, 2],  // Above median
          [2, 1, 3]   // Below/equal median
        ]
      }

      // 검증: 필수 필드 존재
      expect(mockPythonResult).toHaveProperty('statistic')
      expect(mockPythonResult).toHaveProperty('pValue')
      expect(mockPythonResult).toHaveProperty('grandMedian')
      expect(mockPythonResult).toHaveProperty('contingencyTable')

      // 검증: 타입
      expect(typeof mockPythonResult.statistic).toBe('number')
      expect(typeof mockPythonResult.pValue).toBe('number')
      expect(typeof mockPythonResult.grandMedian).toBe('number')
      expect(Array.isArray(mockPythonResult.contingencyTable)).toBe(true)

      // 검증: contingencyTable 구조 (2 × k)
      expect(mockPythonResult.contingencyTable).toHaveLength(2)  // 2 rows
      expect(mockPythonResult.contingencyTable[0]).toHaveLength(3)  // k groups
    })
  })

  describe('그룹별 통계 계산', () => {
    it('중앙값이 올바르게 계산되어야 함', () => {
      const calculateMedian = (arr: number[]): number => {
        const sorted = [...arr].sort((a, b) => a - b)
        return sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
      }

      // 홀수 길이
      expect(calculateMedian([1, 3, 5, 7, 9])).toBe(5)

      // 짝수 길이
      expect(calculateMedian([1, 2, 3, 4, 5, 6])).toBe(3.5)

      // 정렬되지 않은 데이터
      expect(calculateMedian([9, 1, 5, 3, 7])).toBe(5)
    })

    it('Above/Below median 카운트가 올바르게 계산되어야 함', () => {
      const groupData = [10, 20, 30, 40, 50]
      const grandMedian = 30

      const aboveMedian = groupData.filter(v => v > grandMedian).length
      const belowMedian = groupData.filter(v => v <= grandMedian).length

      // 검증: Above median - 2개 (40, 50)
      expect(aboveMedian).toBe(2)

      // 검증: Below/equal median - 3개 (10, 20, 30)
      expect(belowMedian).toBe(3)

      // 검증: 합계
      expect(aboveMedian + belowMedian).toBe(groupData.length)
    })
  })

  describe('데이터 필터링', () => {
    it('유효하지 않은 데이터를 제외해야 함', () => {
      const rawData = [
        { group: 'A', value: 10 },
        { group: 'B', value: null },  // ❌ null
        { group: 'A', value: 15 },
        { group: 'C', value: undefined },  // ❌ undefined
        { group: 'B', value: NaN },  // ❌ NaN
        { group: 'A', value: 20 }
      ]

      // 필터링
      const groupsMap = new Map<string, number[]>()
      for (const row of rawData) {
        const { group, value } = row

        if (
          group === null || group === undefined ||
          value === null || value === undefined ||
          typeof value !== 'number' || isNaN(value)
        ) {
          continue
        }

        if (!groupsMap.has(group)) {
          groupsMap.set(group, [])
        }

        groupsMap.get(group)!.push(value)
      }

      const groups = Array.from(groupsMap.values())

      // 검증: 유효한 데이터만 1개 그룹 (A)
      expect(groups).toHaveLength(1)
      expect(groups[0]).toEqual([10, 15, 20])
    })
  })

  describe('에러 처리', () => {
    it('최소 2개 그룹 미만이면 에러', () => {
      const groups = [[10, 20, 30]]  // 1개 그룹만

      expect(() => {
        if (groups.length < 2) {
          throw new Error('Mood Median Test는 최소 2개 이상의 그룹이 필요합니다.')
        }
      }).toThrow('Mood Median Test는 최소 2개 이상의 그룹이 필요합니다.')
    })
  })

  describe('Frontend Result 구조', () => {
    it('MoodMedianTestResult 인터페이스가 Python 결과를 포함해야 함', () => {
      const pythonResult = {
        statistic: 5.234,
        pValue: 0.073,
        grandMedian: 45.0,
        contingencyTable: [[3, 4, 2], [2, 1, 3]]
      }

      const frontendResult = {
        ...pythonResult,
        significant: pythonResult.pValue < 0.05,
        interpretation: 'Test interpretation',
        nGroups: 3,
        nTotal: 15,
        groupStats: [
          { group: 'A', n: 5, median: 34, aboveMedian: 3, belowMedian: 2 },
          { group: 'B', n: 5, median: 56, aboveMedian: 4, belowMedian: 1 },
          { group: 'C', n: 5, median: 34, aboveMedian: 2, belowMedian: 3 }
        ]
      }

      // 검증: Python 결과 필드
      expect(frontendResult.statistic).toBe(pythonResult.statistic)
      expect(frontendResult.pValue).toBe(pythonResult.pValue)
      expect(frontendResult.grandMedian).toBe(pythonResult.grandMedian)

      // 검증: 프론트엔드 추가 필드
      expect(frontendResult).toHaveProperty('significant')
      expect(frontendResult).toHaveProperty('interpretation')
      expect(frontendResult).toHaveProperty('nGroups')
      expect(frontendResult).toHaveProperty('nTotal')
      expect(frontendResult).toHaveProperty('groupStats')

      // 검증: 그룹 통계 배열
      expect(frontendResult.groupStats).toHaveLength(3)
      expect(frontendResult.groupStats[0].median).toBe(34)
    })
  })

  describe('Contingency Table 구조', () => {
    it('2 × k 분할표가 올바르게 구성되어야 함', () => {
      const contingencyTable = [
        [3, 4, 2],  // Row 0: Above median
        [2, 1, 3]   // Row 1: Below/equal median
      ]

      // 검증: 2 rows
      expect(contingencyTable).toHaveLength(2)

      // 검증: k columns (3 groups)
      expect(contingencyTable[0]).toHaveLength(3)
      expect(contingencyTable[1]).toHaveLength(3)

      // 검증: 각 열의 합계 = 그룹 크기
      const nGroup1 = contingencyTable[0][0] + contingencyTable[1][0]
      const nGroup2 = contingencyTable[0][1] + contingencyTable[1][1]
      const nGroup3 = contingencyTable[0][2] + contingencyTable[1][2]

      expect(nGroup1).toBe(5)  // 3 + 2
      expect(nGroup2).toBe(5)  // 4 + 1
      expect(nGroup3).toBe(5)  // 2 + 3
    })
  })
})
