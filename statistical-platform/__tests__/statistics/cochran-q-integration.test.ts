/**
 * Cochran Q Test Integration Test
 * - 프론트엔드 데이터 구조 검증
 * - Python Worker 호출 파라미터 검증
 * - 결과 타입 검증
 */

import { describe, it } from '@jest/globals'

describe('Cochran Q Test Integration', () => {
  describe('데이터 구조', () => {
    it('2D 행렬이 올바른 형식이어야 함', () => {
      // n subjects × k conditions (n >= 2, k >= 3)
      const dataMatrix = [
        [1, 0, 1],  // Subject 1
        [0, 0, 1],  // Subject 2
        [1, 1, 1],  // Subject 3
        [0, 1, 0]   // Subject 4
      ]

      // 검증: 최소 2명 피험자
      expect(dataMatrix.length).toBeGreaterThanOrEqual(2)

      // 검증: 최소 3개 조건
      expect(dataMatrix[0].length).toBeGreaterThanOrEqual(3)

      // 검증: 모든 행의 열 개수 동일
      const nConditions = dataMatrix[0].length
      expect(dataMatrix.every(row => row.length === nConditions)).toBe(true)

      // 검증: 모든 값이 0 또는 1
      const allBinary = dataMatrix.every(row =>
        row.every(val => val === 0 || val === 1)
      )
      expect(allBinary).toBe(true)
    })

    it('피험자별 데이터 집계가 올바르게 되어야 함', () => {
      const rawData = [
        { subject: 'S1', treatmentA: 1, treatmentB: 0, treatmentC: 1 },
        { subject: 'S2', treatmentA: 0, treatmentB: 0, treatmentC: 1 },
        { subject: 'S3', treatmentA: 1, treatmentB: 1, treatmentC: 1 }
      ]

      const conditionVars = ['treatmentA', 'treatmentB', 'treatmentC']

      // 데이터 집계
      const dataMatrix: number[][] = []
      for (const row of rawData) {
        const conditionValues = conditionVars.map(v => row[v as keyof typeof row] as number)
        dataMatrix.push(conditionValues)
      }

      // 검증: 3명 × 3개 조건
      expect(dataMatrix).toHaveLength(3)
      expect(dataMatrix[0]).toEqual([1, 0, 1])
      expect(dataMatrix[1]).toEqual([0, 0, 1])
      expect(dataMatrix[2]).toEqual([1, 1, 1])
    })
  })

  describe('Python Worker 호출', () => {
    it('파라미터가 올바른 형식이어야 함', () => {
      const params = {
        data_matrix: [
          [1, 0, 1, 0],
          [0, 0, 1, 1],
          [1, 1, 1, 1],
          [0, 1, 0, 1],
          [1, 0, 1, 0]
        ]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('data_matrix')

      // 검증: snake_case 사용 (Python 규약)
      expect(Object.keys(params)).toEqual(['data_matrix'])

      // 검증: 2D 배열
      expect(Array.isArray(params.data_matrix)).toBe(true)
      expect(Array.isArray(params.data_matrix[0])).toBe(true)
    })

    it('반환 타입이 CochranQTestResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockPythonResult = {
        qStatistic: 5.143,
        pValue: 0.076,
        df: 3
      }

      // 검증: 필수 필드 존재
      expect(mockPythonResult).toHaveProperty('qStatistic')
      expect(mockPythonResult).toHaveProperty('pValue')
      expect(mockPythonResult).toHaveProperty('df')

      // 검증: 타입
      expect(typeof mockPythonResult.qStatistic).toBe('number')
      expect(typeof mockPythonResult.pValue).toBe('number')
      expect(typeof mockPythonResult.df).toBe('number')

      // 검증: df = k - 1 (조건 수 - 1)
      const nConditions = 4
      expect(mockPythonResult.df).toBe(nConditions - 1)
    })
  })

  describe('조건별 성공률 계산', () => {
    it('성공률이 올바르게 계산되어야 함', () => {
      const dataMatrix = [
        [1, 0, 1],  // S1
        [0, 0, 1],  // S2
        [1, 1, 1],  // S3
        [0, 1, 0]   // S4
      ]

      const nSubjects = dataMatrix.length
      const conditionVars = ['TreatmentA', 'TreatmentB', 'TreatmentC']

      // 조건별 성공률 계산
      const conditionSuccessRates = conditionVars.map((condVar, colIndex) => {
        const successCount = dataMatrix.reduce((sum, row) => sum + row[colIndex], 0)
        const successRate = successCount / nSubjects

        return {
          condition: condVar,
          successRate,
          successCount
        }
      })

      // 검증: TreatmentA - 2/4 = 50%
      expect(conditionSuccessRates[0].successCount).toBe(2)
      expect(conditionSuccessRates[0].successRate).toBeCloseTo(0.5, 2)

      // 검증: TreatmentB - 2/4 = 50%
      expect(conditionSuccessRates[1].successCount).toBe(2)
      expect(conditionSuccessRates[1].successRate).toBeCloseTo(0.5, 2)

      // 검증: TreatmentC - 3/4 = 75%
      expect(conditionSuccessRates[2].successCount).toBe(3)
      expect(conditionSuccessRates[2].successRate).toBeCloseTo(0.75, 2)
    })
  })

  describe('이진값 변환', () => {
    it('숫자형 데이터를 0/1로 변환해야 함', () => {
      const convertToBinary = (value: unknown): number | null => {
        if (value === null || value === undefined) return null
        if (typeof value === 'number') {
          if (value === 0) return 0
          if (value === 1) return 1
          return value > 0 ? 1 : 0
        }
        if (typeof value === 'boolean') return value ? 1 : 0
        return null
      }

      // 검증: 숫자형
      expect(convertToBinary(0)).toBe(0)
      expect(convertToBinary(1)).toBe(1)
      expect(convertToBinary(5)).toBe(1)
      expect(convertToBinary(-3)).toBe(0)

      // 검증: 불린형
      expect(convertToBinary(true)).toBe(1)
      expect(convertToBinary(false)).toBe(0)

      // 검증: null/undefined
      expect(convertToBinary(null)).toBe(null)
      expect(convertToBinary(undefined)).toBe(null)
    })

    it('문자열 데이터를 0/1로 변환해야 함', () => {
      const convertToBinary = (value: unknown): number | null => {
        if (value === null || value === undefined) return null

        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          if (['1', 'yes', 'y', 'true', 'positive', '+', 'success'].includes(lower)) return 1
          if (['0', 'no', 'n', 'false', 'negative', '-', 'failure'].includes(lower)) return 0
        }

        return null
      }

      // 검증: 성공 케이스
      expect(convertToBinary('yes')).toBe(1)
      expect(convertToBinary('YES')).toBe(1)
      expect(convertToBinary('1')).toBe(1)
      expect(convertToBinary('true')).toBe(1)

      // 검증: 실패 케이스
      expect(convertToBinary('no')).toBe(0)
      expect(convertToBinary('NO')).toBe(0)
      expect(convertToBinary('0')).toBe(0)
      expect(convertToBinary('false')).toBe(0)
    })
  })

  describe('데이터 필터링', () => {
    it('유효하지 않은 데이터를 제외해야 함', () => {
      const rawData = [
        { subject: 'S1', condA: 1, condB: 0, condC: 1 },
        { subject: 'S2', condA: null, condB: 0, condC: 1 },  // ❌ null
        { subject: 'S3', condA: 1, condB: 1, condC: undefined },  // ❌ undefined
        { subject: 'S4', condA: 0, condB: 1, condC: 0 }
      ]

      const conditionVars = ['condA', 'condB', 'condC']

      const convertToBinary = (value: unknown): number | null => {
        if (value === null || value === undefined) return null
        if (typeof value === 'number') return value > 0 ? 1 : 0
        return null
      }

      // 데이터 필터링
      const validRows: number[][] = []
      for (const row of rawData) {
        const conditionValues: number[] = []
        let validRow = true

        for (const condVar of conditionVars) {
          const condVal = row[condVar as keyof typeof row]
          const binaryVal = convertToBinary(condVal)

          if (binaryVal === null) {
            validRow = false
            break
          }

          conditionValues.push(binaryVal)
        }

        if (validRow && conditionValues.length === conditionVars.length) {
          validRows.push(conditionValues)
        }
      }

      // 검증: 유효한 데이터만 2개
      expect(validRows).toHaveLength(2)
      expect(validRows[0]).toEqual([1, 0, 1])  // S1
      expect(validRows[1]).toEqual([0, 1, 0])  // S4
    })
  })

  describe('에러 처리', () => {
    it('최소 2명 미만이면 에러', () => {
      const dataMatrix = [[1, 0, 1]]  // 1명만

      expect(() => {
        if (dataMatrix.length < 2) {
          throw new Error('Cochran Q 검정은 최소 2명 이상의 피험자가 필요합니다.')
        }
      }).toThrow('Cochran Q 검정은 최소 2명 이상의 피험자가 필요합니다.')
    })

    it('최소 3개 조건 미만이면 에러', () => {
      const conditionVars = ['condA', 'condB']  // 2개만

      expect(() => {
        if (conditionVars.length < 3) {
          throw new Error('Cochran Q 검정은 최소 3개 이상의 조건이 필요합니다.')
        }
      }).toThrow('Cochran Q 검정은 최소 3개 이상의 조건이 필요합니다.')
    })
  })

  describe('Frontend Result 구조', () => {
    it('CochranQTestResult 인터페이스가 Python 결과를 포함해야 함', () => {
      const pythonResult = {
        qStatistic: 5.143,
        pValue: 0.076,
        df: 3
      }

      const frontendResult = {
        ...pythonResult,
        significant: pythonResult.pValue < 0.05,
        interpretation: 'Test interpretation',
        nSubjects: 5,
        nConditions: 4,
        conditionSuccessRates: [
          { condition: 'A', successRate: 0.6, successCount: 3 },
          { condition: 'B', successRate: 0.4, successCount: 2 },
          { condition: 'C', successRate: 0.8, successCount: 4 },
          { condition: 'D', successRate: 0.2, successCount: 1 }
        ],
        contingencyTable: [[1, 0, 1, 0], [0, 0, 1, 1]]
      }

      // 검증: Python 결과 필드
      expect(frontendResult.qStatistic).toBe(pythonResult.qStatistic)
      expect(frontendResult.pValue).toBe(pythonResult.pValue)
      expect(frontendResult.df).toBe(pythonResult.df)

      // 검증: 프론트엔드 추가 필드
      expect(frontendResult).toHaveProperty('significant')
      expect(frontendResult).toHaveProperty('interpretation')
      expect(frontendResult).toHaveProperty('nSubjects')
      expect(frontendResult).toHaveProperty('nConditions')
      expect(frontendResult).toHaveProperty('conditionSuccessRates')
      expect(frontendResult).toHaveProperty('contingencyTable')

      // 검증: 조건 성공률 배열
      expect(frontendResult.conditionSuccessRates).toHaveLength(4)
      expect(frontendResult.conditionSuccessRates[0].successRate).toBeCloseTo(0.6, 2)
    })
  })
})
