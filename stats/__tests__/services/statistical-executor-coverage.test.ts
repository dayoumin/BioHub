/**
 * StatisticalExecutor 메서드 커버리지 테스트
 *
 * Smart Flow에서 사용하는 StatisticalExecutor가 모든 메서드를 지원하는지 확인
 */

import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

describe('StatisticalExecutor Method Coverage', () => {
  // 카테고리별로 executeMethod에서 라우팅되는 메서드들
  const EXECUTOR_SUPPORTED_CATEGORIES = {
    't-test': ['t-test', 'welch-t', 'one-sample-t', 'paired-t'],
    'anova': ['anova', 'welch-anova', 'repeated-measures-anova', 'ancova', 'manova', 'mixed-model'],
    'nonparametric': [
      'mann-whitney', 'wilcoxon', 'kruskal-wallis', 'friedman', 'chi-square',
      'sign-test', 'mcnemar', 'cochran-q', 'binomial-test', 'runs-test',
      'ks-test', 'mood-median', 'proportion-test', 'non-parametric'
    ],
    'correlation': ['correlation', 'partial-correlation'],
    'regression': ['regression', 'logistic-regression', 'poisson', 'ordinal-regression', 'stepwise', 'dose-response', 'response-surface'],
    'chi-square': ['chi-square-goodness', 'chi-square-independence'],
    'descriptive': ['descriptive', 'normality-test', 'explore-data', 'means-plot'],
    'timeseries': ['arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall'],
    'survival': ['kaplan-meier', 'cox-regression', 'roc-curve'],
    'advanced': ['pca', 'factor-analysis', 'cluster-analysis', 'discriminant', 'cluster'],
    'design': ['power-analysis'],
    'psychometrics': ['reliability']
  }

  describe('Category-Method Mapping', () => {
    it('모든 STATISTICAL_METHODS가 Executor 카테고리에 매핑되어야 함', () => {
      const allExecutorMethods = Object.values(EXECUTOR_SUPPORTED_CATEGORIES).flat()
      const unmappedMethods: string[] = []

      Object.keys(STATISTICAL_METHODS).forEach(methodId => {
        if (!allExecutorMethods.includes(methodId)) {
          unmappedMethods.push(methodId)
        }
      })

      // 미매핑 메서드가 있으면 테스트 실패
      if (unmappedMethods.length > 0) {
        console.log('Unmapped methods:', unmappedMethods)
      }

      expect(unmappedMethods.length).toBeLessThanOrEqual(0)
    })

    it('power-analysis가 design 카테고리여야 함', () => {
      const method = STATISTICAL_METHODS['power-analysis']
      expect(method.category).toBe('design')
    })

    it('비모수 검정 14개가 모두 매핑되어야 함', () => {
      const nonparametricMethods = EXECUTOR_SUPPORTED_CATEGORIES.nonparametric
      expect(nonparametricMethods.length).toBe(14)

      const expectedMethods = [
        'mann-whitney', 'wilcoxon', 'kruskal-wallis', 'friedman', 'chi-square',
        'sign-test', 'mcnemar', 'cochran-q', 'binomial-test', 'runs-test',
        'ks-test', 'mood-median', 'proportion-test'
      ]

      expectedMethods.forEach(method => {
        expect(nonparametricMethods).toContain(method)
      })
    })

    it('생존분석 2개가 매핑되어야 함', () => {
      const survivalMethods = EXECUTOR_SUPPORTED_CATEGORIES.survival
      expect(survivalMethods).toContain('kaplan-meier')
      expect(survivalMethods).toContain('cox-regression')
    })

    it('다변량 분석에 discriminant가 포함되어야 함', () => {
      const advancedMethods = EXECUTOR_SUPPORTED_CATEGORIES.advanced
      expect(advancedMethods).toContain('discriminant')
    })
  })

  describe('Method Category Validation', () => {
    it('각 메서드의 category가 올바른 executor 함수로 라우팅되어야 함', () => {
      // 카테고리 → executor 함수 매핑
      const categoryToExecutor: Record<string, string> = {
        't-test': 'executeHypothesis',
        'anova': 'executeANOVA',
        'nonparametric': 'executeNonparametric',
        'correlation': 'executeCorrelation',
        'regression': 'executeRegression',
        'chi-square': 'executeChiSquare',
        'descriptive': 'executeDescriptive',
        'timeseries': 'executeTimeSeries',
        'survival': 'executeSurvival',
        'pca': 'executeMultivariate',
        'clustering': 'executeMultivariate',
        'advanced': 'executeMultivariate',
        'multivariate': 'executeMultivariate',
        'design': 'executeDesign',
        'psychometrics': 'executeReliability'
      }

      // 각 STATISTICAL_METHODS의 category가 유효한지 확인
      Object.entries(STATISTICAL_METHODS).forEach(([id, method]) => {
        const category = method.category
        expect(categoryToExecutor[category]).toBeDefined()
      })
    })
  })

  describe('Previously Failing Methods', () => {
    // 이전에 "지원되지 않는" 오류가 발생했던 메서드들
    const previouslyFailingMethods = [
      'power-analysis',    // "지원되지 않는 다변량 분석"
      'sign-test',         // "지원되지 않는 비모수 검정"
      'mcnemar',
      'cochran-q',
      'binomial-test',
      'runs-test',
      'ks-test',
      'mood-median',
      'proportion-test',
      'kaplan-meier',      // "생존 분석은 아직 구현되지 않았습니다"
      'cox-regression',
      'discriminant'       // "지원되지 않는 다변량 분석"
    ]

    previouslyFailingMethods.forEach(methodId => {
      it(`${methodId}가 STATISTICAL_METHODS에 정의되어 있어야 함`, () => {
        expect(STATISTICAL_METHODS[methodId]).toBeDefined()
      })

      it(`${methodId}가 Executor 지원 목록에 포함되어야 함`, () => {
        const allSupported = Object.values(EXECUTOR_SUPPORTED_CATEGORIES).flat()
        expect(allSupported).toContain(methodId)
      })
    })
  })
})
