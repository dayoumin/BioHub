/**
 * Statistical Methods - Single Source of Truth
 *
 * All statistical methods are defined here.
 * ID = page route (e.g., 't-test' -> /statistics/t-test)
 *
 * ============================================
 * SUMMARY
 * ============================================
 * - Total definitions: 51
 * - Independent pages: 48 (hasOwnPage !== false)
 * - Embedded methods:   3 (hasOwnPage: false)
 *   - paired-t         -> t-test page
 *   - welch-anova      -> anova page
 *   - logistic-regression -> regression page
 *
 * @see docs/STATISTICAL_METHODS_UNIFICATION_PLAN.md
 * @see design-system -> Dev Tools -> Statistical Methods
 */

import type { StatisticalMethod } from '@/types/smart-flow'

// Extended type with aliases for backward compatibility
export interface StatisticalMethodWithAliases extends StatisticalMethod {
  aliases?: string[]
  /** false = no dedicated page, uses parentPageId instead */
  hasOwnPage?: boolean
  /** Parent page for embedded methods */
  parentPageId?: string
  /** Korean display name */
  koreanName?: string
  /** Korean description */
  koreanDescription?: string
}

/**
 * 51 Statistical Method Definitions
 * - 48 independent pages
 * - 3 embedded (paired-t, welch-anova, logistic-regression)
 */
export const STATISTICAL_METHODS: Record<string, StatisticalMethodWithAliases> = {
  // ============================================
  // 1. T-Test (4)
  // ============================================
  't-test': {
    id: 't-test',
    name: 'Independent Samples t-Test',
    description: 'Two independent groups mean comparison',
    category: 't-test',
    aliases: ['independent-t', 'independent-t-test', 'student-t'],
    koreanName: '독립표본 t-검정',
    koreanDescription: '두 독립 그룹의 평균 차이 검정',
  },
  'welch-t': {
    id: 'welch-t',
    name: 'Welch t-Test',
    description: 'Two groups mean comparison without equal variance assumption',
    category: 't-test',
    aliases: ['welch-t-test'],
    koreanName: 'Welch t-검정',
    koreanDescription: '등분산 가정 없이 두 그룹 평균 비교',
  },
  'one-sample-t': {
    id: 'one-sample-t',
    name: 'One-Sample t-Test',
    description: 'Sample mean vs population mean comparison',
    category: 't-test',
    aliases: ['one-sample-t-test'],
    koreanName: '단일표본 t-검정',
    koreanDescription: '표본 평균과 모집단 평균 비교',
  },
  'paired-t': {
    id: 'paired-t',
    name: 'Paired Samples t-Test',
    description: 'Paired/matched samples mean comparison',
    category: 't-test',
    aliases: ['paired-t-test', 'dependent-t'],
    hasOwnPage: false,
    parentPageId: 't-test',
    koreanName: '대응표본 t-검정',
    koreanDescription: '같은 대상을 전/후 측정하여 평균 차이 검정',
  },

  // ============================================
  // 2. ANOVA (7)
  // ============================================
  'anova': {
    id: 'anova',
    name: 'One-Way ANOVA',
    description: 'Three or more groups mean comparison',
    category: 'anova',
    aliases: ['one-way-anova', 'oneway-anova'],
    koreanName: '일원분산분석 (ANOVA)',
    koreanDescription: '3개 이상 독립 그룹의 평균 차이 검정',
  },
  'welch-anova': {
    id: 'welch-anova',
    name: 'Welch ANOVA',
    description: 'ANOVA without equal variance assumption',
    category: 'anova',
    aliases: ['welch-f'],
    hasOwnPage: false,
    parentPageId: 'anova',
    koreanName: 'Welch ANOVA',
    koreanDescription: '등분산 가정 없이 3개 이상 그룹 비교',
  },
  'repeated-measures-anova': {
    id: 'repeated-measures-anova',
    name: 'Repeated Measures ANOVA',
    description: 'Within-subjects factor analysis',
    category: 'anova',
    aliases: ['repeated-anova', 'rm-anova'],
    koreanName: '반복측정 분산분석',
    koreanDescription: '같은 대상을 여러 시점에서 측정',
  },
  'ancova': {
    id: 'ancova',
    name: 'ANCOVA',
    description: 'Analysis of Covariance',
    category: 'anova',
    aliases: ['analysis-of-covariance'],
    koreanName: '공분산분석 (ANCOVA)',
    koreanDescription: '공변량 통제 후 그룹 비교',
  },
  'manova': {
    id: 'manova',
    name: 'MANOVA',
    description: 'Multivariate Analysis of Variance',
    category: 'anova',
    aliases: ['multivariate-anova'],
    koreanName: '다변량 분산분석 (MANOVA)',
    koreanDescription: '여러 종속변수의 그룹 간 차이',
  },
  'mixed-model': {
    id: 'mixed-model',
    name: 'Mixed Effects Model',
    description: 'Fixed and random effects analysis',
    category: 'anova',
    aliases: ['mixed-effects', 'linear-mixed-model', 'lmm'],
    koreanName: '혼합효과 모형',
    koreanDescription: '고정효과와 랜덤효과 포함 분석',
  },

  // ============================================
  // 3. Nonparametric (12)
  // ============================================
  'mann-whitney': {
    id: 'mann-whitney',
    name: 'Mann-Whitney U Test',
    description: 'Two independent groups nonparametric comparison',
    category: 'nonparametric',
    aliases: ['mann-whitney-u', 'wilcoxon-rank-sum'],
    koreanName: 'Mann-Whitney U 검정',
    koreanDescription: '두 독립 그룹의 비모수 비교',
  },
  'wilcoxon': {
    id: 'wilcoxon',
    name: 'Wilcoxon Signed-Rank Test',
    description: 'Paired samples nonparametric comparison',
    category: 'nonparametric',
    aliases: ['wilcoxon-signed-rank', 'wilcoxon-test'],
    koreanName: 'Wilcoxon 부호순위 검정',
    koreanDescription: '대응표본의 비모수 검정',
  },
  'kruskal-wallis': {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis H Test',
    description: 'Three or more groups nonparametric comparison',
    category: 'nonparametric',
    aliases: ['kruskal-wallis-h'],
    koreanName: 'Kruskal-Wallis 검정',
    koreanDescription: '3개 이상 그룹의 비모수 비교',
  },
  'friedman': {
    id: 'friedman',
    name: 'Friedman Test',
    description: 'Repeated measures nonparametric comparison',
    category: 'nonparametric',
    aliases: ['friedman-test'],
    koreanName: 'Friedman 검정',
    koreanDescription: '반복측정의 비모수 대안',
  },
  'sign-test': {
    id: 'sign-test',
    name: 'Sign Test',
    description: 'Paired samples sign test',
    category: 'nonparametric',
    aliases: [],
    koreanName: '부호 검정',
    koreanDescription: '대응표본의 방향성 검정',
  },
  'mcnemar': {
    id: 'mcnemar',
    name: 'McNemar Test',
    description: 'Paired nominal data comparison',
    category: 'nonparametric',
    aliases: ['mcnemar-test'],
    koreanName: 'McNemar 검정',
    koreanDescription: '대응 이진 데이터 비교',
  },
  'cochran-q': {
    id: 'cochran-q',
    name: "Cochran's Q Test",
    description: 'Multiple related samples binary comparison',
    category: 'nonparametric',
    aliases: ['cochran-q-test'],
    koreanName: 'Cochran Q 검정',
    koreanDescription: '다중 대응 이진 비교',
  },
  'binomial-test': {
    id: 'binomial-test',
    name: 'Binomial Test',
    description: 'Binary outcome probability test',
    category: 'nonparametric',
    aliases: ['binomial'],
    koreanName: '이항 검정',
    koreanDescription: '이진 결과 확률 검정',
  },
  'runs-test': {
    id: 'runs-test',
    name: 'Runs Test',
    description: 'Randomness test',
    category: 'nonparametric',
    aliases: ['wald-wolfowitz'],
    koreanName: '런 검정',
    koreanDescription: '무작위성 검정',
  },
  'ks-test': {
    id: 'ks-test',
    name: 'Kolmogorov-Smirnov Test',
    description: 'Distribution comparison test',
    category: 'nonparametric',
    aliases: ['kolmogorov-smirnov', 'ks-2samp'],
    koreanName: 'Kolmogorov-Smirnov 검정',
    koreanDescription: '두 분포 비교',
  },
  'mood-median': {
    id: 'mood-median',
    name: "Mood's Median Test",
    description: 'Median comparison across groups',
    category: 'nonparametric',
    aliases: ['mood-median-test'],
    koreanName: 'Mood 중앙값 검정',
    koreanDescription: '그룹 간 중앙값 비교',
  },
  'non-parametric': {
    id: 'non-parametric',
    name: 'Nonparametric Methods Overview',
    description: 'Overview of nonparametric statistical methods',
    category: 'nonparametric',
    aliases: ['nonparametric-overview'],
    hasOwnPage: false,  // Category overview, not an analysis method
  },

  // ============================================
  // 4. Correlation (3)
  // ============================================
  'correlation': {
    id: 'correlation',
    name: 'Correlation Analysis',
    description: 'Pearson/Spearman correlation',
    category: 'correlation',
    aliases: ['pearson', 'spearman', 'pearson-correlation', 'spearman-correlation'],
    koreanName: 'Pearson 상관분석',
    koreanDescription: '두 연속형 변수의 선형 상관관계',
  },
  'partial-correlation': {
    id: 'partial-correlation',
    name: 'Partial Correlation',
    description: 'Correlation controlling for variables',
    category: 'correlation',
    aliases: ['partial-corr'],
    koreanName: '편상관분석',
    koreanDescription: '제3변수 통제 후 상관관계',
  },

  // ============================================
  // 5. Regression (6)
  // ============================================
  'regression': {
    id: 'regression',
    name: 'Linear Regression',
    description: 'Simple/multiple linear regression',
    category: 'regression',
    aliases: ['linear-regression', 'multiple-regression', 'ols'],
    koreanName: '선형 회귀',
    koreanDescription: '예측 변수로 결과 예측',
  },
  'logistic-regression': {
    id: 'logistic-regression',
    name: 'Logistic Regression',
    description: 'Binary outcome regression',
    category: 'regression',
    aliases: ['logistic', 'binomial-regression'],
    hasOwnPage: false,
    parentPageId: 'regression',
    koreanName: '로지스틱 회귀',
    koreanDescription: '이진 결과 예측',
  },
  'poisson': {
    id: 'poisson',
    name: 'Poisson Regression',
    description: 'Count data regression',
    category: 'regression',
    aliases: ['poisson-regression'],
    koreanName: '포아송 회귀',
    koreanDescription: '빈도/개수 데이터 예측',
  },
  'ordinal-regression': {
    id: 'ordinal-regression',
    name: 'Ordinal Regression',
    description: 'Ordered categorical outcome regression',
    category: 'regression',
    aliases: ['ordinal-logistic'],
    koreanName: '순서형 로지스틱 회귀',
    koreanDescription: '순서형 범주 예측',
  },
  'stepwise': {
    id: 'stepwise',
    name: 'Stepwise Regression',
    description: 'Automatic variable selection regression',
    category: 'regression',
    aliases: ['stepwise-regression', 'forward-selection', 'backward-elimination'],
    koreanName: '단계적 회귀',
    koreanDescription: '자동 변수 선택 회귀',
  },
  'dose-response': {
    id: 'dose-response',
    name: 'Dose-Response Analysis',
    description: 'EC50/IC50 curve fitting',
    category: 'regression',
    aliases: ['dose-response-curve', 'ec50', 'ic50'],
    koreanName: '용량-반응 분석',
    koreanDescription: 'EC50/IC50 곡선 피팅',
  },
  'response-surface': {
    id: 'response-surface',
    name: 'Response Surface Methodology',
    description: 'Optimization experiments analysis',
    category: 'regression',
    aliases: ['rsm', 'response-surface-methodology'],
    koreanName: '반응표면 분석',
    koreanDescription: '최적화 실험 분석',
  },

  // ============================================
  // 6. Chi-Square (3)
  // ============================================
  'chi-square': {
    id: 'chi-square',
    name: 'Chi-Square Test',
    description: 'Chi-square test overview',
    category: 'chi-square',
    aliases: ['chi-squared', 'chi2'],
    hasOwnPage: false,  // Category overview, not an analysis method
  },
  'chi-square-goodness': {
    id: 'chi-square-goodness',
    name: 'Chi-Square Goodness of Fit',
    description: 'Distribution fit test',
    category: 'chi-square',
    aliases: ['goodness-of-fit', 'chi-square-gof'],
    koreanName: '카이제곱 적합도 검정',
    koreanDescription: '관찰 빈도와 기대 빈도 비교',
  },
  'chi-square-independence': {
    id: 'chi-square-independence',
    name: 'Chi-Square Independence Test',
    description: 'Categorical variables independence test',
    category: 'chi-square',
    aliases: ['independence-test', 'contingency-table'],
    koreanName: '카이제곱 독립성 검정',
    koreanDescription: '두 범주형 변수의 독립성 검정',
  },

  // ============================================
  // 7. Descriptive (4)
  // ============================================
  'descriptive': {
    id: 'descriptive',
    name: 'Descriptive Statistics',
    description: 'Summary statistics',
    category: 'descriptive',
    aliases: ['descriptive-stats', 'summary-statistics'],
    koreanName: '기술통계량',
    koreanDescription: '평균, 표준편차, 분위수 등 요약',
  },
  'normality-test': {
    id: 'normality-test',
    name: 'Normality Test',
    description: 'Shapiro-Wilk, Kolmogorov-Smirnov normality tests',
    category: 'descriptive',
    aliases: ['shapiro-wilk', 'normality'],
    koreanName: '정규성 검정',
    koreanDescription: 'Shapiro-Wilk, K-S 검정',
  },
  'explore-data': {
    id: 'explore-data',
    name: 'Explore Data',
    description: 'Data exploration and visualization',
    category: 'descriptive',
    aliases: ['data-exploration', 'eda'],
    koreanName: '데이터 탐색',
    koreanDescription: '데이터 탐색 및 시각화',
  },
  'means-plot': {
    id: 'means-plot',
    name: 'Means Plot',
    description: 'Group means visualization with CI',
    category: 'descriptive',
    aliases: ['means-comparison-plot'],
    koreanName: '평균 도표',
    koreanDescription: '그룹별 평균과 신뢰구간 시각화',
  },

  // ============================================
  // 8. Time Series (4)
  // ============================================
  'arima': {
    id: 'arima',
    name: 'ARIMA',
    description: 'Autoregressive Integrated Moving Average',
    category: 'timeseries',
    aliases: ['arima-model', 'time-series-arima'],
    koreanName: 'ARIMA',
    koreanDescription: '시계열 예측 모형',
  },
  'seasonal-decompose': {
    id: 'seasonal-decompose',
    name: 'Seasonal Decomposition',
    description: 'Time series decomposition',
    category: 'timeseries',
    aliases: ['stl-decomposition', 'decomposition'],
    koreanName: 'STL 분해',
    koreanDescription: '추세, 계절성, 잔차 분리',
  },
  'stationarity-test': {
    id: 'stationarity-test',
    name: 'Stationarity Test',
    description: 'ADF, KPSS stationarity tests',
    category: 'timeseries',
    aliases: ['adf-test', 'kpss-test'],
    koreanName: 'ADF 정상성 검정',
    koreanDescription: 'Augmented Dickey-Fuller 검정',
  },
  'mann-kendall': {
    id: 'mann-kendall',
    name: 'Mann-Kendall Trend Test',
    description: 'Time series trend detection',
    category: 'timeseries',
    aliases: ['mk-test', 'trend-test'],
    koreanName: 'Mann-Kendall 추세 검정',
    koreanDescription: '시계열 추세 탐지',
  },

  // ============================================
  // 9. Survival (3)
  // ============================================
  'kaplan-meier': {
    id: 'kaplan-meier',
    name: 'Kaplan-Meier Survival Analysis',
    description: 'Survival curve estimation',
    category: 'survival',
    aliases: ['km-curve', 'survival-curve', 'log-rank'],
    koreanName: 'Kaplan-Meier 추정',
    koreanDescription: '생존 곡선 추정',
  },
  'cox-regression': {
    id: 'cox-regression',
    name: 'Cox Proportional Hazards',
    description: 'Survival regression with covariates',
    category: 'survival',
    aliases: ['cox-ph', 'proportional-hazards'],
    koreanName: 'Cox 비례위험 회귀',
    koreanDescription: '생존에 영향을 미치는 요인 분석',
  },

  // ============================================
  // 10. Multivariate (4)
  // ============================================
  'pca': {
    id: 'pca',
    name: 'Principal Component Analysis',
    description: 'Dimensionality reduction',
    category: 'pca',
    aliases: ['principal-components'],
    koreanName: '주성분 분석 (PCA)',
    koreanDescription: '차원 축소',
  },
  'factor-analysis': {
    id: 'factor-analysis',
    name: 'Factor Analysis',
    description: 'Latent factor extraction',
    category: 'advanced',
    aliases: ['efa', 'exploratory-factor-analysis'],
    koreanName: '요인 분석',
    koreanDescription: '잠재 요인 추출',
  },
  'cluster': {
    id: 'cluster',
    name: 'Cluster Analysis',
    description: 'K-means, hierarchical clustering',
    category: 'clustering',
    aliases: ['cluster-analysis', 'k-means', 'hierarchical-clustering'],
    koreanName: '군집 분석',
    koreanDescription: 'K-means, 계층적 군집화',
  },
  'discriminant': {
    id: 'discriminant',
    name: 'Discriminant Analysis',
    description: 'Group classification',
    category: 'advanced',
    aliases: ['discriminant-analysis', 'lda', 'linear-discriminant'],
    koreanName: '판별 분석',
    koreanDescription: '그룹 분류',
  },

  // ============================================
  // 11. Other (4)
  // ============================================
  'power-analysis': {
    id: 'power-analysis',
    name: 'Power Analysis',
    description: 'Sample size and power calculation',
    category: 'design',
    aliases: ['sample-size', 'statistical-power'],
    koreanName: '검정력 분석',
    koreanDescription: '표본 크기 및 검정력 계산',
  },
  'reliability': {
    id: 'reliability',
    name: 'Reliability Analysis',
    description: "Cronbach's alpha, internal consistency",
    category: 'psychometrics',
    aliases: ['reliability-analysis', 'cronbach-alpha'],
    koreanName: '신뢰도 분석',
    koreanDescription: 'Cronbach 알파, 내적 일관성',
  },
  'proportion-test': {
    id: 'proportion-test',
    name: 'Proportion Test',
    description: 'One/two sample proportion test',
    category: 'nonparametric',
    aliases: ['z-test-proportion', 'one-sample-proportion'],
    koreanName: '비율 검정',
    koreanDescription: '단일/두 표본 비율 비교',
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get method by ID or alias
 * @param idOrAlias - Method ID or alias
 * @returns StatisticalMethod or null
 */
export function getMethodByIdOrAlias(
  idOrAlias: string
): StatisticalMethodWithAliases | null {
  // Direct match
  if (STATISTICAL_METHODS[idOrAlias]) {
    return STATISTICAL_METHODS[idOrAlias]
  }

  // Search aliases
  for (const method of Object.values(STATISTICAL_METHODS)) {
    if (method.aliases?.includes(idOrAlias)) {
      return method
    }
  }

  return null
}

/**
 * Get methods by category
 * @param category - Category name
 * @returns Array of methods
 */
export function getMethodsByCategory(
  category: string
): StatisticalMethodWithAliases[] {
  return Object.values(STATISTICAL_METHODS).filter((m) => m.category === category)
}

/**
 * Get all methods
 * @returns Array of all methods
 */
export function getAllMethods(): StatisticalMethodWithAliases[] {
  return Object.values(STATISTICAL_METHODS)
}

/**
 * Get all method IDs
 * @returns Array of method IDs
 */
export function getAllMethodIds(): string[] {
  return Object.keys(STATISTICAL_METHODS)
}

/**
 * Get page route for a method
 * @param idOrAlias - Method ID or alias
 * @returns Route path (e.g., '/statistics/t-test')
 */
export function getMethodRoute(idOrAlias: string): string | null {
  const method = getMethodByIdOrAlias(idOrAlias)
  if (!method) return null

  // If method has no own page, use parent page
  if (method.hasOwnPage === false && method.parentPageId) {
    return `/statistics/${method.parentPageId}`
  }

  return `/statistics/${method.id}`
}

/**
 * Validate method ID exists
 * @param id - Method ID to validate
 * @returns boolean
 */
export function isValidMethodId(id: string): boolean {
  return getMethodByIdOrAlias(id) !== null
}


/**
 * Get Korean name for a method
 * @param id - Method ID
 * @returns Korean name or English name as fallback
 */
export function getKoreanName(id: string): string {
  const method = STATISTICAL_METHODS[id]
  return method?.koreanName ?? method?.name ?? id
}

/**
 * Get Korean description for a method
 * @param id - Method ID
 * @returns Korean description or English description as fallback
 */
export function getKoreanDescription(id: string): string {
  const method = STATISTICAL_METHODS[id]
  return method?.koreanDescription ?? method?.description ?? ''
}

// ============================================
// Category Definitions
// ============================================

export const METHOD_CATEGORIES = {
  't-test': {
    name: 'T-Test',
    description: 'Mean comparison tests',
    methods: ['t-test', 'welch-t', 'one-sample-t', 'paired-t'],
    koreanName: '독립표본 t-검정',
    koreanDescription: '두 독립 그룹의 평균 차이 검정',
  },
  anova: {
    name: 'ANOVA',
    description: 'Analysis of Variance',
    methods: [
      'anova',
      'welch-anova',
      'repeated-measures-anova',
      'ancova',
      'manova',
      'mixed-model',
    ],
  },
  nonparametric: {
    name: 'Nonparametric',
    description: 'Distribution-free tests',
    methods: [
      'mann-whitney',
      'wilcoxon',
      'kruskal-wallis',
      'friedman',
      'sign-test',
      'mcnemar',
      'cochran-q',
      'binomial-test',
      'runs-test',
      'ks-test',
      'mood-median',
      'non-parametric',
    ],
  },
  correlation: {
    name: 'Correlation',
    description: 'Correlation analysis',
    methods: ['correlation', 'partial-correlation'],
  },
  regression: {
    name: 'Regression',
    description: 'Regression analysis',
    methods: [
      'regression',
      'logistic-regression',
      'poisson',
      'ordinal-regression',
      'stepwise',
      'dose-response',
      'response-surface',
    ],
  },
  'chi-square': {
    name: 'Chi-Square',
    description: 'Chi-square tests',
    methods: ['chi-square', 'chi-square-goodness', 'chi-square-independence'],
  },
  descriptive: {
    name: 'Descriptive',
    description: 'Descriptive statistics',
    methods: ['descriptive', 'normality-test', 'explore-data', 'means-plot'],
  },
  timeseries: {
    name: 'Time Series',
    description: 'Time series analysis',
    methods: ['arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall'],
  },
  survival: {
    name: 'Survival',
    description: 'Survival analysis',
    methods: ['kaplan-meier', 'cox-regression'],
  },
  multivariate: {
    name: 'Multivariate',
    description: 'Multivariate analysis',
    methods: ['pca', 'factor-analysis', 'cluster', 'discriminant'],
  },
  other: {
    name: 'Other',
    description: 'Other statistical methods',
    methods: ['power-analysis', 'reliability', 'proportion-test'],
  },
} as const

export type MethodCategoryKey = keyof typeof METHOD_CATEGORIES
