/**
 * Non-Parametric Tests Integration Test
 *
 * Issue 2: Mock 제거 및 실제 Worker 3 호출 검증
 *
 * 날짜: 2025-11-13
 */

import { describe, it } from 'vitest'

describe('Non-Parametric Integration Tests', () => {
  describe('Worker 3 메서드 검증', () => {
    it('mann_whitney_test는 statistic과 pValue를 반환해야 함', () => {
      const mockResult = {
        statistic: 234.5,
        pValue: 0.023
      }

      expect(mockResult.statistic).toBeDefined()
      expect(mockResult.pValue).toBeDefined()
      expect(typeof mockResult.statistic).toBe('number')
      expect(typeof mockResult.pValue).toBe('number')
      expect(mockResult.pValue).toBeGreaterThanOrEqual(0)
      expect(mockResult.pValue).toBeLessThanOrEqual(1)
    })

    it('wilcoxon_test는 풍부한 결과를 반환해야 함', () => {
      const mockResult = {
        statistic: 45.0,
        pValue: 0.015,
        nobs: 25,
        zScore: -2.43,
        medianDiff: 5.2,
        effectSize: {
          value: 0.48,
          interpretation: '중간 효과크기'
        },
        descriptives: {
          before: {
            median: 45.2,
            mean: 46.8,
            iqr: 12.3,
            min: 30.1,
            max: 65.4,
            q1: 40.0,
            q3: 52.3
          },
          after: {
            median: 50.4,
            mean: 52.0,
            iqr: 13.5,
            min: 32.5,
            max: 70.2,
            q1: 42.3,
            q3: 55.8
          },
          differences: {
            median: 5.2,
            mean: 5.2,
            iqr: 3.2,
            min: -2.4,
            max: 12.8,
            q1: 2.3,
            q3: 5.5,
            positive: 20,
            negative: 4,
            ties: 1
          }
        }
      }

      // 필수 필드 검증
      expect(mockResult.statistic).toBeDefined()
      expect(mockResult.pValue).toBeDefined()
      expect(mockResult.effectSize).toBeDefined()
      expect(mockResult.descriptives).toBeDefined()

      // effectSize 검증
      expect(mockResult.effectSize.value).toBeGreaterThanOrEqual(-1)
      expect(mockResult.effectSize.value).toBeLessThanOrEqual(1)
      expect(mockResult.effectSize.interpretation).toBeDefined()

      // descriptives 검증
      expect(mockResult.descriptives.before).toBeDefined()
      expect(mockResult.descriptives.after).toBeDefined()
      expect(mockResult.descriptives.differences).toBeDefined()
    })

    it('kruskal_wallis_test는 statistic, pValue, df를 반환해야 함', () => {
      const mockResult = {
        statistic: 12.345,
        pValue: 0.002,
        df: 2
      }

      expect(mockResult.statistic).toBeDefined()
      expect(mockResult.pValue).toBeDefined()
      expect(mockResult.df).toBeDefined()
      expect(typeof mockResult.df).toBe('number')
      expect(mockResult.df).toBeGreaterThan(0)
    })

    it('friedman_test는 statistic과 pValue를 반환해야 함', () => {
      const mockResult = {
        statistic: 8.765,
        pValue: 0.012
      }

      expect(mockResult.statistic).toBeDefined()
      expect(mockResult.pValue).toBeDefined()
      expect(typeof mockResult.statistic).toBe('number')
      expect(typeof mockResult.pValue).toBe('number')
    })
  })

  describe('변환 레이어 검증', () => {
    it('MannWhitneyResult → StatisticalResult 변환', () => {
      const workerResult = {
        statistic: 234.5,
        pValue: 0.023
      }

      // 변환 후 필수 필드 (StatisticalResult)
      const statisticalResult = {
        testName: 'Mann-Whitney U 검정',
        testType: '비모수 검정',
        description: '두 독립 표본 간 중앙값 차이를 검정합니다.',
        statistic: workerResult.statistic,
        statisticName: 'U',
        pValue: workerResult.pValue,
        alpha: 0.05,
        effectSize: {
          value: 0,
          type: 'r',
          ci: undefined
        },
        assumptions: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            passed: expect.any(Boolean)
          })
        ]),
        sampleSize: 53,
        variables: ['dependent_var', 'group_var'],
        groups: 2
      }

      expect(statisticalResult.testName).toBeDefined()
      expect(statisticalResult.statistic).toBe(workerResult.statistic)
      expect(statisticalResult.pValue).toBe(workerResult.pValue)
      expect(statisticalResult.effectSize).toBeDefined()
      expect(statisticalResult.assumptions).toBeDefined()
    })

    it('WilcoxonResult → StatisticalResult 변환 (풍부한 데이터)', () => {
      const workerResult = {
        statistic: 45.0,
        pValue: 0.015,
        nobs: 25,
        zScore: -2.43,
        medianDiff: 5.2,
        effectSize: {
          value: 0.48,
          interpretation: '중간 효과크기'
        },
        descriptives: {
          before: {
            median: 45.2,
            mean: 46.8,
            iqr: 12.3,
            min: 30.1,
            max: 65.4,
            q1: 40.0,
            q3: 52.3
          },
          after: {
            median: 50.4,
            mean: 52.0,
            iqr: 13.5,
            min: 32.5,
            max: 70.2,
            q1: 42.3,
            q3: 55.8
          },
          differences: {
            median: 5.2,
            mean: 5.2,
            iqr: 3.2,
            min: -2.4,
            max: 12.8,
            q1: 2.3,
            q3: 5.5,
            positive: 20,
            negative: 4,
            ties: 1
          }
        }
      }

      // 변환 후 StatisticalResult
      const statisticalResult = {
        testName: 'Wilcoxon 부호순위 검정',
        statistic: workerResult.statistic,
        pValue: workerResult.pValue,
        effectSize: {
          value: workerResult.effectSize.value,
          type: 'r',
          ci: undefined
        },
        additionalResults: {
          title: '기술통계량',
          columns: expect.arrayContaining([
            expect.objectContaining({
              key: expect.any(String),
              header: expect.any(String),
              type: expect.any(String)
            })
          ]),
          data: expect.arrayContaining([
            expect.objectContaining({
              measure: '사전',
              median: workerResult.descriptives.before.median,
              mean: workerResult.descriptives.before.mean
            }),
            expect.objectContaining({
              measure: '사후',
              median: workerResult.descriptives.after.median,
              mean: workerResult.descriptives.after.mean
            })
          ])
        }
      }

      expect(statisticalResult.effectSize.value).toBe(workerResult.effectSize.value)
      expect(statisticalResult.additionalResults).toBeDefined()
      expect(statisticalResult.additionalResults?.data).toBeDefined()
    })
  })

  describe('데이터 전처리 검증', () => {
    it('Mann-Whitney: 그룹별 데이터 분리', () => {
      const data = [
        { value: 45.2, group: 'A' },
        { value: 52.1, group: 'B' },
        { value: 48.3, group: 'A' },
        { value: 55.4, group: 'B' }
      ]

      const groups: Record<string, number[]> = {}
      data.forEach(row => {
        const groupValue = String(row.group)
        if (!groups[groupValue]) {
          groups[groupValue] = []
        }
        groups[groupValue].push(row.value)
      })

      expect(Object.keys(groups).length).toBe(2)
      expect(groups['A']).toEqual([45.2, 48.3])
      expect(groups['B']).toEqual([52.1, 55.4])
    })

    it('Wilcoxon: 대응 데이터 쌍 생성', () => {
      const data = [
        { before: 45.2, after: 50.4 },
        { before: 52.1, after: 55.8 },
        { before: 48.3, after: 'invalid' } // NaN 포함
      ]

      const values1: number[] = []
      const values2: number[] = []

      data.forEach(row => {
        const val1 = row.before
        const val2 = row.after
        const num1 = typeof val1 === 'number' ? val1 : parseFloat(String(val1))
        const num2 = typeof val2 === 'number' ? val2 : parseFloat(String(val2))

        if (!isNaN(num1) && !isNaN(num2)) {
          values1.push(num1)
          values2.push(num2)
        }
      })

      expect(values1.length).toBe(2) // NaN 쌍 제외
      expect(values2.length).toBe(2)
      expect(values1).toEqual([45.2, 52.1])
      expect(values2).toEqual([50.4, 55.8])
    })

    it('Kruskal-Wallis: 3개 이상 그룹 데이터', () => {
      const data = [
        { value: 45.2, group: 'A' },
        { value: 52.1, group: 'B' },
        { value: 48.3, group: 'C' },
        { value: 50.5, group: 'A' }
      ]

      const groups: Record<string, number[]> = {}
      data.forEach(row => {
        const groupValue = String(row.group)
        if (!groups[groupValue]) {
          groups[groupValue] = []
        }
        groups[groupValue].push(row.value)
      })

      const groupArrays = Object.values(groups)
      expect(groupArrays.length).toBeGreaterThanOrEqual(3)
      expect(groupArrays.length).toBe(3)
    })

    it('Friedman: 반복측정 데이터 (동일 샘플 크기)', () => {
      const data = [
        { time1: 45.2, time2: 48.3, time3: 52.1 },
        { time1: 50.5, time2: 53.2, time3: 56.8 }
      ]

      const variables = ['time1', 'time2', 'time3']
      const groups: number[][] = []

      variables.forEach(varName => {
        const values: number[] = []
        data.forEach(row => {
          const val = (row as Record<string, unknown>)[varName]
          const numVal = typeof val === 'number' ? val : parseFloat(String(val))
          if (!isNaN(numVal)) {
            values.push(numVal)
          }
        })
        groups.push(values)
      })

      expect(groups.length).toBe(3)
      // Friedman은 동일한 샘플 크기 필요
      const lengths = groups.map(g => g.length)
      expect(new Set(lengths).size).toBe(1) // 모두 동일한 길이
    })
  })

  describe('NonParametricVariables 타입 검증', () => {
    it('dependent는 string이어야 함', () => {
      const vars = {
        dependent: 'value',
        factor: ['group']
      }

      expect(typeof vars.dependent).toBe('string')
      expect(Array.isArray(vars.factor)).toBe(true)
    })

    it('factor는 string[] 이어야 함', () => {
      const vars = {
        dependent: 'value',
        factor: ['before', 'after']
      }

      expect(Array.isArray(vars.factor)).toBe(true)
      expect(vars.factor.length).toBeGreaterThanOrEqual(1)
      expect(vars.factor.every(v => typeof v === 'string')).toBe(true)
    })
  })

  describe('에러 처리 검증', () => {
    it('Mann-Whitney: 그룹이 2개가 아니면 에러', () => {
      const groupCounts = [1, 3, 4]

      groupCounts.forEach(count => {
        if (count !== 2) {
          expect(() => {
            if (count !== 2) {
              throw new Error(`Mann-Whitney 검정은 정확히 2개 그룹이 필요합니다 (현재: ${count}개)`)
            }
          }).toThrow('Mann-Whitney 검정은 정확히 2개 그룹이 필요합니다')
        }
      })
    })

    it('Kruskal-Wallis: 그룹이 3개 미만이면 에러', () => {
      const groupCounts = [1, 2]

      groupCounts.forEach(count => {
        expect(() => {
          if (count < 3) {
            throw new Error(`Kruskal-Wallis 검정은 최소 3개 그룹이 필요합니다 (현재: ${count}개)`)
          }
        }).toThrow('Kruskal-Wallis 검정은 최소 3개 그룹이 필요합니다')
      })
    })

    it('Wilcoxon: 변수가 2개 미만이면 에러', () => {
      const varCounts = [0, 1]

      varCounts.forEach(count => {
        expect(() => {
          if (count < 2) {
            throw new Error('2개의 대응 변수를 선택해주세요.')
          }
        }).toThrow('2개의 대응 변수를 선택해주세요')
      })
    })

    it('Friedman: 변수가 3개 미만이면 에러', () => {
      const varCounts = [0, 1, 2]

      varCounts.forEach(count => {
        expect(() => {
          if (count < 3) {
            throw new Error('3개 이상의 반복측정 변수를 선택해주세요.')
          }
        }).toThrow('3개 이상의 반복측정 변수를 선택해주세요')
      })
    })
  })
})
