/**
 * 새로 구현된 7개 통계 메서드 테스트 스위트
 *
 * 테스트 대상:
 * - twoWayANOVA (이원분산분석)
 * - performTukeyHSD (Tukey HSD 사후검정)
 * - performBonferroni (Bonferroni 보정)
 * - multipleRegression (다중회귀분석)
 * - logisticRegression (로지스틱 회귀)
 * - dunnTest (Dunn 비모수 검정)
 * - gamesHowellTest (Games-Howell 검정)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

// Pyodide 서비스 인스턴스
let pyodideService: PyodideStatisticsService

// 테스트 설정
const TOLERANCE = 0.01 // 허용 오차 (1%)
const INIT_TIMEOUT = 60000 // Pyodide 초기화 타임아웃 (60초)

describe.skip('새로 구현된 통계 메서드 테스트', () => {
  // Pyodide 초기화
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
  // 1. 이원분산분석 (Two-way ANOVA)
  // ==========================================================================
  describe.skip('이원분산분석 (Two-way ANOVA)', () => {
    test('2x3 디자인 이원분산분석', async () => {
      // 테스트 데이터: 2개 요인 (성별 x 치료법)
      const data = [
        { factor1: 'Male', factor2: 'A', value: 23.5 },
        { factor1: 'Male', factor2: 'B', value: 25.8 },
        { factor1: 'Male', factor2: 'C', value: 22.1 },
        { factor1: 'Female', factor2: 'A', value: 21.2 },
        { factor1: 'Female', factor2: 'B', value: 28.5 },
        { factor1: 'Female', factor2: 'C', value: 24.3 },
        { factor1: 'Male', factor2: 'A', value: 24.1 },
        { factor1: 'Male', factor2: 'B', value: 26.2 },
        { factor1: 'Male', factor2: 'C', value: 21.8 },
        { factor1: 'Female', factor2: 'A', value: 20.8 },
        { factor1: 'Female', factor2: 'B', value: 29.1 },
        { factor1: 'Female', factor2: 'C', value: 23.9 },
      ]

      const result = await pyodideService.twoWayANOVA(data, true)

      // 기본 검증
      expect(result).toBeDefined()
      expect(result.factor1_f).toBeDefined()
      expect(result.factor2_f).toBeDefined()
      expect(result.interaction_f).toBeDefined()

      // F-통계량이 양수인지 검증
      expect(result.factor1_f).toBeGreaterThanOrEqual(0)
      expect(result.factor2_f).toBeGreaterThanOrEqual(0)
      expect(result.interaction_f).toBeGreaterThanOrEqual(0)

      // p-value가 0과 1 사이인지 검증
      expect(result.factor1_p).toBeGreaterThanOrEqual(0)
      expect(result.factor1_p).toBeLessThanOrEqual(1)
    })
  })

  // ==========================================================================
  // 2. Tukey HSD 사후검정
  // ==========================================================================
  describe.skip('Tukey HSD 사후검정', () => {
    test('3개 그룹 Tukey HSD', async () => {
      const groups = [
        [23.5, 24.1, 22.8, 23.9, 24.5], // Group 1
        [26.8, 27.2, 26.5, 27.8, 26.9], // Group 2
        [21.2, 20.8, 21.5, 20.9, 21.1], // Group 3
      ]
      const groupNames = ['Control', 'Treatment A', 'Treatment B']

      const result = await pyodideService.performTukeyHSD(groups, groupNames, 0.05)

      // 기본 검증
      expect(result).toBeDefined()
      expect(result.comparisons).toBeDefined()
      expect(Array.isArray(result.comparisons)).toBe(true)

      // 3개 그룹 = 3개 비교 (3C2)
      expect(result.comparisons.length).toBe(3)

      // 각 비교 결과 검증
      result.comparisons.forEach(comp => {
        expect(comp.group1).toBeDefined()
        expect(comp.group2).toBeDefined()
        expect(comp.meandiff).toBeDefined()
        expect(comp.pvalue).toBeGreaterThanOrEqual(0)
        expect(comp.pvalue).toBeLessThanOrEqual(1)
        expect(typeof comp.reject).toBe('boolean')
      })
    })
  })

  // ==========================================================================
  // 3. Bonferroni 보정
  // ==========================================================================
  describe.skip('Bonferroni 보정', () => {
    test('다중비교 Bonferroni 보정', async () => {
      const groups = [
        [10.2, 10.5, 9.8, 10.1, 10.3],
        [12.5, 12.8, 12.2, 12.6, 12.4],
        [11.1, 10.9, 11.3, 11.0, 11.2],
      ]
      const groupNames = ['Low', 'High', 'Medium']

      const result = await pyodideService.performBonferroni(groups, groupNames, 0.05)

      expect(result).toBeDefined()
      expect(result.comparisons).toBeDefined()
      expect(result.num_comparisons).toBe(3)
      expect(result.adjusted_alpha).toBe(0.05 / 3)

      // 보정된 p-value 검증
      result.comparisons.forEach(comp => {
        expect(comp.adjusted_p).toBeGreaterThanOrEqual(comp.p_value)
        expect(comp.adjusted_p).toBeLessThanOrEqual(1)
      })
    })
  })

  // ==========================================================================
  // 4. 다중회귀분석
  // ==========================================================================
  describe.skip('다중회귀분석', () => {
    test('3개 독립변수 다중회귀', async () => {
      // X: 독립변수 (나이, 경력, 교육수준)
      const X = [
        [25, 2, 16],
        [30, 5, 18],
        [35, 8, 20],
        [40, 12, 16],
        [28, 4, 18],
        [33, 6, 20],
        [38, 10, 22],
        [45, 15, 18],
      ]

      // Y: 종속변수 (연봉)
      const y = [45000, 55000, 65000, 70000, 52000, 60000, 72000, 80000]

      const variableNames = ['Age', 'Experience', 'Education']

      const result = await pyodideService.multipleRegression(X, y, variableNames)

      expect(result).toBeDefined()
      expect(result.r_squared).toBeDefined()
      expect(result.adj_r_squared).toBeDefined()
      expect(result.f_statistic).toBeDefined()
      expect(result.coefficients).toBeDefined()

      // R² 값 범위 검증
      expect(result.r_squared).toBeGreaterThanOrEqual(0)
      expect(result.r_squared).toBeLessThanOrEqual(1)

      // 계수 개수 검증 (절편 + 3개 변수)
      expect(result.coefficients.length).toBe(4)
    })
  })

  // ==========================================================================
  // 5. 로지스틱 회귀
  // ==========================================================================
  describe.skip('로지스틱 회귀', () => {
    test('이진 분류 로지스틱 회귀', async () => {
      // X: 독립변수 (공부시간, 출석률)
      const X = [
        [2, 60], [3, 70], [5, 85], [1, 50],
        [4, 80], [6, 90], [2, 55], [5, 88],
        [3, 65], [4, 75], [7, 95], [1, 45],
      ]

      // Y: 종속변수 (합격 여부: 0 또는 1)
      const y = [0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0]

      const variableNames = ['StudyHours', 'Attendance']

      const result = await pyodideService.logisticRegression(X, y, variableNames)

      expect(result).toBeDefined()
      expect(result.accuracy).toBeDefined()
      expect(result.auc).toBeDefined()
      expect(result.coefficients).toBeDefined()

      // 정확도와 AUC 범위 검증
      expect(result.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.accuracy).toBeLessThanOrEqual(1)
      expect(result.auc).toBeGreaterThanOrEqual(0)
      expect(result.auc).toBeLessThanOrEqual(1)
    })
  })

  // ==========================================================================
  // 6. Dunn Test (비모수 사후검정)
  // ==========================================================================
  describe.skip('Dunn Test', () => {
    test('Kruskal-Wallis 후 Dunn Test', async () => {
      const groups = [
        [12, 14, 11, 15, 13],
        [18, 20, 17, 19, 21],
        [14, 15, 13, 16, 14],
        [22, 24, 23, 25, 21],
      ]
      const groupNames = ['G1', 'G2', 'G3', 'G4']

      const result = await pyodideService.dunnTest(groups, groupNames, 'holm', 0.05)

      expect(result).toBeDefined()
      expect(result.comparisons).toBeDefined()

      // 4개 그룹 = 6개 비교 (4C2)
      expect(result.comparisons.length).toBe(6)

      // 각 비교 결과 검증
      result.comparisons.forEach(comp => {
        expect(comp.z_statistic).toBeDefined()
        expect(comp.p_value).toBeGreaterThanOrEqual(0)
        expect(comp.p_value).toBeLessThanOrEqual(1)
        expect(comp.p_adjusted).toBeGreaterThanOrEqual(comp.p_value)
      })
    })
  })

  // ==========================================================================
  // 7. Games-Howell Test
  // ==========================================================================
  describe.skip('Games-Howell Test', () => {
    test('등분산 가정 없는 사후검정', async () => {
      const groups = [
        [10, 11, 9, 10.5, 9.5],      // 낮은 분산
        [15, 25, 18, 22, 20],         // 높은 분산
        [12, 12.5, 11.8, 12.2, 11.9], // 낮은 분산
      ]
      const groupNames = ['Low Var', 'High Var', 'Medium Var']

      const result = await pyodideService.gamesHowellTest(groups, groupNames, 0.05)

      expect(result).toBeDefined()
      expect(result.comparisons).toBeDefined()

      // 3개 그룹 = 3개 비교
      expect(result.comparisons.length).toBe(3)

      // 각 비교 결과 검증
      result.comparisons.forEach(comp => {
        expect(comp.group1).toBeDefined()
        expect(comp.group2).toBeDefined()
        expect(comp.t_statistic).toBeDefined()
        expect(comp.df).toBeGreaterThan(0)
        expect(comp.p_value).toBeGreaterThanOrEqual(0)
        expect(comp.p_value).toBeLessThanOrEqual(1)
      })
    })
  })

  // ==========================================================================
  // 통합 테스트: 전체 분석 플로우
  // ==========================================================================
  describe.skip('통합 분석 플로우', () => {
    test('ANOVA → 사후검정 전체 플로우', async () => {
      const groups = [
        [65, 70, 68, 72, 67],
        [75, 78, 82, 79, 80],
        [55, 58, 60, 57, 59],
        [70, 73, 71, 74, 72],
      ]

      // Step 1: 일원분산분석
      const anovaResult = await pyodideService.oneWayANOVA(groups)
      expect(anovaResult).toBeDefined()
      expect(anovaResult.pValue).toBeDefined()

      // Step 2: p < 0.05이면 사후검정
      if (anovaResult.pValue < 0.05) {
        // Tukey HSD
        const tukeyResult = await pyodideService.performTukeyHSD(
          groups,
          ['G1', 'G2', 'G3', 'G4'],
          0.05
        )
        expect(tukeyResult.comparisons).toBeDefined()

        // Games-Howell (등분산 가정 없음)
        const ghResult = await pyodideService.gamesHowellTest(
          groups,
          ['G1', 'G2', 'G3', 'G4'],
          0.05
        )
        expect(ghResult.comparisons).toBeDefined()

        // 두 방법의 비교 수가 같은지 확인
        expect(tukeyResult.comparisons.length).toBe(ghResult.comparisons.length)
      }
    })
  })
})