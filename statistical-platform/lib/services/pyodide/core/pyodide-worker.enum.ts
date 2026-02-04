/**
 * Pyodide Worker 번호 Enum
 *
 * Phase 6: 타입 안전성 향상
 * - 하드코딩된 숫자 대신 enum 사용
 * - IDE 자동완성 지원
 * - 잘못된 Worker 번호 방지
 *
 * @example
 * ```typescript
 * import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
 *
 * const result = await pyodideCore.callWorkerMethod<T>(
 *   PyodideWorker.Descriptive,
 *   'descriptive_stats',
 *   { data: values }
 * )
 * ```
 */

export enum PyodideWorker {
  /**
   * Worker 1: 기술통계
   * - descriptive_stats
   * - normality_test
   * - outlier_detection
   * - frequency_analysis
   * - etc.
   */
  Descriptive = 1,

  /**
   * Worker 2: 가설검정
   * - t_test_one_sample
   * - t_test_two_sample
   * - t_test_paired
   * - chi_square_test
   * - z_test
   * - binomial_test
   * - partialCorrelation
   * - etc.
   */
  Hypothesis = 2,

  /**
   * Worker 3: 비모수 검정 + ANOVA
   * - mann_whitney_u_test
   * - wilcoxon_signed_rank_test
   * - kruskal_wallis_test
   * - friedman_test
   * - one_way_anova
   * - two_way_anova
   * - repeated_measures_anova
   * - bonferroni_post_hoc
   * - tukey_hsd_post_hoc
   * - games_howell_post_hoc
   * - etc.
   */
  NonparametricAnova = 3,

  /**
   * Worker 4: 회귀분석 + 고급분석
   * - linear_regression
   * - multiple_regression
   * - logistic_regression
   * - polynomial_regression
   * - pca_analysis
   * - factor_analysis
   * - discriminant_analysis
   * - cluster_analysis
   * - etc.
   */
  RegressionAdvanced = 4
}

/**
 * Worker별 패키지 의존성 정보
 *
 * PyodideCore에서 Worker 로딩 시 참고
 */
export const WORKER_PACKAGES = Object.freeze({
  [PyodideWorker.Descriptive]: [] as const,
  [PyodideWorker.Hypothesis]: ['statsmodels', 'pandas'] as const,
  [PyodideWorker.NonparametricAnova]: ['statsmodels', 'pandas'] as const,
  [PyodideWorker.RegressionAdvanced]: ['statsmodels', 'scikit-learn'] as const
} as const)

/**
 * Worker별 Python 파일 경로
 */
export const WORKER_FILE_PATHS = Object.freeze({
  [PyodideWorker.Descriptive]: '/workers/python/worker1-descriptive.py',
  [PyodideWorker.Hypothesis]: '/workers/python/worker2-hypothesis.py',
  [PyodideWorker.NonparametricAnova]: '/workers/python/worker3-nonparametric-anova.py',
  [PyodideWorker.RegressionAdvanced]: '/workers/python/worker4-regression-advanced.py'
} as const)
