/**
 * Web Worker 타입 정의
 *
 * Phase 5-3: Worker Pool
 * - Worker 메시지 프로토콜
 * - Worker 응답 타입
 * - Worker 상태 관리
 */

// ============================================================================
// Worker 메시지 타입
// ============================================================================

/**
 * Worker로 전송하는 메시지
 */
export interface WorkerMessage {
  id: string // 요청 ID (응답 매칭용)
  type: 'init' | 'execute' | 'terminate'
  method?: string // Python 메서드명 (execute 타입)
  params?: Record<string, unknown> // 메서드 파라미터
  workerNum?: number // Worker 번호 (1-4)
}

/**
 * Worker에서 받는 응답
 */
export interface WorkerResponse<T = unknown> {
  id: string // 요청 ID
  type: 'success' | 'error' | 'progress'
  result?: T // 성공 시 결과
  error?: string // 에러 시 메시지
  progress?: number // 진행률 (0-100)
}

/**
 * Worker 상태
 */
export type WorkerStatus = 'idle' | 'initializing' | 'ready' | 'busy' | 'error'

/**
 * Worker 정보
 */
export interface WorkerInfo {
  num: number // Worker 번호 (1-4)
  status: WorkerStatus
  lastUsed: number // 마지막 사용 시간 (timestamp)
  isCore: boolean // Core Worker 여부 (1-2: true, 3-4: false)
}

// ============================================================================
// Worker별 패키지 매핑
// ============================================================================

/**
 * Worker별 필요 Python 패키지
 */
export const WORKER_PACKAGES: Record<number, string[]> = {
  1: ['numpy', 'scipy'], // Descriptive
  2: ['numpy', 'scipy'], // Hypothesis
  3: ['numpy', 'scipy', 'statsmodels'], // Nonparametric + ANOVA
  4: ['numpy', 'scipy', 'statsmodels', 'sklearn'] // Regression + Advanced
}

/**
 * Worker별 메서드 매핑
 */
export const WORKER_METHODS: Record<number, string[]> = {
  1: [
    // Descriptive (10개)
    'descriptive_statistics',
    'frequency_table',
    'cross_tabulation',
    'normality_test',
    'kolmogorov_smirnov_test',
    'reliability_analysis',
    'explore_data',
    'means_plot',
    'power_analysis',
    'proportion_test'
  ],
  2: [
    // Hypothesis (8개)
    't_test_two_sample',
    't_test_paired',
    't_test_one_sample',
    'z_test',
    'binomial_test',
    'correlation_test',
    'partial_correlation',
    'mann_kendall_test'
  ],
  3: [
    // Nonparametric + ANOVA (18개)
    'mann_whitney_u',
    'wilcoxon_signed_rank',
    'kruskal_wallis',
    'friedman_test',
    'sign_test',
    'runs_test',
    'mcnemar_test',
    'cochran_q_test',
    'mood_median_test',
    'one_way_anova',
    'two_way_anova',
    'three_way_anova',
    'repeated_measures_anova',
    'ancova',
    'manova',
    'welch_anova',
    'chi_square_test',
    'chi_square_goodness_of_fit'
  ],
  4: [
    // Regression + Advanced (24개)
    'linear_regression',
    'multiple_regression',
    'logistic_regression',
    'polynomial_regression',
    'ridge_regression',
    'lasso_regression',
    'stepwise_regression',
    'pca_analysis',
    'factor_analysis',
    'cluster_analysis',
    'discriminant_analysis',
    'mixed_model',
    'ordinal_regression',
    'poisson_regression',
    'negative_binomial_regression',
    'response_surface',
    'dose_response',
    'curve_estimation',
    'binary_logistic',
    'multinomial_logistic',
    'ordinal_logistic',
    'probit_regression',
    'nonlinear_regression',
    'durbin_watson_test'
  ]
}
