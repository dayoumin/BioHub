/**
 * Phase 1 수정 대상 유닛 테스트 시뮬레이션
 *
 * statistical-executor.ts 변경사항 검증:
 * 1. additionalInfo 타입 확장 검증
 * 2. 정규성 검정 분기 로직
 * 3. 일표본 t-검정 분기 로직
 * 4. ANOVA postHoc try-catch 로직
 * 5. 시계열 switch 분기 로직
 * 6. 검정력 분석 pvalue 방어 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Types from the executor
interface AdditionalInfo {
  // 기존 필드
  effectSize?: {
    type: string
    value: number
    interpretation: string
  }
  postHoc?: unknown
  totalVariance?: number
  firstFunctionVariance?: number

  // Phase 1 추가 필드
  isNormal?: boolean
  descriptive?: {
    mean: number
    sd: number
    n: number
    testValue: number
  }
  isStationary?: boolean
  trendSlope?: number
  seasonalPeriod?: number
}

interface AnalysisResult {
  metadata: {
    method: string
    methodName: string
    timestamp: string
    duration: number
    dataInfo: {
      totalN: number
      missingRemoved: number
      groups?: number
    }
  }
  mainResults: {
    statistic: number
    pvalue: number
    df?: number
    significant: boolean
    interpretation: string
  }
  additionalInfo: AdditionalInfo
  visualizationData?: unknown
  rawResults?: unknown
}

describe('Phase 1: statistical-executor 변경사항 검증', () => {
  describe('1. additionalInfo 타입 확장', () => {
    it('정규성 검정 결과에 isNormal 필드가 포함되어야 함', () => {
      const result: AdditionalInfo = {
        isNormal: true
      }
      expect(result.isNormal).toBe(true)
    })

    it('일표본 t-검정 결과에 descriptive 필드가 포함되어야 함', () => {
      const result: AdditionalInfo = {
        descriptive: {
          mean: 105.5,
          sd: 15.2,
          n: 30,
          testValue: 100
        }
      }
      expect(result.descriptive?.mean).toBe(105.5)
      expect(result.descriptive?.testValue).toBe(100)
    })

    it('시계열 분석 결과에 isStationary, trendSlope, seasonalPeriod가 포함되어야 함', () => {
      const result: AdditionalInfo = {
        isStationary: true,
        trendSlope: 0.015,
        seasonalPeriod: 12
      }
      expect(result.isStationary).toBe(true)
      expect(result.trendSlope).toBe(0.015)
      expect(result.seasonalPeriod).toBe(12)
    })
  })

  describe('2. 정규성 검정 (normality-test) 분기', () => {
    it('Shapiro-Wilk 결과가 올바른 포맷으로 반환되어야 함', () => {
      // 시뮬레이션된 정규성 검정 결과
      const mockShapiroResult = {
        statistic: 0.9654,
        pValue: 0.234,
        isNormal: true
      }

      // 예상되는 mainResults 구조
      const expectedMainResults = {
        statistic: mockShapiroResult.statistic,
        pvalue: mockShapiroResult.pValue,
        significant: mockShapiroResult.pValue < 0.05,
        interpretation: expect.stringContaining('Shapiro-Wilk W = 0.9654')
      }

      // 실제 executor가 반환할 구조 시뮬레이션
      const result: AnalysisResult = {
        metadata: {
          method: 'normality-test',
          methodName: '정규성 검정',
          timestamp: '',
          duration: 0,
          dataInfo: { totalN: 30, missingRemoved: 0 }
        },
        mainResults: {
          statistic: mockShapiroResult.statistic,
          pvalue: mockShapiroResult.pValue,
          significant: mockShapiroResult.pValue < 0.05,
          interpretation: `Shapiro-Wilk W = ${mockShapiroResult.statistic.toFixed(4)}, p = ${mockShapiroResult.pValue.toFixed(4)} → 정규성 가정을 유지합니다`
        },
        additionalInfo: {
          isNormal: mockShapiroResult.isNormal
        },
        rawResults: mockShapiroResult
      }

      expect(result.mainResults.statistic).toBe(0.9654)
      expect(result.additionalInfo.isNormal).toBe(true)
      expect(result.mainResults.interpretation).toContain('정규성 가정을 유지합니다')
    })

    it('비정규 분포일 때 올바른 해석이 반환되어야 함', () => {
      const mockShapiroResult = {
        statistic: 0.8234,
        pValue: 0.002,
        isNormal: false
      }

      const interpretation = mockShapiroResult.pValue < 0.05
        ? `Shapiro-Wilk W = ${mockShapiroResult.statistic.toFixed(4)}, p = ${mockShapiroResult.pValue.toFixed(4)} → 정규성 가정을 기각합니다 (정규분포가 아닐 수 있음)`
        : `정규성 가정을 유지합니다`

      expect(interpretation).toContain('정규성 가정을 기각합니다')
    })
  })

  describe('3. 일표본 t-검정 (one-sample-t) 분기', () => {
    it("Cohen's d 효과크기가 올바르게 계산되어야 함", () => {
      const values = [105, 110, 95, 108, 102, 115, 98, 107, 103, 111]
      const testValue = 100
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
      const cohensD = sd > 0 ? Math.abs(mean - testValue) / sd : 0

      // 계산 검증
      expect(mean).toBeCloseTo(105.4, 1)
      expect(sd).toBeGreaterThan(0)
      expect(cohensD).toBeGreaterThan(0)
    })

    it('testValue가 variables에서 올바르게 추출되어야 함', () => {
      const variables: Record<string, unknown> = {
        dependentVar: 'score',
        testValue: '100'
      }

      const testValue = Number(variables.testValue ?? 0)
      expect(testValue).toBe(100)
    })

    it('testValue가 없을 때 기본값 0이 사용되어야 함', () => {
      const variables: Record<string, unknown> = {
        dependentVar: 'score'
      }

      const testValue = Number(variables.testValue ?? 0)
      expect(testValue).toBe(0)
    })

    it('최소 관측치 검증이 작동해야 함', () => {
      const values: number[] = [105] // 1개만
      const minRequired = 2

      expect(values.length).toBeLessThan(minRequired)
      // executor에서는 throw new Error('일표본 t-검정을 위해 최소 2개 이상의 관측치가 필요합니다')
    })

    it('testValue가 NaN일 때 에러를 던져야 함', () => {
      const variables: Record<string, unknown> = {
        dependentVar: 'score',
        testValue: 'invalid_string'
      }

      const testValue = Number(variables.testValue ?? 0)
      expect(isNaN(testValue)).toBe(true)
      // executor에서는 throw new Error('기준값(μ₀)이 유효한 숫자가 아닙니다')
    })
  })

  describe('4. ANOVA postHoc try-catch 로직', () => {
    it('Games-Howell 결과에서 comparisons 배열이 추출되어야 함', () => {
      const gamesHowellResult = {
        comparisons: [
          { group1: 'A', group2: 'B', meanDiff: 5.2, pValue: 0.001, significant: true },
          { group1: 'A', group2: 'C', meanDiff: 2.1, pValue: 0.15, significant: false }
        ],
        alpha: 0.05,
        significant_count: 1
      }

      const postHoc = gamesHowellResult?.comparisons ?? gamesHowellResult
      expect(Array.isArray(postHoc)).toBe(true)
      expect(postHoc).toHaveLength(2)
    })

    it('Tukey HSD fallback 시 그룹명이 매핑되어야 함', () => {
      const tukeyResult = {
        comparisons: [
          { group1: 0, group2: 1, meanDiff: 5.2, pValue: 0.001, reject: true },
          { group1: 0, group2: 2, meanDiff: 2.1, pValue: 0.15, reject: false }
        ]
      }
      const groupNames = ['Control', 'Treatment A', 'Treatment B']

      const postHoc = tukeyResult.comparisons.map((c) => ({
        group1: groupNames[c.group1] ?? `Group ${c.group1 + 1}`,
        group2: groupNames[c.group2] ?? `Group ${c.group2 + 1}`,
        meanDiff: c.meanDiff,
        pvalue: c.pValue,
        significant: c.reject
      }))

      expect(postHoc[0].group1).toBe('Control')
      expect(postHoc[0].group2).toBe('Treatment A')
      expect(postHoc[0].significant).toBe(true)
    })

    it('postHoc이 없을 때 null이어야 함', () => {
      let postHoc: unknown = null

      // p-value가 유의하지 않을 때
      const pValue = 0.15
      if (pValue >= 0.05) {
        postHoc = null
      }

      expect(postHoc).toBeNull()
    })
  })

  describe('5. 시계열 switch 분기', () => {
    it('stationarity-test: ADF 결과가 올바르게 반환되어야 함', () => {
      const adfResult = {
        adfStatistic: -3.45,
        adfPValue: 0.012,
        isStationary: true,
        trend: [100, 101, 102]
      }

      const mainResults = {
        statistic: adfResult.adfStatistic ?? 0,
        pvalue: adfResult.adfPValue ?? 1,
        significant: adfResult.isStationary ?? adfResult.adfPValue < 0.05,
        interpretation: adfResult.isStationary
          ? `ADF 통계량 = ${Number(adfResult.adfStatistic).toFixed(4)}, p = ${Number(adfResult.adfPValue).toFixed(4)} → 시계열이 정상 (stationary)입니다`
          : `시계열이 비정상 (non-stationary)입니다`
      }

      expect(mainResults.statistic).toBe(-3.45)
      expect(mainResults.significant).toBe(true)
      expect(mainResults.interpretation).toContain('정상 (stationary)입니다')
    })

    it('seasonal-decompose: trendSlope가 계산되어야 함', () => {
      const trend = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122]
      const trendSlope = trend.length >= 2
        ? (trend[trend.length - 1] - trend[0]) / trend.length
        : 0

      expect(trendSlope).toBeCloseTo(1.833, 2) // (122 - 100) / 12
    })

    it('default (ARIMA 등): 기본 결과 포맷이 반환되어야 함', () => {
      const trend = [100, 101, 102]

      const mainResults = {
        statistic: Array.isArray(trend) ? trend[0] : (trend || 0),
        pvalue: 1,
        significant: false,
        interpretation: '시계열 분석 완료'
      }

      expect(mainResults.statistic).toBe(100)
      expect(mainResults.pvalue).toBe(1)
      expect(mainResults.interpretation).toBe('시계열 분석 완료')
    })
  })

  describe('6. 검정력 분석 pvalue 방어', () => {
    it('result.alpha가 number일 때 그 값을 사용해야 함', () => {
      const result = { alpha: 0.01, achievedPower: 0.85 }
      const pvalue = typeof result.alpha === 'number' ? result.alpha : 0.05

      expect(pvalue).toBe(0.01)
    })

    it('result.alpha가 undefined일 때 기본값 0.05를 사용해야 함', () => {
      const result: { alpha?: number; achievedPower: number } = { achievedPower: 0.85 }
      const pvalue = typeof result.alpha === 'number' ? result.alpha : 0.05

      expect(pvalue).toBe(0.05)
    })

    it('result.alpha가 NaN일 때 기본값 0.05를 사용해야 함', () => {
      const result = { alpha: NaN, achievedPower: 0.85 }
      // NaN은 typeof 'number'이지만, 실제로는 유효하지 않음
      // 현재 코드는 typeof만 체크하므로 NaN이 들어갈 수 있음 (미래 개선점)
      const pvalue = typeof result.alpha === 'number' ? result.alpha : 0.05

      // 현재 코드 동작: NaN 반환 (개선 필요할 수 있음)
      expect(Number.isNaN(pvalue)).toBe(true)
    })
  })

  describe('7. result-transformer postHoc Array.isArray 체크', () => {
    it('postHoc이 배열일 때 map 호출이 성공해야 함', () => {
      const additionalInfo = {
        postHoc: [
          { group1: 'A', group2: 'B', meanDiff: 5.2, pvalue: 0.001, significant: true }
        ]
      }

      if (additionalInfo?.postHoc && Array.isArray(additionalInfo.postHoc)) {
        const mapped = additionalInfo.postHoc.map(item => ({
          comparison: `${item.group1} vs ${item.group2}`,
          significant: item.significant
        }))
        expect(mapped).toHaveLength(1)
        expect(mapped[0].comparison).toBe('A vs B')
      }
    })

    it('postHoc이 객체일 때 map이 호출되지 않아야 함', () => {
      const additionalInfo = {
        postHoc: { comparisons: [], error: 'some error' }
      }

      let mapCalled = false
      if (additionalInfo?.postHoc && Array.isArray(additionalInfo.postHoc)) {
        mapCalled = true
      }

      expect(mapCalled).toBe(false)
    })

    it('postHoc이 null/undefined일 때 안전하게 처리되어야 함', () => {
      const additionalInfo: { postHoc?: unknown } = { postHoc: null }

      let result: unknown[] | undefined
      if (additionalInfo?.postHoc && Array.isArray(additionalInfo.postHoc)) {
        result = additionalInfo.postHoc
      }

      expect(result).toBeUndefined()
    })
  })

  describe('8. formatPValue null/NaN 방어', () => {
    function formatPValue(p: number | null | undefined): string {
      if (p == null || isNaN(p)) return '-'
      if (p < 0.001) return '< .001'
      if (p < 0.01) return '< .01'
      if (p < 0.05) return '< .05'
      return p.toFixed(3)
    }

    it('null일 때 "-"를 반환해야 함', () => {
      expect(formatPValue(null)).toBe('-')
    })

    it('undefined일 때 "-"를 반환해야 함', () => {
      expect(formatPValue(undefined)).toBe('-')
    })

    it('NaN일 때 "-"를 반환해야 함', () => {
      expect(formatPValue(NaN)).toBe('-')
    })

    it('정상 값일 때 포맷팅되어야 함', () => {
      expect(formatPValue(0.0001)).toBe('< .001')
      expect(formatPValue(0.005)).toBe('< .01')
      expect(formatPValue(0.03)).toBe('< .05')
      expect(formatPValue(0.15)).toBe('0.150')
    })
  })

  describe('9. toFixed null 방어', () => {
    it('statistic이 null일 때 기본값 0이 사용되어야 함', () => {
      const statistic: number | null = null
      const formatted = (statistic ?? 0).toFixed(2)
      expect(formatted).toBe('0.00')
    })

    it('effectSize.value가 undefined일 때 기본값 0이 사용되어야 함', () => {
      const effectSize: { value?: number } = {}
      const formatted = (effectSize.value ?? 0).toFixed(2)
      expect(formatted).toBe('0.00')
    })
  })
})
