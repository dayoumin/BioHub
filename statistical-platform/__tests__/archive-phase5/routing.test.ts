/**
 * 8개 카테고리 라우팅 테스트
 */

import { STATISTICAL_ANALYSIS_CONFIG } from '@/lib/statistics/ui-config'

describe('통계 카테고리 라우팅 확인', () => {
  const categories = STATISTICAL_ANALYSIS_CONFIG

  test('8개 카테고리가 존재해야 함', () => {
    expect(categories.length).toBe(8)
  })

  test('카테고리 ID가 고유해야 함', () => {
    const ids = categories.map(c => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  test('모든 카테고리 ID 확인', () => {
    const expectedCategories = [
      'descriptive',  // 기초통계
      'hypothesis',   // 가설검정
      'anova',        // 분산분석
      'regression',   // 회귀분석
      'nonparametric', // 비모수검정
      'timeseries',   // 시계열분석
      'survival',     // 생존분석
      'multivariate'  // 다변량/기타
    ]

    const actualIds = categories.map(c => c.id)
    expect(actualIds).toEqual(expectedCategories)
  })

  test('각 카테고리별 메서드 수 확인', () => {
    const methodCounts = {
      'descriptive': 5,
      'hypothesis': 8,  // 비율검정 추가로 8개
      'anova': 8,
      'regression': 4,
      'nonparametric': 6,
      'timeseries': 4,
      'survival': 2,
      'multivariate': 4
    }

    categories.forEach(category => {
      expect(category.tests.length).toBe(methodCounts[category.id])
    })
  })

  test('모든 메서드 ID가 고유해야 함', () => {
    const allMethods: string[] = []
    categories.forEach(category => {
      category.tests.forEach(test => {
        allMethods.push(test.id)
      })
    })

    const uniqueMethods = new Set(allMethods)
    expect(uniqueMethods.size).toBe(allMethods.length)
    expect(allMethods.length).toBe(41) // 총 41개 메서드 (5+8+8+4+6+4+2+4)
  })

  test('각 메서드가 올바른 카테고리에 속해있는지 확인', () => {
    const categoryMapping = {
      // 기초통계
      'calculateDescriptiveStats': 'descriptive',
      'normalityTest': 'descriptive',
      'homogeneityTest': 'descriptive',
      'outlierDetection': 'descriptive',
      'powerAnalysis': 'descriptive',

      // 가설검정
      'oneSampleTTest': 'hypothesis',
      'twoSampleTTest': 'hypothesis',
      'pairedTTest': 'hypothesis',
      'welchTTest': 'hypothesis',
      'correlationAnalysis': 'hypothesis',
      'partialCorrelation': 'hypothesis',
      'effectSize': 'hypothesis',
      'oneSampleProportionTest': 'hypothesis',

      // 분산분석
      'oneWayANOVA': 'anova',
      'twoWayANOVA': 'anova',
      'tukeyHSD': 'anova',
      'bonferroniPostHoc': 'anova',
      'gamesHowellPostHoc': 'anova',
      'repeatedMeasuresANOVA': 'anova',
      'manova': 'anova',
      'mixedEffectsModel': 'anova',

      // 회귀분석
      'simpleLinearRegression': 'regression',
      'multipleRegression': 'regression',
      'logisticRegression': 'regression',
      'polynomialRegression': 'regression',

      // 비모수검정
      'mannWhitneyU': 'nonparametric',
      'wilcoxonSignedRank': 'nonparametric',
      'kruskalWallis': 'nonparametric',
      'dunnTest': 'nonparametric',
      'chiSquareTest': 'nonparametric',
      'friedman': 'nonparametric',

      // 시계열분석
      'timeSeriesDecomposition': 'timeseries',
      'arimaForecast': 'timeseries',
      'sarimaForecast': 'timeseries',
      'varModel': 'timeseries',

      // 생존분석
      'kaplanMeierSurvival': 'survival',
      'coxRegression': 'survival',

      // 다변량/기타
      'principalComponentAnalysis': 'multivariate',
      'kMeansClustering': 'multivariate',
      'hierarchicalClustering': 'multivariate',
      'factorAnalysis': 'multivariate'
    }

    Object.entries(categoryMapping).forEach(([methodId, expectedCategory]) => {
      const actualCategory = categories.find(c =>
        c.tests.some(t => t.id === methodId)
      )
      expect(actualCategory?.id).toBe(expectedCategory)
    })
  })

  test('라우팅 URL 형식 확인', () => {
    categories.forEach(category => {
      category.tests.forEach(test => {
        const expectedUrl = `/analysis/${category.id}/${encodeURIComponent(test.id)}`
        expect(expectedUrl).toMatch(/^\/analysis\/[a-z]+\/[a-zA-Z]+$/)
      })
    })
  })
})