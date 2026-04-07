/**
 * Validation Metadata — 메서드별 Python 라이브러리 + R 교차검증 결과
 *
 * 데이터 출처:
 * - pythonLib: validation/method-target-matrix.json (실제 코드 확인 2026-04-07)
 * - lre: validation/results/run-phase3-final-2026-04-07.json (평균 LRE)
 * - isCustomImpl: Pyodide에서 전문 라이브러리 사용 불가로 자체 구현된 메서드
 *
 * UI에서 결과 화면에 라이브러리/검증 상태를 표시하는 데 사용됩니다.
 */

export interface ValidationMeta {
  /** Python 라이브러리명 + 버전 (예: "scipy 1.14.1") */
  readonly pythonLib: string
  /** R 교차검증 평균 LRE (Log Relative Error, 0~15 범위) */
  readonly lre: number
  /** true = Pyodide 제약으로 자체 구현 (라이브러리 없음) */
  readonly isCustomImpl: boolean
}

/**
 * 50개 메서드별 검증 메타데이터.
 * key = canonical method ID (statistical-methods.ts SSOT)
 */
export const VALIDATION_METADATA: Readonly<Record<string, ValidationMeta>> = {
  // ── T-Test (4) ─────────────────────────────────────────
  'two-sample-t':            { pythonLib: 'scipy 1.14.1',       lre: 14.8, isCustomImpl: false },
  'welch-t':                 { pythonLib: 'scipy 1.14.1',       lre: 14.7, isCustomImpl: false },
  'one-sample-t':            { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'paired-t':                { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },

  // ── ANOVA (6) ──────────────────────────────────────────
  'one-way-anova':           { pythonLib: 'scipy 1.14.1',       lre: 14.9, isCustomImpl: false },
  'two-way-anova':           { pythonLib: 'statsmodels 0.14.1', lre: 14.4, isCustomImpl: false },
  'repeated-measures-anova': { pythonLib: 'statsmodels 0.14.1', lre: 14.8, isCustomImpl: false },
  'ancova':                  { pythonLib: 'statsmodels 0.14.1', lre: 14.7, isCustomImpl: false },
  'manova':                  { pythonLib: 'statsmodels 0.14.1', lre: 13.3, isCustomImpl: false },
  'mixed-model':             { pythonLib: 'statsmodels 0.14.1', lre: 10.7, isCustomImpl: false },

  // ── 비모수 검정 (11) ──────────────────────────────────
  'mann-whitney':            { pythonLib: 'scipy 1.14.1',       lre:  8.0, isCustomImpl: false },
  'wilcoxon-signed-rank':    { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'kruskal-wallis':          { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'friedman':                { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'sign-test':               { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'mcnemar':                 { pythonLib: 'statsmodels 0.14.1', lre: 14.4, isCustomImpl: false },
  'cochran-q':               { pythonLib: 'statsmodels 0.14.1', lre: 15.0, isCustomImpl: false },
  'binomial-test':           { pythonLib: 'scipy 1.14.1',       lre: 14.9, isCustomImpl: false },
  'runs-test':               { pythonLib: 'statsmodels 0.14.1', lre: 15.0, isCustomImpl: false },
  'kolmogorov-smirnov':      { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'mood-median':             { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },

  // ── 상관 (2) ───────────────────────────────────────────
  'pearson-correlation':     { pythonLib: 'scipy 1.14.1',       lre: 10.3, isCustomImpl: false },
  'partial-correlation':     { pythonLib: 'statsmodels 0.14.1', lre: 14.7, isCustomImpl: false },

  // ── 회귀 (6) ───────────────────────────────────────────
  'simple-regression':       { pythonLib: 'scipy 1.14.1',       lre: 13.9, isCustomImpl: false },
  'logistic-regression':     { pythonLib: 'statsmodels 0.14.1', lre:  8.9, isCustomImpl: false },
  'poisson-regression':      { pythonLib: 'statsmodels 0.14.1', lre: 12.4, isCustomImpl: false },
  'ordinal-regression':      { pythonLib: 'statsmodels 0.14.1', lre:  4.8, isCustomImpl: false },
  'stepwise-regression':     { pythonLib: 'statsmodels 0.14.1', lre: 11.3, isCustomImpl: false },
  'dose-response':           { pythonLib: 'scipy 1.14.1',       lre:  5.8, isCustomImpl: false },
  'response-surface':        { pythonLib: 'statsmodels 0.14.1', lre: 12.4, isCustomImpl: false },

  // ── 카이제곱 (2) ───────────────────────────────────────
  'chi-square-goodness':     { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },
  'chi-square-independence': { pythonLib: 'scipy 1.14.1',       lre: 15.0, isCustomImpl: false },

  // ── 정규성 (1) ─────────────────────────────────────────
  'normality-test':          { pythonLib: 'scipy 1.14.1',       lre:  9.2, isCustomImpl: false },

  // ── 다변량 (4) ─────────────────────────────────────────
  'pca':                     { pythonLib: 'sklearn 1.4.0',      lre:  7.9, isCustomImpl: false },
  'factor-analysis':         { pythonLib: 'numpy (PAF+varimax)', lre:  2.6, isCustomImpl: true },
  'cluster':                 { pythonLib: 'sklearn 1.4.0',      lre:  6.4, isCustomImpl: false },
  'discriminant-analysis':   { pythonLib: 'sklearn 1.4.0',      lre: 15.0, isCustomImpl: false },

  // ── 생존/ROC (3) ───────────────────────────────────────
  'kaplan-meier':            { pythonLib: 'statsmodels 0.14.1', lre: 15.0, isCustomImpl: false },
  'cox-regression':          { pythonLib: 'statsmodels 0.14.1', lre: 14.7, isCustomImpl: false },
  'roc-curve':               { pythonLib: 'sklearn 1.4.0',      lre: 11.7, isCustomImpl: false },

  // ── 시계열 (4) ─────────────────────────────────────────
  'arima':                   { pythonLib: 'statsmodels 0.14.1', lre:  4.7, isCustomImpl: false },
  'seasonal-decompose':      { pythonLib: 'statsmodels 0.14.1', lre: 14.8, isCustomImpl: false },
  'stationarity-test':       { pythonLib: 'statsmodels 0.14.1', lre: 10.3, isCustomImpl: false },
  'mann-kendall-test':       { pythonLib: 'custom (NumPy + SciPy)', lre: 13.0, isCustomImpl: true },

  // ── 기타 (1) ───────────────────────────────────────────
  'one-sample-proportion':   { pythonLib: 'scipy 1.14.1',       lre: 14.8, isCustomImpl: false },
  'reliability-analysis':    { pythonLib: 'pingouin 0.5.4',     lre: 15.0, isCustomImpl: false },

  // ── 데이터 도구 (4) ────────────────────────────────────
  'descriptive-stats':       { pythonLib: 'scipy 1.14.1 + numpy', lre: 15.0, isCustomImpl: false },
  'explore-data':            { pythonLib: 'scipy 1.14.1 + numpy', lre: 13.5, isCustomImpl: false },
  'means-plot':              { pythonLib: 'scipy 1.14.1 + numpy', lre: 15.0, isCustomImpl: false },
  'power-analysis':          { pythonLib: 'statsmodels 0.14.1', lre: 11.7, isCustomImpl: false },
} as const
