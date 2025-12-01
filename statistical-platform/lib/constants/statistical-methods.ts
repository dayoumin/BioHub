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
  },
  'welch-t': {
    id: 'welch-t',
    name: 'Welch t-Test',
    description: 'Two groups mean comparison without equal variance assumption',
    category: 't-test',
    aliases: ['welch-t-test'],
  },
  'one-sample-t': {
    id: 'one-sample-t',
    name: 'One-Sample t-Test',
    description: 'Sample mean vs population mean comparison',
    category: 't-test',
    aliases: ['one-sample-t-test'],
  },
  'paired-t': {
    id: 'paired-t',
    name: 'Paired Samples t-Test',
    description: 'Paired/matched samples mean comparison',
    category: 't-test',
    aliases: ['paired-t-test', 'dependent-t'],
    hasOwnPage: false,
    parentPageId: 't-test',
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
  },
  'welch-anova': {
    id: 'welch-anova',
    name: 'Welch ANOVA',
    description: 'ANOVA without equal variance assumption',
    category: 'anova',
    aliases: ['welch-f'],
    hasOwnPage: false,
    parentPageId: 'anova',
  },
  'repeated-measures-anova': {
    id: 'repeated-measures-anova',
    name: 'Repeated Measures ANOVA',
    description: 'Within-subjects factor analysis',
    category: 'anova',
    aliases: ['repeated-anova', 'rm-anova'],
  },
  'ancova': {
    id: 'ancova',
    name: 'ANCOVA',
    description: 'Analysis of Covariance',
    category: 'anova',
    aliases: ['analysis-of-covariance'],
  },
  'manova': {
    id: 'manova',
    name: 'MANOVA',
    description: 'Multivariate Analysis of Variance',
    category: 'anova',
    aliases: ['multivariate-anova'],
  },
  'mixed-model': {
    id: 'mixed-model',
    name: 'Mixed Effects Model',
    description: 'Fixed and random effects analysis',
    category: 'anova',
    aliases: ['mixed-effects', 'linear-mixed-model', 'lmm'],
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
  },
  'wilcoxon': {
    id: 'wilcoxon',
    name: 'Wilcoxon Signed-Rank Test',
    description: 'Paired samples nonparametric comparison',
    category: 'nonparametric',
    aliases: ['wilcoxon-signed-rank', 'wilcoxon-test'],
  },
  'kruskal-wallis': {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis H Test',
    description: 'Three or more groups nonparametric comparison',
    category: 'nonparametric',
    aliases: ['kruskal-wallis-h'],
  },
  'friedman': {
    id: 'friedman',
    name: 'Friedman Test',
    description: 'Repeated measures nonparametric comparison',
    category: 'nonparametric',
    aliases: ['friedman-test'],
  },
  'sign-test': {
    id: 'sign-test',
    name: 'Sign Test',
    description: 'Paired samples sign test',
    category: 'nonparametric',
    aliases: [],
  },
  'mcnemar': {
    id: 'mcnemar',
    name: 'McNemar Test',
    description: 'Paired nominal data comparison',
    category: 'nonparametric',
    aliases: ['mcnemar-test'],
  },
  'cochran-q': {
    id: 'cochran-q',
    name: "Cochran's Q Test",
    description: 'Multiple related samples binary comparison',
    category: 'nonparametric',
    aliases: ['cochran-q-test'],
  },
  'binomial-test': {
    id: 'binomial-test',
    name: 'Binomial Test',
    description: 'Binary outcome probability test',
    category: 'nonparametric',
    aliases: ['binomial'],
  },
  'runs-test': {
    id: 'runs-test',
    name: 'Runs Test',
    description: 'Randomness test',
    category: 'nonparametric',
    aliases: ['wald-wolfowitz'],
  },
  'ks-test': {
    id: 'ks-test',
    name: 'Kolmogorov-Smirnov Test',
    description: 'Distribution comparison test',
    category: 'nonparametric',
    aliases: ['kolmogorov-smirnov', 'ks-2samp'],
  },
  'mood-median': {
    id: 'mood-median',
    name: "Mood's Median Test",
    description: 'Median comparison across groups',
    category: 'nonparametric',
    aliases: ['mood-median-test'],
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
  },
  'partial-correlation': {
    id: 'partial-correlation',
    name: 'Partial Correlation',
    description: 'Correlation controlling for variables',
    category: 'correlation',
    aliases: ['partial-corr'],
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
  },
  'logistic-regression': {
    id: 'logistic-regression',
    name: 'Logistic Regression',
    description: 'Binary outcome regression',
    category: 'regression',
    aliases: ['logistic', 'binomial-regression'],
    hasOwnPage: false,
    parentPageId: 'regression',
  },
  'poisson': {
    id: 'poisson',
    name: 'Poisson Regression',
    description: 'Count data regression',
    category: 'regression',
    aliases: ['poisson-regression'],
  },
  'ordinal-regression': {
    id: 'ordinal-regression',
    name: 'Ordinal Regression',
    description: 'Ordered categorical outcome regression',
    category: 'regression',
    aliases: ['ordinal-logistic'],
  },
  'stepwise': {
    id: 'stepwise',
    name: 'Stepwise Regression',
    description: 'Automatic variable selection regression',
    category: 'regression',
    aliases: ['stepwise-regression', 'forward-selection', 'backward-elimination'],
  },
  'dose-response': {
    id: 'dose-response',
    name: 'Dose-Response Analysis',
    description: 'EC50/IC50 curve fitting',
    category: 'regression',
    aliases: ['dose-response-curve', 'ec50', 'ic50'],
  },
  'response-surface': {
    id: 'response-surface',
    name: 'Response Surface Methodology',
    description: 'Optimization experiments analysis',
    category: 'regression',
    aliases: ['rsm', 'response-surface-methodology'],
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
  },
  'chi-square-independence': {
    id: 'chi-square-independence',
    name: 'Chi-Square Independence Test',
    description: 'Categorical variables independence test',
    category: 'chi-square',
    aliases: ['independence-test', 'contingency-table'],
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
  },
  'normality-test': {
    id: 'normality-test',
    name: 'Normality Test',
    description: 'Shapiro-Wilk, Kolmogorov-Smirnov normality tests',
    category: 'descriptive',
    aliases: ['shapiro-wilk', 'normality'],
  },
  'explore-data': {
    id: 'explore-data',
    name: 'Explore Data',
    description: 'Data exploration and visualization',
    category: 'descriptive',
    aliases: ['data-exploration', 'eda'],
  },
  'means-plot': {
    id: 'means-plot',
    name: 'Means Plot',
    description: 'Group means visualization with CI',
    category: 'descriptive',
    aliases: ['means-comparison-plot'],
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
  },
  'seasonal-decompose': {
    id: 'seasonal-decompose',
    name: 'Seasonal Decomposition',
    description: 'Time series decomposition',
    category: 'timeseries',
    aliases: ['stl-decomposition', 'decomposition'],
  },
  'stationarity-test': {
    id: 'stationarity-test',
    name: 'Stationarity Test',
    description: 'ADF, KPSS stationarity tests',
    category: 'timeseries',
    aliases: ['adf-test', 'kpss-test'],
  },
  'mann-kendall': {
    id: 'mann-kendall',
    name: 'Mann-Kendall Trend Test',
    description: 'Time series trend detection',
    category: 'timeseries',
    aliases: ['mk-test', 'trend-test'],
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
  },
  'cox-regression': {
    id: 'cox-regression',
    name: 'Cox Proportional Hazards',
    description: 'Survival regression with covariates',
    category: 'survival',
    aliases: ['cox-ph', 'proportional-hazards'],
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
  },
  'factor-analysis': {
    id: 'factor-analysis',
    name: 'Factor Analysis',
    description: 'Latent factor extraction',
    category: 'advanced',
    aliases: ['efa', 'exploratory-factor-analysis'],
  },
  'cluster': {
    id: 'cluster',
    name: 'Cluster Analysis',
    description: 'K-means, hierarchical clustering',
    category: 'clustering',
    aliases: ['cluster-analysis', 'k-means', 'hierarchical-clustering'],
  },
  'discriminant': {
    id: 'discriminant',
    name: 'Discriminant Analysis',
    description: 'Group classification',
    category: 'advanced',
    aliases: ['discriminant-analysis', 'lda', 'linear-discriminant'],
  },

  // ============================================
  // 11. Other (4)
  // ============================================
  'power-analysis': {
    id: 'power-analysis',
    name: 'Power Analysis',
    description: 'Sample size and power calculation',
    category: 'advanced',
    aliases: ['sample-size', 'statistical-power'],
  },
  'reliability': {
    id: 'reliability',
    name: 'Reliability Analysis',
    description: "Cronbach's alpha, internal consistency",
    category: 'psychometrics',
    aliases: ['reliability-analysis', 'cronbach-alpha'],
  },
  'proportion-test': {
    id: 'proportion-test',
    name: 'Proportion Test',
    description: 'One/two sample proportion test',
    category: 'nonparametric',
    aliases: ['z-test-proportion', 'one-sample-proportion'],
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

// ============================================
// Category Definitions
// ============================================

export const METHOD_CATEGORIES = {
  't-test': {
    name: 'T-Test',
    description: 'Mean comparison tests',
    methods: ['t-test', 'welch-t', 'one-sample-t', 'paired-t'],
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
