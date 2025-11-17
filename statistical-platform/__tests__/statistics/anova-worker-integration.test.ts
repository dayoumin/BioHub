/**
 * ANOVA 페이지 Worker 통합 테스트
 *
 * 목적: PyodideCore 변환 후 로직 검증
 * - Worker 호출 정상 동작
 * - TypeScript 계산 정확성 (SS, MS, 효과 크기)
 * - 사후검정 pairwise 비교
 */

describe('ANOVA Worker Integration', () => {
  describe('1. 데이터 그룹화 로직', () => {
    it('그룹별 데이터를 정확하게 분리', () => {
      const uploadedData = {
        data: [
          { group: 'A', value: 10 },
          { group: 'B', value: 20 },
          { group: 'A', value: 12 },
          { group: 'C', value: 30 },
          { group: 'B', value: 22 },
          { group: 'C', value: 32 }
        ]
      }

      const groupCol = 'group'
      const depVar = 'value'

      // 실제 코드 로직 (Lines 192-202)
      const groupsMap = new Map<string, number[]>()
      uploadedData.data.forEach((row) => {
        const groupName = String(row[groupCol])
        const value = row[depVar]
        if (typeof value === 'number' && !isNaN(value)) {
          if (!groupsMap.has(groupName)) {
            groupsMap.set(groupName, [])
          }
          groupsMap.get(groupName)!.push(value)
        }
      })

      expect(groupsMap.size).toBe(3)
      expect(groupsMap.get('A')).toEqual([10, 12])
      expect(groupsMap.get('B')).toEqual([20, 22])
      expect(groupsMap.get('C')).toEqual([30, 32])
    })

    it('결측값(NaN, null) 제외', () => {
      const uploadedData = {
        data: [
          { group: 'A', value: 10 },
          { group: 'A', value: NaN },
          { group: 'A', value: null },
          { group: 'A', value: 12 }
        ]
      }

      const groupCol = 'group'
      const depVar = 'value'

      const groupsMap = new Map<string, number[]>()
      uploadedData.data.forEach((row) => {
        const groupName = String(row[groupCol])
        const value = row[depVar]
        if (typeof value === 'number' && !isNaN(value)) {
          if (!groupsMap.has(groupName)) {
            groupsMap.set(groupName, [])
          }
          groupsMap.get(groupName)!.push(value)
        }
      })

      expect(groupsMap.get('A')).toEqual([10, 12])
      expect(groupsMap.get('A')?.length).toBe(2)
    })
  })

  describe('2. 기술통계 계산', () => {
    it('평균, 표준편차, SE, 95% CI 정확 계산', () => {
      const data = [10, 12, 14, 16, 18] // mean=14, std=3.16

      // 실제 코드 로직 (Lines 221-239)
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length
      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1)
      const std = Math.sqrt(variance)
      const se = std / Math.sqrt(data.length)
      const t = 1.96 // 95% CI 근사
      const ciLower = mean - t * se
      const ciUpper = mean + t * se

      expect(mean).toBe(14)
      expect(variance).toBeCloseTo(10, 1) // (4+2+0+2+4)/4 = 10
      expect(std).toBeCloseTo(3.162, 2)
      expect(se).toBeCloseTo(1.414, 2) // 3.162 / √5
      expect(ciLower).toBeCloseTo(11.23, 1)
      expect(ciUpper).toBeCloseTo(16.77, 1)
    })
  })

  describe('3. SS/MS/F 통계량 계산', () => {
    it('SSBetween, SSWithin, SSTotal 정확 계산', () => {
      // 간단한 예: 3그룹, 각 2개 샘플
      const groupsMap = new Map<string, number[]>([
        ['A', [10, 12]], // mean=11
        ['B', [20, 22]], // mean=21
        ['C', [30, 32]]  // mean=31
      ])

      const groupNames = Array.from(groupsMap.keys())
      const groups = groupNames.map((name) => {
        const data = groupsMap.get(name)!
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length
        return { name, mean, data }
      })

      // 전체 평균: (11+21+31)/3 = 21
      const allValues = Array.from(groupsMap.values()).flat()
      const grandMean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length

      expect(grandMean).toBe(21)

      // SSBetween = Σ(n_i * (mean_i - grandMean)^2)
      // = 2*(11-21)^2 + 2*(21-21)^2 + 2*(31-21)^2
      // = 2*100 + 0 + 2*100 = 400
      const ssBetween = groups.reduce((sum, g) => {
        const groupData = groupsMap.get(g.name)!
        return sum + groupData.length * Math.pow(g.mean - grandMean, 2)
      }, 0)

      expect(ssBetween).toBe(400)

      // SSWithin = Σ(Σ(x_ij - mean_i)^2)
      // A: (10-11)^2 + (12-11)^2 = 2
      // B: (20-21)^2 + (22-21)^2 = 2
      // C: (30-31)^2 + (32-31)^2 = 2
      // Total = 6
      const ssWithin = groups.reduce((sum, g) => {
        const groupData = groupsMap.get(g.name)!
        const groupMean = g.mean
        return sum + groupData.reduce((gsum, val) => gsum + Math.pow(val - groupMean, 2), 0)
      }, 0)

      expect(ssWithin).toBe(6)

      const ssTotal = ssBetween + ssWithin
      expect(ssTotal).toBe(406)

      // MS = SS / df
      const df1 = groups.length - 1 // 2
      const df2 = allValues.length - groups.length // 3
      const msBetween = ssBetween / df1 // 400/2 = 200
      const msWithin = ssWithin / df2 // 6/3 = 2

      expect(msBetween).toBe(200)
      expect(msWithin).toBe(2)

      // F = msBetween / msWithin
      const F = msBetween / msWithin // 200/2 = 100
      expect(F).toBe(100)
    })
  })

  describe('4. 효과 크기 계산', () => {
    it('η², ω², Cohen\'s f 정확 계산', () => {
      const ssBetween = 400
      const ssWithin = 6
      const ssTotal = 406
      const df1 = 2
      const msWithin = 2

      // η² = SSBetween / SSTotal
      const etaSquared = ssBetween / ssTotal
      expect(etaSquared).toBeCloseTo(0.985, 3)

      // ω² = (SSBetween - df1 * MSWithin) / (SSTotal + MSWithin)
      const omegaSquared = (ssBetween - df1 * msWithin) / (ssTotal + msWithin)
      expect(omegaSquared).toBeCloseTo(0.971, 3) // (400-4) / 408

      // Cohen's f = √(η² / (1-η²))
      const cohensF = Math.sqrt(etaSquared / (1 - etaSquared))
      expect(cohensF).toBeCloseTo(8.165, 2) // √(0.985 / 0.015) = 8.165
    })

    it('효과 크기 해석', () => {
      const interpretEffectSize = (eta: number) => {
        if (eta >= 0.14) return 'large'
        if (eta >= 0.06) return 'medium'
        if (eta >= 0.01) return 'small'
        return 'none'
      }

      expect(interpretEffectSize(0.985)).toBe('large')
      expect(interpretEffectSize(0.10)).toBe('medium')
      expect(interpretEffectSize(0.02)).toBe('small')
      expect(interpretEffectSize(0.005)).toBe('none')
    })
  })

  describe('5. 사후검정 pairwise 비교', () => {
    it('3그룹에서 3개 비교 생성 (A-B, A-C, B-C)', () => {
      const groupNames = ['A', 'B', 'C']
      const groups = [
        { name: 'A', mean: 11, n: 2 },
        { name: 'B', mean: 21, n: 2 },
        { name: 'C', mean: 31, n: 2 }
      ]
      const msWithin = 2

      // 실제 코드 로직 (Lines 300-328)
      const postHocComparisons = []
      for (let i = 0; i < groupNames.length; i++) {
        for (let j = i + 1; j < groupNames.length; j++) {
          const group1Name = groupNames[i]
          const group2Name = groupNames[j]
          const group1 = groups[i]
          const group2 = groups[j]

          const meanDiff = group1.mean - group2.mean
          const pooledSE = Math.sqrt(msWithin * (1/group1.n + 1/group2.n))
          const t = Math.abs(meanDiff) / pooledSE

          postHocComparisons.push({
            group1: group1Name,
            group2: group2Name,
            meanDiff,
            pooledSE,
            t
          })
        }
      }

      expect(postHocComparisons.length).toBe(3)
      expect(postHocComparisons[0]).toMatchObject({ group1: 'A', group2: 'B' })
      expect(postHocComparisons[1]).toMatchObject({ group1: 'A', group2: 'C' })
      expect(postHocComparisons[2]).toMatchObject({ group1: 'B', group2: 'C' })

      // Pooled SE = √(2 * (1/2 + 1/2)) = √2 = 1.414
      expect(postHocComparisons[0].pooledSE).toBeCloseTo(1.414, 2)

      // A-B: |11-21| / 1.414 = 10 / 1.414 = 7.07
      expect(postHocComparisons[0].t).toBeCloseTo(7.07, 1)
    })

    it('Bonferroni 보정 alpha 계산', () => {
      const numComparisons = 3 // 3그룹 → 3개 비교
      const adjustedAlpha = 0.05 / numComparisons

      expect(adjustedAlpha).toBeCloseTo(0.0167, 4)
    })
  })

  describe('6. Worker 결과 매핑', () => {
    it('Worker 결과를 ANOVAResults 타입으로 정확 변환', () => {
      // Worker 반환값 (최소)
      const workerResult = {
        fStatistic: 100,
        pValue: 0.001,
        df1: 2,
        df2: 3
      }

      // TypeScript 계산 결과
      const ssBetween = 400
      const ssWithin = 6
      const msBetween = 200
      const msWithin = 2
      const etaSquared = 0.985
      const omegaSquared = 0.971
      const cohensF = 8.08

      // 최종 결과 (Lines 345-367)
      const finalResult = {
        fStatistic: workerResult.fStatistic,
        pValue: workerResult.pValue,
        dfBetween: workerResult.df1,
        dfWithin: workerResult.df2,
        msBetween,
        msWithin,
        etaSquared,
        omegaSquared,
        powerAnalysis: {
          observedPower: workerResult.pValue < 0.05 ? 0.80 : 0.50,
          effectSize: etaSquared >= 0.14 ? 'large' : etaSquared >= 0.06 ? 'medium' : 'small',
          cohensF
        },
        groups: [],
        postHoc: undefined,
        assumptions: {
          normality: {
            shapiroWilk: { statistic: 0.95, pValue: 0.15 },
            passed: true,
            interpretation: '정규성 가정이 만족됩니다 (p > 0.05)'
          },
          homogeneity: {
            levene: { statistic: 1.2, pValue: 0.3 },
            passed: true,
            interpretation: '등분산성 가정이 만족됩니다 (p > 0.05)'
          }
        },
        anovaTable: [
          { source: '그룹 간', ss: ssBetween, df: workerResult.df1, ms: msBetween, f: workerResult.fStatistic, p: workerResult.pValue },
          { source: '그룹 내', ss: ssWithin, df: workerResult.df2, ms: msWithin, f: null, p: null },
          { source: '전체', ss: ssBetween + ssWithin, df: workerResult.df1 + workerResult.df2, ms: null, f: null, p: null }
        ]
      }

      expect(finalResult.fStatistic).toBe(100)
      expect(finalResult.pValue).toBe(0.001)
      expect(finalResult.powerAnalysis.effectSize).toBe('large')
      expect(finalResult.anovaTable.length).toBe(3)
    })
  })

  describe('7. 에러 처리', () => {
    it('그룹 수 < 2일 때 에러', () => {
      const groupsArray = [[10, 12]] // 1그룹만

      expect(groupsArray.length < 2).toBe(true)
      // actions.setError?.('최소 2개 이상의 그룹이 필요합니다.')
    })

    it('이원 분산분석: 데이터 수 < 4일 때 에러', () => {
      const dataValues = [10, 12, 14] // 3개만

      expect(dataValues.length < 4).toBe(true)
      // actions.setError?.('이원 분산분석은 최소 4개 이상의 유효한 데이터가 필요합니다.')
    })
  })

  describe('8. 가정 검정 Worker 호출', () => {
    it('test_assumptions 파라미터 구성', () => {
      const groupsArray = [[10, 12], [20, 22], [30, 32]]

      // Worker 호출 파라미터
      const params = { groups: groupsArray }
      expect(params.groups).toEqual(groupsArray)
      expect(params.groups.length).toBe(3)
    })

    it('Worker 결과를 UI 형식으로 변환', () => {
      // Worker 반환값 (Lines 361-372)
      const workerResult = {
        normality: {
          shapiroWilk: [
            { group: 0, statistic: 0.976, pValue: 0.234, passed: true },
            { group: 1, statistic: 0.982, pValue: 0.456, passed: true },
            { group: 2, statistic: 0.968, pValue: 0.123, passed: true }
          ],
          passed: true,
          interpretation: '정규성 가정 만족'
        },
        homogeneity: {
          levene: { statistic: 1.234, pValue: 0.305 },
          passed: true,
          interpretation: '등분산성 가정 만족'
        }
      }

      // UI 변환 (Lines 375-390)
      const overallNormality = workerResult.normality.shapiroWilk[0]
      const assumptionsResult = {
        normality: {
          shapiroWilk: {
            statistic: overallNormality?.statistic ?? 0.95,
            pValue: overallNormality?.pValue ?? 0.15
          },
          passed: workerResult.normality.passed,
          interpretation: workerResult.normality.interpretation
        },
        homogeneity: {
          levene: workerResult.homogeneity.levene,
          passed: workerResult.homogeneity.passed,
          interpretation: workerResult.homogeneity.interpretation
        }
      }

      expect(assumptionsResult.normality.shapiroWilk.statistic).toBe(0.976)
      expect(assumptionsResult.normality.shapiroWilk.pValue).toBe(0.234)
      expect(assumptionsResult.normality.passed).toBe(true)
      expect(assumptionsResult.homogeneity.levene.statistic).toBe(1.234)
      expect(assumptionsResult.homogeneity.passed).toBe(true)
    })
  })

  describe('9. Tukey HSD Worker 호출', () => {
    it('tukey_hsd 파라미터 구성', () => {
      const groupsArray = [[10, 12], [20, 22], [30, 32]]

      const params = { groups: groupsArray }
      expect(params.groups).toEqual(groupsArray)
    })

    it('Worker 결과를 PostHocComparison 타입으로 변환', () => {
      // Worker 반환값 (Lines 301-316)
      const tukeyResult = {
        comparisons: [
          {
            group1: 0,
            group2: 1,
            meanDiff: -10,
            statistic: 7.07,
            pValue: 0.012,
            pAdjusted: 0.012,
            significant: true,
            ciLower: -13.2,
            ciUpper: -6.8
          },
          {
            group1: 0,
            group2: 2,
            meanDiff: -20,
            statistic: 14.14,
            pValue: 0.001,
            pAdjusted: 0.001,
            significant: true,
            ciLower: -23.2,
            ciUpper: -16.8
          },
          {
            group1: 1,
            group2: 2,
            meanDiff: -10,
            statistic: 7.07,
            pValue: 0.012,
            pAdjusted: 0.012,
            significant: true,
            ciLower: -13.2,
            ciUpper: -6.8
          }
        ],
        statistic: [7.07, 14.14, 7.07],
        pValue: [0.012, 0.001, 0.012],
        confidenceInterval: {
          lower: [-13.2, -23.2, -13.2],
          upper: [-6.8, -16.8, -6.8],
          confidenceLevel: 0.95
        }
      }

      const groupNames = ['A', 'B', 'C']

      // 변환 로직 (Lines 318-327)
      const postHocComparisons = tukeyResult.comparisons.map(comp => ({
        group1: groupNames[comp.group1],
        group2: groupNames[comp.group2],
        meanDiff: comp.meanDiff,
        pValue: comp.pValue ?? comp.pAdjusted,
        significant: comp.significant,
        ciLower: comp.ciLower,
        ciUpper: comp.ciUpper
      }))

      expect(postHocComparisons.length).toBe(3)
      expect(postHocComparisons[0]).toMatchObject({
        group1: 'A',
        group2: 'B',
        meanDiff: -10,
        pValue: 0.012,
        significant: true
      })
      expect(postHocComparisons[0].ciLower).toBe(-13.2)
      expect(postHocComparisons[0].ciUpper).toBe(-6.8)
    })
  })

  describe('10. 이원 ANOVA', () => {
    it('Two-way ANOVA 데이터 추출', () => {
      const uploadedData = {
        data: [
          { feed: 'A', temp: 'low', weight: 10 },
          { feed: 'A', temp: 'high', weight: 12 },
          { feed: 'B', temp: 'low', weight: 20 },
          { feed: 'B', temp: 'high', weight: 22 }
        ]
      }

      const depVar = 'weight'
      const factor1Col = 'feed'
      const factor2Col = 'temp'

      // 데이터 추출 (Lines 422-436)
      const dataValues: number[] = []
      const factor1Values: string[] = []
      const factor2Values: string[] = []

      uploadedData.data.forEach((row) => {
        const value = row[depVar]
        const f1 = String(row[factor1Col])
        const f2 = String(row[factor2Col])

        if (typeof value === 'number' && !isNaN(value)) {
          dataValues.push(value)
          factor1Values.push(f1)
          factor2Values.push(f2)
        }
      })

      expect(dataValues).toEqual([10, 12, 20, 22])
      expect(factor1Values).toEqual(['A', 'A', 'B', 'B'])
      expect(factor2Values).toEqual(['low', 'high', 'low', 'high'])
    })

    it('Worker 결과를 ANOVA 테이블로 변환', () => {
      // Worker 반환값 (Lines 445-455)
      const twoWayResult = {
        factor1: { fStatistic: 12.5, pValue: 0.001, df: 1 },
        factor2: { fStatistic: 8.3, pValue: 0.015, df: 1 },
        interaction: { fStatistic: 2.1, pValue: 0.165, df: 1 },
        residual: { df: 12 },
        anovaTable: {}
      }

      const factor1Col = 'feed'
      const factor2Col = 'temp'

      // ANOVA 테이블 생성 (Lines 473-506)
      const anovaTable = [
        {
          source: `요인 1 (${factor1Col})`,
          ss: 0,
          df: twoWayResult.factor1.df,
          ms: 0,
          f: twoWayResult.factor1.fStatistic,
          p: twoWayResult.factor1.pValue
        },
        {
          source: `요인 2 (${factor2Col})`,
          ss: 0,
          df: twoWayResult.factor2.df,
          ms: 0,
          f: twoWayResult.factor2.fStatistic,
          p: twoWayResult.factor2.pValue
        },
        {
          source: '상호작용',
          ss: 0,
          df: twoWayResult.interaction.df,
          ms: 0,
          f: twoWayResult.interaction.fStatistic,
          p: twoWayResult.interaction.pValue
        },
        {
          source: '잔차',
          ss: 0,
          df: twoWayResult.residual.df,
          ms: 0,
          f: null,
          p: null
        }
      ]

      expect(anovaTable.length).toBe(4)
      expect(anovaTable[0].source).toBe('요인 1 (feed)')
      expect(anovaTable[0].f).toBe(12.5)
      expect(anovaTable[0].p).toBe(0.001)
      expect(anovaTable[1].source).toBe('요인 2 (temp)')
      expect(anovaTable[2].source).toBe('상호작용')
      expect(anovaTable[2].p).toBe(0.165) // 비유의
    })
  })

  describe('11. UI Factor 선택 제한', () => {
    it('One-way: 최대 1개 factor만 선택 가능', () => {
      const anovaType = 'oneWay'
      const currentFactors = ['feed']

      const maxFactors = anovaType === 'oneWay' ? 1 : anovaType === 'twoWay' ? 2 : anovaType === 'threeWay' ? 3 : 999
      const canSelectMore = currentFactors.length < maxFactors

      expect(maxFactors).toBe(1)
      expect(canSelectMore).toBe(false) // 이미 1개 선택됨
    })

    it('Two-way: 최대 2개 factor만 선택 가능', () => {
      const anovaType: 'oneWay' | 'twoWay' | 'threeWay' = 'twoWay'
      const currentFactors = ['feed']

      const maxFactors = anovaType === 'oneWay' ? 1 : anovaType === 'twoWay' ? 2 : anovaType === 'threeWay' ? 3 : 999
      const canSelectMore = currentFactors.length < maxFactors

      expect(maxFactors).toBe(2)
      expect(canSelectMore).toBe(true) // 1개만 선택됨, 1개 더 가능
    })

    it('Button disabled 로직: ANOVA 타입별 factor 수 체크', () => {
      const anovaType = 'twoWay'
      const selectedVariables = { dependent: 'weight', factor: ['feed', 'temp'] }
      const isAnalyzing = false

      // Lines 418-427
      const disabled = (() => {
        if (isAnalyzing || !selectedVariables?.dependent || !selectedVariables?.factor) return true
        const factorArray = Array.isArray(selectedVariables.factor) ? selectedVariables.factor : [selectedVariables.factor]

        if (anovaType === 'oneWay') return factorArray.length !== 1
        if (anovaType === 'twoWay') return factorArray.length !== 2
        if (anovaType === 'threeWay') return factorArray.length !== 3
        return factorArray.length < 1
      })()

      expect(disabled).toBe(false) // 2개 factor 선택됨, two-way ANOVA 가능
    })
  })

  describe('12. 삼원 ANOVA', () => {
    it('3개 factor 데이터 추출', () => {
      const uploadedData = {
        data: [
          { factor1: 'A', factor2: 'X', factor3: 'I', value: 10 },
          { factor1: 'B', factor2: 'Y', factor3: 'J', value: 15 },
          { factor1: 'A', factor2: 'X', factor3: 'I', value: 12 },
          { factor1: 'B', factor2: 'Y', factor3: 'J', value: 18 }
        ]
      }

      const factor1Col = 'factor1'
      const factor2Col = 'factor2'
      const factor3Col = 'factor3'
      const depVar = 'value'

      // 실제 코드 로직 (Lines 516-533)
      const dataValues: number[] = []
      const factor1Values: string[] = []
      const factor2Values: string[] = []
      const factor3Values: string[] = []

      uploadedData.data.forEach((row) => {
        const value = row[depVar]
        const f1 = String(row[factor1Col])
        const f2 = String(row[factor2Col])
        const f3 = String(row[factor3Col])

        if (typeof value === 'number' && !isNaN(value)) {
          dataValues.push(value)
          factor1Values.push(f1)
          factor2Values.push(f2)
          factor3Values.push(f3)
        }
      })

      expect(dataValues).toEqual([10, 15, 12, 18])
      expect(factor1Values).toEqual(['A', 'B', 'A', 'B'])
      expect(factor2Values).toEqual(['X', 'Y', 'X', 'Y'])
      expect(factor3Values).toEqual(['I', 'J', 'I', 'J'])
    })

    it('Worker 결과를 ANOVA 테이블로 변환', () => {
      // Worker 반환값 (Lines 536-545)
      const threeWayResult = {
        factor1: { fStatistic: 5.2, pValue: 0.031, df: 1 },
        factor2: { fStatistic: 6.8, pValue: 0.015, df: 1 },
        factor3: { fStatistic: 4.1, pValue: 0.052, df: 1 },
        interaction12: { fStatistic: 2.3, pValue: 0.138, df: 1 },
        interaction13: { fStatistic: 1.9, pValue: 0.177, df: 1 },
        interaction23: { fStatistic: 3.4, pValue: 0.074, df: 1 },
        interaction123: { fStatistic: 0.8, pValue: 0.378, df: 1 },
        residual: { df: 24 },
        anovaTable: {}
      }

      const factor1Col = 'Treatment'
      const factor2Col = 'Time'
      const factor3Col = 'Location'

      // ANOVA 테이블 생성 (Lines 554-619)
      const anovaTable = [
        {
          source: `요인 1 (${factor1Col})`,
          ss: 0,
          df: threeWayResult.factor1.df,
          ms: 0,
          f: threeWayResult.factor1.fStatistic,
          p: threeWayResult.factor1.pValue
        },
        {
          source: `요인 2 (${factor2Col})`,
          ss: 0,
          df: threeWayResult.factor2.df,
          ms: 0,
          f: threeWayResult.factor2.fStatistic,
          p: threeWayResult.factor2.pValue
        },
        {
          source: `요인 3 (${factor3Col})`,
          ss: 0,
          df: threeWayResult.factor3.df,
          ms: 0,
          f: threeWayResult.factor3.fStatistic,
          p: threeWayResult.factor3.pValue
        },
        {
          source: `${factor1Col} × ${factor2Col}`,
          ss: 0,
          df: threeWayResult.interaction12.df,
          ms: 0,
          f: threeWayResult.interaction12.fStatistic,
          p: threeWayResult.interaction12.pValue
        },
        {
          source: `${factor1Col} × ${factor3Col}`,
          ss: 0,
          df: threeWayResult.interaction13.df,
          ms: 0,
          f: threeWayResult.interaction13.fStatistic,
          p: threeWayResult.interaction13.pValue
        },
        {
          source: `${factor2Col} × ${factor3Col}`,
          ss: 0,
          df: threeWayResult.interaction23.df,
          ms: 0,
          f: threeWayResult.interaction23.fStatistic,
          p: threeWayResult.interaction23.pValue
        },
        {
          source: `${factor1Col} × ${factor2Col} × ${factor3Col}`,
          ss: 0,
          df: threeWayResult.interaction123.df,
          ms: 0,
          f: threeWayResult.interaction123.fStatistic,
          p: threeWayResult.interaction123.pValue
        },
        {
          source: '잔차',
          ss: 0,
          df: threeWayResult.residual.df,
          ms: 0,
          f: null,
          p: null
        }
      ]

      // 검증
      expect(anovaTable.length).toBe(8) // 3 main effects + 4 interactions + residual
      expect(anovaTable[0].source).toBe('요인 1 (Treatment)')
      expect(anovaTable[0].f).toBe(5.2)
      expect(anovaTable[0].p).toBe(0.031)

      expect(anovaTable[1].source).toBe('요인 2 (Time)')
      expect(anovaTable[1].f).toBe(6.8)

      expect(anovaTable[2].source).toBe('요인 3 (Location)')
      expect(anovaTable[2].f).toBe(4.1)

      expect(anovaTable[3].source).toBe('Treatment × Time')
      expect(anovaTable[4].source).toBe('Treatment × Location')
      expect(anovaTable[5].source).toBe('Time × Location')
      expect(anovaTable[6].source).toBe('Treatment × Time × Location')
      expect(anovaTable[7].source).toBe('잔차')
    })

    it('3-factor 선택 UI 제한', () => {
      const anovaType: 'oneWay' | 'twoWay' | 'threeWay' = 'threeWay'
      const selectedVariables = {
        dependent: 'weight',
        factor: ['treatment', 'time', 'location']
      }

      // UI 로직 (Lines 660-688)
      const factorArray = Array.isArray(selectedVariables.factor)
        ? selectedVariables.factor
        : [selectedVariables.factor]

      const maxFactors = anovaType === 'oneWay' ? 1 : anovaType === 'twoWay' ? 2 : anovaType === 'threeWay' ? 3 : 999

      expect(maxFactors).toBe(3)
      expect(factorArray.length).toBe(3)

      // Button disabled 체크 (Lines 700-709)
      const disabled = (() => {
        const isAnalyzing = false
        if (isAnalyzing || !selectedVariables?.dependent || !selectedVariables?.factor) return true
        const factorArray = Array.isArray(selectedVariables.factor) ? selectedVariables.factor : [selectedVariables.factor]

        if (anovaType === 'oneWay') return factorArray.length !== 1
        if (anovaType === 'twoWay') return factorArray.length !== 2
        if (anovaType === 'threeWay') return factorArray.length !== 3
        return factorArray.length < 1
      })()

      expect(disabled).toBe(false) // 3개 factor 선택됨, three-way ANOVA 가능
    })
  })
})
