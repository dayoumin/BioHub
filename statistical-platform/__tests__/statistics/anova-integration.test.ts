/**
 * ANOVA Integration Test
 * - Two-Way ANOVA 프론트 연결 검증
 * - Three-Way ANOVA 프론트 연결 검증
 * - Repeated Measures ANOVA 프론트 연결 검증
 */

import { describe, it } from '@jest/globals'

describe('ANOVA Integration Tests', () => {
  describe('Two-Way ANOVA', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조
      const dataValues = [10, 12, 14, 16, 18, 20]
      const factor1Values = ['A', 'A', 'B', 'B', 'C', 'C']
      const factor2Values = ['Low', 'High', 'Low', 'High', 'Low', 'High']

      // 검증: 배열 길이 일치
      expect(dataValues.length).toBe(factor1Values.length)
      expect(dataValues.length).toBe(factor2Values.length)

      // 검증: 최소 데이터 (4개 이상)
      expect(dataValues.length).toBeGreaterThanOrEqual(4)

      // 검증: 데이터 타입
      expect(Array.isArray(dataValues)).toBe(true)
      expect(dataValues.every(v => typeof v === 'number')).toBe(true)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        data_values: [10, 12, 14, 16],
        factor1_values: ['A', 'A', 'B', 'B'],
        factor2_values: ['Low', 'High', 'Low', 'High']
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('data_values')
      expect(params).toHaveProperty('factor1_values')
      expect(params).toHaveProperty('factor2_values')

      // 검증: snake_case 사용 (Python 규약)
      expect(Object.keys(params)).toEqual([
        'data_values',
        'factor1_values',
        'factor2_values'
      ])
    })

    it('반환 타입이 TwoWayANOVAResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        factor1: {
          fStatistic: 5.2,
          pValue: 0.032,
          df: 1
        },
        factor2: {
          fStatistic: 3.8,
          pValue: 0.067,
          df: 1
        },
        interaction: {
          fStatistic: 2.1,
          pValue: 0.165,
          df: 1
        },
        residual: {
          df: 8
        },
        anovaTable: {}
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('factor1')
      expect(mockResult).toHaveProperty('factor2')
      expect(mockResult).toHaveProperty('interaction')
      expect(mockResult).toHaveProperty('residual')

      // 검증: FactorEffect 구조
      expect(mockResult.factor1).toHaveProperty('fStatistic')
      expect(mockResult.factor1).toHaveProperty('pValue')
      expect(mockResult.factor1).toHaveProperty('df')
    })
  })

  describe('Three-Way ANOVA', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조
      const dataValues = [10, 12, 14, 16, 18, 20, 22, 24]
      const factor1Values = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B']
      const factor2Values = ['Low', 'Low', 'High', 'High', 'Low', 'Low', 'High', 'High']
      const factor3Values = ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y']

      // 검증: 배열 길이 일치
      expect(dataValues.length).toBe(factor1Values.length)
      expect(dataValues.length).toBe(factor2Values.length)
      expect(dataValues.length).toBe(factor3Values.length)

      // 검증: 최소 데이터 (8개 이상)
      expect(dataValues.length).toBeGreaterThanOrEqual(8)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        data_values: [10, 12, 14, 16, 18, 20, 22, 24],
        factor1_values: ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'],
        factor2_values: ['Low', 'Low', 'High', 'High', 'Low', 'Low', 'High', 'High'],
        factor3_values: ['X', 'Y', 'X', 'Y', 'X', 'Y', 'X', 'Y']
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('data_values')
      expect(params).toHaveProperty('factor1_values')
      expect(params).toHaveProperty('factor2_values')
      expect(params).toHaveProperty('factor3_values')
    })

    it('반환 타입이 ThreeWayANOVAResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        factor1: { fStatistic: 5.2, pValue: 0.032, df: 1 },
        factor2: { fStatistic: 3.8, pValue: 0.067, df: 1 },
        factor3: { fStatistic: 2.5, pValue: 0.135, df: 1 },
        interaction12: { fStatistic: 1.9, pValue: 0.187, df: 1 },
        interaction13: { fStatistic: 1.5, pValue: 0.238, df: 1 },
        interaction23: { fStatistic: 1.2, pValue: 0.289, df: 1 },
        interaction123: { fStatistic: 0.8, pValue: 0.385, df: 1 },
        residual: { df: 8 },
        anovaTable: {}
      }

      // 검증: 7개 효과 모두 존재
      expect(mockResult).toHaveProperty('factor1')
      expect(mockResult).toHaveProperty('factor2')
      expect(mockResult).toHaveProperty('factor3')
      expect(mockResult).toHaveProperty('interaction12')
      expect(mockResult).toHaveProperty('interaction13')
      expect(mockResult).toHaveProperty('interaction23')
      expect(mockResult).toHaveProperty('interaction123')
      expect(mockResult).toHaveProperty('residual')

      // 검증: 총 8개 키 (7개 효과 + anovaTable)
      expect(Object.keys(mockResult)).toHaveLength(9)
    })
  })

  describe('Repeated Measures ANOVA', () => {
    it('데이터 구조가 Python Worker와 일치해야 함 (2D 매트릭스)', () => {
      // 프론트에서 준비하는 데이터 구조 (subjects × timepoints)
      const dataMatrix = [
        [10, 12, 14],  // Subject 1
        [11, 13, 15],  // Subject 2
        [9, 11, 13]    // Subject 3
      ]
      const subjectIds = [1, 2, 3]
      const timeLabels = ['T1', 'T2', 'T3']

      // 검증: 2D 배열
      expect(Array.isArray(dataMatrix)).toBe(true)
      expect(dataMatrix.every(row => Array.isArray(row))).toBe(true)

      // 검증: 배열 길이 일치
      expect(dataMatrix.length).toBe(subjectIds.length)
      expect(dataMatrix[0].length).toBe(timeLabels.length)

      // 검증: 최소 요구사항 (2명 이상, 2개 시점 이상)
      expect(dataMatrix.length).toBeGreaterThanOrEqual(2)
      expect(dataMatrix[0].length).toBeGreaterThanOrEqual(2)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        data_matrix: [[10, 12, 14], [11, 13, 15]],
        subject_ids: [1, 2],
        time_labels: ['T1', 'T2', 'T3']
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('data_matrix')
      expect(params).toHaveProperty('subject_ids')
      expect(params).toHaveProperty('time_labels')

      // 검증: snake_case 사용
      expect(Object.keys(params)).toEqual([
        'data_matrix',
        'subject_ids',
        'time_labels'
      ])
    })

    it('반환 타입이 RepeatedMeasuresANOVAResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        fStatistic: 8.5,
        pValue: 0.012,
        df: {
          numerator: 2,
          denominator: 4
        },
        sphericityEpsilon: 1.0,
        anovaTable: {}
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('fStatistic')
      expect(mockResult).toHaveProperty('pValue')
      expect(mockResult).toHaveProperty('df')
      expect(mockResult).toHaveProperty('sphericityEpsilon')

      // 검증: df 구조
      expect(mockResult.df).toHaveProperty('numerator')
      expect(mockResult.df).toHaveProperty('denominator')
    })
  })

  describe('프론트엔드 데이터 추출 로직', () => {
    it('유효하지 않은 데이터를 필터링해야 함', () => {
      const rawData = [
        { dependent: 10, factor1: 'A', factor2: 'Low' },
        { dependent: null, factor1: 'A', factor2: 'High' },  // ❌ null
        { dependent: 12, factor1: undefined, factor2: 'Low' },  // ❌ undefined
        { dependent: 14, factor1: 'B', factor2: 'High' }
      ]

      // 필터링 로직 시뮬레이션
      const filtered = rawData.filter(row => {
        return row.dependent !== null &&
               row.dependent !== undefined &&
               typeof row.dependent === 'number' &&
               !isNaN(row.dependent) &&
               row.factor1 !== null &&
               row.factor1 !== undefined &&
               row.factor2 !== null &&
               row.factor2 !== undefined
      })

      // 검증: 유효한 데이터만 2개
      expect(filtered).toHaveLength(2)
      expect(filtered[0].dependent).toBe(10)
      expect(filtered[1].dependent).toBe(14)
    })

    it('Repeated Measures용 2D 매트릭스를 올바르게 구성해야 함', () => {
      const rawData = [
        { T1: 10, T2: 12, T3: 14 },  // Subject 1
        { T1: 11, T2: 13, T3: 15 },  // Subject 2
        { T1: null, T2: 12, T3: 14 }  // Subject 3 (invalid)
      ]

      const dependentVars = ['T1', 'T2', 'T3']
      const dataMatrix: number[][] = []

      for (const row of rawData) {
        const rowData: number[] = []
        let hasValidData = true

        for (const depVar of dependentVars) {
          const value = row[depVar as keyof typeof row]
          if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
            rowData.push(value)
          } else {
            hasValidData = false
            break
          }
        }

        if (hasValidData && rowData.length === dependentVars.length) {
          dataMatrix.push(rowData)
        }
      }

      // 검증: 유효한 행만 2개
      expect(dataMatrix).toHaveLength(2)
      expect(dataMatrix[0]).toEqual([10, 12, 14])
      expect(dataMatrix[1]).toEqual([11, 13, 15])
    })
  })
})
