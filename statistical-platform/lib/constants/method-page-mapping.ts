/**
 * 메서드 ID ↔ 페이지 경로 매핑
 *
 * 목적:
 * - variable-requirements.ts의 메서드 ID와 실제 페이지 경로 연결
 * - 가이드 컴포넌트에서 methodId로 메타데이터 조회
 * - 통합 페이지에서 선택된 분석 유형에 따른 동적 가이드
 *
 * 현황 (2026-01-27):
 * - 통계 페이지 (statistics): 48개
 * - 데이터 도구 페이지 (data-tools): 3개
 * - 메서드 ID: 53개 (전체 구현 완료)
 * - 통합 페이지: 6개 (regression, anova, correlation, descriptive, chi-square, t-test)
 */

// ============================================================================
// 메서드 ID → 페이지 경로 (1:1 또는 N:1)
// ============================================================================

/**
 * 메서드 ID가 페이지 경로와 다른 경우만 정의
 * 동일한 경우는 getPagePath 함수에서 그대로 반환
 */
export const METHOD_TO_PAGE: Record<string, string> = {
  // ----------------------------------------
  // 명명 불일치 해결 (약칭, 변형)
  // ----------------------------------------
  'wilcoxon-signed-rank': 'wilcoxon',
  'kolmogorov-smirnov': 'ks-test',
  'mann-kendall-test': 'mann-kendall',
  'one-sample-proportion': 'proportion-test',
  'reliability-analysis': 'reliability',
  'cluster-analysis': 'cluster',
  'discriminant-analysis': 'discriminant',
  'explore-data': 'explore-data',  // 동일 (명시적)

  // ----------------------------------------
  // 통합 페이지: 회귀분석 (regression)
  // ----------------------------------------
  'simple-regression': 'regression',
  'multiple-regression': 'regression',
  'logistic-regression': 'regression',
  'stepwise-regression': 'stepwise',    // 별도 페이지
  'poisson-regression': 'poisson',      // 별도 페이지

  // ----------------------------------------
  // 통합 페이지: 분산분석 (anova)
  // ----------------------------------------
  'one-way-anova': 'anova',
  'two-way-anova': 'anova',
  'three-way-anova': 'anova',

  // ----------------------------------------
  // 통합 페이지: 상관분석 (correlation)
  // ----------------------------------------
  'pearson-correlation': 'correlation',
  'spearman-correlation': 'correlation',
  'kendall-correlation': 'correlation',

  // ----------------------------------------
  // 통합 페이지: 기술통계 (descriptive)
  // ----------------------------------------
  'descriptive-stats': 'descriptive',

  // ----------------------------------------
  // 데이터 도구 (data-tools) - statistics 외부
  // ----------------------------------------
  'frequency-table': 'data-tools/frequency-table',
  'cross-tabulation': 'data-tools/cross-tabulation',

  // ----------------------------------------
  // 통합 페이지: 카이제곱 (chi-square)
  // ----------------------------------------
  'chi-square-independence': 'chi-square',
  'chi-square-goodness': 'chi-square-goodness',  // 별도 페이지 존재

  // ----------------------------------------
  // t-검정 계열
  // ----------------------------------------
  'one-sample-t': 'one-sample-t',
  'two-sample-t': 't-test',      // t-test 페이지가 독립표본 t-검정
  'paired-t': 't-test',          // t-test 페이지에서 대응표본 선택 가능

  // ----------------------------------------
  // Fisher 정확 검정 (chi-square 페이지에서 처리)
  // ----------------------------------------
  'fisher-exact': 'chi-square',  // chi-square 페이지에서 fisher_exact_test 호출
}

// ============================================================================
// 페이지 경로 → 메서드 ID 목록 (1:N, 통합 페이지용)
// ============================================================================

/**
 * 통합 페이지에서 사용 가능한 메서드 목록
 * - 동적 가이드에서 선택된 분석 유형에 따라 가이드 변경
 * - 첫 번째 항목이 기본 메서드
 */
export const PAGE_TO_METHODS: Record<string, string[]> = {
  // 회귀분석
  'regression': [
    'simple-regression',
    'multiple-regression',
    'logistic-regression',
  ],

  // 분산분석
  'anova': [
    'one-way-anova',
    'two-way-anova',
    'three-way-anova',
  ],

  // 상관분석
  'correlation': [
    'pearson-correlation',
    'spearman-correlation',
    'kendall-correlation',
  ],

  // 기술통계 (descriptive 페이지에서 선택 가능한 메서드)
  // 참고: frequency-table, cross-tabulation은 data-tools에 별도 페이지
  'descriptive': [
    'descriptive-stats',
  ],

  // 카이제곱
  'chi-square': [
    'chi-square-independence',
    'fisher-exact',  // chi-square 페이지에서 자동 적용
  ],

  // t-검정
  't-test': [
    'two-sample-t',
    'paired-t',
  ],
}

// ============================================================================
// 전체 페이지 목록 (48개)
// ============================================================================

/**
 * 실제 존재하는 모든 통계 페이지 경로
 * app/(dashboard)/statistics/{pagePath}/page.tsx
 */
export const ALL_STATISTICS_PAGES = [
  // 기술통계 (Descriptive)
  'descriptive',
  'explore-data',
  'reliability',

  // 평균비교 (Compare Means)
  'one-sample-t',
  't-test',
  'welch-t',
  'means-plot',
  'proportion-test',

  // 분산분석 (ANOVA/GLM)
  'anova',
  'ancova',
  'repeated-measures-anova',
  'manova',
  'mixed-model',
  'response-surface',

  // 상관분석 (Correlation)
  'correlation',
  'partial-correlation',

  // 회귀분석 (Regression)
  'regression',
  'stepwise',
  'ordinal-regression',
  'poisson',
  'dose-response',

  // 비모수 검정 (Nonparametric)
  'mann-whitney',
  'wilcoxon',
  'kruskal-wallis',
  'friedman',
  'sign-test',
  'runs-test',
  'ks-test',
  'mcnemar',
  'cochran-q',
  'mood-median',
  'binomial-test',
  'mann-kendall',

  // 카이제곱 검정 (Chi-square)
  'chi-square',
  'chi-square-goodness',
  'chi-square-independence',

  // 정규성/정상성 검정
  'normality-test',
  'stationarity-test',

  // 고급분석 (Advanced)
  'factor-analysis',
  'pca',
  'cluster',
  'discriminant',
  'power-analysis',

  // 생존분석 (Survival)
  'kaplan-meier',
  'cox-regression',

  // 시계열 (Time Series)
  'arima',
  'seasonal-decompose',

  // 카테고리 상위 페이지 (개별 메서드 없음)
  'non-parametric',  // 비모수 검정 대시보드
] as const

export type StatisticsPagePath = typeof ALL_STATISTICS_PAGES[number]

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 메서드 ID → 페이지 경로
 * @param methodId variable-requirements.ts의 메서드 ID
 * @returns 실제 페이지 경로
 */
export function getPagePath(methodId: string): string {
  return METHOD_TO_PAGE[methodId] || methodId
}

/**
 * 페이지 경로 → 메서드 ID 목록
 * @param pagePath 페이지 경로
 * @returns 해당 페이지에서 사용 가능한 메서드 ID 배열
 */
export function getMethodIds(pagePath: string): string[] {
  return PAGE_TO_METHODS[pagePath] || [pagePath]
}

/**
 * 페이지 경로 → 기본 메서드 ID
 * @param pagePath 페이지 경로
 * @returns 기본 메서드 ID (통합 페이지의 경우 첫 번째)
 */
export function getDefaultMethodId(pagePath: string): string {
  const methods = PAGE_TO_METHODS[pagePath]
  return methods ? methods[0] : pagePath
}

/**
 * 통합 페이지 여부 확인
 * @param pagePath 페이지 경로
 * @returns 여러 메서드를 포함하는 통합 페이지인지
 */
export function isIntegratedPage(pagePath: string): boolean {
  return pagePath in PAGE_TO_METHODS
}

/**
 * 메서드 ID가 구현되었는지 확인
 * @param methodId variable-requirements.ts의 메서드 ID
 * @returns 해당 페이지가 존재하는지 (통계 + 데이터 도구 모두 확인)
 */
export function isMethodImplemented(methodId: string): boolean {
  const pagePath = getPagePath(methodId)
  return (
    ALL_STATISTICS_PAGES.includes(pagePath as StatisticsPagePath) ||
    ALL_DATA_TOOLS_PAGES.includes(pagePath as DataToolsPagePath)
  )
}

// ============================================================================
// 데이터 도구 페이지 (data-tools)
// ============================================================================

/**
 * 데이터 도구 페이지 경로
 * app/(dashboard)/data-tools/{pagePath}/page.tsx
 */
export const ALL_DATA_TOOLS_PAGES = [
  'data-tools/frequency-table',
  'data-tools/cross-tabulation',
  'data-tools/effect-size-converter',
] as const

export type DataToolsPagePath = typeof ALL_DATA_TOOLS_PAGES[number]

/**
 * 모든 페이지 경로 (통계 + 데이터 도구)
 */
export const ALL_PAGES = [
  ...ALL_STATISTICS_PAGES,
  ...ALL_DATA_TOOLS_PAGES,
] as const