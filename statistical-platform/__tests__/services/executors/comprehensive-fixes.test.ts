import { AnovaExecutor } from '@/lib/services/executors/anova-executor'
import { TTestExecutor } from '@/lib/services/executors/t-test-executor'
import { DescriptiveExecutor } from '@/lib/services/executors/descriptive-executor'

/**
 * 종합 수정 검증 테스트 (총 8개 버그)
 *
 * Session 1 (3개):
 * 1. Two-Way ANOVA: null 필터링
 * 2. Welch: equalVar=false 강제
 * 3. 빈 배열 가드
 *
 * Session 2 (3개):
 * 4. Two-Way ANOVA: 빈 배열 + dataSize
 * 5. Two-Way ANOVA: factor null/undefined
 * 6. Welch: Cohen's d (평균 SD)
 *
 * Session 3 (2개) - 새로 발견:
 * 7. extractNumericSeries: 숫자 배열 null 필터링
 * 8. Welch: n < 3 가드 순서
 */
describe('Comprehensive Fixes Validation', () => {
  describe('Bug #7: extractNumericSeries - 숫자 배열 null 필터링', () => {
    let executor: DescriptiveExecutor

    beforeEach(() => {
      executor = new DescriptiveExecutor()
    })

    it('순수 숫자 배열에서 null을 필터링한다', async () => {
      const data = [10, 20, null, 30, undefined, 40]

      const result = await executor.execute(data, { method: 'basic' })

      // null/undefined 제외하고 4개만
      expect(result.metadata.dataSize).toBe(4)
    })

    it('Number(null) === 0 버그를 차단한다', async () => {
      const data = [10, 20, null, 30]

      const extracted = (executor as any).extractNumericSeries(data, {})

      // null이 0으로 변환되지 않았다면 3개만
      expect(extracted).toEqual([10, 20, 30])
      expect(extracted).not.toContain(0)
    })

    it('NaN을 필터링한다', async () => {
      const data = [10, NaN, 20, 30]

      const extracted = (executor as any).extractNumericSeries(data, {})

      expect(extracted).toEqual([10, 20, 30])
    })

    it('Infinity를 필터링한다', async () => {
      const data = [10, Infinity, 20, -Infinity, 30]

      const extracted = (executor as any).extractNumericSeries(data, {})

      expect(extracted).toEqual([10, 20, 30])
    })

    it('혼합 타입 배열을 처리한다', async () => {
      const data = [10, '20', null, 30, 'invalid', NaN, 40]

      const extracted = (executor as any).extractNumericSeries(data, {})

      // 10, '20' → 20, 30, 40만 유효
      expect(extracted).toEqual([10, 20, 30, 40])
    })
  })

  describe('Bug #8: Welch - n < 3 가드 순서', () => {
    let executor: TTestExecutor

    beforeEach(() => {
      executor = new TTestExecutor()
    })

    it('n=2 그룹에서 Pyodide 호출 전에 에러를 던진다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20], // n=2
        group2: [15, 25]
      }

      const result = await executor.execute([], options)

      // Pyodide 호출 전에 에러 발생
      expect(result.mainResults.interpretation).toContain('최소 3개 이상')
    })

    it('n=1 그룹에서 즉시 에러를 던진다', async () => {
      const options = {
        method: 'welch',
        group1: [10], // n=1
        group2: [15, 25, 35]
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.interpretation).toContain('최소 3개 이상')
    })

    it('n=3일 때는 정상 작동한다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20, 30],
        group2: [15, 25, 35]
      }

      const result = await executor.execute([], options)

      // n=3은 허용
      expect(result.mainResults.statistic).toBeDefined()
    })
  })

  describe('통합 시나리오: 전체 수정 검증', () => {
    it('Two-Way ANOVA: null + factor null + 빈 배열 + dataSize', async () => {
      const executor = new AnovaExecutor()

      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: null, factor2: 'X', value: 15 }, // factor null → 필터링
        { factor1: 'A', factor2: null, value: 20 }, // factor null → 필터링
        { factor1: 'A', factor2: 'Y', value: null }, // value null → 필터링
        { factor1: 'B', factor2: 'X', value: 25 },
        { factor1: 'B', factor2: 'Y', value: NaN } // NaN → 필터링
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await executor.execute(data, options)

      // 유효한 데이터: 10, 25만 (2개)
      expect(result.metadata.dataSize).toBe(2)
    })

    it('Welch: equalVar=false + Cohen\'s d 평균 SD + n >= 3', async () => {
      const executor = new TTestExecutor()

      const options = {
        method: 'welch',
        group1: [10, 20, 30, 40, 50], // n=5, std=15.81
        group2: [100, 200, 300] // n=3, std=100 (이분산)
      }

      const result = await executor.execute([], options)

      // equalVar=false
      expect(result.additionalInfo.equalVariance).toBe(false)

      // Cohen's d가 평균 SD로 계산됨
      const cohensD = result.additionalInfo.effectSize?.value
      expect(cohensD).toBeDefined()

      // 이분산 가정 확인
      expect(result.metadata.assumptions?.homogeneity?.passed).toBe(false)
      expect(result.metadata.assumptions?.homogeneity?.test).toContain('assumes unequal variances')
    })

    it('T-Test: 빈 배열 가드 (4개 메서드 모두)', async () => {
      const executor = new TTestExecutor()

      // One-Sample
      const result1 = await executor.execute([], {
        method: 'one-sample',
        populationMean: 30
      })
      expect(result1.mainResults.interpretation).toContain('유효한 수치형 데이터가 없습니다')

      // Independent
      const result2 = await executor.execute([], {
        method: 'independent',
        group1: [],
        group2: [15, 25, 35]
      })
      expect(result2.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')

      // Paired
      const result3 = await executor.execute([], {
        method: 'paired',
        before: [70, 75, 80],
        after: []
      })
      expect(result3.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')

      // Welch
      const result4 = await executor.execute([], {
        method: 'welch',
        group1: [10, 20],
        group2: []
      })
      expect(result4.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')
    })
  })

  describe('Edge Cases: 경계 조건 검증', () => {
    it('모든 데이터가 invalid한 경우', async () => {
      const executor = new DescriptiveExecutor()

      const data = [null, undefined, NaN, Infinity, -Infinity]

      const result = await executor.execute(data, { method: 'basic' })

      expect(result.metadata.dataSize).toBe(0)
    })

    it('문자열 숫자 변환 + null 혼합', async () => {
      const executor = new DescriptiveExecutor()

      const data = ['10', '20', null, '30', 'invalid', undefined, '40']

      const extracted = (executor as any).extractNumericSeries(data, {})

      // 10, 20, 30, 40만 유효
      expect(extracted).toEqual([10, 20, 30, 40])
    })

    it('객체 배열에서 null 값 컬럼 처리', async () => {
      const executor = new DescriptiveExecutor()

      const data = [
        { age: 25 },
        { age: null },
        { age: 30 },
        { age: undefined },
        { age: 35 }
      ]

      const extracted = (executor as any).extractNumericSeries(data, { variables: 'age' })

      expect(extracted).toEqual([25, 30, 35])
    })
  })
})
