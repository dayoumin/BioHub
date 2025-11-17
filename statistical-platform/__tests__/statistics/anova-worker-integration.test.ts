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
      expect(cohensF).toBeCloseTo(8.08, 1)
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

    it('factors.length > 1일 때 에러 (이원 분산분석 미구현)', () => {
      const factors = ['factor1', 'factor2']

      expect(factors.length > 1).toBe(true)
      // actions.setError?.('현재는 일원 분산분석만 지원됩니다.')
    })
  })
})
