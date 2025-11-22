import { TTestExecutor } from '@/lib/services/executors/t-test-executor'
import { AnovaExecutor } from '@/lib/services/executors/anova-executor'
import { DescriptiveExecutor } from '@/lib/services/executors/descriptive-executor'

/**
 * 추가 발견 버그 검증 테스트 (3개)
 *
 * Bug #10: Welch - Zero Variance Guard
 * Bug #11: extractNumericSeries - Empty String Coercion
 * Bug #12: Two-Way ANOVA - Field Validation
 */
describe('Additional Bugs Validation', () => {
  describe('Bug #10: Welch - Zero Variance Guard', () => {
    let executor: TTestExecutor

    beforeEach(() => {
      executor = new TTestExecutor()
    })

    it('두 그룹이 모두 상수이고 평균이 같으면 cohensD = 0', async () => {
      const options = {
        method: 'welch',
        group1: [10, 10, 10],
        group2: [10, 10, 10]
      }

      const result = await executor.execute([], options)

      const cohensD = result.additionalInfo.effectSize?.value
      expect(cohensD).toBe(0) // meanStd = 0, mean1 = mean2 → cohensD = 0
    })

    it('두 그룹이 모두 상수이지만 평균이 다르면 cohensD = NaN', async () => {
      const options = {
        method: 'welch',
        group1: [10, 10, 10],
        group2: [20, 20, 20]
      }

      const result = await executor.execute([], options)

      const cohensD = result.additionalInfo.effectSize?.value
      expect(cohensD).toBeNaN() // meanStd = 0, mean1 ≠ mean2 → NaN (효과 크기 계산 불가)
    })

    it('한 그룹만 상수이면 정상 계산된다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 10, 10],
        group2: [15, 20, 25]
      }

      const result = await executor.execute([], options)

      const cohensD = result.additionalInfo.effectSize?.value
      expect(cohensD).toBeDefined()
      expect(Number.isFinite(cohensD!)).toBe(true)
    })

    it('Infinity가 아닌 유효한 값을 반환한다', async () => {
      const options = {
        method: 'welch',
        group1: [5, 5, 5],
        group2: [10, 10, 10]
      }

      const result = await executor.execute([], options)

      const cohensD = result.additionalInfo.effectSize?.value

      // Infinity가 아님을 확인
      expect(cohensD).not.toBe(Infinity)
      expect(cohensD).not.toBe(-Infinity)

      // 0 또는 NaN 중 하나
      expect(cohensD === 0 || Number.isNaN(cohensD)).toBe(true)
    })
  })

  describe('Bug #11: extractNumericSeries - Empty String Coercion', () => {
    let executor: DescriptiveExecutor

    beforeEach(() => {
      executor = new DescriptiveExecutor()
    })

    it('빈 문자열을 0으로 변환하지 않는다', () => {
      const data = ['10', '', '20', '30']

      const extracted = (executor as any).extractNumericSeries(data, {})

      // '' → 필터링 (0으로 변환하지 않음)
      expect(extracted).toEqual([10, 20, 30])
      expect(extracted).not.toContain(0)
    })

    it('공백 문자열을 0으로 변환하지 않는다', () => {
      const data = ['10', '  ', '20', '\t\n', '30']

      const extracted = (executor as any).extractNumericSeries(data, {})

      // 공백 → 필터링
      expect(extracted).toEqual([10, 20, 30])
    })

    it('객체 배열에서도 빈 문자열을 필터링한다', () => {
      const data = [
        { age: '25' },
        { age: '' }, // 필터링
        { age: '30' },
        { age: '  ' }, // 필터링
        { age: '35' }
      ]

      const extracted = (executor as any).extractNumericSeries(data, { variables: 'age' })

      expect(extracted).toEqual([25, 30, 35])
    })

    it('혼합 타입에서 빈 문자열 + null을 모두 필터링한다', () => {
      const data = ['10', '', null, '20', '  ', undefined, '30']

      const extracted = (executor as any).extractNumericSeries(data, {})

      expect(extracted).toEqual([10, 20, 30])
    })

    it('유효한 "0" 문자열은 변환한다', () => {
      const data = ['10', '0', '20', '-5', '30']

      const extracted = (executor as any).extractNumericSeries(data, {})

      // "0"은 유효한 숫자
      expect(extracted).toEqual([10, 0, 20, -5, 30])
    })
  })

  describe('Bug #12: Two-Way ANOVA - Field Validation', () => {
    let executor: AnovaExecutor

    beforeEach(() => {
      executor = new AnovaExecutor()
    })

    it('factor1이 없으면 사전 에러를 던진다', async () => {
      const data = [
        { factor2: 'X', value: 10 },
        { factor2: 'Y', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: '', // 빈 문자열
        factor2: 'factor2',
        dependent: 'value'
      }

      await expect(executor.execute(data, options)).rejects.toThrow('factor1, factor2, dependent 변수가 모두 필요합니다')
    })

    it('factor2가 없으면 사전 에러를 던진다', async () => {
      const data = [
        { factor1: 'A', value: 10 },
        { factor1: 'B', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: undefined, // undefined
        dependent: 'value'
      }

      await expect(executor.execute(data, options)).rejects.toThrow('factor1, factor2, dependent 변수가 모두 필요합니다')
    })

    it('dependent가 없으면 사전 에러를 던진다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X' },
        { factor1: 'B', factor2: 'Y' }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: '' // 빈 문자열
      }

      await expect(executor.execute(data, options)).rejects.toThrow('factor1, factor2, dependent 변수가 모두 필요합니다')
    })

    it('모든 필드가 있으면 정상 작동한다', async () => {
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
    })
  })

  describe('통합 시나리오: 전체 버그 검증', () => {
    it('Welch: zero variance + 빈 문자열 처리', async () => {
      const executor = new TTestExecutor()

      const options = {
        method: 'welch',
        group1: [{ value: '10' }, { value: '10' }, { value: '10' }], // 상수 + 문자열
        group2: [{ value: '20' }, { value: '20' }, { value: '20' }],
        variables: 'value'
      }

      const result = await executor.execute([], options)

      // 문자열 → 숫자 변환
      expect(result.additionalInfo.group1Stats?.mean).toBe(10)
      expect(result.additionalInfo.group2Stats?.mean).toBe(20)

      // Zero variance → NaN
      const cohensD = result.additionalInfo.effectSize?.value
      expect(Number.isNaN(cohensD)).toBe(true)
    })

    it('빈 문자열 + 유효한 데이터 혼합', async () => {
      const executor = new DescriptiveExecutor()

      const data = [
        { age: '25' },
        { age: '' }, // 빈 문자열 → 필터링
        { age: '30' },
        { age: null }, // null → 필터링
        { age: '  ' }, // 공백 → 필터링
        { age: '35' }
      ]

      const extracted = (executor as any).extractNumericSeries(data, { variables: 'age' })

      expect(extracted).toEqual([25, 30, 35])
    })
  })
})
