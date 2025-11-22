import { AnovaExecutor } from '@/lib/services/executors/anova-executor'
import { TTestExecutor } from '@/lib/services/executors/t-test-executor'

/**
 * 추가 수정 검증 테스트 (3가지 버그)
 * 1. Two-Way ANOVA: 빈 배열 가드 + dataSize 정확도
 * 2. Two-Way ANOVA: factor null/undefined 검증
 * 3. Welch: Cohen's d 계산 (평균 SD 사용)
 */
describe('Additional Fixes Validation', () => {
  describe('Bug #1: Two-Way ANOVA - 빈 배열 + dataSize', () => {
    let anovaExecutor: AnovaExecutor

    beforeEach(() => {
      anovaExecutor = new AnovaExecutor()
    })

    it('모든 데이터가 null이면 에러를 던진다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: null },
        { factor1: 'A', factor2: 'Y', value: null },
        { factor1: 'B', factor2: 'X', value: null }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.mainResults.interpretation).toContain('유효한 데이터가 없습니다')
    })

    it('필터링 후 dataSize가 정확해야 한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'X', value: null }, // 필터링
        { factor1: 'A', factor2: 'Y', value: 15 },
        { factor1: 'B', factor2: 'X', value: null }, // 필터링
        { factor1: 'B', factor2: 'Y', value: 25 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      // 필터링 후 3개만 남음
      expect(result.metadata.dataSize).toBe(3)
    })

    it('dataSize가 원본이 아닌 필터링 후 크기를 반영해야 한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'Y', value: NaN }, // 필터링
        { factor1: 'B', factor2: 'X', value: 20 },
        { factor1: 'B', factor2: 'Y', value: Infinity } // 필터링
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.metadata.dataSize).toBe(2) // 10, 20만 유효
    })
  })

  describe('Bug #2: Two-Way ANOVA - factor null/undefined', () => {
    let anovaExecutor: AnovaExecutor

    beforeEach(() => {
      anovaExecutor = new AnovaExecutor()
    })

    it('factor1이 null이면 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: null, factor2: 'X', value: 15 }, // 필터링
        { factor1: 'B', factor2: 'Y', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.metadata.dataSize).toBe(2)
    })

    it('factor2가 undefined이면 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: undefined, value: 15 }, // 필터링
        { factor1: 'B', factor2: 'Y', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.metadata.dataSize).toBe(2)
    })

    it('factor와 dependent가 모두 null이면 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: null, factor2: null, value: null }, // 필터링
        { factor1: 'B', factor2: 'Y', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.metadata.dataSize).toBe(2)
    })
  })

  describe('Bug #3: Welch - Cohen\'s d 계산', () => {
    let ttestExecutor: TTestExecutor

    beforeEach(() => {
      ttestExecutor = new TTestExecutor()
    })

    it('작은 표본 (n < 3)이면 에러를 던진다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20], // n=2
        group2: [15, 25, 35]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('최소 3개 이상')
    })

    it('n=3일 때 정상 작동한다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20, 30],
        group2: [15, 25, 35]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.effectSize?.value).toBeDefined()
    })

    it('Cohen\'s d가 평균 SD로 계산되어야 한다 (pooled SD 아님)', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20, 30, 40, 50],
        group2: [15, 25, 35, 45, 55]
      }

      const result = await ttestExecutor.execute([], options)

      // Welch는 이분산이므로 평균 SD 사용
      // group1 mean=30, std=15.81
      // group2 mean=35, std=15.81
      // meanStd = sqrt((15.81^2 + 15.81^2) / 2) = 15.81
      // cohensD = (30 - 35) / 15.81 = -0.316

      const cohensD = result.additionalInfo.effectSize?.value
      expect(cohensD).toBeDefined()
      expect(Math.abs(cohensD!)).toBeGreaterThan(0)
      expect(Math.abs(cohensD!)).toBeLessThan(1) // 중간 효과 크기
    })

    it('이분산 데이터에서 정상 작동해야 한다', async () => {
      const options = {
        method: 'welch',
        group1: [1, 2, 3, 4, 5], // std=1.58
        group2: [10, 20, 30, 40, 50] // std=15.81
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.equalVariance).toBe(false)
    })
  })
})
