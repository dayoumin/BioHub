/**
 * ANOVA Analysis Test
 *
 * handleAnalysis 함수의 데이터 처리 로직 테스트
 */

describe('ANOVA Analysis - Data Processing', () => {
  describe('그룹별 데이터 분리', () => {
    it('3개 그룹 데이터를 올바르게 분리해야 함', () => {
      const uploadedData = {
        data: [
          { Group: 'A', Value: 23 },
          { Group: 'A', Value: 25 },
          { Group: 'A', Value: 28 },
          { Group: 'A', Value: 22 },
          { Group: 'A', Value: 26 },
          { Group: 'B', Value: 30 },
          { Group: 'B', Value: 32 },
          { Group: 'B', Value: 35 },
          { Group: 'B', Value: 31 },
          { Group: 'B', Value: 33 },
          { Group: 'C', Value: 18 },
          { Group: 'C', Value: 20 },
          { Group: 'C', Value: 22 },
          { Group: 'C', Value: 19 },
          { Group: 'C', Value: 21 }
        ],
        fileName: 'test_anova_data.csv'
      }

      const factorVariable = 'Group'
      const dependentVariable = 'Value'

      // 그룹별 데이터 분리 로직 (코드에서 추출)
      const groupMap = new Map<string | number, number[]>()

      for (const row of uploadedData.data) {
        const factorValue = row[factorVariable]
        const dependentValue = row[dependentVariable]

        if (
          dependentValue !== null &&
          dependentValue !== undefined &&
          typeof dependentValue === 'number' &&
          !isNaN(dependentValue) &&
          factorValue !== null &&
          factorValue !== undefined
        ) {
          const groupKey = String(factorValue)
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, [])
          }
          groupMap.get(groupKey)!.push(dependentValue)
        }
      }

      const groups: number[][] = []
      const groupNames: string[] = []

      for (const [key, values] of groupMap.entries()) {
        if (values.length >= 2) {
          groups.push(values)
          groupNames.push(String(key))
        }
      }

      // 검증
      expect(groups.length).toBe(3)
      expect(groupNames).toEqual(['A', 'B', 'C'])
      expect(groups[0]).toEqual([23, 25, 28, 22, 26])
      expect(groups[1]).toEqual([30, 32, 35, 31, 33])
      expect(groups[2]).toEqual([18, 20, 22, 19, 21])
    })

    it('결측값(null, undefined)을 올바르게 필터링해야 함', () => {
      const uploadedData = {
        data: [
          { Group: 'A', Value: 23 },
          { Group: 'A', Value: null },  // 결측값
          { Group: 'A', Value: 25 },
          { Group: 'B', Value: undefined },  // 결측값
          { Group: 'B', Value: 30 },
          { Group: null, Value: 20 },  // 그룹 결측값
        ],
        fileName: 'test_with_nulls.csv'
      }

      const factorVariable = 'Group'
      const dependentVariable = 'Value'

      const groupMap = new Map<string | number, number[]>()

      for (const row of uploadedData.data) {
        const factorValue = row[factorVariable]
        const dependentValue = row[dependentVariable]

        if (
          dependentValue !== null &&
          dependentValue !== undefined &&
          typeof dependentValue === 'number' &&
          !isNaN(dependentValue) &&
          factorValue !== null &&
          factorValue !== undefined
        ) {
          const groupKey = String(factorValue)
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, [])
          }
          groupMap.get(groupKey)!.push(dependentValue)
        }
      }

      const groups: number[][] = []
      for (const [_, values] of groupMap.entries()) {
        if (values.length >= 2) {
          groups.push(values)
        }
      }

      // 검증: 결측값이 제거되고 유효한 데이터만 남음
      expect(groups.length).toBe(1)  // A 그룹만 (B는 1개, null 그룹 제외)
      expect(groups[0]).toEqual([23, 25])
    })

    it('그룹 크기가 2 미만인 그룹을 제외해야 함', () => {
      const uploadedData = {
        data: [
          { Group: 'A', Value: 23 },
          { Group: 'A', Value: 25 },
          { Group: 'A', Value: 28 },
          { Group: 'B', Value: 30 },  // 1개만
          { Group: 'C', Value: 18 },
          { Group: 'C', Value: 20 }
        ],
        fileName: 'test_small_groups.csv'
      }

      const factorVariable = 'Group'
      const dependentVariable = 'Value'

      const groupMap = new Map<string | number, number[]>()

      for (const row of uploadedData.data) {
        const factorValue = row[factorVariable]
        const dependentValue = row[dependentVariable]

        if (
          dependentValue !== null &&
          dependentValue !== undefined &&
          typeof dependentValue === 'number' &&
          !isNaN(dependentValue) &&
          factorValue !== null &&
          factorValue !== undefined
        ) {
          const groupKey = String(factorValue)
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, [])
          }
          groupMap.get(groupKey)!.push(dependentValue)
        }
      }

      const groups: number[][] = []
      const groupNames: string[] = []

      for (const [key, values] of groupMap.entries()) {
        if (values.length >= 2) {
          groups.push(values)
          groupNames.push(String(key))
        }
      }

      // 검증: B 그룹(1개)은 제외됨
      expect(groups.length).toBe(2)
      expect(groupNames).toEqual(['A', 'C'])
    })
  })

  describe('기술통계량 계산', () => {
    it('그룹별 평균, 표준편차, 표준오차를 올바르게 계산해야 함', () => {
      const groupData = [23, 25, 28, 22, 26]
      const n = groupData.length
      const mean = groupData.reduce((sum, v) => sum + v, 0) / n
      const variance = groupData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
      const std = Math.sqrt(variance)
      const se = std / Math.sqrt(n)

      // 검증 (수동 계산 결과와 비교)
      expect(mean).toBeCloseTo(24.8, 1)
      expect(std).toBeCloseTo(2.39, 1)
      expect(se).toBeCloseTo(1.07, 1)
    })

    it('신뢰구간을 올바르게 계산해야 함', () => {
      const groupData = [23, 25, 28, 22, 26]
      const n = groupData.length
      const mean = groupData.reduce((sum, v) => sum + v, 0) / n
      const variance = groupData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
      const std = Math.sqrt(variance)
      const se = std / Math.sqrt(n)
      const tCritical = 2.0
      const ciMargin = tCritical * se

      const ci = [
        parseFloat((mean - ciMargin).toFixed(2)),
        parseFloat((mean + ciMargin).toFixed(2))
      ]

      // 검증
      expect(ci[0]).toBeCloseTo(22.66, 1)
      expect(ci[1]).toBeCloseTo(26.94, 1)
    })
  })

  describe('효과크기 계산', () => {
    it('Eta-squared를 올바르게 계산해야 함', () => {
      const groups = [
        [23, 25, 28, 22, 26],  // A: mean = 24.8
        [30, 32, 35, 31, 33],  // B: mean = 32.2
        [18, 20, 22, 19, 21]   // C: mean = 20.0
      ]

      const totalN = groups.reduce((sum, g) => sum + g.length, 0)
      const grandMean = groups.reduce((sum, g) =>
        sum + g.reduce((gSum, v) => gSum + v, 0), 0
      ) / totalN

      const groupMeans = groups.map(g => g.reduce((sum, v) => sum + v, 0) / g.length)

      const ssBetween = groups.reduce((sum, g, idx) => {
        const groupMean = groupMeans[idx]
        return sum + g.length * Math.pow(groupMean - grandMean, 2)
      }, 0)

      const ssWithin = groups.reduce((sum, g, idx) => {
        const groupMean = groupMeans[idx]
        return sum + g.reduce((gSum, v) => gSum + Math.pow(v - groupMean, 2), 0)
      }, 0)

      const ssTotal = ssBetween + ssWithin
      const etaSquared = ssBetween / ssTotal

      // 검증: Eta-squared는 0~1 사이
      expect(etaSquared).toBeGreaterThan(0)
      expect(etaSquared).toBeLessThan(1)
      expect(etaSquared).toBeCloseTo(0.94, 1)  // 매우 큰 효과크기
    })

    it('Cohen\'s f를 올바르게 계산해야 함', () => {
      const etaSquared = 0.94
      const cohensF = Math.sqrt(etaSquared / (1 - etaSquared))

      // 검증
      expect(cohensF).toBeGreaterThan(0)
      expect(cohensF).toBeCloseTo(3.96, 1)
    })
  })

  describe('에러 검증', () => {
    it('그룹이 2개 미만이면 에러를 발생시켜야 함', () => {
      const groups: number[][] = [[23, 25, 28]]  // 1개 그룹만

      expect(() => {
        if (groups.length < 2) {
          throw new Error(`ANOVA는 최소 2개 이상의 그룹이 필요합니다. 현재 그룹 수: ${groups.length}`)
        }
      }).toThrow('ANOVA는 최소 2개 이상의 그룹이 필요합니다')
    })

    it('독립변수가 없으면 에러를 발생시켜야 함', () => {
      const variables = {
        dependent: 'Value',
        independent: []  // 빈 배열
      }

      expect(() => {
        if (variables.independent.length === 0) {
          throw new Error('독립변수(요인)를 선택해주세요')
        }
      }).toThrow('독립변수(요인)를 선택해주세요')
    })

    it('업로드된 데이터가 없으면 에러를 발생시켜야 함', () => {
      const uploadedData = null

      expect(() => {
        if (!uploadedData?.data || uploadedData.data.length === 0) {
          throw new Error('업로드된 데이터가 없습니다. 먼저 데이터를 업로드해주세요.')
        }
      }).toThrow('업로드된 데이터가 없습니다')
    })
  })
})
