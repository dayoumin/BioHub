import { AnovaExecutor } from '@/lib/services/executors/anova-executor'

/**
 * AnovaExecutor 데이터 추출 테스트
 * - prepareGroups 표준화 검증
 * - null → 0 버그 방지 테스트
 */
describe('AnovaExecutor - Data Extraction', () => {
  let executor: AnovaExecutor

  beforeEach(() => {
    executor = new AnovaExecutor()
  })

  describe('One-Way ANOVA', () => {
    it('숫자 배열 그룹을 직접 사용한다', async () => {
      const data = [
        [10, 20, 30],
        [15, 25, 35],
        [20, 30, 40]
      ]
      const options = {
        method: 'one-way',
        groups: data
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.mainResults.pvalue).toBeDefined()
    })

    it('객체 배열에서 그룹별로 데이터를 분할한다', async () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 20 },
        { group: 'B', value: 15 },
        { group: 'B', value: 25 },
        { group: 'C', value: 20 },
        { group: 'C', value: 30 }
      ]
      const options = {
        method: 'one-way',
        dependentVar: 'value',
        groupVar: 'group'
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.groupStats).toHaveLength(3) // A, B, C
    })

    it('null 값을 필터링한다 (Number(null) === 0 버그 방지)', async () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: null },
        { group: 'A', value: 20 },
        { group: 'B', value: 15 },
        { group: 'B', value: null },
        { group: 'B', value: 25 }
      ]
      const options = {
        method: 'one-way',
        dependentVar: 'value',
        groupVar: 'group'
      }

      const result = await executor.execute(data, options)

      // 각 그룹에서 null 제외 (A: 2개, B: 2개)
      expect(result.additionalInfo.groupStats?.[0]?.n).toBe(2)
      expect(result.additionalInfo.groupStats?.[1]?.n).toBe(2)
    })

    it('문자열 숫자를 변환한다', async () => {
      const data = [
        { group: 'A', value: '10' },
        { group: 'A', value: '20' },
        { group: 'B', value: '15' },
        { group: 'B', value: '25' }
      ]
      const options = {
        method: 'one-way',
        dependentVar: 'value',
        groupVar: 'group'
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
    })

    it('NaN과 Infinity를 필터링한다', async () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: NaN },
        { group: 'A', value: 20 },
        { group: 'B', value: 15 },
        { group: 'B', value: Infinity },
        { group: 'B', value: 25 }
      ]
      const options = {
        method: 'one-way',
        dependentVar: 'value',
        groupVar: 'group'
      }

      const result = await executor.execute(data, options)

      expect(result.additionalInfo.groupStats?.[0]?.n).toBe(2)
      expect(result.additionalInfo.groupStats?.[1]?.n).toBe(2)
    })

    it('최소 2개 그룹이 필요하다', async () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 20 }
      ]
      const options = {
        method: 'one-way',
        dependentVar: 'value',
        groupVar: 'group'
      }

      await expect(executor.execute(data, options)).rejects.toThrow(
        'ANOVA를 위해 최소 2개 그룹이 필요합니다'
      )
    })
  })

  describe('Two-Way ANOVA', () => {
    it('두 요인으로 데이터를 분석한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'Y', value: 15 },
        { factor1: 'B', factor2: 'X', value: 20 },
        { factor1: 'B', factor2: 'Y', value: 25 }
      ]
      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.factor1).toBeDefined()
      expect(result.additionalInfo.factor2).toBeDefined()
      expect(result.additionalInfo.interaction).toBeDefined()
    })
  })

  describe('Tukey HSD Post-hoc', () => {
    it('사후 검정을 수행한다', async () => {
      const data = [
        [10, 20, 30],
        [15, 25, 35],
        [20, 30, 40]
      ]
      const options = {
        method: 'tukey',
        groups: data
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.postHoc).toBeDefined()
    })

    it('객체 배열에서 그룹을 준비한다', async () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 20 },
        { group: 'B', value: 15 },
        { group: 'B', value: 25 },
        { group: 'C', value: 20 },
        { group: 'C', value: 30 }
      ]
      const options = {
        method: 'tukey',
        dependentVar: 'value',
        groupVar: 'group'
      }

      const result = await executor.execute(data, options)

      expect(result.additionalInfo.postHoc).toBeDefined()
    })
  })

  describe('Games-Howell Post-hoc', () => {
    it('이분산 가정으로 사후 검정을 수행한다', async () => {
      const data = [
        [10, 20, 30],
        [15, 25, 35],
        [20, 30, 40]
      ]
      const options = {
        method: 'games-howell',
        groups: data
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.postHoc).toBeDefined()
    })
  })

  describe('prepareGroups 메서드 검증', () => {
    it('null/undefined를 0으로 변환하지 않는다', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: null },
        { group: 'A', value: 0 },     // 실제 0
        { group: 'A', value: undefined },
        { group: 'A', value: 20 }
      ]

      // private 메서드 테스트를 위한 타입 캐스팅
      const groups = (executor as any).prepareGroups(data, 'value', 'group')

      expect(groups[0]).toHaveLength(3) // 10, 0, 20 (null/undefined 제외)
      expect(groups[0]).toContain(0)    // 실제 0은 포함
      expect(groups[0]).toContain(10)
      expect(groups[0]).toContain(20)
    })

    it('변환 불가능한 문자열을 필터링한다', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 'invalid' },
        { group: 'A', value: '20' },
        { group: 'A', value: 'N/A' },
        { group: 'A', value: 30 }
      ]

      const groups = (executor as any).prepareGroups(data, 'value', 'group')

      expect(groups[0]).toHaveLength(3) // 10, 20, 30
    })

    it('여러 그룹을 올바르게 분할한다', () => {
      const data = [
        { treatment: 'Control', response: 10 },
        { treatment: 'Control', response: 15 },
        { treatment: 'DrugA', response: 20 },
        { treatment: 'DrugA', response: 25 },
        { treatment: 'DrugB', response: 30 },
        { treatment: 'DrugB', response: 35 }
      ]

      const groups = (executor as any).prepareGroups(data, 'response', 'treatment')

      expect(groups).toHaveLength(3)
      expect(groups[0]).toEqual([10, 15])
      expect(groups[1]).toEqual([20, 25])
      expect(groups[2]).toEqual([30, 35])
    })

    it('빈 그룹을 제외하지 않는다 (빈 배열 반환)', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'B', value: null },
        { group: 'B', value: null }
      ]

      const groups = (executor as any).prepareGroups(data, 'value', 'group')

      // B 그룹은 빈 배열로 포함됨
      expect(groups).toHaveLength(2)
      expect(groups[0]).toEqual([10])
      expect(groups[1]).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('빈 데이터 배열을 처리한다', async () => {
      const data: any[] = []
      const options = {
        method: 'one-way',
        dependentVar: 'value',
        groupVar: 'group'
      }

      await expect(executor.execute(data, options)).rejects.toThrow()
    })

    it('존재하지 않는 컬럼을 처리한다', async () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'B', value: 20 }
      ]
      const options = {
        method: 'one-way',
        dependentVar: 'nonexistent',
        groupVar: 'group'
      }

      await expect(executor.execute(data, options)).rejects.toThrow()
    })
  })
})
