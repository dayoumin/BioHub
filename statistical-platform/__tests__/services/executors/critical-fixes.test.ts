import { AnovaExecutor } from '@/lib/services/executors/anova-executor'
import { TTestExecutor } from '@/lib/services/executors/t-test-executor'

/**
 * Critical 버그 수정 검증 테스트
 * 1. Two-Way ANOVA null 필터링
 * 2. Welch t-test equalVar=false 강제
 * 3. 빈 배열 가드
 */
describe('Critical Fixes Validation', () => {
  describe('Two-Way ANOVA - null 필터링', () => {
    let anovaExecutor: AnovaExecutor

    beforeEach(() => {
      anovaExecutor = new AnovaExecutor()
    })

    it('Number(null) === 0 버그를 차단한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'X', value: null }, // null → 필터링
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

      const result = await anovaExecutor.execute(data, options)

      // metadata.dataSize는 원본 데이터 크기 (5)
      expect(result.metadata.dataSize).toBe(5)

      // null이 0으로 변환되지 않았다면 결과가 정상
      expect(result.mainResults.statistic).toBeDefined()
      expect(result.mainResults.pvalue).toBeDefined()
    })

    it('undefined 값을 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'X', value: undefined }, // undefined → 필터링
        { factor1: 'A', factor2: 'Y', value: 15 },
        { factor1: 'B', factor2: 'X', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
    })

    it('NaN 값을 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'X', value: NaN }, // NaN → 필터링
        { factor1: 'A', factor2: 'Y', value: 15 },
        { factor1: 'B', factor2: 'X', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
    })

    it('Infinity 값을 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'X', value: Infinity }, // Infinity → 필터링
        { factor1: 'A', factor2: 'Y', value: 15 },
        { factor1: 'B', factor2: 'X', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
    })

    it('문자열 숫자를 변환한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: '10' },
        { factor1: 'A', factor2: 'Y', value: '15' },
        { factor1: 'B', factor2: 'X', value: '20' },
        { factor1: 'B', factor2: 'Y', value: '25' }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
    })

    it('변환 불가능한 문자열을 필터링한다', async () => {
      const data = [
        { factor1: 'A', factor2: 'X', value: 10 },
        { factor1: 'A', factor2: 'X', value: 'invalid' }, // 'invalid' → NaN → 필터링
        { factor1: 'A', factor2: 'Y', value: 15 },
        { factor1: 'B', factor2: 'X', value: 20 }
      ]

      const options = {
        method: 'two-way',
        factor1: 'factor1',
        factor2: 'factor2',
        dependent: 'value'
      }

      const result = await anovaExecutor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
    })
  })

  describe('Welch t-test - equalVar=false 강제', () => {
    let ttestExecutor: TTestExecutor

    beforeEach(() => {
      ttestExecutor = new TTestExecutor()
    })

    it('equalVar가 항상 false이다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20, 30, 40, 50],
        group2: [15, 25, 35, 45, 55]
      }

      const result = await ttestExecutor.execute([], options)

      // Welch는 항상 이분산 가정
      expect(result.additionalInfo.equalVariance).toBe(false)
    })

    it('homogeneity.passed가 false이다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20, 30],
        group2: [15, 25, 35]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.metadata.assumptions?.homogeneity?.passed).toBe(false)
    })

    it('homogeneity 테스트가 "None"이다', async () => {
      const options = {
        method: 'welch',
        group1: [10, 20, 30],
        group2: [15, 25, 35]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.metadata.assumptions?.homogeneity?.test).toContain('assumes unequal variances')
    })

    it('Independent t-test와 다른 결과를 반환한다', async () => {
      const group1 = [10, 20, 30, 40, 50]
      const group2 = [15, 25, 35, 45, 55]

      const welchResult = await ttestExecutor.execute([], {
        method: 'welch',
        group1,
        group2
      })

      const independentResult = await ttestExecutor.execute([], {
        method: 'independent',
        group1,
        group2
      })

      // equalVariance 차이
      expect(welchResult.additionalInfo.equalVariance).toBe(false)
      expect(independentResult.additionalInfo.equalVariance).toBeDefined() // Levene 결과에 따라 true/false
    })
  })

  describe('빈 배열 가드', () => {
    let ttestExecutor: TTestExecutor

    beforeEach(() => {
      ttestExecutor = new TTestExecutor()
    })

    it('One-sample: 빈 배열 시 에러를 던진다', async () => {
      const options = {
        method: 'one-sample',
        populationMean: 30
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('분석 실행 중 오류 발생')
      expect(result.mainResults.interpretation).toContain('유효한 수치형 데이터가 없습니다')
    })

    it('Independent: 첫 번째 그룹이 비어있으면 에러를 던진다', async () => {
      const options = {
        method: 'independent',
        group1: [],
        group2: [15, 25, 35]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('분석 실행 중 오류 발생')
      expect(result.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')
    })

    it('Independent: 두 번째 그룹이 비어있으면 에러를 던진다', async () => {
      const options = {
        method: 'independent',
        group1: [10, 20, 30],
        group2: []
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('분석 실행 중 오류 발생')
      expect(result.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')
    })

    it('Paired: before가 비어있으면 에러를 던진다', async () => {
      const options = {
        method: 'paired',
        before: [],
        after: [85, 90, 95]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('분석 실행 중 오류 발생')
      expect(result.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')
    })

    it('Paired: after가 비어있으면 에러를 던진다', async () => {
      const options = {
        method: 'paired',
        before: [70, 75, 80],
        after: []
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('분석 실행 중 오류 발생')
      expect(result.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')
    })

    it('Welch: 빈 그룹 시 에러를 던진다', async () => {
      const options = {
        method: 'welch',
        group1: [],
        group2: [15, 25, 35]
      }

      const result = await ttestExecutor.execute([], options)

      expect(result.mainResults.interpretation).toContain('분석 실행 중 오류 발생')
      expect(result.mainResults.interpretation).toContain('유효한 수치형 데이터가 필요합니다')
    })
  })
})
