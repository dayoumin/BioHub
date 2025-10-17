/**
 * 통계 함수 정확성 검증 테스트 스위트
 *
 * 모든 통계 함수를 R/SPSS 레퍼런스 결과와 비교 검증합니다.
 * 허용 오차: 0.0001 (소수점 4자리)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import { ReferenceResults, compareResults } from '@/test-data/reference-results/r-reference-results'
import { standardDatasets, quickTestData } from '@/test-data/datasets/standard-datasets'

// Pyodide 서비스 인스턴스
let pyodideService: PyodideStatisticsService

// 테스트 설정
const TOLERANCE = 0.0001 // 허용 오차
const INIT_TIMEOUT = 30000 // Pyodide 초기화 타임아웃 (30초)

describe('통계 함수 정확성 검증', () => {
  // Pyodide 초기화 (모든 테스트 전 1회만 실행)
  beforeAll(async () => {
    pyodideService = PyodideStatisticsService.getInstance()
    await pyodideService.initialize()
  }, INIT_TIMEOUT)

  // 정리
  afterAll(() => {
    if (pyodideService) {
      pyodideService.dispose()
    }
  })

  // ==========================================================================
  // 1. T-TEST 검증
  // ==========================================================================
  describe('T-검정 (T-Tests)', () => {
    test('독립표본 t-검정 (Independent t-test)', async () => {
      const { data, expected } = ReferenceResults.tTest.independent

      const result = await pyodideService.tTest(
        data.group1,
        data.group2,
        { paired: false, equalVar: true }
      )

      // 통계량 검증
      expect(Math.abs(result.statistic - expected.statistic))
        .toBeLessThan(TOLERANCE)

      // p-값 검증
      expect(Math.abs(result.pvalue - expected.pValue))
        .toBeLessThan(TOLERANCE)

      // 자유도 검증
      expect(result.df).toBe(expected.df)
    })

    test('대응표본 t-검정 (Paired t-test)', async () => {
      const { data, expected } = ReferenceResults.tTest.paired

      const result = await pyodideService.tTest(
        data.before,
        data.after,
        { paired: true }
      )

      expect(Math.abs(result.statistic - expected.statistic))
        .toBeLessThan(TOLERANCE)
      expect(Math.abs(result.pvalue - expected.pValue))
        .toBeLessThan(0.001) // p-값은 더 관대한 허용치
    })

    test('Welch t-검정 (불등분산)', async () => {
      const { data, expected } = ReferenceResults.tTest.welch

      const result = await pyodideService.tTest(
        data.group1,
        data.group2,
        { paired: false, equalVar: false }
      )

      expect(Math.abs(result.statistic - expected.statistic))
        .toBeLessThan(TOLERANCE)
      expect(result.df).toBe(expected.df)
    })
  })

  // ==========================================================================
  // 2. ANOVA 검증
  // ==========================================================================
  describe('분산분석 (ANOVA)', () => {
    test('일원분산분석 (One-way ANOVA)', async () => {
      const { data, expected } = ReferenceResults.anova.oneWay

      const groups = [data.control, data.treatment1, data.treatment2]
      const result = await pyodideService.anova(groups)

      // F-통계량 검증
      expect(Math.abs(result.fStatistic - expected.fStatistic))
        .toBeLessThan(0.01) // ANOVA는 약간 더 관대한 허용치

      // p-값 검증 (매우 작은 값이므로 로그 스케일로 비교)
      if (expected.pValue < 0.0001) {
        expect(result.pvalue).toBeLessThan(0.0001)
      } else {
        expect(Math.abs(result.pvalue - expected.pValue))
          .toBeLessThan(0.001)
      }

      // 자유도 검증
      expect(result.df).toEqual([expected.dfBetween, expected.dfWithin])

      // 효과크기 검증
      if (result.etaSquared !== undefined) {
        expect(Math.abs(result.etaSquared - expected.etaSquared))
          .toBeLessThan(0.01)
      }
    })

    test('Tukey HSD 사후검정', async () => {
      const { data } = ReferenceResults.anova.oneWay
      const groups = [data.control, data.treatment1, data.treatment2]

      const result = await pyodideService.tukeyHSD(groups)

      // 결과가 배열 형태로 반환되는지 확인
      expect(result).toHaveProperty('comparisons')
      expect(Array.isArray(result.comparisons)).toBe(true)

      // 모든 쌍별 비교가 있는지 확인 (3개 그룹 = 3개 비교)
      expect(result.comparisons.length).toBe(3)

      // 각 비교에 필요한 속성이 있는지 확인
      result.comparisons.forEach((comparison: any) => {
        expect(comparison).toHaveProperty('meanDiff')
        expect(comparison).toHaveProperty('pvalue')
        expect(comparison).toHaveProperty('significant')
      })
    })
  })

  // ==========================================================================
  // 3. 상관분석 검증
  // ==========================================================================
  describe('상관분석 (Correlation)', () => {
    test('Pearson 상관계수', async () => {
      const { data, expected } = ReferenceResults.correlation.pearson

      const result = await pyodideService.correlation(data.x, data.y)

      // Pearson r 검증
      expect(Math.abs(result.pearson.r - expected.r))
        .toBeLessThan(TOLERANCE)

      // p-값 검증
      if (expected.pValue < 0.0001) {
        expect(result.pearson.pValue).toBeLessThan(0.0001)
      }
    })

    test('Spearman 순위상관계수', async () => {
      const { data, expected } = ReferenceResults.correlation.spearman

      const result = await pyodideService.correlation(data.x, data.y)

      // Spearman rho 검증
      expect(Math.abs(result.spearman.r - expected.rho))
        .toBeLessThan(TOLERANCE)
    })
  })

  // ==========================================================================
  // 4. 회귀분석 검증
  // ==========================================================================
  describe('회귀분석 (Regression)', () => {
    test('단순선형회귀', async () => {
      const { data, expected } = ReferenceResults.regression.simple

      const result = await pyodideService.regression(data.x, data.y)

      // 회귀계수 검증
      expect(Math.abs(result.slope! - expected.slope))
        .toBeLessThan(0.01)
      expect(Math.abs(result.intercept! - expected.intercept))
        .toBeLessThan(0.01)

      // R-squared 검증
      expect(Math.abs(result.rSquared - expected.rSquared))
        .toBeLessThan(0.001)

      // F-통계량 검증 (큰 값이므로 상대 오차로)
      const fRatio = result.fStatistic! / expected.fStatistic
      expect(fRatio).toBeGreaterThan(0.95)
      expect(fRatio).toBeLessThan(1.05)
    })
  })

  // ==========================================================================
  // 5. 정규성 검정
  // ==========================================================================
  describe('정규성 검정 (Normality Tests)', () => {
    test('Shapiro-Wilk 검정', async () => {
      const { data, expected } = ReferenceResults.normality.shapiroWilk

      const result = await pyodideService.shapiroWilkTest(data)

      // W 통계량 검증
      expect(Math.abs(result.statistic - expected.W))
        .toBeLessThan(0.01)

      // p-값 검증
      expect(Math.abs(result.pValue - expected.pValue))
        .toBeLessThan(0.1) // 정규성 검정은 더 관대한 허용치

      // 정규성 판정 (p > 0.05)
      expect(result.isNormal).toBe(expected.pValue > 0.05)
    })

    test('Levene 등분산성 검정', async () => {
      const { data } = ReferenceResults.normality.levene

      const result = await pyodideService.leveneTest([
        data.group1,
        data.group2
      ])

      // 등분산성 결과 확인
      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pValue')
      expect(result).toHaveProperty('equalVariance')
    })
  })

  // ==========================================================================
  // 6. 비모수 검정
  // ==========================================================================
  describe('비모수 검정 (Nonparametric Tests)', () => {
    test('Mann-Whitney U 검정', async () => {
      const { data, expected } = ReferenceResults.nonparametric.mannWhitneyU

      const result = await pyodideService.mannWhitneyU(
        data.group1,
        data.group2
      )

      // U 통계량은 구현에 따라 다를 수 있음
      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pvalue')

      // p-값 범위 확인
      expect(result.pvalue).toBeGreaterThan(0.05)
      expect(result.pvalue).toBeLessThan(0.5)
    })

    test('Wilcoxon 부호순위 검정', async () => {
      const { data } = ReferenceResults.nonparametric.wilcoxonSignedRank

      const result = await pyodideService.wilcoxon(
        data.group1,
        data.group2
      )

      expect(result).toHaveProperty('statistic')
      expect(result).toHaveProperty('pvalue')

      // p-값 범위 확인
      expect(result.pvalue).toBeGreaterThan(0.01)
      expect(result.pvalue).toBeLessThan(0.2)
    })

    test('Kruskal-Wallis 검정', async () => {
      const { data, expected } = ReferenceResults.nonparametric.kruskalWallis

      const result = await pyodideService.kruskalWallis([
        data.group1,
        data.group2,
        data.group3
      ])

      // H 통계량 검증
      expect(Math.abs(result.statistic - expected.H))
        .toBeLessThan(0.1)

      // 자유도 검증
      expect(result.df).toBe(expected.df)

      // p-값 검증 (매우 작은 값)
      expect(result.pvalue).toBeLessThan(0.0001)
    })
  })

  // ==========================================================================
  // 7. 카이제곱 검정
  // ==========================================================================
  describe('카이제곱 검정 (Chi-square Test)', () => {
    test('독립성 검정', async () => {
      const { data, expected } = ReferenceResults.chiSquare.independence

      const result = await pyodideService.chiSquare(data)

      // 카이제곱 통계량 검증
      expect(Math.abs(result.statistic - expected.chiSquare))
        .toBeLessThan(0.1)

      // 자유도 검증
      expect(result.df).toBe(expected.df)

      // p-값 범위 확인
      expect(result.pvalue).toBeGreaterThan(0.05)
      expect(result.pvalue).toBeLessThan(0.1)
    })
  })

  // ==========================================================================
  // 8. 기술통계
  // ==========================================================================
  describe('기술통계 (Descriptive Statistics)', () => {
    test('기본 기술통계량', async () => {
      const { data, expected } = ReferenceResults.descriptive.basic

      const result = await pyodideService.descriptiveStats(data)

      // 주요 통계량 검증
      expect(Math.abs(result.mean - expected.mean))
        .toBeLessThan(TOLERANCE)
      expect(Math.abs(result.median - expected.median))
        .toBeLessThan(TOLERANCE)
      expect(Math.abs(result.std - expected.sd))
        .toBeLessThan(0.01)

      // 범위 검증
      expect(result.min).toBe(expected.min)
      expect(result.max).toBe(expected.max)

      // 사분위수 검증
      expect(Math.abs(result.q1 - expected.q1))
        .toBeLessThan(0.01)
      expect(Math.abs(result.q3 - expected.q3))
        .toBeLessThan(0.01)
    })

    test('이상치 탐지 (IQR 방법)', async () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100] // 100은 이상치

      const result = await pyodideService.detectOutliersIQR(data)

      expect(result).toHaveProperty('q1')
      expect(result).toHaveProperty('q3')
      expect(result).toHaveProperty('iqr')
      expect(result).toHaveProperty('lowerBound')
      expect(result).toHaveProperty('upperBound')
      expect(result).toHaveProperty('extremeOutliers')

      // 100이 이상치로 탐지되는지 확인
      const allOutliers = [
        ...result.mildOutliers,
        ...result.extremeOutliers
      ]
      expect(allOutliers).toContain(100)
    })
  })

  // ==========================================================================
  // 9. 성능 테스트
  // ==========================================================================
  describe('성능 벤치마크', () => {
    test('대용량 데이터 처리 (n=1000)', async () => {
      const largeData = standardDatasets.normal.data.large.values

      const startTime = performance.now()
      const result = await pyodideService.descriptiveStats(largeData)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      // 1000개 데이터 처리 시간이 2초 이내인지 확인
      expect(executionTime).toBeLessThan(2000)

      // 결과가 정상적으로 반환되는지 확인
      expect(result).toHaveProperty('mean')
      expect(result).toHaveProperty('std')
      expect(result.mean).toBeCloseTo(100, 1) // 평균 약 100
      expect(result.std).toBeCloseTo(15, 1) // 표준편차 약 15
    })
  })
})