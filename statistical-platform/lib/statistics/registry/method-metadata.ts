/**
 * 통계 메서드 메타데이터
 *
 * 50개 통계 메서드의 그룹 매핑 및 의존성 패키지 정의
 * Registry Pattern의 핵심 데이터
 */

import type { StatisticalGroup, MethodMetadata } from './types'

/**
 * 메서드 메타데이터 레지스트리
 *
 * 각 메서드는 다음 정보를 포함:
 * - group: 어느 Worker에서 실행될지 결정
 * - deps: 필요한 Python 패키지
 * - estimatedTime: 예상 실행 시간 (초, 참고용)
 */
export const METHOD_METADATA: Record<string, MethodMetadata> = {
  // ============================================================================
  // Group 1: Descriptive (10개) → Worker 1
  // ============================================================================
  mean: {
    group: 'descriptive',
    deps: ['numpy'],
    estimatedTime: 0.1
  },
  median: {
    group: 'descriptive',
    deps: ['numpy'],
    estimatedTime: 0.1
  },
  mode: {
    group: 'descriptive',
    deps: ['scipy'],
    estimatedTime: 0.1
  },
  descriptive: {
    group: 'descriptive',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.2
  },
  normality: {
    group: 'descriptive',
    deps: ['scipy'],
    estimatedTime: 0.3
  },
  outliers: {
    group: 'descriptive',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.2
  },
  frequency: {
    group: 'descriptive',
    deps: ['numpy'],
    estimatedTime: 0.1
  },
  crosstab: {
    group: 'descriptive',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.2
  },
  proportionTest: {
    group: 'descriptive',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  reliability: {
    group: 'descriptive',
    deps: ['numpy'],
    estimatedTime: 0.3
  },

  // ============================================================================
  // Group 2: Hypothesis (8개) → Worker 2
  // ============================================================================
  tTest: {
    group: 'hypothesis',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  pairedTTest: {
    group: 'hypothesis',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  oneSampleTTest: {
    group: 'hypothesis',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  zTest: {
    group: 'hypothesis',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.2
  },
  chiSquare: {
    group: 'hypothesis',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  binomialTest: {
    group: 'hypothesis',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  correlation: {
    group: 'hypothesis',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.2
  },
  partialCorrelation: {
    group: 'hypothesis',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.3
  },

  // ============================================================================
  // Group 3: Regression (12개) → Worker 4 (확장)
  // ============================================================================
  linearRegression: {
    group: 'regression',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.3
  },
  multipleRegression: {
    group: 'regression',
    deps: ['numpy', 'scipy', 'statsmodels'],
    estimatedTime: 0.4
  },
  logisticRegression: {
    group: 'regression',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.4
  },
  curveEstimation: {
    group: 'regression',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.3
  },
  nonlinearRegression: {
    group: 'regression',
    deps: ['scipy'],
    estimatedTime: 0.5
  },
  stepwiseRegression: {
    group: 'regression',
    deps: ['numpy', 'statsmodels'],
    estimatedTime: 0.6
  },
  binaryLogistic: {
    group: 'regression',
    deps: ['statsmodels'],
    estimatedTime: 0.4
  },
  multinomialLogistic: {
    group: 'regression',
    deps: ['statsmodels'],
    estimatedTime: 0.5
  },
  ordinalLogistic: {
    group: 'regression',
    deps: ['statsmodels'],
    estimatedTime: 0.5
  },
  probitRegression: {
    group: 'regression',
    deps: ['statsmodels'],
    estimatedTime: 0.4
  },
  poissonRegression: {
    group: 'regression',
    deps: ['statsmodels'],
    estimatedTime: 0.4
  },
  negativeBinomial: {
    group: 'regression',
    deps: ['statsmodels'],
    estimatedTime: 0.4
  },

  // ============================================================================
  // Group 4: Nonparametric (9개) → Worker 3 (확장)
  // ============================================================================
  mannWhitney: {
    group: 'nonparametric',
    deps: ['scipy'],
    estimatedTime: 0.3
  },
  wilcoxon: {
    group: 'nonparametric',
    deps: ['scipy'],
    estimatedTime: 0.3
  },
  kruskalWallis: {
    group: 'nonparametric',
    deps: ['scipy'],
    estimatedTime: 0.3
  },
  friedman: {
    group: 'nonparametric',
    deps: ['scipy'],
    estimatedTime: 0.3
  },
  signTest: {
    group: 'nonparametric',
    deps: ['scipy'],
    estimatedTime: 0.2
  },
  runsTest: {
    group: 'nonparametric',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },
  mcNemar: {
    group: 'nonparametric',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.2
  },
  cochranQ: {
    group: 'nonparametric',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },
  moodMedian: {
    group: 'nonparametric',
    deps: ['scipy'],
    estimatedTime: 0.3
  },

  // ============================================================================
  // Group 5: ANOVA (9개) → Worker 3 (확장)
  // ============================================================================
  oneWayAnova: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },
  twoWayAnova: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.4
  },
  repeatedMeasures: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.5
  },
  ancova: {
    group: 'anova',
    deps: ['statsmodels'],
    estimatedTime: 0.4
  },
  manova: {
    group: 'anova',
    deps: ['statsmodels'],
    estimatedTime: 0.5
  },
  tukeyHSD: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },
  scheffeTest: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },
  bonferroni: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },
  gamesHowell: {
    group: 'anova',
    deps: ['scipy', 'statsmodels'],
    estimatedTime: 0.3
  },

  // ============================================================================
  // Group 6: Advanced (12개) → Worker 4 (확장)
  // ============================================================================
  pca: {
    group: 'advanced',
    deps: ['numpy', 'sklearn'],
    estimatedTime: 0.5
  },
  factorAnalysis: {
    group: 'advanced',
    deps: ['sklearn'],
    estimatedTime: 0.6
  },
  clusterAnalysis: {
    group: 'advanced',
    deps: ['sklearn'],
    estimatedTime: 0.5
  },
  discriminantAnalysis: {
    group: 'advanced',
    deps: ['sklearn'],
    estimatedTime: 0.5
  },
  canonicalCorrelation: {
    group: 'advanced',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.6
  },
  survivalAnalysis: {
    group: 'advanced',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.7
  },
  timeSeries: {
    group: 'advanced',
    deps: ['numpy', 'scipy', 'statsmodels'],
    estimatedTime: 0.6
  },
  metaAnalysis: {
    group: 'advanced',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.5
  },
  sem: {
    group: 'advanced',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.8
  },
  multilevelModel: {
    group: 'advanced',
    deps: ['statsmodels'],
    estimatedTime: 0.7
  },
  mediation: {
    group: 'advanced',
    deps: ['numpy', 'scipy'],
    estimatedTime: 0.5
  },
  moderation: {
    group: 'advanced',
    deps: ['numpy', 'scipy', 'statsmodels'],
    estimatedTime: 0.5
  }
} as const

/**
 * 그룹별 메서드 목록 (참고용)
 */
export const GROUP_METHODS: Record<StatisticalGroup, readonly string[]> = {
  descriptive: [
    'mean', 'median', 'mode', 'descriptive', 'normality',
    'outliers', 'frequency', 'crosstab', 'proportionTest', 'reliability'
  ],
  hypothesis: [
    'tTest', 'pairedTTest', 'oneSampleTTest', 'zTest',
    'chiSquare', 'binomialTest', 'correlation', 'partialCorrelation'
  ],
  regression: [
    'linearRegression', 'multipleRegression', 'logisticRegression',
    'curveEstimation', 'nonlinearRegression', 'stepwiseRegression',
    'binaryLogistic', 'multinomialLogistic', 'ordinalLogistic',
    'probitRegression', 'poissonRegression', 'negativeBinomial'
  ],
  nonparametric: [
    'mannWhitney', 'wilcoxon', 'kruskalWallis', 'friedman',
    'signTest', 'runsTest', 'mcNemar', 'cochranQ', 'moodMedian'
  ],
  anova: [
    'oneWayAnova', 'twoWayAnova', 'repeatedMeasures', 'ancova', 'manova',
    'tukeyHSD', 'scheffeTest', 'bonferroni', 'gamesHowell'
  ],
  advanced: [
    'pca', 'factorAnalysis', 'clusterAnalysis', 'discriminantAnalysis',
    'canonicalCorrelation', 'survivalAnalysis', 'timeSeries', 'metaAnalysis',
    'sem', 'multilevelModel', 'mediation', 'moderation'
  ]
} as const

/**
 * Worker별 그룹 매핑 (구현 참고용)
 *
 * Worker 1: Descriptive (10개)
 * Worker 2: Hypothesis (8개)
 * Worker 3: Nonparametric + ANOVA (18개)
 * Worker 4: Regression + Advanced (24개)
 */
export const WORKER_GROUP_MAPPING = {
  worker1: ['descriptive'],
  worker2: ['hypothesis'],
  worker3: ['nonparametric', 'anova'],
  worker4: ['regression', 'advanced']
} as const

/**
 * 메서드 ID 타입 (자동 생성)
 */
export type MethodId = keyof typeof METHOD_METADATA
