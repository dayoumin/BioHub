/**
 * 통계 분석 메서드 ID 상수
 */
export const ANALYSIS_METHOD_IDS = {
  // 비모수 검정
  MANN_WHITNEY: 'mann_whitney',
  WILCOXON_SIGNED_RANK: 'wilcoxon_signed_rank',
  KRUSKAL_WALLIS: 'kruskal_wallis',
  FRIEDMAN: 'friedman',

  // 모수 검정
  ONE_SAMPLE_T: 'one_sample_t',
  INDEPENDENT_T: 'independent_t',
  PAIRED_T: 'paired_t',
  ANOVA: 'anova',
  REPEATED_ANOVA: 'repeated_anova',

  // 상관분석
  PEARSON_CORRELATION: 'pearson_correlation',
  SPEARMAN_CORRELATION: 'spearman_correlation',
  PARTIAL_CORRELATION: 'partial_correlation',

  // 회귀분석
  LINEAR_REGRESSION: 'linear_regression',
  MULTIPLE_REGRESSION: 'multiple_regression',
  LOGISTIC_REGRESSION: 'logistic_regression',

  // 기타
  CHI_SQUARE: 'chi_square',
  NORMALITY_TEST: 'normality_test',
  DESCRIPTIVE_STATS: 'descriptive_stats'
} as const

export type AnalysisMethodId = typeof ANALYSIS_METHOD_IDS[keyof typeof ANALYSIS_METHOD_IDS]