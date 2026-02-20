/**
 * 통계 분석 모듈 통합 Export
 * 
 * 모든 통계 함수를 카테고리별로 구조화하여 제공
 */

// 타입 정의
export * from './types'

// 유틸리티 함수
export * from './utils'

// 기술통계 (3개 함수)
export {
  calculateDescriptiveStats,
  normalityTest,
  homogeneityTest
} from './descriptive'

// t-검정 (4개 함수)
export {
  oneSampleTTest,
  twoSampleTTest,
  pairedTTest,
  welchTTest
} from './t-tests'

// 분산분석 & 사후검정 (6개 함수)
export {
  oneWayANOVA,
  twoWayANOVA,
  tukeyHSD,
  bonferroniPostHoc,
  gamesHowellPostHoc
} from './anova'

// 회귀분석 & 상관분석 (4개 함수)
export {
  simpleLinearRegression,
  multipleRegression,
  logisticRegression,
  correlationAnalysis
} from './regression'

// 비모수 검정 (5개 함수)
export {
  mannWhitneyU,
  wilcoxonSignedRank,
  kruskalWallis,
  dunnTest,
  chiSquareTest
} from './nonparametric'

// 고급 분석 (7개 함수)
export {
  principalComponentAnalysis,
  kMeansClustering,
  hierarchicalClustering,
  timeSeriesDecomposition,
  arimaForecast,
  kaplanMeierSurvival
} from './advanced'

/**
 * 통계 함수 카테고리 정보
 */
export const STATISTICS_CATEGORIES = {
  descriptive: {
    name: '기술통계',
    nameEn: 'Descriptive Statistics',
    functions: ['calculateDescriptiveStats', 'normalityTest', 'homogeneityTest']
  },
  tTests: {
    name: 't-검정',
    nameEn: 'T-Tests',
    functions: ['oneSampleTTest', 'twoSampleTTest', 'pairedTTest', 'welchTTest']
  },
  anova: {
    name: '분산분석',
    nameEn: 'ANOVA',
    functions: ['oneWayANOVA', 'twoWayANOVA', 'tukeyHSD', 'bonferroniPostHoc', 'gamesHowellPostHoc']
  },
  regression: {
    name: '회귀분석',
    nameEn: 'Regression',
    functions: ['simpleLinearRegression', 'multipleRegression', 'logisticRegression', 'correlationAnalysis']
  },
  nonparametric: {
    name: '비모수검정',
    nameEn: 'Nonparametric',
    functions: ['mannWhitneyU', 'wilcoxonSignedRank', 'kruskalWallis', 'dunnTest', 'chiSquareTest']
  },
  advanced: {
    name: '고급분석',
    nameEn: 'Advanced',
    functions: ['principalComponentAnalysis', 'kMeansClustering', 'hierarchicalClustering', 'timeSeriesDecomposition', 'arimaForecast', 'kaplanMeierSurvival']
  }
}

/**
 * 전체 통계 함수 목록 (29개)
 */
export const ALL_STATISTICS_FUNCTIONS = [
  // 기술통계 (3)
  'calculateDescriptiveStats',
  'normalityTest',
  'homogeneityTest',
  // t-검정 (4)
  'oneSampleTTest',
  'twoSampleTTest',
  'pairedTTest',
  'welchTTest',
  // ANOVA (5)
  'oneWayANOVA',
  'twoWayANOVA',
  'tukeyHSD',
  'bonferroniPostHoc',
  'gamesHowellPostHoc',
  // 회귀/상관 (4)
  'simpleLinearRegression',
  'multipleRegression',
  'logisticRegression',
  'correlationAnalysis',
  // 비모수 (5)
  'mannWhitneyU',
  'wilcoxonSignedRank',
  'kruskalWallis',
  'dunnTest',
  'chiSquareTest',
  // 고급 (6)
  'principalComponentAnalysis',
  'kMeansClustering',
  'hierarchicalClustering',
  'timeSeriesDecomposition',
  'arimaForecast',
  'kaplanMeierSurvival'
]