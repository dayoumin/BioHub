import { TTestExecutor } from '@/lib/services/executors/t-test-executor'

/**
 * TTestExecutor 데이터 추출 테스트
 * - extractNumericSeries 적용 검증
 * - 객체 배열 → 숫자 배열 변환 테스트
 */
describe('TTestExecutor - Data Extraction', () => {
  let executor: TTestExecutor

  beforeEach(() => {
    executor = new TTestExecutor()
  })

  describe('One-Sample T-Test', () => {
    it('숫자 배열을 직접 사용한다', async () => {
      const data: unknown[] = [25, 30, 35, 40, 45]
      const options = {
        method: 'one-sample',
        populationMean: 30
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.mainResults.pvalue).toBeDefined()
      expect(result.metadata.dataSize).toBe(5)
    })

    it('객체 배열에서 변수를 추출한다', async () => {
      const data = [
        { age: 25 },
        { age: 30 },
        { age: 35 },
        { age: 40 },
        { age: 45 }
      ]
      const options = {
        method: 'one-sample',
        variables: 'age',
        populationMean: 30
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.metadata.dataSize).toBe(5)
    })

    it('null 값을 필터링한다', async () => {
      const data = [
        { age: 25 },
        { age: null },
        { age: 30 },
        { age: undefined },
        { age: 35 }
      ]
      const options = {
        method: 'one-sample',
        variables: 'age',
        populationMean: 30
      }

      const result = await executor.execute(data, options)

      expect(result.metadata.dataSize).toBe(3) // null/undefined 제외
    })

    it('populationMean이 없으면 0을 사용한다', async () => {
      const data = [1, 2, 3, 4, 5]
      const options = {
        method: 'one-sample'
        // populationMean 없음
      }

      const result = await executor.execute(data, options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.populationMean).toBe(0)
    })
  })

  describe('Independent T-Test', () => {
    it('숫자 배열 그룹을 직접 사용한다', async () => {
      const options = {
        method: 'independent',
        group1: [25, 30, 35, 40, 45],
        group2: [20, 25, 30, 35, 40]
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.mainResults.pvalue).toBeDefined()
    })

    it('객체 배열 그룹에서 변수를 추출한다', async () => {
      const options = {
        method: 'independent',
        group1: [{ score: 85 }, { score: 90 }, { score: 95 }],
        group2: [{ score: 75 }, { score: 80 }, { score: 85 }],
        variables: 'score'
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.additionalInfo.group1Stats?.n).toBe(3)
      expect(result.additionalInfo.group2Stats?.n).toBe(3)
    })

    it('null 값을 각 그룹에서 필터링한다', async () => {
      const options = {
        method: 'independent',
        group1: [{ value: 10 }, { value: null }, { value: 20 }, { value: 30 }],
        group2: [{ value: 5 }, { value: 15 }, { value: null }, { value: 25 }],
        variables: 'value'
      }

      const result = await executor.execute([], options)

      expect(result.additionalInfo.group1Stats?.n).toBe(3)
      expect(result.additionalInfo.group2Stats?.n).toBe(3)
    })

    it('문자열 숫자를 변환한다', async () => {
      const options = {
        method: 'independent',
        group1: [{ age: '25' }, { age: '30' }, { age: '35' }],
        group2: [{ age: '20' }, { age: '25' }, { age: '30' }],
        variables: 'age'
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
    })
  })

  describe('Paired T-Test', () => {
    it('대응 데이터를 추출한다', async () => {
      const options = {
        method: 'paired',
        before: [{ score: 70 }, { score: 75 }, { score: 80 }],
        after: [{ score: 85 }, { score: 90 }, { score: 95 }],
        variables: 'score'
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
      expect(result.metadata.dataSize).toBe(3)
    })

    it('null 값을 필터링한다', async () => {
      const options = {
        method: 'paired',
        before: [{ value: 10 }, { value: null }, { value: 20 }, { value: 30 }],
        after: [{ value: 15 }, { value: null }, { value: 25 }, { value: 35 }],
        variables: 'value'
      }

      const result = await executor.execute([], options)

      expect(result.metadata.dataSize).toBe(3) // null 제외
    })
  })

  describe('Welch T-Test', () => {
    it('이분산 가정으로 그룹을 처리한다', async () => {
      const options = {
        method: 'welch',
        group1: [{ value: 10 }, { value: 20 }, { value: 30 }],
        group2: [{ value: 5 }, { value: 15 }, { value: 25 }],
        variables: 'value'
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('빈 배열을 처리한다', async () => {
      const options = {
        method: 'independent',
        group1: [],
        group2: []
      }

      const result = await executor.execute([], options)

      // 에러 또는 NaN 결과 예상
      expect(result.mainResults.statistic).toBeDefined()
    })

    it('배열이 아닌 그룹 데이터를 처리한다', async () => {
      const options = {
        method: 'independent',
        group1: 'not an array',
        group2: 'also not an array'
      }

      const result = await executor.execute([], options)

      expect(result.mainResults.statistic).toBeDefined()
    })

    it('혼합 타입 데이터를 처리한다', async () => {
      const options = {
        method: 'one-sample',
        populationMean: 25
      }
      const data = [
        { value: 10 },
        { value: '20' },
        { value: null },
        { value: 30 },
        { value: 'invalid' },
        { value: 40 }
      ]

      const result = await executor.execute(data, { ...options, variables: 'value' })

      expect(result.metadata.dataSize).toBe(4) // 10, 20, 30, 40만 유효
    })
  })
})
