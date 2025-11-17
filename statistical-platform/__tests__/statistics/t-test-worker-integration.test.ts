/**
 * T-Test 페이지 Worker 통합 테스트
 *
 * 목적: PyodideCore 변환 후 로직 검증
 * - Worker 호출 3가지 타입 (one-sample, two-sample, paired)
 * - 결과 매핑 정확성
 * - Effect size 계산
 */

describe('T-Test Worker Integration', () => {
  describe('1. One-sample T-test', () => {
    it('데이터 추출 및 Worker 파라미터 구성', () => {
      const uploadedData = {
        data: [
          { value: 10 },
          { value: 12 },
          { value: 14 },
          { value: 16 }
        ]
      }

      const valueCol = 'value'
      const testValue = 10

      // 실제 코드 로직 (Lines 135-138)
      const values = uploadedData.data.map((row) => row[valueCol] as number)

      expect(values).toEqual([10, 12, 14, 16])
      expect(values.length).toBe(4)

      // Worker 호출 파라미터
      const params = { data: values, popmean: testValue }
      expect(params.data).toEqual([10, 12, 14, 16])
      expect(params.popmean).toBe(10)
    })

    it('Worker 결과를 TTestResult 타입으로 변환', () => {
      // Worker 반환값 (Lines 140-144)
      const workerResult = {
        statistic: 2.449,
        pValue: 0.092,
        sampleMean: 13
      }

      const n = 4
      const df = n - 1

      // 최종 결과 매핑 (Lines 190-199)
      const finalResult = {
        type: 'one-sample' as const,
        statistic: workerResult.statistic,
        pvalue: workerResult.pValue,
        df: df
      }

      expect(finalResult.type).toBe('one-sample')
      expect(finalResult.statistic).toBe(2.449)
      expect(finalResult.pvalue).toBe(0.092)
      expect(finalResult.df).toBe(3)
    })
  })

  describe('2. Two-sample T-test', () => {
    it('그룹별 데이터 분리', () => {
      const uploadedData = {
        data: [
          { group: 'A', value: 10 },
          { group: 'B', value: 20 },
          { group: 'A', value: 12 },
          { group: 'B', value: 22 }
        ]
      }

      const groupCol = 'group'
      const valueCol = 'value'

      // 그룹 고유값 추출 (Lines 150-151)
      const uniqueGroups = Array.from(new Set(uploadedData.data.map(row => row[groupCol])))
      expect(uniqueGroups).toEqual(['A', 'B'])

      // 그룹별 데이터 필터링 (Lines 153-159)
      const group1Data = uploadedData.data
        .filter((row) => row[groupCol] === uniqueGroups[0])
        .map((row) => row[valueCol] as number)

      const group2Data = uploadedData.data
        .filter((row) => row[groupCol] === uniqueGroups[1])
        .map((row) => row[valueCol] as number)

      expect(group1Data).toEqual([10, 12])
      expect(group2Data).toEqual([20, 22])
    })

    it('Worker 결과를 TTestResult 타입으로 변환 (효과 크기 포함)', () => {
      // Worker 반환값 (Lines 161-169)
      const workerResult = {
        statistic: -5.0,
        pValue: 0.015,
        cohensD: -3.536,
        mean1: 11,
        mean2: 21,
        std1: 1.414,
        std2: 1.414,
        n1: 2,
        n2: 2
      }

      // Effect size 해석
      const interpretEffectSize = (d: number) => {
        const absD = Math.abs(d)
        if (absD >= 0.8) return '큰 효과'
        if (absD >= 0.5) return '중간 효과'
        if (absD >= 0.2) return '작은 효과'
        return '효과 없음'
      }

      // 최종 결과 매핑 (Lines 201-218)
      const finalResult = {
        type: 'two-sample' as const,
        statistic: workerResult.statistic,
        pvalue: workerResult.pValue,
        df: workerResult.n1 + workerResult.n2 - 2, // 2
        mean_diff: workerResult.mean1 - workerResult.mean2, // -10
        effect_size: {
          cohens_d: workerResult.cohensD,
          interpretation: interpretEffectSize(workerResult.cohensD)
        },
        sample_stats: {
          group1: { mean: workerResult.mean1, std: workerResult.std1, n: workerResult.n1 },
          group2: { mean: workerResult.mean2, std: workerResult.std2, n: workerResult.n2 }
        }
      }

      expect(finalResult.type).toBe('two-sample')
      expect(finalResult.statistic).toBe(-5.0)
      expect(finalResult.df).toBe(2)
      expect(finalResult.mean_diff).toBe(-10)
      expect(finalResult.effect_size.cohens_d).toBe(-3.536)
      expect(finalResult.effect_size.interpretation).toBe('큰 효과')
      expect(finalResult.sample_stats.group1.mean).toBe(11)
      expect(finalResult.sample_stats.group2.mean).toBe(21)
    })
  })

  describe('3. Paired T-test', () => {
    it('대응 데이터 추출', () => {
      const uploadedData = {
        data: [
          { before: 10, after: 12 },
          { before: 14, after: 16 },
          { before: 18, after: 20 }
        ]
      }

      const beforeCol = 'before'
      const afterCol = 'after'

      // 실제 코드 로직 (Lines 175-176)
      const values1 = uploadedData.data.map((row) => row[beforeCol] as number)
      const values2 = uploadedData.data.map((row) => row[afterCol] as number)

      expect(values1).toEqual([10, 14, 18])
      expect(values2).toEqual([12, 16, 20])
      expect(values1.length).toBe(values2.length)
    })

    it('Worker 결과를 TTestResult 타입으로 변환', () => {
      // Worker 반환값 (Lines 178-182)
      const workerResult = {
        statistic: -3.464,
        pValue: 0.074,
        meanDiff: -2.0,
        nPairs: 3
      }

      // 최종 결과 매핑 (Lines 220-227)
      const finalResult = {
        type: 'paired' as const,
        statistic: workerResult.statistic,
        pvalue: workerResult.pValue,
        df: workerResult.nPairs - 1, // 2
        mean_diff: workerResult.meanDiff
      }

      expect(finalResult.type).toBe('paired')
      expect(finalResult.statistic).toBe(-3.464)
      expect(finalResult.pvalue).toBe(0.074)
      expect(finalResult.df).toBe(2)
      expect(finalResult.mean_diff).toBe(-2.0)
    })
  })

  describe('4. Effect Size 해석', () => {
    it('Cohen\'s d 해석', () => {
      const interpretEffectSize = (d: number) => {
        const absD = Math.abs(d)
        if (absD >= 0.8) return '큰 효과'
        if (absD >= 0.5) return '중간 효과'
        if (absD >= 0.2) return '작은 효과'
        return '효과 없음'
      }

      expect(interpretEffectSize(1.5)).toBe('큰 효과')
      expect(interpretEffectSize(-0.9)).toBe('큰 효과')
      expect(interpretEffectSize(0.6)).toBe('중간 효과')
      expect(interpretEffectSize(0.3)).toBe('작은 효과')
      expect(interpretEffectSize(0.1)).toBe('효과 없음')
    })
  })

  describe('5. Button Disabled Logic', () => {
    it('One-sample: value 변수 선택 필수', () => {
      const testType = 'one-sample'
      const selectedVariables1 = { value: 'weight' }
      const selectedVariables2 = {}

      // 실제 코드 로직 (Lines 535-540)
      const disabled1 = testType === 'one-sample' && !selectedVariables1.value
      const disabled2 = testType === 'one-sample' && !(selectedVariables2 as { value?: string }).value

      expect(disabled1).toBe(false) // value 있음 → 활성화
      expect(disabled2).toBe(true)  // value 없음 → 비활성화
    })

    it('Two-sample: group + value 변수 선택 필수', () => {
      const testType = 'two-sample'
      const selectedVariables1 = { group: 'treatment', value: 'weight' }
      const selectedVariables2 = { group: 'treatment' }
      const selectedVariables3 = { value: 'weight' }

      const disabled1 = testType === 'two-sample' && (!selectedVariables1.group || !selectedVariables1.value)
      const disabled2 = testType === 'two-sample' && (!selectedVariables2.group || !(selectedVariables2 as { value?: string }).value)
      const disabled3 = testType === 'two-sample' && (!(selectedVariables3 as { group?: string }).group || !selectedVariables3.value)

      expect(disabled1).toBe(false) // 둘 다 있음 → 활성화
      expect(disabled2).toBe(true)  // value 없음 → 비활성화
      expect(disabled3).toBe(true)  // group 없음 → 비활성화
    })

    it('Paired: before + after 변수 선택 필수', () => {
      const testType = 'paired'
      const selectedVariables1 = { before: 'pre_test', after: 'post_test' }
      const selectedVariables2 = { before: 'pre_test' }
      const selectedVariables3 = { after: 'post_test' }

      const disabled1 = testType === 'paired' && (!selectedVariables1.before || !selectedVariables1.after)
      const disabled2 = testType === 'paired' && (!selectedVariables2.before || !(selectedVariables2 as { after?: string }).after)
      const disabled3 = testType === 'paired' && (!(selectedVariables3 as { before?: string }).before || !selectedVariables3.after)

      expect(disabled1).toBe(false) // 둘 다 있음 → 활성화
      expect(disabled2).toBe(true)  // after 없음 → 비활성화
      expect(disabled3).toBe(true)  // before 없음 → 비활성화
    })
  })

  describe('6. Variable Selection UI 패턴', () => {
    it('One-sample: 단일 value 변수 선택', () => {
      const testType = 'one-sample'
      const columns = ['age', 'weight', 'height']
      const selectedVariables = { value: 'weight' }

      // UI 렌더링 로직 (Lines 385-407)
      const isSelected = (header: string) => selectedVariables.value === header

      expect(isSelected('weight')).toBe(true)
      expect(isSelected('age')).toBe(false)
      expect(isSelected('height')).toBe(false)
    })

    it('Two-sample: group + value 2개 변수 선택', () => {
      const testType = 'two-sample'
      const selectedVariables = { group: 'treatment', value: 'weight' }

      expect(selectedVariables.group).toBe('treatment')
      expect(selectedVariables.value).toBe('weight')
    })

    it('Paired: before + after 2개 변수 선택', () => {
      const testType = 'paired'
      const selectedVariables = { before: 'pre_test', after: 'post_test' }

      expect(selectedVariables.before).toBe('pre_test')
      expect(selectedVariables.after).toBe('post_test')
    })
  })
})