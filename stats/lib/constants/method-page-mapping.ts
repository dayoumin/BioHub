/**
 * 페이지 경로 목록 및 페이지 유효성 검증
 *
 * 목적:
 * - 실제 존재하는 통계/데이터 도구 페이지 경로 목록 제공
 * - 페이지 경로 유효성 검증
 *
 * 참고: 메서드 ID ↔ 페이지 매핑은 statistical-methods.ts의 StatisticalMethodEntry.pageId 참조
 * (getPageRoute, getMethodsByPage, isIntegratedPage, getMethod 헬퍼 함수 사용)
 */

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